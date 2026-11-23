"use server";

import { revalidatePath } from "next/cache";
import type { MediaType, Prisma } from "@prisma/client";

import type { PartnerActionState } from "@/components/partner/action-state";
import { fileOf, str } from "@/components/partner/guards";
import { requirePartnerPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { storeUpload } from "@/lib/storage";
import { safeJsonParse } from "@/lib/utils";

const MEDIA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const UPLOAD_LIMIT = 8;

/**
 * Unit-scoped media actions — every mutation re-resolves the unit through the
 * acting partner, so an id posted from the browser can never touch another
 * partner's inventory. Mirrors the property media actions so the two behave
 * identically.
 */
async function ownedUnit(partnerId: string, unitId: string) {
  return prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId } },
    include: { property: { select: { id: true, slug: true, name: true } } },
  });
}

function revalidateUnit(propertyId: string) {
  revalidatePath(`/partner/properties/${propertyId}`);
  revalidatePath(`/partner/properties/${propertyId}?tab=units`);
}

/** Uploads images / floor plans for one unit. */
export async function addUnitImages(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");

  const unit = await ownedUnit(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const kind = str(formData, "kind") as "IMAGE" | "FLOOR_PLAN";
  if (kind !== "IMAGE" && kind !== "FLOOR_PLAN") {
    return { error: "Choose the media type you are uploading." };
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) return { error: "Choose at least one image to upload." };
  if (files.length > UPLOAD_LIMIT) {
    return { error: `Upload at most ${UPLOAD_LIMIT} files at a time.` };
  }

  const existing = await prisma.unitMedia.count({ where: { unitId: unit.id, type: kind } });
  let sortOrder = existing;
  const mediaType: MediaType = kind === "FLOOR_PLAN" ? "FLOOR_PLAN" : "IMAGE";

  try {
    for (const file of files) {
      const stored = await storeUpload(file, `units/${unit.property.slug}`, {
        resourceType: MEDIA_IMAGE_TYPES.includes(file.type) ? "image" : "raw",
      });
      await prisma.unitMedia.create({
        data: {
          unitId: unit.id,
          type: mediaType,
          url: stored.url,
          publicId: stored.publicId,
          width: stored.width ?? null,
          height: stored.height ?? null,
          sortOrder: sortOrder++,
        },
      });
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "We could not store those files." };
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_MEDIA_UPLOADED",
    entityType: "Unit",
    entityId: unit.id,
    summary: `${files.length} ${kind === "FLOOR_PLAN" ? "floor plan" : "image"}${files.length > 1 ? "s" : ""} uploaded to ${unit.label}`,
  });

  revalidateUnit(unit.property.id);
  return { success: `${files.length} file${files.length > 1 ? "s" : ""} uploaded to ${unit.label}.` };
}

/** Adds a hosted YouTube walkthrough for one unit. */
export async function addUnitYoutube(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");

  const unit = await ownedUnit(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const url = str(formData, "youtubeUrl");
  const caption = str(formData, "caption");
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
    return { error: "Enter a valid YouTube link." };
  }

  const count = await prisma.unitMedia.count({ where: { unitId: unit.id, type: "YOUTUBE" } });
  await prisma.unitMedia.create({
    data: { unitId: unit.id, type: "YOUTUBE", url, caption: caption || null, sortOrder: count },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_MEDIA_VIDEO_ADDED",
    entityType: "Unit",
    entityId: unit.id,
    summary: `YouTube video added to ${unit.label}`,
  });

  revalidateUnit(unit.property.id);
  return { success: "Video added." };
}

/**
 * Real interactive tours per unit — partners paste the scene manifest or
 * upload the JSON export from Matterport / Kuula. We persist exactly what
 * they give us; we never invent a tour.
 */
export async function saveUnitVirtualTour(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");

  const unit = await ownedUnit(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const file = fileOf(formData, "tourFile");
  let raw = str(formData, "tourJson");

  let text = raw;
  if (file) {
    text = await file.text();
  }
  if (!text) return { error: "Paste the tour configuration or upload the JSON file." };

  const parsed = safeJsonParse<{ provider?: string; url?: string; scenes?: unknown[] } | null>(
    text,
    null,
  );
  if (!parsed || typeof parsed !== "object") {
    return { error: "That tour configuration is not valid JSON." };
  }
  const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  if (scenes.length === 0 && !parsed.url) {
    return { error: "The tour needs at least one scene, or a URL to the hosted tour." };
  }

  const existing = await prisma.unitMedia.findFirst({
    where: { unitId: unit.id, type: { in: ["VIRTUAL_TOUR", "VIRTUAL_TOUR_360"] } },
    select: { id: true },
  });

  const data = {
    type: (scenes.length > 0 ? ("VIRTUAL_TOUR_360" as const) : ("VIRTUAL_TOUR" as const)),
    url: parsed.url ?? `virtual-tour:${unit.id}`,
    meta: parsed as Prisma.InputJsonValue,
    caption: typeof parsed.provider === "string" ? parsed.provider : "Virtual tour",
  };

  if (existing) {
    await prisma.unitMedia.update({ where: { id: existing.id }, data });
  } else {
    await prisma.unitMedia.create({ data: { unitId: unit.id, sortOrder: 0, ...data } });
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_VIRTUAL_TOUR_SAVED",
    entityType: "Unit",
    entityId: unit.id,
    summary: `Virtual tour saved for ${unit.label} (${scenes.length} scene${scenes.length === 1 ? "" : "s"})`,
  });

  revalidateUnit(unit.property.id);
  return { success: scenes.length > 0 ? "Interactive tour saved." : "Tour link saved." };
}

/** Deletes one media item from a unit. */
export async function deleteUnitMedia(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");
  const mediaId = str(formData, "mediaId");

  const unit = await ownedUnit(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const media = await prisma.unitMedia.findFirst({
    where: { id: mediaId, unitId: unit.id },
    select: { id: true, type: true },
  });
  if (!media) return { error: "That item is not on this unit." };

  await prisma.unitMedia.delete({ where: { id: media.id } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_MEDIA_DELETED",
    entityType: "Unit",
    entityId: unit.id,
    summary: `${media.type} removed from ${unit.label}`,
  });

  revalidateUnit(unit.property.id);
  return { success: "Media removed." };
}
