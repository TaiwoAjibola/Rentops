import type { CancellationPolicy, Partner, Prisma, Property, RateBasis } from "@prisma/client";

import { prisma } from "@/lib/db";
import { addDays, nightsBetween, startOfTodayUtc, utcDayOfWeek } from "@/lib/dates";
import { buildQuote, computeExtraGuestCharges, computeUnitStay, type AppliedFeeLine, type Quote, type SeasonalRateInput, type UnitRateInput, type UnitStayResult } from "@/lib/pricing";
import { evaluateDueDiligence, type DueDiligenceOutcome } from "@/lib/due-diligence";
import { getFinancialConfig, getPartnerCommissionRate } from "@/lib/settings";
import { reservationReference as makeReference } from "@/lib/reference";
import { RESERVATION_HOLD_MINUTES, SETTLEMENT_HOLD_DEFAULT_DAYS } from "@/lib/constants";
import { prismaExclusionViolation } from "@/lib/db-errors";

/**
 * Booking & leasing engine.
 *
 * Short stays and long leases run through exactly the same pipeline: the only
 * difference is the value of (checkIn, checkOut). Everything downstream —
 * pricing, inventory, due diligence, payment, settlement — is duration-agnostic.
 */

export const APPROVAL_WINDOW_HOURS = 24;

// -----------------------------------------------------------------------------
// Booking rules
// -----------------------------------------------------------------------------

export type BookingRuleIssue = {
  code:
    | "MIN_NIGHTS"
    | "MAX_NIGHTS"
    | "NOTICE"
    | "ADVANCE_WINDOW"
    | "CHECK_IN_DAY"
    | "NO_UNITS"
    | "UNIT_UNAVAILABLE"
    | "PROPERTY_NOT_BOOKABLE"
    | "CAPACITY";
  message: string;
};

export function evaluateBookingRules(options: {
  property: Pick<
    Property,
    | "minNights"
    | "maxNights"
    | "minNoticeHours"
    | "advanceBookingDays"
    | "acceptedCheckInDays"
    | "instantBooking"
    | "bookingMode"
  >;
  checkIn: Date;
  checkOut: Date;
  unitMinNights?: number | null;
  unitMaxNights?: number | null;
  availableUnitCount?: number;
  guestCapacity?: number;
  guests?: number;
  now?: Date;
}): BookingRuleIssue[] {
  const issues: BookingRuleIssue[] = [];
  const now = options.now ?? new Date();
  const nights = nightsBetween(options.checkIn, options.checkOut);
  const { property } = options;

  if (nights <= 0) {
    issues.push({ code: "MIN_NIGHTS", message: "Check-out must be after check-in." });
    return issues;
  }

  const effectiveMin = Math.max(property.minNights ?? 1, options.unitMinNights ?? 1);
  if (nights < effectiveMin) {
    issues.push({
      code: "MIN_NIGHTS",
      message: `This property requires a minimum stay of ${effectiveMin} night${effectiveMin === 1 ? "" : "s"}.`,
    });
  }

  const configuredMax = options.unitMaxNights ?? property.maxNights ?? null;
  if (configuredMax != null && nights > configuredMax) {
    issues.push({
      code: "MAX_NIGHTS",
      message: `This property accepts stays up to ${configuredMax} nights.`,
    });
  }

  const noticeHours = property.minNoticeHours ?? 0;
  if (noticeHours > 0) {
    const earliest = new Date(now.getTime() + noticeHours * 3_600_000);
    if (options.checkIn < earliest) {
      issues.push({
        code: "NOTICE",
        message: `This property requires ${noticeHours} hours notice before check-in.`,
      });
    }
  }

  const windowDays = property.advanceBookingDays ?? 365;
  const latest = addDays(startOfTodayUtc(), windowDays);
  if (options.checkIn > latest) {
    issues.push({
      code: "ADVANCE_WINDOW",
      message: `This property accepts bookings up to ${windowDays} days in advance.`,
    });
  }

  if (property.acceptedCheckInDays) {
    const accepted = property.acceptedCheckInDays.split(",").map((value) => Number(value.trim()));
    const day = utcDayOfWeek(options.checkIn);
    if (accepted.length > 0 && !accepted.includes(day)) {
      issues.push({
        code: "CHECK_IN_DAY",
        message: "Check-in on the selected day is not accepted by this property.",
      });
    }
  }

  if (options.availableUnitCount === 0) {
    issues.push({ code: "NO_UNITS", message: "No accommodation is available for the selected dates." });
  }

  if (options.guests != null && options.guestCapacity != null && options.guests > options.guestCapacity) {
    issues.push({
      code: "CAPACITY",
      message: `Maximum occupancy is ${options.guestCapacity} guests.`,
    });
  }

  return issues;
}

// -----------------------------------------------------------------------------
// Quoting
// -----------------------------------------------------------------------------

export type QuoteContext = {
  quote: Quote;
  stays: UnitStayResult[];
  dueDiligence: DueDiligenceOutcome;
  property: Property & { partner: Partner };
  units: { id: string; label: string; maxGuests: number }[];
};

/** Builds a price for concrete units and dates without persisting anything. */
export async function quoteBooking(options: {
  property: Property & { partner: Partner };
  unitIds: string[];
  checkIn: Date;
  checkOut: Date;
  guests: number;
  promotionCode?: string | null;
}): Promise<QuoteContext> {
  const { property, unitIds, checkIn, checkOut, guests } = options;

  const units = await prisma.unit.findMany({
    where: { id: { in: unitIds }, propertyId: property.id },
    include: { rate: true, seasonalRates: true },
    orderBy: { sortOrder: "asc" },
  });

  if (units.length === 0) throw new Error("No units selected.");

  const stays = units.map((unit) => {
    const rate: UnitRateInput = {
      unitId: unit.id,
      label: unit.label,
      maxGuests: unit.maxGuests,
      nightlyRate: unit.rate?.nightlyRate ?? null,
      weeklyRate: unit.rate?.weeklyRate ?? null,
      monthlyRate: unit.rate?.monthlyRate ?? null,
      annualRate: unit.rate?.annualRate ?? null,
      weekendNightlyRate: unit.rate?.weekendNightlyRate ?? null,
      extraGuestFee: unit.rate?.extraGuestFee ?? 0,
      extraGuestThreshold: unit.rate?.extraGuestThreshold ?? null,
      cleaningFee: unit.rate?.cleaningFee ?? 0,
      serviceCharge: unit.rate?.serviceCharge ?? 0,
      securityDeposit: unit.rate?.securityDeposit ?? 0,
    };
    const seasonalRates: SeasonalRateInput[] = (unit.seasonalRates ?? []).map((season) => ({
      startDate: season.startDate,
      endDate: season.endDate,
      nightlyRate: season.nightlyRate,
      weeklyRate: season.weeklyRate,
      monthlyRate: season.monthlyRate,
      priority: season.priority,
    }));

    return computeUnitStay({ rate, seasonalRates, checkIn, checkOut });
  });

  // Extra-guest fees are assessed once across the whole party.
  const included = units.reduce(
    (total, unit) => total + (unit.rate?.extraGuestThreshold ?? unit.maxGuests),
    0,
  );
  const firstUnit = units[0];
  const extraGuestFee = firstUnit?.rate?.extraGuestFee ?? 0;
  const extraGuestCharges = computeExtraGuestCharges({
    guests,
    maxGuests: included,
    extraGuestFee,
    extraGuestThreshold: null,
    nights: Math.max(1, nightsBetween(checkIn, checkOut)),
  });

  if (stays[0]) stays[0].extraGuestCharges = extraGuestCharges;

  const config = await getFinancialConfig();
  const commissionRate = await getPartnerCommissionRate(property.partner.commissionRate);
  const accommodationSubtotal = stays.reduce((sum, stay) => sum + stay.subtotal, 0);
  const discount = await evaluatePromotion(options.promotionCode, accommodationSubtotal, property);

  const propertyFees = await prisma.propertyFee.findMany({
    where: { propertyId: property.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const nights = Math.max(1, nightsBetween(checkIn, checkOut));
  const feeLines: AppliedFeeLine[] = propertyFees.map((fee) => {
    const multiplier = fee.appliesTo === "PER_NIGHT" ? nights : fee.appliesTo === "PER_GUEST" ? Math.max(1, guests) : 1;
    let amount = 0;
    const isVariable = fee.calculation === "VARIABLE" || (fee.calculation === "FIXED" && fee.amount == null);
    if (!isVariable) {
      if (fee.calculation === "PERCENTAGE") {
        amount = Math.round((accommodationSubtotal * (fee.percentage ?? 0)) / 100) * multiplier;
      } else {
        amount = Math.round(fee.amount ?? 0) * multiplier;
      }
    }
    return {
      id: fee.id,
      name: fee.name,
      kind: fee.kind,
      calculation: fee.calculation,
      appliesTo: fee.appliesTo,
      amount: isVariable ? 0 : Math.max(0, amount),
      isVariable,
      isRefundable: fee.isRefundable,
    };
  });

  const quote = buildQuote({
    currency: property.currency,
    checkIn,
    checkOut,
    guests,
    stays,
    discountAmount: discount.amount,
    promotionCode: discount.code,
    commissionRate,
    processingFeeRate: config.processingFeeRate,
    processingFeeFlat: config.processingFeeFlat,
    processingFeeBearer: config.processingFeeBearer,
    feeLines,
  });

  const dueDiligence = await evaluateDueDiligence({ nights, property });

  return {
    quote,
    stays,
    dueDiligence,
    property,
    units: units.map((unit) => ({ id: unit.id, label: unit.label, maxGuests: unit.maxGuests })),
  };
}

async function evaluatePromotion(code: string | null | undefined, subtotal: number, property: Property) {
  if (!code) return { amount: 0, code: null };
  const promotion = await prisma.promotion.findUnique({ where: { code: code.toUpperCase() } });
  if (!promotion || !promotion.isActive) return { amount: 0, code: null };
  const now = new Date();
  if (promotion.startsAt > now || promotion.endsAt < now) return { amount: 0, code: null };
  if (promotion.usageLimit != null && promotion.usedCount >= promotion.usageLimit) return { amount: 0, code: null };
  if (promotion.minAmount != null && subtotal < promotion.minAmount) return { amount: 0, code: null };
  if (promotion.scope === "PARTNER" && promotion.partnerId !== property.partnerId) return { amount: 0, code: null };
  if (promotion.scope === "CATEGORY" && promotion.categoryId !== property.categoryId) return { amount: 0, code: null };
  if (promotion.scope === "PROPERTY" && promotion.propertyId !== property.id) return { amount: 0, code: null };

  const raw =
    promotion.type === "PERCENTAGE"
      ? Math.round((subtotal * promotion.value) / 100)
      : promotion.value;
  const amount = promotion.maxDiscount != null ? Math.min(raw, promotion.maxDiscount) : raw;
  return { amount, code: promotion.code };
}

// -----------------------------------------------------------------------------
// Creating a reservation (inventory hold)
// -----------------------------------------------------------------------------

export type CreateReservationInput = {
  userId: string;
  propertyId: string;
  unitIds: string[];
  checkIn: Date;
  checkOut: Date;
  guests: number;
  adults?: number;
  children?: number;
  infants?: number;
  promotionCode?: string | null;
  purposeOfStay?: string | null;
  specialRequests?: string | null;
  paymentOption?: "PAY_NOW" | "PAY_LATER";
};

export type CreateReservationResult =
  | { ok: true; reservationId: string; reference: string; quote: Quote }
  | { ok: false; error: string; issues: BookingRuleIssue[] };

export async function createReservation(input: CreateReservationInput): Promise<CreateReservationResult> {
  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    include: { partner: true },
  });

  if (!property) return { ok: false, error: "Property not found.", issues: [] };
  if (property.status !== "APPROVED" || !property.isActive) {
    return { ok: false, error: "This property is not currently bookable.", issues: [{ code: "PROPERTY_NOT_BOOKABLE", message: "This property is not currently bookable." }] };
  }

  const nights = nightsBetween(input.checkIn, input.checkOut);

  const issueCheck = evaluateBookingRules({
    property,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });
  if (issueCheck.length > 0) {
    return { ok: false, error: issueCheck[0]?.message ?? "Invalid dates.", issues: issueCheck };
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const units = await tx.unit.findMany({
          where: {
            id: { in: input.unitIds },
            propertyId: property.id,
            status: "ACTIVE",
            isBookable: true,
          },
          include: {
            rate: true,
            seasonalRates: true,
            availabilityBlocks: {
              where: { startDate: { lt: input.checkOut }, endDate: { gt: input.checkIn } },
              select: { id: true },
            },
            reservationUnits: {
              where: {
                occupiesInventory: true,
                checkIn: { lt: input.checkOut },
                checkOut: { gt: input.checkIn },
              },
              select: { id: true },
            },
          },
        });

        if (units.length !== input.unitIds.length) {
          throw new BookingError("UNIT_UNAVAILABLE", "One or more selected units are no longer available.");
        }
        if (units.some((unit) => unit.availabilityBlocks.length > 0 || unit.reservationUnits.length > 0)) {
          throw new BookingError("UNIT_UNAVAILABLE", "The selected accommodation was just booked. Please choose another unit or dates.");
        }

        const capacity = units.reduce((total, unit) => total + unit.maxGuests, 0);
        if (input.guests > capacity) {
          throw new BookingError("CAPACITY", `Maximum occupancy is ${capacity} guests.`);
        }

        const context = await quoteBooking({
          property,
          unitIds: input.unitIds,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          guests: input.guests,
          promotionCode: input.promotionCode,
        });

        const { quote, dueDiligence } = context;
        const approval = property.bookingMode === "APPROVAL" || !property.instantBooking;

        const wantsPayLater = input.paymentOption === "PAY_LATER";
        const canPayLater = !approval && wantsPayLater && property.allowPayLater && (property.unpaidHoldDays ?? 0) > 0;
        const paymentOption = canPayLater ? "PAY_LATER" : "PAY_NOW";

        // APPROVAL: hold for review window. INSTANT+PAY_LATER: hold for unpaidHoldDays.
        // INSTANT+PAY_NOW: short payment window so inventory isn't blocked indefinitely.
        const holdMs = approval
          ? APPROVAL_WINDOW_HOURS * 3_600_000
          : canPayLater
            ? (property.unpaidHoldDays ?? 2) * 86_400_000
            : RESERVATION_HOLD_MINUTES * 60_000;

        const reservation = await tx.reservation.create({
          data: {
            reference: makeReference(),
            userId: input.userId,
            propertyId: property.id,
            status: approval ? "PENDING_APPROVAL" : "PENDING_PAYMENT",
            bookingMode: approval ? "APPROVAL" : "INSTANT",
            paymentOption,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            nights,
            adults: input.adults ?? Math.max(1, input.guests),
            children: input.children ?? 0,
            infants: input.infants ?? 0,
            guests: input.guests,
            purposeOfStay: input.purposeOfStay ?? null,
            specialRequests: input.specialRequests ?? null,
            currency: property.currency,
            priceBasis: quote.priceBasis,
            accommodationSubtotal: quote.accommodationSubtotal,
            extraGuestCharges: quote.extraGuestCharges,
            cleaningFee: quote.cleaningFee,
            serviceCharge: quote.serviceCharge,
            taxAmount: quote.taxAmount,
            cautionAmount: quote.cautionAmount,
            discountAmount: quote.discountAmount,
            promotionId: quote.promotionCode
              ? (await tx.promotion.findUnique({ where: { code: quote.promotionCode }, select: { id: true } }))?.id ?? null
              : null,
            grossAmount: quote.grossAmount,
            platformCommission: quote.platformCommission,
            processingFee: quote.processingFee,
            partnerNetAmount: quote.partnerNetAmount,
            commissionRate: quote.commissionRate,
            quote: quote as unknown as Prisma.InputJsonValue,
            appliedFees: quote.feeLines as unknown as Prisma.InputJsonValue,
            holdExpiresAt: new Date(Date.now() + holdMs),
            dueDiligenceRequired: dueDiligence.required,
            dueDiligenceNote: dueDiligence.message || null,
          },
        });

        await tx.reservationUnit.createMany({
          data: units.map((unit, index) => {
            const line = quote.lines.find((entry) => entry.unitId === unit.id) ?? quote.lines[index];
            return {
              reservationId: reservation.id,
              unitId: unit.id,
              checkIn: input.checkIn,
              checkOut: input.checkOut,
              nights,
              rateMinor: line?.averagePerNight ?? 0,
              subtotal: line?.accommodation ?? 0,
            };
          }),
        });

        if (quote.promotionCode) {
          await tx.promotion.update({
            where: { code: quote.promotionCode },
            data: { usedCount: { increment: 1 } },
          });
        }

        return { ok: true as const, reservationId: reservation.id, reference: reservation.reference, quote };
      },
      { isolationLevel: "Serializable", timeout: 20_000 },
    );
  } catch (error) {
    if (prismaExclusionViolation(error)) {
      return {
        ok: false,
        error: "The accommodation was booked by someone else moments ago. Please choose another unit or dates.",
        issues: [{ code: "UNIT_UNAVAILABLE", message: "The accommodation was booked by someone else moments ago." }],
      };
    }
    if (error instanceof BookingError) {
      return { ok: false, error: error.message, issues: [{ code: error.code, message: error.message }] };
    }
    throw error;
  }
}

export class BookingError extends Error {
  constructor(
    public code: BookingRuleIssue["code"],
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

// -----------------------------------------------------------------------------
// Lifecycle transitions
// -----------------------------------------------------------------------------

export async function releaseExpiredHolds(now = new Date()) {
  const result = await prisma.reservation.updateMany({
    where: {
      status: { in: ["PENDING_PAYMENT", "PENDING_APPROVAL"] },
      holdExpiresAt: { lt: now },
    },
    data: { status: "EXPIRED", holdExpiresAt: null },
  });
  return result.count;
}

export function holdExpired(reservation: { status: string; holdExpiresAt: Date | null }, now = new Date()) {
  return Boolean(reservation.holdExpiresAt && reservation.holdExpiresAt < now && (reservation.status === "PENDING_PAYMENT" || reservation.status === "PENDING_APPROVAL"));
}

export async function approveReservation(reservationId: string, actorId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.status !== "PENDING_APPROVAL") return null;

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: "PENDING_PAYMENT",
      approvedById: actorId,
      approvedAt: new Date(),
      holdExpiresAt: new Date(Date.now() + RESERVATION_HOLD_MINUTES * 60_000),
    },
  });

  await recordStatusEvent(reservationId, "APPROVED", actorId);
  return updated;
}

export async function declineReservation(reservationId: string, actorId: string, reason?: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.status !== "PENDING_APPROVAL") return null;

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledById: actorId,
      cancellationReason: reason ?? "Declined by property partner",
      declinedAt: new Date(),
      declineReason: reason ?? null,
    },
  });

  await recordStatusEvent(reservationId, "DECLINED", actorId);
  return updated;
}

export type CancellationOutcome = {
  refundPercent: number;
  refundAmount: number;
  policyName: string | null;
};

/** Refund due under the property's cancellation policy. */
export function computeCancellationOutcome(options: {
  grossAmount: number;
  checkIn: Date;
  policy?: (CancellationPolicy & { rules: unknown }) | null;
  now?: Date;
}): CancellationOutcome {
  const now = options.now ?? new Date();
  const hoursUntilCheckIn = (options.checkIn.getTime() - now.getTime()) / 3_600_000;
  const rules = Array.isArray(options.policy?.rules)
    ? (options.policy?.rules as { hoursBeforeCheckIn: number; refundPercent: number }[])
    : [];

  if (rules.length === 0) {
    return {
      refundPercent: hoursUntilCheckIn >= 48 ? 100 : 0,
      refundAmount: hoursUntilCheckIn >= 48 ? options.grossAmount : 0,
      policyName: options.policy?.name ?? "Standard",
    };
  }

  const sorted = rules.slice().sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn);
  const matched = sorted.find((rule) => hoursUntilCheckIn >= rule.hoursBeforeCheckIn);
  const percent = matched?.refundPercent ?? 0;

  return {
    refundPercent: percent,
    refundAmount: Math.round((options.grossAmount * percent) / 100),
    policyName: options.policy?.name ?? null,
  };
}

export async function cancelReservation(options: {
  reservationId: string;
  actorId: string;
  reason?: string;
  refundOverride?: number | null;
  issueRefund?: boolean;
}) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: options.reservationId },
    include: { property: { include: { cancellationPolicy: true, partner: true } } },
  });
  if (!reservation) return null;
  if (["CHECKED_OUT", "CANCELLED", "REFUNDED", "EXPIRED"].includes(reservation.status)) return null;

  const outcome = computeCancellationOutcome({
    grossAmount: reservation.grossAmount,
    checkIn: reservation.checkIn,
    policy: reservation.property.cancellationPolicy,
  });

  const refundAmount = options.refundOverride ?? outcome.refundAmount;

  const updated = await prisma.reservation.update({
    where: { id: options.reservationId },
    data: {
      status: refundAmount > 0 && options.issueRefund ? "REFUND_PENDING" : "CANCELLED",
      cancelledAt: new Date(),
      cancelledById: options.actorId,
      cancellationReason: options.reason ?? "Cancelled",
      refundAmount,
    },
  });

  if (refundAmount > 0) {
    // Refund settlement is initiated by finance (admin) and recorded in the ledger
    // independently of the reservation status.
  }

  await recordStatusEvent(options.reservationId, "CANCELLED", options.actorId, {
    refundAmount,
    refundPercent: outcome.refundPercent,
  });

  return { reservation: updated, outcome, refundAmount };
}

export async function checkInReservation(reservationId: string, actorId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { property: { include: { partner: true } } },
  });
  if (!reservation || reservation.status !== "CONFIRMED") return null;

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CHECKED_IN", checkedInAt: new Date(), checkedInById: actorId },
  });

  await ensureSettlement(reservation.id);
  await recordStatusEvent(reservationId, "CHECKED_IN", actorId);
  return updated;
}

export async function checkOutReservation(reservationId: string, actorId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.status !== "CHECKED_IN") return null;

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CHECKED_OUT", checkedOutAt: new Date(), checkedOutById: actorId },
  });

  await ensureSettlement(reservation.id);
  await recordStatusEvent(reservationId, "CHECKED_OUT", actorId);
  return updated;
}

export async function ensureSettlement(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { property: { include: { partner: true } }, settlements: true },
  });
  if (!reservation || reservation.settlements.length > 0) return null;
  if (reservation.partnerNetAmount <= 0) return null;

  const config = await getFinancialConfig();
  const holdDays = reservation.property.partner.settlementHoldDays ?? config.settlementHoldDays;

  return prisma.settlement.create({
    data: {
      reference: `RTS-${reservation.reference.slice(-8)}`,
      partnerId: reservation.property.partnerId,
      status: "PENDING",
      currency: reservation.currency,
      grossAmount: reservation.partnerNetAmount,
      commissionDeducted: reservation.platformCommission,
      processingFeeDeducted: reservation.processingFee,
      netPayable: reservation.partnerNetAmount,
      periodStart: reservation.checkIn,
      periodEnd: reservation.checkOut,
      holdUntil: new Date(Date.now() + holdDays * 86_400_000),
      reservations: { connect: { id: reservation.id } },
    },
  });
}

async function recordStatusEvent(reservationId: string, action: string, actorId: string, data?: object) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action: `RESERVATION_${action}`,
      entityType: "Reservation",
      entityId: reservationId,
      summary: `Reservation ${action.toLowerCase().replace(/_/g, " ")}`,
      after: (data ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export function reservationPaymentWindowOpen(reservation: { status: string; holdExpiresAt: Date | null }, now = new Date()) {
  if (reservation.status !== "PENDING_PAYMENT") return false;
  return !reservation.holdExpiresAt || reservation.holdExpiresAt > now;
}

export function priceBasisLabel(basis: RateBasis) {
  const map: Record<RateBasis, string> = {
    NIGHTLY: "per night",
    WEEKLY: "per week",
    MONTHLY: "per month",
    ANNUAL: "per year",
  };
  return map[basis];
}

export { SETTLEMENT_HOLD_DEFAULT_DAYS };
