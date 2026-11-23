"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { isUnitAvailable } from "@/lib/availability";
import { notify } from "@/lib/notifications";
import { startReservationPayment } from "@/lib/payments/booking";
import { createReservation, evaluateBookingRules, quoteBooking } from "@/lib/reservations";
import type { Quote } from "@/lib/pricing";
import { describeDuration, nightsBetween, parseDateInput } from "@/lib/dates";

/**
 * Customer booking actions.
 *
 * These are deliberately thin: every business rule lives in `@/lib/*` so the
 * same behaviour is guaranteed whether it is triggered from the website, the
 * customer portal or (later) a mobile client.
 */

export type BookingActionState = { error?: string; success?: string } | null;

async function siteOrigin() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
// -----------------------------------------------------------------------------
// Favourites
// -----------------------------------------------------------------------------

export async function toggleFavourite(
  _state: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to save this property." };
  if (!propertyId) return { error: "That property could not be found." };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, status: "APPROVED", isActive: true },
    select: { id: true, slug: true, name: true },
  });
  if (!property) return { error: "That property is no longer listed." };

  const existing = await prisma.savedProperty.findUnique({
    where: { userId_propertyId: { userId: user.id, propertyId: property.id } },
    select: { id: true },
  });

  if (existing) {
    await prisma.savedProperty.delete({ where: { id: existing.id } });
    revalidatePath(`/properties/${property.slug}`);
    if (returnTo.startsWith("/")) revalidatePath(returnTo);
    return { success: "Removed from your saved properties." };
  }

  await prisma.savedProperty.create({ data: { userId: user.id, propertyId: property.id } });
  revalidatePath(`/properties/${property.slug}`);
  if (returnTo.startsWith("/")) revalidatePath(returnTo);
  return { success: `Saved ${property.name} to your favourites.` };
}

// -----------------------------------------------------------------------------
// Live quote preview
// -----------------------------------------------------------------------------

export type StayPreviewInput = {
  propertyId: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  promotionCode?: string | null;
};

export type StayPreview =
  | {
      ok: true;
      available: boolean;
      nights: number;
      durationLabel: string;
      minNights: number;
      maxNights: number | null;
      issues: string[];
      quote: Quote;
      dueDiligence: {
        required: boolean;
        mandatory: boolean;
        message: string;
        verificationTypes: string[];
        chargeMinor: number;
      };
    }
  | { ok: false; error: string };

/**
 * Prices a stay without persisting anything. Called by the booking widget every
 * time dates, guests or unit change so the guest always sees a real figure.
 *
 * Accepts either a `FormData` submission (works without JavaScript) or the
 * equivalent plain object (used by the live preview in the booking widget).
 */
export async function previewStay(input: StayPreviewInput | FormData): Promise<StayPreview> {
  const request: StayPreviewInput =
    input instanceof FormData
      ? {
          propertyId: String(input.get("propertyId") ?? ""),
          unitId: String(input.get("unitId") ?? ""),
          checkIn: String(input.get("checkIn") ?? ""),
          checkOut: String(input.get("checkOut") ?? ""),
          guests: Number(input.get("guests") ?? 1),
          promotionCode: String(input.get("promotionCode") ?? "") || null,
        }
      : input;

  if (!request.propertyId) return { ok: false, error: "This property is not currently available." };
  if (!request.unitId) return { ok: false, error: "Choose one of the available rooms or apartments." };

  const property = await prisma.property.findFirst({
    where: { id: request.propertyId, status: "APPROVED", isActive: true },
    include: { partner: true },
  });
  if (!property) return { ok: false, error: "This property is not currently available." };

  const checkIn = parseDateInput(request.checkIn);
  const checkOut = parseDateInput(request.checkOut);
  if (!checkIn || !checkOut) return { ok: false, error: "Choose a valid check-in and check-out date." };
  if (checkOut <= checkIn) return { ok: false, error: "Check-out must be after check-in." };

  const unit = await prisma.unit.findFirst({
    where: { id: request.unitId, propertyId: property.id, isBookable: true },
    select: { id: true, label: true, maxGuests: true, status: true, rate: true },
  });
  if (!unit) return { ok: false, error: "Choose one of the available rooms or apartments." };

  const guests = Math.max(1, Math.trunc(request.guests) || 1);
  const available = await isUnitAvailable(unit.id, checkIn, checkOut);
  const nights = nightsBetween(checkIn, checkOut);

  const issues = evaluateBookingRules({
    property,
    checkIn,
    checkOut,
    unitMinNights: unit.rate?.minNights ?? null,
    unitMaxNights: unit.rate?.maxNights ?? null,
    availableUnitCount: available ? 1 : 0,
    guestCapacity: unit.maxGuests,
    guests,
  }).map((issue) => issue.message);

  const context = await quoteBooking({
    property,
    unitIds: [unit.id],
    checkIn,
    checkOut,
    guests,
    promotionCode: input instanceof FormData ? input.get("promotionCode") as string | null : input.promotionCode ?? null,
  });

  return {
    ok: true,
    available,
    nights,
    durationLabel: describeDuration(nights),
    minNights: Math.max(property.minNights, unit.rate?.minNights ?? 1),
    maxNights: unit.rate?.maxNights ?? property.maxNights ?? null,
    issues,
    quote: context.quote,
    dueDiligence: {
      required: context.dueDiligence.required,
      mandatory: context.dueDiligence.mandatory,
      message: context.dueDiligence.message,
      verificationTypes: context.dueDiligence.verificationTypes,
      chargeMinor: context.dueDiligence.chargeMinor,
    },
  };
}

// -----------------------------------------------------------------------------
// Reserve
// -----------------------------------------------------------------------------

export async function startBooking(
  _state: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const propertySlug = String(formData.get("propertySlug") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  const promotionCode = String(formData.get("promotionCode") ?? "").trim() || null;
  const purposeOfStay = String(formData.get("purposeOfStay") ?? "").trim() || null;
  const specialRequests = String(formData.get("specialRequests") ?? "").trim() || null;

  if (!propertySlug) return { error: "Missing property reference." };
  if (!unitId) return { error: "Choose the room or apartment you want to stay in." };

  const checkIn = parseDateInput(String(formData.get("checkIn") ?? ""));
  const checkOut = parseDateInput(String(formData.get("checkOut") ?? ""));
  if (!checkIn || !checkOut) return { error: "Choose a valid check-in and check-out date." };
  if (checkOut <= checkIn) return { error: "Check-out must be after check-in." };

  const guests = Math.max(1, Number(formData.get("guests") ?? 1) || 1);
  const adults = Math.max(1, Number(formData.get("adults") ?? guests) || guests);
  const children = Math.max(0, Number(formData.get("children") ?? 0) || 0);

  const paymentOptionRaw = String(formData.get("paymentOption") ?? "PAY_NOW");
  const paymentOption = paymentOptionRaw === "PAY_LATER" ? "PAY_LATER" : "PAY_NOW";

  const property = await prisma.property.findFirst({
    where: { slug: propertySlug, status: "APPROVED", isActive: true },
    select: { id: true, name: true, slug: true, allowPayLater: true, unpaidHoldDays: true },
  });
  if (!property) return { error: "This property is not currently accepting bookings." };

  // Must happen before any inventory work so the guest returns to the property.
  const user = await requireUser(`/properties/${property.slug}`);

  const result = await createReservation({
    userId: user.id,
    propertyId: property.id,
    unitIds: [unitId],
    checkIn,
    checkOut,
    guests,
    adults,
    children,
    promotionCode,
    purposeOfStay,
    specialRequests,
    paymentOption,
  });

  if (!result.ok) return { error: result.error };

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "RESERVATION_REQUESTED",
    entityType: "Reservation",
    entityId: result.reservationId,
    summary: `${property.name} · ${describeDuration(result.quote.nights)} · ${guests} guest(s)`,
    after: { reference: result.reference, grossAmount: result.quote.grossAmount },
  });

  await notify({
    userId: user.id,
    type: "BOOKING_REQUESTED",
    title: `Reservation ${result.reference} received`,
    body:
      paymentOption === "PAY_LATER" && property.allowPayLater
        ? `Your dates at ${property.name} are reserved. Complete payment before the hold expires to keep this booking.`
        : `We are holding your accommodation at ${property.name} while you complete payment.`,
    channels: ["IN_APP"],
    data: { reservationId: result.reservationId },
  });

  revalidatePath(`/properties/${property.slug}`);
  redirect(`/checkout/${result.reference}`);
}

// -----------------------------------------------------------------------------
// Pay
// -----------------------------------------------------------------------------

export async function payForBooking(
  _state: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const reference = String(formData.get("reference") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const specialRequests = String(formData.get("specialRequests") ?? "").trim() || null;

  if (!reference) return { error: "Missing booking reference." };

  const user = await requireUser(`/checkout/${reference}`);

  const reservation = await prisma.reservation.findUnique({
    where: { reference },
    include: { property: { select: { id: true, name: true, slug: true } } },
  });

  if (!reservation || reservation.userId !== user.id) return { error: "We could not find that booking." };
  if (reservation.status === "PENDING_APPROVAL") {
    return { error: "This stay requires approval from the property partner before payment." };
  }
  if (reservation.status !== "PENDING_PAYMENT") {
    return { error: "This booking is not awaiting payment." };
  }

  if (phone && !user.phone) {
    await prisma.user.update({ where: { id: user.id }, data: { phone } });
  }
  if (specialRequests && specialRequests !== reservation.specialRequests) {
    await prisma.reservation.update({ where: { id: reservation.id }, data: { specialRequests } });
  }

  const origin = await siteOrigin();
  const result = await startReservationPayment({
    reservationId: reservation.id,
    userId: user.id,
    email: user.email,
    callbackUrl: `${origin}/booking/${reference}/confirmation`,
  });

  if (!result.ok) return { error: result.error };

  redirect(result.authorizationUrl);
}
