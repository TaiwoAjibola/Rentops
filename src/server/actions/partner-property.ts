"use server";

import type { PartnerActionState } from "@/components/partner/action-state";

/**
 * Server actions the property workspace tabs submit to.
 *
 * Every action re-resolves ownership from the session partner (never from an id
 * that came from the browser), writes through the domain services, records an
 * audit entry and revalidates the affected paths.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BlockReason, RoomCategory, Unit } from "@prisma/client";

import { generateToken, hashPassword, requirePartnerContext, requirePartnerPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { parseToMinor } from "@/lib/money";
import { addDays, formatDate, nightsBetween, parseDateInput, startOfTodayUtc } from "@/lib/dates";
import { slugify, uniqueSuffix } from "@/lib/utils";
import { createReservation } from "@/lib/reservations";
import { recalculatePropertyRate } from "@/lib/properties";
import { getUnitCalendar } from "@/lib/availability";
import { ownedProperty } from "@/components/partner/guards";
import { bool, floatOr, intOr, isEmail, str } from "@/components/partner/guards";
import { storeUpload } from "@/lib/storage";

type OwnedUnit = {
  id: string;
  label: string;
  propertyId: string;
  property: { id: string; name: string; currency: string; bookingMode: string };
};

async function unitForPartner(partnerId: string, unitId: string): Promise<OwnedUnit | null> {
  return prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId } },
    include: { property: { select: { id: true, name: true, currency: true, bookingMode: true } } },
  });
}

function money(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (!raw) return null;
  return parseToMinor(raw, "NGN");
}

function workspacePath(propertyId: string, tab: string) {
  return `/partner/properties/${propertyId}?tab=${tab}`;
}

// -----------------------------------------------------------------------------
// Rooms & units
// -----------------------------------------------------------------------------

/**
 * Creates a room category and the individual units it describes.
 *
 * Inventory is always row-per-unit: a "Deluxe King × 12" becomes 12 Unit rows so
 * availability, pricing and occupancy arithmetic are exact.
 */
export async function createRoomCategory(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const propertyId = str(formData, "propertyId");

  const property = await ownedProperty(partner.id, propertyId);
  if (!property) return { error: "That property is not on your account." };

  const name = str(formData, "name");
  const quantity = intOr(formData, "quantity", 1) ?? 1;
  if (!name) return { error: "Name the room type." };
  if (quantity < 1) return { error: "Create at least one unit." };
  if (quantity > 200) return { error: "Create at most 200 units at a time." };

  const baseSlug = slugify(name) || `room-${uniqueSuffix(4).toLowerCase()}`;
  const existingSlugs = new Set(
    (
      await prisma.roomCategory.findMany({ where: { propertyId }, select: { slug: true } })
    ).map((entry) => entry.slug),
  );
  let slug = baseSlug;
  let index = 2;
  while (existingSlugs.has(slug)) slug = `${baseSlug}-${index++}`;

  const maxGuests = intOr(formData, "maxGuests", 2) ?? 2;
  const bedrooms = intOr(formData, "bedrooms", 1) ?? 1;
  const bathrooms = intOr(formData, "bathrooms", 1) ?? 1;

  const category = await prisma.roomCategory.create({
    data: {
      propertyId,
      name,
      slug,
      description: str(formData, "description") || null,
      maxGuests,
      bedrooms,
      bathrooms,
      beds: str(formData, "beds") || null,
      sizeSqm: floatOr(formData, "sizeSqm"),
      quantity,
      sortOrder: intOr(formData, "sortOrder", 0) ?? 0,
    },
  });

  const existingLabels = new Set(
    (await prisma.unit.findMany({ where: { propertyId }, select: { label: true } })).map((unit) =>
      unit.label.toLowerCase(),
    ),
  );

  let created = 0;
  for (let unitNumber = 1; unitNumber <= quantity; unitNumber += 1) {
    const label = `${name} ${unitNumber}`;
    if (existingLabels.has(label.toLowerCase())) continue;
    existingLabels.add(label.toLowerCase());
    await prisma.unit.create({
      data: {
        propertyId,
        categoryId: category.id,
        label,
        unitNumber: String(unitNumber),
        maxGuests,
        bedrooms,
        bathrooms,
        beds: category.beds,
        sizeSqm: category.sizeSqm,
        sortOrder: category.sortOrder * 100 + unitNumber,
      },
    });
    created += 1;
  }

  await recalculatePropertyRate(propertyId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "ROOM_CATEGORY_CREATED",
    entityType: "Property",
    entityId: propertyId,
    summary: `${category.name} — ${created} unit${created === 1 ? "" : "s"} created`,
    after: { categoryId: category.id, quantity },
  });

  revalidatePath(workspacePath(propertyId, "units"));
  return {
    success:
      created > 0
        ? `${name}: ${created} unit${created === 1 ? "" : "s"} created. Set prices for each unit below.`
        : `${name} created, but no new units were added — those unit labels already exist.`,
  };
}

/** Adds one unit or multiple similar units, optionally with photos at creation time. */
export async function createUnit(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const propertyId = str(formData, "propertyId");

  const property = await ownedProperty(partner.id, propertyId);
  if (!property) return { error: "That property is not on your account." };

  const baseLabel = str(formData, "label");
  if (!baseLabel) return { error: "Give the unit a label, e.g. “Apartment 2B”." };

  const quantity = Math.max(1, Math.min(50, intOr(formData, "quantity", 1) ?? 1));

  const categoryId = str(formData, "categoryId");
  if (categoryId) {
    const category = await prisma.roomCategory.findFirst({
      where: { id: categoryId, propertyId },
      select: { id: true },
    });
    if (!category) return { error: "That room type is not on this property." };
  }

  const existingLabels = new Set(
    (await prisma.unit.findMany({ where: { propertyId }, select: { label: true } })).map((u) => u.label.toLowerCase()),
  );

  const photos = formData.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);
  const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { slug: true, name: true } });
  const slug = prop?.slug ?? propertyId;

  let createdCount = 0;
  let lastLabel = baseLabel;
  for (let i = 1; i <= quantity; i += 1) {
    const label = quantity === 1 ? baseLabel : `${baseLabel} ${i}`;
    if (existingLabels.has(label.toLowerCase())) continue;
    existingLabels.add(label.toLowerCase());

    const unit = await prisma.unit.create({
      data: {
        propertyId,
        categoryId: categoryId || null,
        label,
        unitNumber: quantity === 1 ? (str(formData, "unitNumber") || null) : String(i),
        floor: str(formData, "floor") || null,
        maxGuests: intOr(formData, "maxGuests", 2) ?? 2,
        bedrooms: intOr(formData, "bedrooms", 1) ?? 1,
        bathrooms: intOr(formData, "bathrooms", 1) ?? 1,
        beds: str(formData, "beds") || null,
        sizeSqm: floatOr(formData, "sizeSqm"),
        status: "ACTIVE",
        sortOrder: intOr(formData, "sortOrder", 0) ?? 0,
      },
    });
    lastLabel = label;
    createdCount += 1;

    // Attach any uploaded photos to each created unit (useful for similar units).
    let sortOrder = 0;
    for (const file of photos.slice(0, 8)) {
      try {
        const stored = await storeUpload(file, `units/${slug}`, { resourceType: "image" });
        await prisma.unitMedia.create({
          data: {
            unitId: unit.id,
            type: "IMAGE",
            url: stored.url,
            publicId: stored.publicId,
            width: stored.width ?? null,
            height: stored.height ?? null,
            sortOrder: sortOrder++,
          },
        });
      } catch {
        // Ignore individual upload failures; unit is still created.
      }
    }
  }

  if (createdCount === 0) return { error: "No new units were created — those labels already exist." };

  await recalculatePropertyRate(propertyId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_CREATED",
    entityType: "Property",
    entityId: propertyId,
    summary: `${createdCount} unit${createdCount === 1 ? "" : "s"} added (${lastLabel}${createdCount > 1 ? ", …" : ""})`,
  });

  revalidatePath(workspacePath(propertyId, "units"));
  return { success: `${createdCount} unit${createdCount === 1 ? "" : "s"} created. Set prices and add 360° tours/media per unit below.` };
}

export async function updateUnitStatus(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");

  const unit = await unitForPartner(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const status = str(formData, "status") as Unit["status"];
  if (!["ACTIVE", "MAINTENANCE", "BLOCKED", "INACTIVE"].includes(status)) {
    return { error: "Choose a valid unit status." };
  }

  const isBookable = bool(formData, "isBookable");

  await prisma.unit.update({ where: { id: unitId }, data: { status, isBookable } });
  await recalculatePropertyRate(unit.propertyId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_STATUS_UPDATED",
    entityType: "Unit",
    entityId: unitId,
    summary: `${unit.label} → ${status.toLowerCase()}${isBookable ? " (bookable)" : " (not bookable)"}`,
    after: { status, isBookable },
  });

  revalidatePath(workspacePath(unit.propertyId, "units"));
  return { success: `${unit.label} updated.` };
}

export async function updateUnitDetails(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");

  const unit = await unitForPartner(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const label = str(formData, "label");
  if (!label) return { error: "Give the unit a label." };

  const duplicate = await prisma.unit.findFirst({
    where: { propertyId: unit.propertyId, label, id: { not: unitId } },
    select: { id: true },
  });
  if (duplicate) return { error: "Another unit on this property already uses that label." };

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      label,
      unitNumber: str(formData, "unitNumber") || null,
      floor: str(formData, "floor") || null,
      maxGuests: intOr(formData, "maxGuests", 2) ?? 2,
      bedrooms: intOr(formData, "bedrooms", 1) ?? 1,
      bathrooms: intOr(formData, "bathrooms", 1) ?? 1,
      beds: str(formData, "beds") || null,
      sizeSqm: floatOr(formData, "sizeSqm"),
    },
  });

  await recalculatePropertyRate(unit.propertyId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_UPDATED",
    entityType: "Unit",
    entityId: unitId,
    summary: `${label} details updated`,
  });

  revalidatePath(workspacePath(unit.propertyId, "units"));
  return { success: `${label} updated.` };
}

export async function deleteUnit(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId: partner.id } },
    include: { _count: { select: { reservationUnits: true } } },
  });
  if (!unit) return { error: "That unit is not on your account." };
  if (unit._count.reservationUnits > 0) {
    return { error: "This unit has booking history. Set it to Inactive instead of deleting it." };
  }

  await prisma.unit.delete({ where: { id: unitId } });
  await recalculatePropertyRate(unit.propertyId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_DELETED",
    entityType: "Unit",
    entityId: unitId,
    summary: `${unit.label} deleted`,
  });

  revalidatePath(workspacePath(unit.propertyId, "units"));
  return { success: `${unit.label} deleted.` };
}

// -----------------------------------------------------------------------------
// Per-unit pricing
// -----------------------------------------------------------------------------

/**
 * Unit pricing.
 *
 * The partner configures only the periods that are meaningful to them; the
 * pricing engine derives everything else. Amounts arrive in Naira major units
 * and are converted to minor units before they touch the database.
 */
export async function saveUnitRate(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("rate.manage");
  const unitId = str(formData, "unitId");

  const unit = await unitForPartner(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const nightlyRate = money(formData, "nightlyRate");
  const weeklyRate = money(formData, "weeklyRate");
  const monthlyRate = money(formData, "monthlyRate");
  const annualRate = money(formData, "annualRate");
  const weekendNightlyRate = money(formData, "weekendNightlyRate");

  if ([nightlyRate, weeklyRate, monthlyRate, annualRate].every((value) => value == null)) {
    return { error: "Set at least one rate period — nightly, weekly, monthly or annual." };
  }
  for (const [label, value] of [
    ["Nightly", nightlyRate],
    ["Weekly", weeklyRate],
    ["Monthly", monthlyRate],
    ["Annual", annualRate],
    ["Weekend nightly", weekendNightlyRate],
    ["Extra guest fee", money(formData, "extraGuestFee")],
  ] as const) {
    if (value != null && value < 0) return { error: `${label} cannot be negative.` };
  }

  const minNights = intOr(formData, "minNights");
  const maxNights = intOr(formData, "maxNights");
  if (minNights != null && minNights < 1) return { error: "Minimum nights must be at least 1." };
  if (minNights != null && maxNights != null && maxNights < minNights) {
    return { error: "Maximum nights cannot be lower than minimum nights." };
  }

  const extraGuestThreshold = intOr(formData, "extraGuestThreshold");

  const data = {
    currency: unit.property.currency,
    nightlyRate,
    weeklyRate,
    monthlyRate,
    annualRate,
    weekendNightlyRate,
    extraGuestFee: money(formData, "extraGuestFee") ?? 0,
    extraGuestThreshold,
    cleaningFee: money(formData, "cleaningFee") ?? 0,
    serviceCharge: money(formData, "serviceCharge") ?? 0,
    securityDeposit: money(formData, "securityDeposit") ?? 0,
    minNights,
    maxNights,
  };

  await prisma.unitRate.upsert({
    where: { unitId },
    create: { unitId, ...data },
    update: data,
  });

  await recalculatePropertyRate(unit.propertyId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_RATE_UPDATED",
    entityType: "Unit",
    entityId: unitId,
    summary: `Pricing updated for ${unit.label}`,
    after: data,
  });

  revalidatePath(workspacePath(unit.propertyId, "units"));
  revalidatePath(workspacePath(unit.propertyId, "pricing"));
  return { success: `${unit.label} pricing saved.` };
}

/** Copies one unit's pricing to every other unit in the same property. */
export async function applyUnitRateToAll(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("rate.manage");
  const unitId = str(formData, "unitId");

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId: partner.id } },
    include: { rate: true, property: { select: { id: true, currency: true, name: true } } },
  });
  if (!unit) return { error: "That unit is not on your account." };
  if (!unit.rate) return { error: "Set and save a price for this unit first, then apply it to all units." };

  const targets = await prisma.unit.findMany({
    where: { propertyId: unit.propertyId, id: { not: unit.id } },
    select: { id: true },
  });

  const data = {
    currency: unit.property.currency,
    nightlyRate: unit.rate.nightlyRate,
    weeklyRate: unit.rate.weeklyRate,
    monthlyRate: unit.rate.monthlyRate,
    annualRate: unit.rate.annualRate,
    weekendNightlyRate: unit.rate.weekendNightlyRate,
    extraGuestFee: unit.rate.extraGuestFee,
    extraGuestThreshold: unit.rate.extraGuestThreshold,
    cleaningFee: unit.rate.cleaningFee,
    serviceCharge: unit.rate.serviceCharge,
    securityDeposit: unit.rate.securityDeposit,
    minNights: unit.rate.minNights,
    maxNights: unit.rate.maxNights,
  };

  for (const target of targets) {
    await prisma.unitRate.upsert({
      where: { unitId: target.id },
      create: { unitId: target.id, ...data },
      update: data,
    });
  }

  await recalculatePropertyRate(unit.propertyId);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_RATE_APPLIED_TO_ALL",
    entityType: "Property",
    entityId: unit.propertyId,
    summary: `Pricing from ${unit.label} applied to ${targets.length} other unit(s)`,
  });

  revalidatePath(workspacePath(unit.propertyId, "pricing"));
  revalidatePath(workspacePath(unit.propertyId, "units"));
  return { success: `Pricing applied to ${targets.length} other unit${targets.length === 1 ? "" : "s"}.` };
}

// -----------------------------------------------------------------------------
// Seasonal & promotional rates
// -----------------------------------------------------------------------------

export async function createSeasonalRate(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("rate.manage");
  const unitId = str(formData, "unitId");

  const unit = await unitForPartner(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const name = str(formData, "name");
  if (!name) return { error: "Name this period, e.g. “December peak”." };

  const startDate = parseDateInput(str(formData, "startDate"));
  const endDate = parseDateInput(str(formData, "endDate"));
  if (!startDate || !endDate) return { error: "Choose a start and end date." };
  if (endDate <= startDate) return { error: "The end date must be after the start date." };

  const isPromotion = bool(formData, "isPromotion");
  if (isPromotion && !str(formData, "label")) {
    return { error: "Give the promotion a short label — it shows publicly in Special offers." };
  }

  await prisma.seasonalRate.create({
    data: {
      unitId,
      name,
      startDate,
      endDate,
      nightlyRate: money(formData, "nightlyRate"),
      weeklyRate: money(formData, "weeklyRate"),
      monthlyRate: money(formData, "monthlyRate"),
      minNights: intOr(formData, "minNights"),
      isPromotion,
      label: str(formData, "label") || null,
      priority: intOr(formData, "priority", 0) ?? 0,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "SEASONAL_RATE_CREATED",
    entityType: "Unit",
    entityId: unitId,
    summary: `${name} added to ${unit.label} (${formatDate(startDate)} – ${formatDate(endDate)})`,
  });

  revalidatePath(workspacePath(unit.propertyId, "pricing"));
  return {
    success: isPromotion
      ? `${name} saved. Because it is marked as a promotion it will also appear in the public "Special offers" collection.`
      : `${name} saved for ${unit.label}.`,
  };
}

export async function deleteSeasonalRate(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("rate.manage");
  const rateId = str(formData, "rateId");

  const rate = await prisma.seasonalRate.findFirst({
    where: { id: rateId, unit: { property: { partnerId: partner.id } } },
    include: { unit: { select: { id: true, label: true, propertyId: true } } },
  });
  if (!rate) return { error: "That seasonal rate is not on your account." };

  await prisma.seasonalRate.delete({ where: { id: rate.id } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "SEASONAL_RATE_DELETED",
    entityType: "SeasonalRate",
    entityId: rateId,
    summary: `${rate.name} removed from ${rate.unit.label}`,
  });

  revalidatePath(workspacePath(rate.unit.propertyId, "pricing"));
  return { success: `${rate.name} removed.` };
}

// -----------------------------------------------------------------------------
// Availability
// -----------------------------------------------------------------------------

export async function blockUnitDates(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("availability.manage");
  const unitId = str(formData, "unitId");

  const unit = await unitForPartner(partner.id, unitId);
  if (!unit) return { error: "That unit is not on your account." };

  const startDate = parseDateInput(str(formData, "startDate"));
  const endDate = parseDateInput(str(formData, "endDate"));
  if (!startDate || !endDate) return { error: "Choose the dates you want to block." };
  if (endDate <= startDate) return { error: "The last date must be after the first date." };

  const reason = str(formData, "reason") as BlockReason;
  if (!["MAINTENANCE", "OWNER_USE", "MANUAL_BOOKING", "OTHER"].includes(reason)) {
    return { error: "Choose why these dates are unavailable." };
  }

  if (reason !== "MANUAL_BOOKING") {
    const overlapping = await prisma.reservationUnit.findFirst({
      where: {
        unitId,
        occupiesInventory: true,
        checkIn: { lt: endDate },
        checkOut: { gt: startDate },
      },
      select: { id: true },
    });
    if (overlapping) {
      return { error: "Those dates overlap an existing booking. Booked dates are read-only — cancel the booking first." };
    }
  }

  const block = await prisma.availabilityBlock.create({
    data: {
      unitId,
      startDate,
      endDate,
      reason,
      note: str(formData, "note") || null,
      createdById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "AVAILABILITY_BLOCKED",
    entityType: "Unit",
    entityId: unitId,
    summary: `${unit.label} blocked ${formatDate(startDate)} – ${formatDate(endDate)} (${reason.toLowerCase().replace(/_/g, " ")})`,
    after: { blockId: block.id, startDate, endDate, reason },
  });

  revalidatePath(workspacePath(unit.propertyId, "availability"));
  revalidatePath("/partner/availability");
  return { success: `${formatDate(startDate)} – ${formatDate(endDate)} blocked for ${unit.label}.` };
}

export async function unblockUnitDates(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("availability.manage");
  const blockId = str(formData, "blockId");

  const block = await prisma.availabilityBlock.findFirst({
    where: { id: blockId, unit: { property: { partnerId: partner.id } } },
    include: { unit: { select: { id: true, label: true, propertyId: true } } },
  });
  if (!block) return { error: "That block is not on your account." };

  await prisma.availabilityBlock.delete({ where: { id: block.id } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "AVAILABILITY_UNBLOCKED",
    entityType: "Unit",
    entityId: block.unitId,
    summary: `${block.unit.label} released ${formatDate(block.startDate)} – ${formatDate(block.endDate)}`,
  });

  revalidatePath(workspacePath(block.unit.propertyId, "availability"));
  revalidatePath("/partner/availability");
  return { success: "Dates released — that unit is bookable again." };
}

// -----------------------------------------------------------------------------
// Manual / walk-in reservations
// -----------------------------------------------------------------------------

/**
 * Records a booking taken offline (walk-in, phone, corporate invoice).
 *
 * It deliberately goes through the same `createReservation` engine used by the
 * customer site so inventory, due diligence, commissions and settlements behave
 * identically. Payment is then marked as collected by the partner directly.
 */
export async function createManualReservation(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("reservation.manage");
  const unitId = str(formData, "unitId");

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId: partner.id } },
    include: {
      property: { select: { id: true, name: true, status: true, isActive: true, currency: true, minNights: true } },
    },
  });
  if (!unit) return { error: "That unit is not on your account." };
  if (unit.status !== "ACTIVE" || !unit.isBookable) {
    return { error: `${unit.label} is not currently bookable.` };
  }

  const checkIn = parseDateInput(str(formData, "checkIn"));
  const checkOut = parseDateInput(str(formData, "checkOut"));
  if (!checkIn || !checkOut) return { error: "Choose the arrival and departure dates." };
  if (checkOut <= checkIn) return { error: "Departure must be after arrival." };
  if (checkIn < startOfTodayUtc()) return { error: "Arrival date cannot be in the past." };

  const guestName = str(formData, "guestName");
  const guestEmail = str(formData, "guestEmail").toLowerCase();
  const guestPhone = str(formData, "guestPhone");
  if (guestName.length < 2) return { error: "Enter the guest's name." };
  if (!isEmail(guestEmail)) return { error: "Enter a valid guest email address." };

  const guests = intOr(formData, "guests", 1) ?? 1;
  if (guests > unit.maxGuests) {
    return { error: `${unit.label} sleeps a maximum of ${unit.maxGuests} guests.` };
  }

  const [firstName, ...restName] = guestName.split(" ");
  const lastName = restName.join(" ") || firstName || "Guest";

  const existingGuest = await prisma.user.findUnique({ where: { email: guestEmail } });
  const guest =
    existingGuest ??
    (await prisma.user.create({
      data: {
        email: guestEmail,
        firstName: firstName || "Guest",
        lastName,
        phone: guestPhone || null,
        passwordHash: await hashPassword(generateToken(24)),
        systemRole: "CUSTOMER",
        referralCode: `RT-${uniqueSuffix(8)}`,
        profile: { create: {} },
        notificationPrefs: { create: {} },
      },
    }));

  const result = await createReservation({
    userId: guest.id,
    propertyId: unit.property.id,
    unitIds: [unitId],
    checkIn,
    checkOut,
    guests,
    purposeOfStay: str(formData, "purposeOfStay") || "Recorded directly by the property (walk-in / phone booking)",
    specialRequests: str(formData, "note") || null,
  });

  if (!result.ok) return { error: result.error };

  await prisma.reservation.update({
    where: { id: result.reservationId },
    data: { status: "CONFIRMED", confirmedAt: new Date(), approvedById: user.id, approvedAt: new Date() },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "RESERVATION_MANUAL_CREATED",
    entityType: "Reservation",
    entityId: result.reservationId,
    summary: `${unit.label} reserved for ${guestName} (${nightsBetween(checkIn, checkOut)} nights, recorded offline)`,
    after: { reference: result.reference, unitId, checkIn, checkOut, guests },
  });

  await notify({
    userId: guest.id,
    type: "BOOKING_CONFIRMED",
    title: `Your stay at ${unit.property.name} is confirmed`,
    body: `${formatDate(checkIn)} – ${formatDate(checkOut)}. Reference ${result.reference}.`,
    channels: ["IN_APP"],
    data: { reservationId: result.reservationId },
  });

  revalidatePath(workspacePath(unit.propertyId, "availability"));
  revalidatePath("/partner/availability");
  revalidatePath("/partner/reservations");

  if (str(formData, "redirectToWorkspace") === "1") {
    redirect(workspacePath(unit.propertyId, "availability"));
  }
  return { success: `Booking ${result.reference} recorded for ${guestName}.` };
}

// -----------------------------------------------------------------------------
// Reviews
// -----------------------------------------------------------------------------

export async function respondToReview(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("property.update");
  const reviewId = str(formData, "reviewId");
  const response = str(formData, "response");

  if (response.length < 10) return { error: "Write a short, useful reply to the guest." };

  const review = await prisma.review.findFirst({
    where: { id: reviewId, property: { partnerId: partner.id } },
    select: { id: true, propertyId: true },
  });
  if (!review) return { error: "That review is not on your account." };

  await prisma.review.update({
    where: { id: review.id },
    data: { partnerResponse: response, respondedAt: new Date(), respondedById: user.id },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "REVIEW_RESPONDED",
    entityType: "Review",
    entityId: review.id,
    summary: "Partner replied to a guest review",
  });

  revalidatePath(workspacePath(review.propertyId, "reviews"));
  return { success: "Your response is published alongside the review." };
}

export type { RoomCategory };

export async function calendarForUnit(unitId: string, from: Date, to: Date) {
  return getUnitCalendar(unitId, from, to);
}

export { addDays };
