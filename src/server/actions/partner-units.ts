"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AvailabilityBlock, RoomCategory, Unit } from "@prisma/client";

import { prisma } from "@/lib/db";
import { createReservation } from "@/lib/reservations";
import {
  requirePartnerContext,
  requirePartnerPermission,
} from "@/lib/auth/session";
import { addPropertyMedia } from "@/server/actions/partner-properties";
import {
  approveReservation,
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  declineReservation,
} from "@/lib/reservations";
import type { PartnerActionState } from "@/components/partner/action-state";
import { recordAudit } from "@/lib/audit";
import { formatDate, parseDateInput } from "@/lib/dates";
import { generateToken, hashPassword } from "@/lib/auth/session";
import { uniqueSuffix } from "@/lib/utils";

/* --------------------------------------------------------------------------
   Form parsing + ownership helpers
   -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isEmail(value: string) {
  return EMAIL_RE.test(value);
}

function str(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function intOr(formData: FormData, name: string, fallback?: number): number | null {
  const raw = str(formData, name);
  if (raw.length === 0) return fallback ?? null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : (fallback ?? null);
}

function floatOr(formData: FormData, name: string, fallback?: number): number | null {
  const raw = str(formData, name);
  if (raw.length === 0) return fallback ?? null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : (fallback ?? null);
}

function bool(formData: FormData, name: string): boolean {
  const value = str(formData, name).toLowerCase();
  return value === "true" || value === "on" || value === "1" || value === "yes";
}

/** Loads a property only when it belongs to the acting partner. */
async function ownedProperty(partnerId: string, propertyId: string) {
  return prisma.property.findFirst({
    where: { id: propertyId, partnerId },
    select: { id: true, name: true, currency: true, partnerId: true },
  });
}

/**
 * `RoomCategory` rows never appear in this file. They were a design detour: a
 * category is only ever a label that groups units, and RentOps keeps those
 * labels inline on the unit itself (`Unit.unitNumber`). Everything below is the
 * single source of truth for what a partner can do to one unit.
 */
export type UnitRow = Unit & { property: { id: string; name: string; currency: string } };

export async function listUnitsForPartner(partnerId: string, propertyId?: string) {
  return prisma.unit.findMany({
    where: { property: { partnerId }, ...(propertyId ? { propertyId } : {}) },
    include: { property: { select: { id: true, name: true, currency: true } } },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
}

export async function saveUnitBasics(input: {
  partnerId: string;
  propertyId: string;
  unitId?: string;
  label: string;
  unitNumber?: string | null;
  floor?: string | null;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds?: string | null;
  sizeSqm?: number | null;
  status: Unit["status"];
  isBookable: boolean;
  sortOrder: number;
}): Promise<UnitRow> {
  const property = await ownedProperty(input.partnerId, input.propertyId);
  if (!property) throw new Error("PROPERTY_NOT_FOUND");

  const data = {
    label: input.label,
    unitNumber: input.unitNumber ?? null,
    floor: input.floor ?? null,
    maxGuests: input.maxGuests,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    beds: input.beds ?? null,
    sizeSqm: input.sizeSqm ?? null,
    status: input.status,
    isBookable: input.isBookable,
    sortOrder: input.sortOrder,
  };

  if (input.unitId) {
    const existing = await prisma.unit.findFirst({
      where: { id: input.unitId, propertyId: input.propertyId, property: { partnerId: input.partnerId } },
    });
    if (!existing) throw new Error("UNIT_NOT_FOUND");
    return prisma.unit.update({
      where: { id: input.unitId },
      data,
      include: { property: { select: { id: true, name: true, currency: true } } },
    });
  }

  return prisma.unit.create({
    data: { ...data, propertyId: input.propertyId },
    include: { property: { select: { id: true, name: true, currency: true } } },
  });
}

/**
 * Creates a run of identical units ("Deluxe King 1" … "Deluxe King 12").
 *
 * A shortlet owner with one apartment uses `quantity` 1; a hotel generates the
 * whole floor. Inventory counts always match reality because every unit is a row.
 */
export async function generateUnits(input: {
  partnerId: string;
  propertyId: string;
  labelPrefix: string;
  quantity: number;
  unitNumberPrefix?: string | null;
  floor?: string | null;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds?: string | null;
  sizeSqm?: number | null;
  startingIndex?: number;
}): Promise<{ created: number; skipped: number }> {
  const property = await ownedProperty(input.partnerId, input.propertyId);
  if (!property) throw new Error("PROPERTY_NOT_FOUND");

  const existing = await prisma.unit.findMany({
    where: { propertyId: input.propertyId },
    select: { label: true },
  });
  const taken = new Set(existing.map((unit) => unit.label.toLowerCase()));
  const start = input.startingIndex ?? 1;

  let created = 0;
  let skipped = 0;

  for (let index = start; index < start + input.quantity; index += 1) {
    const label = `${input.labelPrefix} ${index}`;
    if (taken.has(label.toLowerCase())) {
      skipped += 1;
      continue;
    }
    await prisma.unit.create({
      data: {
        propertyId: input.propertyId,
        label,
        unitNumber: input.unitNumberPrefix ? `${input.unitNumberPrefix}${index}` : String(index),
        floor: input.floor ?? null,
        maxGuests: input.maxGuests,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        beds: input.beds ?? null,
        sizeSqm: input.sizeSqm ?? null,
        sortOrder: index,
      },
    });
    created += 1;
  }

  return { created, skipped };
}

export async function setUnitStatus(
  partnerId: string,
  unitId: string,
  status: Unit["status"],
  isBookable: boolean,
): Promise<UnitRow | null> {
  const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { partnerId } } });
  if (!unit) return null;
  return prisma.unit.update({
    where: { id: unitId },
    data: { status, isBookable },
    include: { property: { select: { id: true, name: true, currency: true } } },
  });
}

export async function deleteUnit(partnerId: string, unitId: string): Promise<"DELETED" | "HAS_BOOKINGS" | "NOT_FOUND"> {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId } },
    include: { _count: { select: { reservationUnits: true } } },
  });
  if (!unit) return "NOT_FOUND";
  if (unit._count.reservationUnits > 0) return "HAS_BOOKINGS";

  await prisma.$transaction([
    prisma.seasonalRate.deleteMany({ where: { unitId } }),
    prisma.unitRate.deleteMany({ where: { unitId } }),
    prisma.availabilityBlock.deleteMany({ where: { unitId } }),
    prisma.unit.delete({ where: { id: unitId } }),
  ]);
  return "DELETED";
}

// -----------------------------------------------------------------------------
// Availability
// -----------------------------------------------------------------------------

export type BlockDraft = { startDate: Date; endDate: Date; reason: AvailabilityBlock["reason"]; note?: string };

export async function replaceBlocks(
  partnerId: string,
  unitId: string,
  blocks: BlockDraft[],
  createdById?: string,
): Promise<number> {
  const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { partnerId } } });
  if (!unit) throw new Error("UNIT_NOT_FOUND");

  await prisma.availabilityBlock.deleteMany({ where: { unitId } });
  if (blocks.length === 0) return 0;

  const result = await prisma.availabilityBlock.createMany({
    data: blocks.map((block) => ({
      unitId,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
      note: block.note ?? null,
      createdById: createdById ?? null,
    })),
  });
  return result.count;
}

export async function addBlock(
  partnerId: string,
  unitId: string,
  block: BlockDraft,
  createdById?: string,
): Promise<AvailabilityBlock | null> {
  const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { partnerId } } });
  if (!unit) return null;
  return prisma.availabilityBlock.create({
    data: {
      unitId,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
      note: block.note ?? null,
      createdById: createdById ?? null,
    },
  });
}

export async function clearBlock(partnerId: string, blockId: string): Promise<boolean> {
  const block = await prisma.availabilityBlock.findFirst({
    where: { id: blockId, unit: { property: { partnerId } } },
  });
  if (!block) return false;
  await prisma.availabilityBlock.delete({ where: { id: blockId } });
  return true;
}

export async function findBlock(partnerId: string, blockId: string) {
  return prisma.availabilityBlock.findFirst({
    where: { id: blockId, unit: { property: { partnerId } } },
  });
}

export async function firstUnit(partnerId: string, propertyId?: string): Promise<UnitRow | null> {
  return prisma.unit.findFirst({
    where: { property: { partnerId }, ...(propertyId ? { propertyId } : {}) },
    include: { property: { select: { id: true, name: true, currency: true } } },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
}

// -----------------------------------------------------------------------------
// Server actions (thin wrappers used by forms)
// -----------------------------------------------------------------------------

export async function createUnitAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const propertyId = str(formData, "propertyId");
  const label = str(formData, "label");

  if (!label) return { error: "Give this unit a name guests will recognise." };

  const maxGuests = intOr(formData, "maxGuests", 2) ?? 2;
  if (maxGuests < 1) return { error: "The unit must sleep at least one guest." };

  try {
    const unit = await saveUnitBasics({
      partnerId: partner.id,
      propertyId,
      label,
      unitNumber: str(formData, "unitNumber") || null,
      floor: str(formData, "floor") || null,
      maxGuests,
      bedrooms: intOr(formData, "bedrooms", 1) ?? 1,
      bathrooms: intOr(formData, "bathrooms", 1) ?? 1,
      beds: str(formData, "beds") || null,
      sizeSqm: floatOr(formData, "sizeSqm"),
      status: (str(formData, "status") || "ACTIVE") as Unit["status"],
      isBookable: bool(formData, "isBookable"),
      sortOrder: intOr(formData, "sortOrder", 0) ?? 0,
    });

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "UNIT_CREATED",
      entityType: "Unit",
      entityId: unit.id,
      summary: `${unit.label} added to ${unit.property.name}`,
    });

    revalidatePath(`/partner/properties/${propertyId}?tab=units` as "/partner/properties/[id]");
    return { success: `${unit.label} added.` };
  } catch {
    return { error: "That unit name already exists on this property." };
  }
}

export async function generateUnitsAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const propertyId = str(formData, "propertyId");
  const labelPrefix = str(formData, "labelPrefix");
  const quantity = intOr(formData, "quantity", 1) ?? 1;

  if (!labelPrefix) return { error: "Name the units you are creating." };
  if (quantity < 1) return { error: "Generate at least one unit." };
  if (quantity > 200) return { error: "Generate at most 200 units at a time." };

  const { created, skipped } = await generateUnits({
    partnerId: partner.id,
    propertyId,
    labelPrefix,
    quantity,
    unitNumberPrefix: str(formData, "unitNumberPrefix") || null,
    floor: str(formData, "floor") || null,
    maxGuests: intOr(formData, "maxGuests", 2) ?? 2,
    bedrooms: intOr(formData, "bedrooms", 1) ?? 1,
    bathrooms: intOr(formData, "bathrooms", 1) ?? 1,
    beds: str(formData, "beds") || null,
    sizeSqm: floatOr(formData, "sizeSqm"),
  });

  if (created === 0) {
    return { error: "Those unit names already exist. Start from a higher number." };
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNITS_GENERATED",
    entityType: "Property",
    entityId: propertyId,
    summary: `Generated ${created} units “${labelPrefix}”`,
  });

  revalidatePath(`/partner/properties/${propertyId}?tab=units` as "/partner/properties/[id]");
  return {
    success: `Created ${created} unit${created === 1 ? "" : "s"}${skipped > 0 ? `, skipped ${skipped} duplicate name${skipped === 1 ? "" : "s"}` : ""}. Set prices for each one in Pricing.`,
  };
}

export async function updateUnitAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId: partner.id } },
  });
  if (!unit) return { error: "That unit is not on your account." };

  const status = str(formData, "status") as Unit["status"];
  if (!["ACTIVE", "MAINTENANCE", "BLOCKED", "INACTIVE"].includes(status)) {
    return { error: "Choose a valid unit status." };
  }

  const isBookable = bool(formData, "isBookable");
  const maxGuests = intOr(formData, "maxGuests", unit.maxGuests) ?? unit.maxGuests;
  if (maxGuests < 1) return { error: "The unit must sleep at least one guest." };

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      label: str(formData, "label") || unit.label,
      unitNumber: str(formData, "unitNumber") || null,
      floor: str(formData, "floor") || null,
      maxGuests,
      bedrooms: intOr(formData, "bedrooms", unit.bedrooms) ?? unit.bedrooms,
      bathrooms: intOr(formData, "bathrooms", unit.bathrooms) ?? unit.bathrooms,
      beds: str(formData, "beds") || null,
      sizeSqm: floatOr(formData, "sizeSqm"),
      status,
      isBookable,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_UPDATED",
    entityType: "Unit",
    entityId: unitId,
    summary: `${unit.label} updated (${status.toLowerCase()}${isBookable ? ", bookable" : ", not bookable"})`,
  });

  revalidatePath(`/partner/properties/${unit.propertyId}?tab=units` as "/partner/properties/[id]");
  return { success: `${unit.label} updated.` };
}

export async function deleteUnitAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("unit.manage");
  const unitId = str(formData, "unitId");

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId: partner.id } },
    include: { _count: { select: { reservationUnits: true } } },
  });
  if (!unit) return { error: "That unit is not on your account." };
  if (unit._count.reservationUnits > 0) {
    return {
      error: `${unit.label} already has reservations attached. Set it to Inactive instead so history is preserved.`,
    };
  }

  await prisma.unit.delete({ where: { id: unitId } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "UNIT_DELETED",
    entityType: "Unit",
    entityId: unitId,
    summary: `${unit.label} deleted`,
  });

  revalidatePath(`/partner/properties/${unit.propertyId}?tab=units` as "/partner/properties/[id]");
  return { success: `${unit.label} deleted.` };
}

export async function blockDatesAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("availability.manage");
  const unitId = str(formData, "unitId");

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId: partner.id } },
    include: { property: { select: { id: true, name: true } } },
  });
  if (!unit) return { error: "That unit is not on your account." };

  const startDate = parseDateInput(str(formData, "startDate"));
  const endDate = parseDateInput(str(formData, "endDate"));
  if (!startDate || !endDate) return { error: "Choose both a start and an end date." };
  if (endDate <= startDate) return { error: "The end date must be after the start date." };

  const reason = (str(formData, "reason") || "OTHER") as BlockDraft["reason"];
  if (!["MAINTENANCE", "OWNER_USE", "MANUAL_BOOKING", "OTHER"].includes(reason)) {
    return { error: "Choose why these dates are being blocked." };
  }

  const clash = await prisma.reservationUnit.findFirst({
    where: {
      unitId,
      occupiesInventory: true,
      checkIn: { lt: endDate },
      checkOut: { gt: startDate },
    },
    select: { id: true },
  });
  if (clash) {
    return { error: "Those dates include a booking. Cancel the reservation first if you need the space." };
  }

  await addBlock(
    partner.id,
    unitId,
    { startDate, endDate, reason, note: str(formData, "note") || undefined },
    user.id,
  );

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "AVAILABILITY_BLOCKED",
    entityType: "Unit",
    entityId: unitId,
    summary: `${unit.label} blocked ${formatDate(startDate)} → ${formatDate(endDate)} (${reason.toLowerCase().replace("_", " ")})`,
  });

  revalidatePath("/partner/availability");
  revalidatePath(`/partner/properties/${unit.property.id}?tab=availability` as "/partner/properties/[id]");
  return { success: "Dates blocked." };
}

export async function unblockDatesAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("availability.manage");
  const blockId = str(formData, "blockId");

  const block = await prisma.availabilityBlock.findFirst({
    where: { id: blockId, unit: { property: { partnerId: partner.id } } },
    include: { unit: { select: { label: true, propertyId: true } } },
  });
  if (!block) return { error: "That block is not on your account." };

  await prisma.availabilityBlock.delete({ where: { id: blockId } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "AVAILABILITY_UNBLOCKED",
    entityType: "AvailabilityBlock",
    entityId: blockId,
    summary: `${block.unit.label} released ${formatDate(block.startDate)} → ${formatDate(block.endDate)}`,
  });

  revalidatePath("/partner/availability");
  revalidatePath(`/partner/properties/${block.unit.propertyId}?tab=availability` as "/partner/properties/[id]");
  return { success: "Dates released — the unit is bookable again." };
}

/**
 * Walk-in / phone booking recorded straight into the booking pipeline.
 *
 * Deliberately uses the same `createReservation` engine as the customer site so
 * an offline booking behaves exactly like an online one: inventory, due
 * diligence, pricing and settlement all apply. It lands as CONFIRMED because the
 * partner took payment themselves.
 */
export async function createManualReservationAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("reservation.manage");
  const unitId = str(formData, "unitId");

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId: partner.id } },
    include: { property: { select: { id: true, name: true, status: true, isActive: true } } },
  });
  if (!unit) return { error: "That unit is not on your account." };

  const checkIn = parseDateInput(str(formData, "checkIn"));
  const checkOut = parseDateInput(str(formData, "checkOut"));
  if (!checkIn || !checkOut) return { error: "Choose check-in and check-out dates." };
  if (checkOut <= checkIn) return { error: "Check-out must be after check-in." };

  const guests = intOr(formData, "guests", 1) ?? 1;
  const guestName = str(formData, "guestName");
  const guestEmail = str(formData, "guestEmail").toLowerCase();
  const guestPhone = str(formData, "guestPhone");

  if (guestName.length < 2) return { error: "Enter the guest's name." };
  if (!isEmail(guestEmail)) return { error: "Enter a valid email address for the guest." };

  const result = await createReservationForPartner({
    partnerId: partner.id,
    propertyId: unit.property.id,
    unitIds: [unitId],
    userId: null,
    guest: { name: guestName, email: guestEmail, phone: guestPhone || null },
    checkIn,
    checkOut,
    guests,
    note: str(formData, "note") || null,
    actorId: user.id,
  });

  if (!result.ok) return { error: result.error };
  return { success: `Booking ${result.reference} recorded for ${guestName}.` };
}

export async function createReservationForPartner(input: {
  partnerId: string;
  propertyId: string;
  unitIds: string[];
  userId: string | null;
  guest: { name: string; email: string; phone: string | null };
  checkIn: Date;
  checkOut: Date;
  guests: number;
  note?: string | null;
  actorId: string;
}): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, partnerId: input.partnerId },
    include: { partner: true },
  });
  if (!property) return { ok: false, error: "That property is not on your account." };

  const [firstName, ...rest] = input.guest.name.split(" ");
  const lastName = rest.join(" ") || firstName || "Guest";

  const user =
    input.userId != null
      ? await prisma.user.findUnique({ where: { id: input.userId } })
      : await prisma.user.findUnique({ where: { email: input.guest.email } });

  const guestUser =
    user ??
    (await prisma.user.create({
      data: {
        email: input.guest.email,
        firstName: firstName || "Guest",
        lastName: lastName || "Guest",
        phone: input.guest.phone,
        // A placeholder hash: the guest activates the account from the
        // invitation RentOps sends, never through a guessable password.
        passwordHash: await hashPassword(generateToken(24)),
        systemRole: "CUSTOMER",
        referralCode: `RT-${uniqueSuffix(8)}`,
        profile: { create: {} },
        notificationPrefs: { create: {} },
      },
    }));

  const created = await createReservation({
    userId: guestUser.id,
    propertyId: property.id,
    unitIds: input.unitIds,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    purposeOfStay: "Recorded by partner (walk-in / phone booking)",
    specialRequests: input.note ?? null,
  });

  if (!created.ok) return { ok: false, error: created.error };

  const status = property.bookingMode === "APPROVAL" ? ("PENDING_APPROVAL" as const) : ("PENDING_PAYMENT" as const);
  await prisma.reservation.update({
    where: { id: created.reservationId },
    data: { status, bookingMode: property.bookingMode },
  });

  await recordAudit({
    actorId: input.actorId,
    action: "PARTNER_MANUAL_RESERVATION",
    entityType: "Reservation",
    entityId: created.reservationId,
    summary: `Walk-in booking ${created.reference} recorded by partner`,
  });

  return { ok: true, reference: created.reference };
}

export const UnitMediaAction = addPropertyMedia;

export async function approveReservationAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { user } = await requirePartnerContext();
  const reference = str(formData, "reference");
  const reservation = await reservationForPartner((await requirePartnerContext()).partner.id, reference);
  if (!reservation) return { error: "RESERVATION_NOT_FOUND" };
  if (reservation.status !== "PENDING_APPROVAL") return { error: "RESERVATION_NOT_PENDING" };
  await approveReservation(reservation.id, user.id);
  return { success: "Approved" };
}

export async function declineReservationAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { user } = await requirePartnerContext();
  const reference = str(formData, "reference");
  const reason = str(formData, "reason");
  const reservation = await reservationForPartner((await requirePartnerContext()).partner.id, reference);
  if (!reservation) return { error: "RESERVATION_NOT_FOUND" };
  await declineReservation(reservation.id, user.id, reason || undefined);
  return { success: "Declined" };
}

export async function checkInAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { user } = await requirePartnerContext();
  const reference = str(formData, "reference");
  const reservation = await reservationForPartner((await requirePartnerContext()).partner.id, reference);
  if (!reservation) return { error: "RESERVATION_NOT_FOUND" };
  await checkInReservation(reservation.id, user.id);
  return { success: "Checked in" };
}

export async function checkOutAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { user } = await requirePartnerContext();
  const reference = str(formData, "reference");
  const reservation = await reservationForPartner((await requirePartnerContext()).partner.id, reference);
  if (!reservation) return { error: "RESERVATION_NOT_FOUND" };
  await checkOutReservation(reservation.id, user.id);
  return { success: "Checked out" };
}

export async function cancelReservationAction(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { user } = await requirePartnerContext();
  const reference = str(formData, "reference");
  const reason = str(formData, "reason");
  const reservation = await reservationForPartner((await requirePartnerContext()).partner.id, reference);
  if (!reservation) return { error: "RESERVATION_NOT_FOUND" };
  await cancelReservation({ reservationId: reservation.id, actorId: user.id, reason });
  return { success: "Cancelled" };
}

async function reservationForPartner(partnerId: string, reference: string) {
  return prisma.reservation.findFirst({
    where: { reference, property: { partnerId } },
  });
}

/** Re-export so partner pages only ever import from one partner module. */
export { createReservation };
export type { RoomCategory };
