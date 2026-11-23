import type { RateBasis } from "@prisma/client";

import { eachDate, isWeekendNight, nightsBetween } from "@/lib/dates";
import { applyPercent, type Currency } from "@/lib/money";
import { RATE_BASIS_LABELS, RATE_BASIS_UNIT_LABELS } from "@/lib/constants";

/**
 * RentOps pricing engine.
 *
 * Design principles
 * -----------------
 * 1. No hardcoded minimum/maximum stay. Duration is pure data; the partner's own
 *    minNights/maxNights are business rules supplied by the partner.
 * 2. A partner configures only the rate periods relevant to them (nightly,
 *    weekly, monthly, annual). Missing periods are derived by pro-rata from the
 *    shortest configured period so a stay can always be priced and labelled.
 * 3. The customer always sees the LOWEST legitimate total for their dates
 *    across all configured bases, and the basis is surfaced so that prices are
 *    never shown without their billing period.
 */

export const PERIOD_NIGHTS: Record<RateBasis, number> = {
  NIGHTLY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  ANNUAL: 365,
};

export type SeasonalRateInput = {
  startDate: Date;
  endDate: Date;
  nightlyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  priority: number;
};

export type UnitRateInput = {
  unitId: string;
  label: string;
  maxGuests: number;
  nightlyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  annualRate: number | null;
  weekendNightlyRate: number | null;
  extraGuestFee: number;
  extraGuestThreshold: number | null;
  cleaningFee: number;
  serviceCharge: number;
  securityDeposit: number;
};

export type UnitStayRequest = {
  rate: UnitRateInput;
  seasonalRates?: SeasonalRateInput[];
  checkIn: Date;
  checkOut: Date;
};

export type BasisCandidate = {
  basis: RateBasis;
  units: number;
  remainderNights: number;
  total: number;
};

export type UnitStayResult = {
  unitId: string;
  label: string;
  nights: number;
  basis: RateBasis;
  basisLabel: string;
  unitLabel: string;
  subtotal: number;
  averagePerNight: number;
  baseRateForBasis: number;
  candidates: BasisCandidate[];
  extraGuestCharges: number;
  cleaningFee: number;
  serviceCharge: number;
  securityDeposit: number;
  appliedSeasonalLabels: string[];
};

function seasonalForDate(date: Date, seasons: SeasonalRateInput[]): SeasonalRateInput | null {
  const covering = seasons.filter((season) => date >= season.startDate && date < season.endDate);
  if (covering.length === 0) return null;
  return covering.sort((a, b) => b.priority - a.priority)[0] ?? null;
}

/** Nightly rate for one night, considering seasonal overrides then weekend rate. */
export function nightlyForDate(request: UnitStayRequest, date: Date): number {
  const { rate, seasonalRates = [] } = request;
  const season = seasonalForDate(date, seasonalRates);
  if (season?.nightlyRate != null) return season.nightlyRate;
  if (rate.weekendNightlyRate != null && isWeekendNight(date)) return rate.weekendNightlyRate;
  return effectiveNightlyRate(rate);
}

/**
 * Guarantees a usable nightly rate. If the partner never configured a nightly
 * rate (common for monthly-only lets), derive it pro-rata from the smallest
 * period they did configure.
 */
export function effectiveNightlyRate(rate: UnitRateInput): number {
  if (rate.nightlyRate != null) return rate.nightlyRate;
  if (rate.weeklyRate != null) return Math.round(rate.weeklyRate / PERIOD_NIGHTS.WEEKLY);
  if (rate.monthlyRate != null) return Math.round(rate.monthlyRate / PERIOD_NIGHTS.MONTHLY);
  if (rate.annualRate != null) return Math.round(rate.annualRate / PERIOD_NIGHTS.ANNUAL);
  return 0;
}

function configuredRate(rate: UnitRateInput, basis: RateBasis): number | null {
  switch (basis) {
    case "NIGHTLY":
      return rate.nightlyRate ?? null;
    case "WEEKLY":
      return rate.weeklyRate ?? null;
    case "MONTHLY":
      return rate.monthlyRate ?? null;
    case "ANNUAL":
      return rate.annualRate ?? null;
    default:
      return null;
  }
}

function seasonalRateForBasis(season: SeasonalRateInput, basis: RateBasis): number | null {
  switch (basis) {
    case "NIGHTLY":
      return season.nightlyRate;
    case "WEEKLY":
      return season.weeklyRate;
    case "MONTHLY":
      return season.monthlyRate;
    default:
      return null;
  }
}

/** Values used when a seasonal period partially overrides a longer stay. */
function effectiveRatesFor(request: UnitStayRequest): Record<RateBasis, number | null> {
  const { rate, seasonalRates = [] } = request;
  const checkIn = request.checkIn;
  const checkOut = request.checkOut;
  const nights = nightsBetween(checkIn, checkOut);
  const seasonsInRange = seasonalRates.filter((season) => season.startDate < checkOut && season.endDate > checkIn);

  // With multiple seasons spanning the stay, use the season covering the most nights.
  let dominantSeason: SeasonalRateInput | null = null;
  let dominantCoverage = -1;
  for (const season of seasonsInRange) {
    const start = season.startDate > checkIn ? season.startDate : checkIn;
    const end = season.endDate < checkOut ? season.endDate : checkOut;
    const coverage = nightsBetween(start, end);
    if (coverage > dominantCoverage) {
      dominantCoverage = coverage;
      dominantSeason = season;
    }
  }

  const effective = (basis: RateBasis): number | null => {
    if (dominantSeason) {
      const seasonRate = seasonalRateForBasis(dominantSeason, basis);
      if (seasonRate != null) return seasonRate;
    }
    return configuredRate(rate, basis);
  };

  return {
    NIGHTLY: effective("NIGHTLY") ?? effectiveNightlyRate(rate),
    WEEKLY: effective("WEEKLY"),
    MONTHLY: effective("MONTHLY"),
    ANNUAL: effective("ANNUAL"),
  };
}

function nightlySum(request: UnitStayRequest): number {
  return eachDate(request.checkIn, request.checkOut).reduce(
    (total, date) => total + nightlyForDate(request, date),
    0,
  );
}

/**
 * Price a single unit for a stay, selecting the cheapest configured basis.
 * Tiers combine whole periods priced at the tier rate plus any remainder priced
 * at the next smaller available rate.
 */
export function computeUnitStay(request: UnitStayRequest): UnitStayResult {
  const { rate, seasonalRates = [] } = request;
  const nights = Math.max(1, nightsBetween(request.checkIn, request.checkOut));
  const effective = effectiveRatesFor(request);
  const nightlyTotal = nightlySum(request);

  const remainderNightlyAverage = Math.round(nightlyTotal / nights);

  const candidates: BasisCandidate[] = [];

  candidates.push({
    basis: "NIGHTLY",
    units: nights,
    remainderNights: 0,
    total: nightlyTotal,
  });

  if (effective.WEEKLY != null) {
    const units = Math.floor(nights / PERIOD_NIGHTS.WEEKLY);
    const remainder = nights % PERIOD_NIGHTS.WEEKLY;
    candidates.push({
      basis: "WEEKLY",
      units,
      remainderNights: remainder,
      total: units * effective.WEEKLY + remainder * remainderNightlyAverage,
    });
  }

  if (effective.MONTHLY != null) {
    const units = Math.floor(nights / PERIOD_NIGHTS.MONTHLY);
    const remainder = nights % PERIOD_NIGHTS.MONTHLY;
    const remainderRate = Math.min(
      effective.WEEKLY != null ? Math.round(effective.WEEKLY / PERIOD_NIGHTS.WEEKLY) : Number.POSITIVE_INFINITY,
      remainderNightlyAverage,
    );
    const safeRemainderRate = Number.isFinite(remainderRate) ? remainderRate : remainderNightlyAverage;
    candidates.push({
      basis: "MONTHLY",
      units,
      remainderNights: remainder,
      total: units * effective.MONTHLY + remainder * safeRemainderRate,
    });
  }

  if (effective.ANNUAL != null) {
    const units = Math.floor(nights / PERIOD_NIGHTS.ANNUAL);
    const remainder = nights % PERIOD_NIGHTS.ANNUAL;
    const remainderRate = remainderNightlyAverage;
    candidates.push({
      basis: "ANNUAL",
      units,
      remainderNights: remainder,
      total: units * effective.ANNUAL + remainder * remainderRate,
    });
  }

  // Cheapest total wins; ties favour the longer period (clearer for the guest).
  const preference: RateBasis[] = ["ANNUAL", "MONTHLY", "WEEKLY", "NIGHTLY"];
  const valid = candidates.filter((candidate) => candidate.total > 0 || candidate.total === 0);
  const best =
    valid.slice().sort((a, b) => {
      if (a.total !== b.total) return a.total - b.total;
      return preference.indexOf(a.basis) - preference.indexOf(b.basis);
    })[0] ?? candidates[0];

  const guestsIncluded = rate.extraGuestThreshold ?? rate.maxGuests;

  const appliedSeasonalLabels = Array.from(
    new Set(
      eachDate(request.checkIn, request.checkOut)
        .map((date) => seasonalForDate(date, seasonalRates))
        .filter((season): season is SeasonalRateInput => Boolean(season))
        .map(() => "seasonal"),
    ),
  );

  return {
    unitId: rate.unitId,
    label: rate.label,
    nights,
    basis: best.basis,
    basisLabel: RATE_BASIS_LABELS[best.basis],
    unitLabel: RATE_BASIS_UNIT_LABELS[best.basis],
    subtotal: best.total,
    averagePerNight: Math.round(best.total / nights),
    baseRateForBasis: (() => {
      switch (best.basis) {
        case "WEEKLY":
          return effective.WEEKLY ?? 0;
        case "MONTHLY":
          return effective.MONTHLY ?? 0;
        case "ANNUAL":
          return effective.ANNUAL ?? 0;
        default:
          return remainderNightlyAverage;
      }
    })(),
    candidates,
    extraGuestCharges: 0,
    cleaningFee: rate.cleaningFee,
    serviceCharge: rate.serviceCharge,
    securityDeposit: rate.securityDeposit,
    appliedSeasonalLabels,
  };
}

export type ExtraGuestInput = {
  guests: number;
  maxGuests: number;
  extraGuestFee: number;
  extraGuestThreshold: number | null;
  nights: number;
};

export function computeExtraGuestCharges(input: ExtraGuestInput): number {
  const threshold = input.extraGuestThreshold ?? input.maxGuests;
  const extraGuests = Math.max(0, input.guests - threshold);
  if (extraGuests <= 0 || input.extraGuestFee <= 0) return 0;
  return extraGuests * input.extraGuestFee * Math.max(1, input.nights);
}

export type QuoteLine = {
  unitId: string;
  unitLabel: string;
  basis: RateBasis;
  basisLabel: string;
  nights: number;
  accommodation: number;
  extraGuestCharges: number;
  cleaningFee: number;
  serviceCharge: number;
  averagePerNight: number;
  securityDeposit: number;
};

export type AppliedFeeLine = {
  id?: string;
  name: string;
  kind: "TAX" | "CAUTION_DEPOSIT" | "CLEANING" | "SERVICE" | "CUSTOM";
  calculation: "FIXED" | "PERCENTAGE" | "VARIABLE";
  appliesTo: "PER_STAY" | "PER_NIGHT" | "PER_GUEST";
  amount: number; // payable now (minor units); 0 when variable/TBD
  isVariable: boolean;
  isRefundable: boolean;
};

export type Quote = {
  currency: Currency;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  lines: QuoteLine[];
  priceBasis: RateBasis;
  priceBasisLabel: string;
  accommodationSubtotal: number;
  extraGuestCharges: number;
  cleaningFee: number;
  serviceCharge: number;
  securityDeposit: number;
  taxAmount: number;
  cautionAmount: number;
  customFeesAmount: number;
  feeLines: AppliedFeeLine[];
  subtotal: number;
  discountAmount: number;
  promotionCode: string | null;
  /** Total charged to the customer. */
  grossAmount: number;
  /** What actually belongs to RentOps — never the full payment. */
  platformCommission: number;
  commissionRate: number;
  processingFee: number;
  /** Amount owed to the property partner. */
  partnerNetAmount: number;
  displayRate: number;
  displayBasis: RateBasis;
  displayBasisLabel: string;
};

export type QuoteInput = {
  currency?: Currency;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  stays: UnitStayResult[];
  cleaningFeeOnce?: boolean;
  discountAmount?: number;
  promotionCode?: string | null;
  commissionRate: number;
  processingFeeRate?: number;
  processingFeeFlat?: number;
  processingFeeBearer?: "PLATFORM" | "PARTNER";
  feeLines?: AppliedFeeLine[];
};

export function buildQuote(input: QuoteInput): Quote {
  const nights = Math.max(1, nightsBetween(input.checkIn, input.checkOut));

  const lines: QuoteLine[] = input.stays.map((stay) => ({
    unitId: stay.unitId,
    unitLabel: stay.label,
    basis: stay.basis,
    basisLabel: stay.basisLabel,
    nights: stay.nights,
    accommodation: stay.subtotal,
    extraGuestCharges: stay.extraGuestCharges,
    cleaningFee: input.cleaningFeeOnce === false ? stay.cleaningFee : stay.cleaningFee,
    serviceCharge: stay.serviceCharge,
    averagePerNight: stay.averagePerNight,
    securityDeposit: stay.securityDeposit,
  }));

  const accommodationSubtotal = lines.reduce((total, line) => total + line.accommodation, 0);
  const extraGuestCharges = lines.reduce((total, line) => total + line.extraGuestCharges, 0);
  // Cleaning and service charges are one-off per reservation, not per unit.
  const cleaningFee = input.stays[0]?.cleaningFee ?? 0;
  const serviceCharge = input.stays[0]?.serviceCharge ?? 0;
  const securityDeposit = input.stays[0]?.securityDeposit ?? 0;

  const feeLines = input.feeLines ?? [];
  const payableFees = feeLines.filter((fee) => !fee.isVariable);
  const taxAmount = payableFees.filter((fee) => fee.kind === "TAX").reduce((sum, fee) => sum + fee.amount, 0);
  const cautionAmount = payableFees.filter((fee) => fee.kind === "CAUTION_DEPOSIT").reduce((sum, fee) => sum + fee.amount, 0);
  const customFeesAmount = payableFees
    .filter((fee) => fee.kind !== "TAX" && fee.kind !== "CAUTION_DEPOSIT")
    .reduce((sum, fee) => sum + fee.amount, 0);
  const payableFeesTotal = taxAmount + cautionAmount + customFeesAmount;

  const subtotal = accommodationSubtotal + extraGuestCharges + cleaningFee + serviceCharge + payableFeesTotal;
  const discountAmount = Math.min(Math.max(input.discountAmount ?? 0, 0), subtotal);
  const grossAmount = Math.max(0, subtotal - discountAmount);

  const commissionRate = input.commissionRate;
  const platformCommission = applyPercent(accommodationSubtotal, commissionRate);
  const processingFee = applyPercent(grossAmount, input.processingFeeRate ?? 0) + (input.processingFeeFlat ?? 0);
  const partnerProcessing = input.processingFeeBearer === "PARTNER" ? processingFee : 0;
  const partnerNetAmount = Math.max(0, grossAmount - platformCommission - partnerProcessing);

  const dominantBasis = lines[0]?.basis ?? "NIGHTLY";
  const displayRate = lines[0]?.averagePerNight ?? 0;

  return {
    currency: input.currency ?? "NGN",
    checkIn: input.checkIn.toISOString().slice(0, 10),
    checkOut: input.checkOut.toISOString().slice(0, 10),
    nights,
    guests: input.guests,
    lines,
    priceBasis: dominantBasis,
    priceBasisLabel: RATE_BASIS_LABELS[dominantBasis],
    accommodationSubtotal,
    extraGuestCharges,
    cleaningFee,
    serviceCharge,
    securityDeposit,
    taxAmount,
    cautionAmount,
    customFeesAmount,
    feeLines,
    subtotal,
    discountAmount,
    promotionCode: input.promotionCode ?? null,
    grossAmount,
    platformCommission,
    commissionRate,
    processingFee,
    partnerNetAmount,
    displayRate,
    displayBasis: dominantBasis,
    displayBasisLabel: RATE_BASIS_LABELS[dominantBasis],
  };
}
