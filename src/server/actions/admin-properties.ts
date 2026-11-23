"use server";

import { revalidatePath } from "next/cache";
import type { PropertyVerificationLevel, VerificationStatus, VerificationType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { notifyMany } from "@/lib/notifications";
import { partnerStaffUserIds } from "@/lib/payments/booking";
import { VERIFICATION_LEVEL_LABELS, VERIFICATION_TYPE_LABELS } from "@/lib/constants";

import { auditAction, enumField, requireAdmin, text } from "@/server/actions/admin-context";
import type { AdminActionState } from "@/components/admin/action-state";

const CHECK_STATUSES = ["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED", "UNVERIFIED", "EXPIRED"] as const;
const LEVELS = ["NONE", "BASIC", "VERIFIED", "PREMIUM"] as const;
const CHECK_TYPES: VerificationType[] = ["IDENTITY", "OWNERSHIP", "LOCATION", "MEDIA", "INSPECTION"];

async function propertyWithPartner(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
      verificationLevel: true,
      verificationBadge: true,
      publishedAt: true,
      rejectionReason: true,
      adminNotes: true,
      partnerId: true,
      partner: { select: { id: true, businessName: true } },
    },
  });
}

/** Approves a property so it becomes publicly discoverable. */
export async function approveProperty(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin("property.review");
  const propertyId = text(formData, "propertyId");
  const level = enumField(formData, "verificationLevel", LEVELS, "VERIFIED") as PropertyVerificationLevel;
  const badge = text(formData, "verificationBadge") === "on" || level === "PREMIUM";
  const note = text(formData, "note");

  if (!propertyId) return { error: "Missing property reference." };

  const property = await propertyWithPartner(propertyId);
  if (!property) return { error: "Property not found." };

  const before = {
    status: property.status,
    verificationLevel: property.verificationLevel,
    verificationBadge: property.verificationBadge,
    publishedAt: property.publishedAt,
  };

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      status: "APPROVED",
      isActive: true,
      verificationLevel: level,
      verificationBadge: badge,
      publishedAt: property.publishedAt ?? new Date(),
      reviewedAt: new Date(),
      reviewedById: admin.id,
      rejectionReason: null,
      adminNotes: note || property.adminNotes,
    },
  });

  await auditAction(admin, {
    action: "PROPERTY_APPROVED",
    entityType: "Property",
    entityId: propertyId,
    summary: `Approved ${property.name} at ${VERIFICATION_LEVEL_LABELS[level]}`,
    before,
    after: { status: "APPROVED", verificationLevel: level, verificationBadge: badge, note: note || null },
  });

  await notifyPartner(
    property.partnerId,
    `${property.name} is approved`,
    `Your property is live on RentOps with ${VERIFICATION_LEVEL_LABELS[level]} verification.${note ? ` ${note}` : ""}`,
    property.slug,
  );

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin");
  return { success: "Property approved and published." };
}

/** Rejects a property with a reason the partner can act on. */
export async function rejectProperty(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin("property.review");
  const propertyId = text(formData, "propertyId");
  const reason = text(formData, "rejectionReason");

  if (!propertyId) return { error: "Missing property reference." };
  if (reason.length < 5) return { error: "Give the partner a clear reason for the rejection." };

  const property = await propertyWithPartner(propertyId);
  if (!property) return { error: "Property not found." };

  const before = { status: property.status, rejectionReason: property.rejectionReason };

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      status: "REJECTED",
      isActive: false,
      rejectionReason: reason,
      reviewedAt: new Date(),
      reviewedById: admin.id,
      verificationBadge: false,
    },
  });

  await auditAction(admin, {
    action: "PROPERTY_REJECTED",
    entityType: "Property",
    entityId: propertyId,
    summary: `Rejected ${property.name} — ${reason}`,
    before,
    after: { status: "REJECTED", rejectionReason: reason },
  });

  await notifyPartner(
    property.partnerId,
    `${property.name} was not approved`,
    `Reason: ${reason}. Update the listing and resubmit it for review.`,
    property.slug,
  );

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin");
  return { success: "Property rejected." };
}

/** Requests more information from the partner. */
export async function requestPropertyInfo(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin("property.review");
  const propertyId = text(formData, "propertyId");
  const note = text(formData, "adminNotes");

  if (!propertyId) return { error: "Missing property reference." };
  if (note.length < 5) return { error: "Describe exactly what the partner needs to provide." };

  const property = await propertyWithPartner(propertyId);
  if (!property) return { error: "Property not found." };

  const before = { status: property.status, adminNotes: property.adminNotes };

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      status: "ADDITIONAL_INFO_REQUIRED",
      adminNotes: note,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  await auditAction(admin, {
    action: "PROPERTY_INFO_REQUESTED",
    entityType: "Property",
    entityId: propertyId,
    summary: `Requested more information for ${property.name}`,
    before,
    after: { status: "ADDITIONAL_INFO_REQUIRED", adminNotes: note },
  });

  await notifyPartner(
    property.partnerId,
    `More information needed for ${property.name}`,
    note,
    property.slug,
  );

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin");
  return { success: "Additional information requested." };
}

/** Suspends (or reinstates) a listing without changing its review status. */
export async function setPropertyListingActive(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("property.manage");
  const propertyId = text(formData, "propertyId");
  const active = text(formData, "active") !== "false";

  if (!propertyId) return { error: "Missing property reference." };

  const property = await propertyWithPartner(propertyId);
  if (!property) return { error: "Property not found." };

  const before = { isActive: property.isActive };
  await prisma.property.update({ where: { id: propertyId }, data: { isActive: active } });

  await auditAction(admin, {
    action: active ? "PROPERTY_REINSTATED" : "PROPERTY_SUSPENDED",
    entityType: "Property",
    entityId: propertyId,
    summary: `${active ? "Reinstated" : "Suspended"} ${property.name}`,
    before,
    after: { isActive: active },
  });

  await notifyPartner(
    property.partnerId,
    `${property.name} ${active ? "is live again" : "has been suspended"}`,
    active
      ? "The listing is visible to customers again."
      : "The listing is hidden from search. Contact RentOps operations to restore it.",
    property.slug,
  );

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  return { success: active ? "Listing reinstated." : "Listing suspended." };
}

/** Records a decision against one of the per-check verification rows. */
export async function reviewPropertyCheck(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("property.review");
  const propertyId = text(formData, "propertyId");
  const type = enumField(formData, "type", CHECK_TYPES, "IDENTITY") as VerificationType;
  const status = enumField(formData, "status", CHECK_STATUSES, "VERIFIED") as VerificationStatus;
  const note = text(formData, "note");

  if (!propertyId) return { error: "Missing property reference." };

  const property = await propertyWithPartner(propertyId);
  if (!property) return { error: "Property not found." };

  const existing = await prisma.propertyVerificationCheck.findUnique({
    where: { propertyId_type: { propertyId, type } },
  });

  const before = existing ? { status: existing.status, note: existing.note } : { status: "MISSING", note: null };

  const completed = status === "VERIFIED" || status === "REJECTED";

  await prisma.propertyVerificationCheck.upsert({
    where: { propertyId_type: { propertyId, type } },
    create: {
      propertyId,
      type,
      status,
      note: note || null,
      reviewedById: admin.id,
      completedAt: completed ? new Date() : null,
    },
    update: {
      status,
      note: note || existing?.note || null,
      reviewedById: admin.id,
      completedAt: completed ? new Date() : existing?.completedAt ?? null,
    },
  });

  await auditAction(admin, {
    action: "PROPERTY_VERIFICATION_CHECK",
    entityType: "PropertyVerificationCheck",
    entityId: propertyId,
    summary: `${VERIFICATION_TYPE_LABELS[type]} → ${status} for ${property.name}`,
    before,
    after: { type, status, note: note || null },
  });

  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/verification");
  return { success: `${VERIFICATION_TYPE_LABELS[type]} marked ${status}.` };
}

/** Saves internal moderation notes without changing the review status. */
export async function savePropertyAdminNotes(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("property.review");
  const propertyId = text(formData, "propertyId");
  const note = text(formData, "adminNotes");

  if (!propertyId) return { error: "Missing property reference." };

  const property = await propertyWithPartner(propertyId);
  if (!property) return { error: "Property not found." };

  const before = { adminNotes: property.adminNotes };
  await prisma.property.update({ where: { id: propertyId }, data: { adminNotes: note || null } });

  await auditAction(admin, {
    action: "PROPERTY_NOTES_UPDATED",
    entityType: "Property",
    entityId: propertyId,
    summary: `Updated moderation notes for ${property.name}`,
    before,
    after: { adminNotes: note || null },
  });

  revalidatePath(`/admin/properties/${propertyId}`);
  return { success: "Notes saved." };
}

async function notifyPartner(partnerId: string, title: string, body: string, slug: string) {
  const staff = await partnerStaffUserIds(partnerId, ["OWNER", "MANAGER"]);
  await notifyMany(staff, {
    type: "PROPERTY_STATUS",
    title,
    body,
    channels: ["IN_APP", "EMAIL"],
    data: { slug },
  });
}
