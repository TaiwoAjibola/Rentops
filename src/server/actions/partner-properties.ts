"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingMode, MediaType, Prisma } from "@prisma/client";

import type { PartnerActionState } from "@/components/partner/action-state";
import {
  bool,
  fileOf,
  floatOr,
  intOr,
  ownedProperty,
  str,
  stringList,
} from "@/components/partner/guards";
import { requirePartnerPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { recalculatePropertyRate } from "@/lib/properties";
import { storeUpload } from "@/lib/storage";
import { safeJsonParse, slugify } from "@/lib/utils";
import { partnerStaffUserIds } from "@/lib/payments/booking";

/**
 * Property actions.
 *
 * Every mutation re-resolves the property through `ownedProperty(partnerId, id)`
 * so an id posted from the browser can never touch another partner's listing.
 * Properties are always created as DRAFT and only ever become public when
 * RentOps approves them.
 */

const MEDIA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function uniquePropertySlug(base: string) {
  const cleaned = slugify(base) || "property";
  let candidate = cleaned;
  let index = 2;
  while (await prisma.property.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${cleaned}-${index++}`;
  }
  return candidate;
}

function weekdayList(formData: FormData) {
  const days = stringList(formData, "acceptedCheckInDays")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => value >= 0 && value <= 6)
    .sort((a, b) => a - b);
  return days.length > 0 && days.length < 7 ? days.join(",") : null;
}

// -----------------------------------------------------------------------------
// Step 1 — general information
// -----------------------------------------------------------------------------

export async function createPropertyBasics(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user, permissions } = await requirePartnerPermission("property.create");

  const name = str(formData, "name");
  const categoryId = str(formData, "categoryId");
  const description = str(formData, "description");
  const addressLine1 = str(formData, "addressLine1");
  const city = str(formData, "city");
  const state = str(formData, "state");
  if (!name) return { error: "Give the property a name." };
  if (!categoryId) return { error: "Choose a property category." };
  if (description.length < 40) return { error: "Write at least a couple of sentences describing the property." };
  if (!addressLine1) return { error: "Enter the street address." };
  if (!city) return { error: "Enter the city." };
  if (!state) return { error: "Enter the state." };

  const category = await prisma.propertyCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) return { error: "That category no longer exists." };

  const latitude = floatOr(formData, "latitude");
  const longitude = floatOr(formData, "longitude");
  if ((latitude == null) !== (longitude == null)) {
    return { error: "Provide both latitude and longitude, or leave both empty." };
  }
  if (latitude != null && (latitude < -90 || latitude > 90)) return { error: "Latitude must be between -90 and 90." };
  if (longitude != null && (longitude < -180 || longitude > 180)) {
    return { error: "Longitude must be between -180 and 180." };
  }

  const slug = await uniquePropertySlug(name);

  const property = await prisma.property.create({
    data: {
      slug,
      partnerId: partner.id,
      categoryId,
      name,
      headline: str(formData, "headline") || null,
      description,
      status: "DRAFT",
      isActive: true,
      addressLine1,
      addressLine2: str(formData, "addressLine2") || null,
      area: str(formData, "area") || null,
      city,
      state,
      country: str(formData, "country") || "Nigeria",
      postalCode: str(formData, "postalCode") || null,
      latitude,
      longitude,
      contactName: str(formData, "contactName") || null,
      contactPhone: str(formData, "contactPhone") || null,
      contactEmail: str(formData, "contactEmail") || null,
      // Booking defaults are permissive: the partner tightens them in step 4.
      bookingMode: "INSTANT",
      minNights: 1,
      minNoticeHours: 0,
      childrenAllowed: true,
      currency: partner.defaultCurrency,
    },
    select: { id: true, name: true },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: permissions.includes("staff.manage") ? "PARTNER_OWNER" : "PARTNER_STAFF",
    action: "PROPERTY_CREATED",
    entityType: "Property",
    entityId: property.id,
    summary: `${property.name} created as a draft`,
    after: { name, city, state, categoryId },
  });

  revalidatePath("/partner/properties");
  revalidatePath("/partner");
  redirect(`/partner/properties/${property.id}?setup=1`);
}

export async function updatePropertyBasics(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");

  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const name = str(formData, "name");
  const description = str(formData, "description");
  if (!name) return { error: "Give the property a name." };
  if (description.length < 40) return { error: "Write at least a couple of sentences describing the property." };

  const latitude = floatOr(formData, "latitude");
  const longitude = floatOr(formData, "longitude");
  if ((latitude == null) !== (longitude == null)) {
    return { error: "Provide both latitude and longitude, or leave both empty." };
  }

  await prisma.property.update({
    where: { id: property.id },
    data: {
      name,
      headline: str(formData, "headline") || null,
      description,
      addressLine1: str(formData, "addressLine1") || property.addressLine1,
      addressLine2: str(formData, "addressLine2") || null,
      area: str(formData, "area") || null,
      city: str(formData, "city") || property.city,
      state: str(formData, "state") || property.state,
      country: str(formData, "country") || property.country,
      postalCode: str(formData, "postalCode") || null,
      latitude,
      longitude,
      contactName: str(formData, "contactName") || null,
      contactPhone: str(formData, "contactPhone") || null,
      contactEmail: str(formData, "contactEmail") || null,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_UPDATED",
    entityType: "Property",
    entityId: property.id,
    summary: "Property details updated",
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath("/partner/properties");
  return { success: "Property details saved." };
}

// -----------------------------------------------------------------------------
// Step 2 — capacity
// -----------------------------------------------------------------------------

export async function savePropertyCapacity(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const bedrooms = intOr(formData, "bedrooms", 1) ?? 1;
  const bathrooms = intOr(formData, "bathrooms", 1) ?? 1;
  const maxGuests = intOr(formData, "maxGuests", 2) ?? 2;
  const sizeSqm = floatOr(formData, "sizeSqm");

  if (bedrooms < 0 || bathrooms < 0) return { error: "Capacity values cannot be negative." };
  if (maxGuests < 1) return { error: "The property must sleep at least one guest." };

  await prisma.property.update({
    where: { id: property.id },
    data: { bedrooms, bathrooms, maxGuests, sizeSqm },
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath("/partner/properties");

  if (str(formData, "wizard") === "1") {
    redirect(`/partner/properties/new?step=3&propertyId=${property.id}`);
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_CAPACITY_UPDATED",
    entityType: "Property",
    entityId: property.id,
    summary: `Capacity set to ${bedrooms} bed / ${bathrooms} bath / ${maxGuests} guests`,
  });
  return { success: "Capacity saved." };
}

// -----------------------------------------------------------------------------
// Step 3 — policies
// -----------------------------------------------------------------------------

export async function savePropertyPolicies(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const cancellationPolicyId = str(formData, "cancellationPolicyId");
  if (cancellationPolicyId) {
    const policy = await prisma.cancellationPolicy.findFirst({
      where: { id: cancellationPolicyId, OR: [{ partnerId: null }, { partnerId: partner.id }] },
      select: { id: true },
    });
    if (!policy) return { error: "Choose a cancellation policy from the list." };
  }

  const minimumAge = intOr(formData, "minimumAge");

  await prisma.property.update({
    where: { id: property.id },
    data: {
      houseRules: str(formData, "houseRules") || null,
      cancellationPolicyId: cancellationPolicyId || null,
      checkInFrom: str(formData, "checkInFrom") || null,
      checkInTo: str(formData, "checkInTo") || null,
      checkOutUntil: str(formData, "checkOutUntil") || null,
      smokingAllowed: bool(formData, "smokingAllowed"),
      petsAllowed: bool(formData, "petsAllowed"),
      partiesAllowed: bool(formData, "partiesAllowed"),
      childrenAllowed: bool(formData, "childrenAllowed"),
      minimumAge,
    },
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath("/partner/properties");

  if (str(formData, "wizard") === "1") {
    redirect(`/partner/properties/new?step=4&propertyId=${property.id}`);
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_POLICIES_UPDATED",
    entityType: "Property",
    entityId: property.id,
    summary: "House rules and policies updated",
  });
  return { success: "Policies saved." };
}

// -----------------------------------------------------------------------------
// Step 4 — booking rules
// -----------------------------------------------------------------------------

export async function saveBookingRules(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const bookingMode = str(formData, "bookingMode") as BookingMode;
  if (bookingMode !== "INSTANT" && bookingMode !== "APPROVAL") {
    return { error: "Choose whether guests book instantly or request approval." };
  }

  const minNights = intOr(formData, "minNights", 1) ?? 1;
  const maxNights = intOr(formData, "maxNights");
  if (minNights < 1) return { error: "Minimum stay must be at least one night." };
  if (maxNights != null && maxNights < minNights) {
    return { error: "Maximum stay cannot be shorter than the minimum stay." };
  }

  const minNoticeHours = intOr(formData, "minNoticeHours", 0) ?? 0;
  const advanceBookingDays = intOr(formData, "advanceBookingDays", 365) ?? 365;
  if (minNoticeHours < 0) return { error: "Notice period cannot be negative." };
  if (advanceBookingDays < 1) return { error: "You must accept bookings at least one day ahead." };

  const dueDiligenceThresholdDays = intOr(formData, "dueDiligenceThresholdDays");
  const allowPayLater = bool(formData, "allowPayLater");
  const unpaidHoldDays = Math.max(0, Math.min(30, intOr(formData, "unpaidHoldDays", 2) ?? 2));

  await prisma.property.update({
    where: { id: property.id },
    data: {
      bookingMode,
      instantBooking: bookingMode === "INSTANT",
      minNights,
      maxNights,
      minNoticeHours,
      advanceBookingDays,
      acceptedCheckInDays: weekdayList(formData),
      dueDiligenceEnabled: bool(formData, "dueDiligenceEnabled"),
      dueDiligenceThresholdDays,
      mandatoryVerification: bool(formData, "mandatoryVerification"),
      allowPayLater,
      unpaidHoldDays: allowPayLater ? unpaidHoldDays : 0,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_BOOKING_RULES_UPDATED",
    entityType: "Property",
    entityId: property.id,
    summary: `Booking mode ${bookingMode.toLowerCase()}, ${minNights}+ nights`,
    after: { bookingMode, minNights, maxNights, minNoticeHours, advanceBookingDays, allowPayLater, unpaidHoldDays },
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath("/partner/properties");

  if (str(formData, "wizard") === "1") {
    redirect(`/partner/properties/new?step=5&propertyId=${property.id}`);
  }
  return { success: "Booking rules saved." };
}

// -----------------------------------------------------------------------------
// Step 5 — amenities
// -----------------------------------------------------------------------------

export async function savePropertyAmenities(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const amenityIds = stringList(formData, "amenityIds");
  const valid = await prisma.amenity.findMany({
    where: { id: { in: amenityIds }, isActive: true },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.propertyAmenity.deleteMany({ where: { propertyId: property.id } }),
    prisma.propertyAmenity.createMany({
      data: valid.map((amenity) => ({ propertyId: property.id, amenityId: amenity.id })),
    }),
  ]);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_AMENITIES_UPDATED",
    entityType: "Property",
    entityId: property.id,
    summary: `${valid.length} amenities saved`,
  });

  revalidatePath(`/partner/properties/${property.id}`);

  if (str(formData, "wizard") === "1") {
    redirect(`/partner/properties/new?step=6&propertyId=${property.id}`);
  }
  return { success: "Amenities saved." };
}

// -----------------------------------------------------------------------------
// Step 6 — media
// -----------------------------------------------------------------------------

const MEDIA_UPLOAD_LIMIT = 8;

export async function addPropertyMedia(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const kind = str(formData, "kind") as "IMAGE" | "FLOOR_PLAN" | "TOUR_FILE";

  if (kind === "IMAGE" || kind === "FLOOR_PLAN") {
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) return { error: "Choose at least one image to upload." };
    if (files.length > MEDIA_UPLOAD_LIMIT) {
      return { error: `Upload at most ${MEDIA_UPLOAD_LIMIT} files at a time.` };
    }

    const existing = await prisma.propertyMedia.count({ where: { propertyId: property.id, type: "IMAGE" } });
    let sortOrder = existing;
    const mediaType: MediaType = kind === "FLOOR_PLAN" ? "FLOOR_PLAN" : "IMAGE";

    for (const file of files) {
      const stored = await storeUpload(file, `properties/${property.slug}`, {
        resourceType: MEDIA_IMAGE_TYPES.includes(file.type) ? "image" : "raw",
      });
      await prisma.propertyMedia.create({
        data: {
          propertyId: property.id,
          type: mediaType,
          url: stored.url,
          publicId: stored.publicId,
          width: stored.width ?? null,
          height: stored.height ?? null,
          sortOrder: sortOrder++,
        },
      });
    }

    if (kind === "IMAGE" && !property.coverImageUrl) {
      const first = await prisma.propertyMedia.findFirst({
        where: { propertyId: property.id, type: "IMAGE" },
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      });
      if (first) {
        await prisma.property.update({ where: { id: property.id }, data: { coverImageUrl: first.url } });
      }
    }

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "PROPERTY_MEDIA_UPLOADED",
      entityType: "Property",
      entityId: property.id,
      summary: `${files.length} ${mediaType.toLowerCase().replace("_", " ")} file(s) uploaded`,
    });

    revalidatePath(`/partner/properties/${property.id}`);
    revalidatePath("/partner/properties");
    return { success: `${files.length} file${files.length > 1 ? "s" : ""} uploaded.` };
  }

  return { error: "Choose what you would like to upload." };
}

export async function addPropertyVideo(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const url = str(formData, "youtubeUrl");
  const caption = str(formData, "caption");
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
    return { error: "Enter a valid YouTube link." };
  }

  const count = await prisma.propertyMedia.count({ where: { propertyId: property.id, type: "YOUTUBE" } });
  await prisma.propertyMedia.create({
    data: {
      propertyId: property.id,
      type: "YOUTUBE",
      url,
      caption: caption || null,
      sortOrder: count,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_MEDIA_VIDEO_ADDED",
    entityType: "Property",
    entityId: property.id,
    summary: "YouTube video added",
  });

  revalidatePath(`/partner/properties/${property.id}`);
  return { success: "Video added." };
}

/**
 * Real interactive tours: partners paste the scene manifest (or upload the JSON
 * export) for providers such as Matterport / Kuula. We only persist what they
 * give us — we never invent a tour.
 */
export async function saveVirtualTour(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const file = fileOf(formData, "tourFile");
  let raw = str(formData, "tourJson");

  if (file) {
    raw = await file.text();
  }
  if (!raw) return { error: "Paste your tour configuration or upload the JSON file." };

  const parsed = safeJsonParse<{ provider?: string; url?: string; scenes?: unknown[] } | null>(raw, null);
  if (!parsed || typeof parsed !== "object") {
    return { error: "That tour configuration is not valid JSON." };
  }
  const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  if (scenes.length === 0 && !parsed.url) {
    return { error: "The tour needs at least one scene, or a URL to the hosted tour." };
  }

  const existing = await prisma.propertyMedia.findFirst({
    where: { propertyId: property.id, type: { in: ["VIRTUAL_TOUR", "VIRTUAL_TOUR_360"] } },
    select: { id: true },
  });

  const data = {
    type: (scenes.length > 0 ? ("VIRTUAL_TOUR_360" as const) : ("VIRTUAL_TOUR" as const)),
    url: parsed.url ?? `virtual-tour:${property.slug}`,
    meta: parsed as Prisma.InputJsonValue,
    caption: typeof parsed.provider === "string" ? parsed.provider : "Virtual tour",
  };

  if (existing) {
    await prisma.propertyMedia.update({ where: { id: existing.id }, data });
  } else {
    await prisma.propertyMedia.create({ data: { propertyId: property.id, sortOrder: 0, ...data } });
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_VIRTUAL_TOUR_SAVED",
    entityType: "Property",
    entityId: property.id,
    summary: `Virtual tour saved (${scenes.length} scene${scenes.length === 1 ? "" : "s"})`,
  });

  revalidatePath(`/partner/properties/${property.id}`);
  return { success: "Virtual tour saved." };
}

export async function setCoverImage(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const media = await prisma.propertyMedia.findFirst({
    where: { id: str(formData, "mediaId"), propertyId: property.id },
    select: { id: true, url: true },
  });
  if (!media) return { error: "That image is not on this property." };

  await prisma.property.update({ where: { id: property.id }, data: { coverImageUrl: media.url } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_COVER_SET",
    entityType: "Property",
    entityId: property.id,
    summary: "Cover image updated",
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath("/partner/properties");
  return { success: "Cover image set." };
}

export async function deletePropertyMedia(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const media = await prisma.propertyMedia.findFirst({
    where: { id: str(formData, "mediaId"), propertyId: property.id },
    select: { id: true, url: true, type: true },
  });
  if (!media) return { error: "That item is not on this property." };

  await prisma.propertyMedia.delete({ where: { id: media.id } });

  if (property.coverImageUrl === media.url) {
    const next = await prisma.propertyMedia.findFirst({
      where: { propertyId: property.id, type: "IMAGE" },
      orderBy: { sortOrder: "asc" },
      select: { url: true },
    });
    await prisma.property.update({ where: { id: property.id }, data: { coverImageUrl: next?.url ?? null } });
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_MEDIA_DELETED",
    entityType: "Property",
    entityId: property.id,
    summary: `Media removed (${media.type.toLowerCase()})`,
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath("/partner/properties");
  return { success: "Media removed." };
}

// -----------------------------------------------------------------------------
// Review workflow
// -----------------------------------------------------------------------------

export async function submitPropertyForReview(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.submit");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };
  if (!["DRAFT", "ADDITIONAL_INFO_REQUIRED", "REJECTED"].includes(property.status)) {
    return { error: `This property is already ${property.status.toLowerCase().replace(/_/g, " ")}.` };
  }

  await prisma.property.update({
    where: { id: property.id },
    data: { status: "SUBMITTED", submittedAt: new Date(), rejectionReason: null },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_SUBMITTED",
    entityType: "Property",
    entityId: property.id,
    summary: `${property.name} submitted for RentOps review`,
  });

  const staff = await partnerStaffUserIds(partner.id);
  await Promise.all(
    staff.map((userId) =>
      notify({
        userId,
        type: "PROPERTY_STATUS",
        title: `${property.name} submitted for review`,
        body: "RentOps will review the listing. You will be notified when it is approved or if we need more information.",
        channels: ["IN_APP"],
        data: { partnerId: partner.id, propertyId: property.id },
      }),
    ),
  );

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath("/partner/properties");
  revalidatePath("/partner");
  return { success: "Submitted. RentOps will review this listing before it can take bookings." };
}

/** Pull a submitted listing back into drafts, or unpublish a live one. */
export async function withdrawProperty(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.submit");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const unpublish = property.status === "APPROVED";
  await prisma.property.update({
    where: { id: property.id },
    data: unpublish ? { isActive: false, status: "SUSPENDED" } : { status: "DRAFT", submittedAt: null },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: unpublish ? "PROPERTY_UNPUBLISHED" : "PROPERTY_WITHDRAWN",
    entityType: "Property",
    entityId: property.id,
    summary: unpublish ? `${property.name} unpublished` : `${property.name} withdrawn from review`,
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath("/partner/properties");
  revalidatePath("/partner");
  return { success: unpublish ? "Listing unpublished." : "Withdrawn from review." };
}

// -----------------------------------------------------------------------------
// Pricing fees: tax, caution/deposit, and custom fees
// -----------------------------------------------------------------------------

export async function addPropertyFee(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("rate.manage");
  const id = str(formData, "propertyId");
  const property = await ownedProperty(partner.id, id);
  if (!property) return { error: "That property is not on your account." };

  const name = str(formData, "name");
  if (!name) return { error: "Give the fee a name (e.g. VAT, Caution fee, Cleaning)." };

  const kind = (str(formData, "kind") || "CUSTOM") as "TAX" | "CAUTION_DEPOSIT" | "CLEANING" | "SERVICE" | "CUSTOM";
  const calculation = (str(formData, "calculation") || "FIXED") as "FIXED" | "PERCENTAGE" | "VARIABLE";
  const appliesTo = (str(formData, "appliesTo") || "PER_STAY") as "PER_STAY" | "PER_NIGHT" | "PER_GUEST";
  const isRefundable = bool(formData, "isRefundable") || kind === "CAUTION_DEPOSIT";

  let amount: number | null = null;
  let percentage: number | null = null;
  if (calculation === "FIXED") {
    amount = floatOr(formData, "amount");
    if (amount == null || amount < 0) return { error: "Enter a valid amount for a fixed fee." };
  } else if (calculation === "PERCENTAGE") {
    percentage = floatOr(formData, "percentage");
    if (percentage == null || percentage < 0) return { error: "Enter a valid percentage." };
  }

  await prisma.propertyFee.create({
    data: {
      propertyId: property.id,
      name,
      kind,
      calculation,
      amount: calculation === "FIXED" ? amount : null,
      percentage: calculation === "PERCENTAGE" ? percentage : null,
      appliesTo,
      isRefundable,
      isActive: true,
      sortOrder: intOr(formData, "sortOrder", 0) ?? 0,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_FEE_ADDED",
    entityType: "Property",
    entityId: property.id,
    summary: `${kind === "CAUTION_DEPOSIT" ? "Caution" : kind === "TAX" ? "Tax" : "Fee"} "${name}" added`,
    after: { name, kind, calculation },
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath(`/partner/properties/${property.id}?tab=pricing`);
  return { success: `Fee "${name}" saved.` };
}

export async function deletePropertyFee(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("rate.manage");
  const propertyId = str(formData, "propertyId");
  const feeId = str(formData, "feeId");
  const property = await ownedProperty(partner.id, propertyId);
  if (!property) return { error: "That property is not on your account." };

  const fee = await prisma.propertyFee.findFirst({ where: { id: feeId, propertyId: property.id }, select: { id: true, name: true } });
  if (!fee) return { error: "That fee is not on this property." };

  await prisma.propertyFee.delete({ where: { id: fee.id } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PROPERTY_FEE_DELETED",
    entityType: "Property",
    entityId: property.id,
    summary: `Fee "${fee.name}" removed`,
  });

  revalidatePath(`/partner/properties/${property.id}`);
  revalidatePath(`/partner/properties/${property.id}?tab=pricing`);
  return { success: "Fee removed." };
}
