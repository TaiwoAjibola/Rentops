import type { AvailabilityBlock, Unit } from "@prisma/client";

import { prisma } from "@/lib/db";
import { addDays, eachDate, nightsBetween, startOfTodayUtc, toISODate, toUtcDate } from "@/lib/dates";
import type { UnitRateInput } from "@/lib/pricing";
import { nightlyForDate, type SeasonalRateInput } from "@/lib/pricing";

export type UnitAvailabilityRecord = {
  unitId: string;
  label: string;
  available: boolean;
  reason?: string;
};

export type AvailabilityDay = {
  date: string;
  available: boolean;
  reason: "AVAILABLE" | "BLOCKED" | "BOOKED" | "PAST";
  rate: number;
};

type Interval = { startDate: Date; endDate: Date };

function overlapsRange(interval: Interval, checkIn: Date, checkOut: Date) {
  return interval.startDate < checkOut && checkIn < interval.endDate;
}

/**
 * Core availability check for one unit.
 *
 * A unit is unavailable for [checkIn, checkOut) when it is blocked by the
 * partner or already held by an inventory-holding reservation. Confirmed
 * double-booking is additionally impossible at the database level via the
 * ReservationUnit exclusion constraint.
 */
export async function isUnitAvailable(unitId: string, checkIn: Date, checkOut: Date) {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.status !== "ACTIVE" || !unit.isBookable) return false;

  const [conflicting, blocked] = await Promise.all([
    prisma.reservationUnit.findMany({
      where: {
        unitId,
        occupiesInventory: true,
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { id: true },
      take: 1,
    }),
    prisma.availabilityBlock.findMany({
      where: {
        unitId,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
      select: { id: true },
      take: 1,
    }),
  ]);

  return conflicting.length === 0 && blocked.length === 0;
}

export type AvailableUnitSearch = {
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
  guests?: number;
  categoryId?: string;
};

export type UnitWithRate = Unit & {
  rate: (UnitRateInput & { seasonalRates: SeasonalRateInput[] }) | null;
};

/** Units of a property that are free for the requested dates. */
export async function findAvailableUnits(search: AvailableUnitSearch) {
  const units = await prisma.unit.findMany({
    where: {
      propertyId: search.propertyId,
      status: "ACTIVE",
      isBookable: true,
      ...(search.categoryId ? { categoryId: search.categoryId } : {}),
      ...(search.guests ? { maxGuests: { gte: search.guests } } : {}),
    },
    include: {
      rate: true,
      seasonalRates: true,
      availabilityBlocks: {
        where: { startDate: { lt: search.checkOut }, endDate: { gt: search.checkIn } },
      },
      reservationUnits: {
        where: {
          occupiesInventory: true,
          checkIn: { lt: search.checkOut },
          checkOut: { gt: search.checkIn },
        },
        select: { id: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return units.filter((unit) => unit.availabilityBlocks.length === 0 && unit.reservationUnits.length === 0);
}

/** Availability grid for a unit, used by the partner calendar and property page. */
export async function getUnitCalendar(unitId: string, from: Date, to: Date, context?: {
  blocks?: AvailabilityBlock[];
  bookings?: Interval[];
  rate?: UnitRateInput | null;
  seasonalRates?: SeasonalRateInput[];
}): Promise<AvailabilityDay[]> {
  const today = startOfTodayUtc();

  const blocks =
    context?.blocks ??
    (await prisma.availabilityBlock.findMany({
      where: { unitId, startDate: { lt: to }, endDate: { gt: from } },
    }));

  const bookings: Interval[] =
    context?.bookings ??
    (
      await prisma.reservationUnit.findMany({
        where: {
          unitId,
          occupiesInventory: true,
          checkIn: { lt: to },
          checkOut: { gt: from },
        },
        select: { checkIn: true, checkOut: true },
      })
    ).map((booking) => ({ startDate: booking.checkIn, endDate: booking.checkOut }));

  const rate =
    context?.rate !== undefined
      ? context.rate
      : await prisma.unitRate.findUnique({ where: { unitId } }).then((found) =>
          found
            ? {
                unitId: found.unitId,
                label: "",
                maxGuests: 0,
                nightlyRate: found.nightlyRate,
                weeklyRate: found.weeklyRate,
                monthlyRate: found.monthlyRate,
                annualRate: found.annualRate,
                weekendNightlyRate: found.weekendNightlyRate,
                extraGuestFee: found.extraGuestFee,
                extraGuestThreshold: found.extraGuestThreshold,
                cleaningFee: found.cleaningFee,
                serviceCharge: found.serviceCharge,
                securityDeposit: found.securityDeposit,
              }
            : null,
        );

  const seasonalRates =
    context?.seasonalRates ??
    (await prisma.seasonalRate.findMany({
      where: { unitId, startDate: { lt: to }, endDate: { gt: from } },
    }));

  return eachDate(from, to).map((date) => {
    const isPast = date < today;
    const isBlocked = blocks.some((block) => block.startDate <= date && date < block.endDate);
    const isBooked = bookings.some((booking) => booking.startDate <= date && date < booking.endDate);

    let reason: AvailabilityDay["reason"] = "AVAILABLE";
    if (isPast) reason = "PAST";
    else if (isBooked) reason = "BOOKED";
    else if (isBlocked) reason = "BLOCKED";

    const nightlyRate = rate
      ? nightlyForDate({ rate, seasonalRates, checkIn: date, checkOut: addDays(date, 1) }, date)
      : 0;

    return {
      date: toISODate(date),
      available: reason === "AVAILABLE",
      reason,
      rate: nightlyRate,
    };
  });
}

/** Cheap availability probe used by search cards ("available for your dates"). */
export async function countAvailableUnits(propertyId: string, checkIn: Date, checkOut: Date) {
  const units = await prisma.unit.findMany({
    where: { propertyId, status: "ACTIVE", isBookable: true },
    select: {
      id: true,
      availabilityBlocks: {
        where: { startDate: { lt: checkOut }, endDate: { gt: checkIn } },
        select: { id: true },
        take: 1,
      },
      reservationUnits: {
        where: { occupiesInventory: true, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
        select: { id: true },
        take: 1,
      },
    },
  });

  return units.filter((unit) => unit.availabilityBlocks.length === 0 && unit.reservationUnits.length === 0).length;
}

export function normaliseInterval(checkIn: Date | string, checkOut: Date | string) {
  const start = toUtcDate(checkIn instanceof Date ? checkIn : checkIn);
  const end = toUtcDate(checkOut instanceof Date ? checkOut : checkOut);
  return { start, end, nights: nightsBetween(start, end) };
}
