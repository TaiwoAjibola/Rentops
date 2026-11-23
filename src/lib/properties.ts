import type { Prisma, Property } from "@prisma/client";

import { prisma } from "@/lib/db";
import { majorToMinor } from "@/lib/money";
import { parseDateInput } from "@/lib/dates";
import { nightlyForDate, effectiveNightlyRate, type SeasonalRateInput, type UnitRateInput } from "@/lib/pricing";

/**
 * Property discovery service shared by the homepage, search results, category
 * and destination pages. One source of truth for how listings are queried.
 */

export type PropertySort = "relevance" | "price_asc" | "price_desc" | "rating" | "newest";

export type SearchParams = {
  q?: string;
  location?: string;
  category?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  rating?: number;
  instant?: boolean;
  sort?: PropertySort;
  page?: number;
  verifiedOnly?: boolean;
};

export const PAGE_SIZE = 12;

const PUBLISHABLE: Prisma.PropertyWhereInput = {
  status: "APPROVED",
  isActive: true,
};

function locationClause(term?: string): Prisma.PropertyWhereInput[] {
  if (!term || term.trim().length === 0) return [];
  const value = term.trim();
  return [
    { city: { contains: value, mode: "insensitive" } },
    { state: { contains: value, mode: "insensitive" } },
    { area: { contains: value, mode: "insensitive" } },
    { addressLine1: { contains: value, mode: "insensitive" } },
    { name: { contains: value, mode: "insensitive" } },
  ];
}

export function buildPropertyWhere(params: SearchParams): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [];

  const term = params.q ?? params.location;
  const location = locationClause(term);
  if (location.length > 0) and.push({ OR: location });

  if (params.category) {
    and.push({ category: { slug: params.category } });
  }

  if (params.guests && params.guests > 0) {
    and.push({ maxGuests: { gte: params.guests } });
  }

  if (params.bedrooms && params.bedrooms > 0) {
    and.push({ bedrooms: { gte: params.bedrooms } });
  }

  if (params.bathrooms && params.bathrooms > 0) {
    and.push({ bathrooms: { gte: params.bathrooms } });
  }

  if (params.minPrice != null || params.maxPrice != null) {
    const price: Prisma.IntNullableFilter = {};
    if (params.minPrice != null) price.gte = majorToMinor(params.minPrice);
    if (params.maxPrice != null) price.lte = majorToMinor(params.maxPrice);
    and.push({ baseNightlyRate: price });
  }

  if (params.amenities && params.amenities.length > 0) {
    and.push({
      AND: params.amenities.map((slug) => ({
        amenities: { some: { amenity: { slug } } },
      })),
    });
  }

  if (params.rating && params.rating > 0) {
    and.push({ ratingAverage: { gte: params.rating } });
  }

  if (params.instant) {
    and.push({ instantBooking: true });
  }

  if (params.verifiedOnly) {
    and.push({ verificationBadge: true });
  }

  if (params.rooms && params.rooms > 0) {
    and.push({ units: { some: { status: "ACTIVE", isBookable: true } } });
  }

  return { ...PUBLISHABLE, AND: and.length > 0 ? and : undefined };
}

function orderByFor(sort: PropertySort | undefined): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ baseNightlyRate: "asc" }, { name: "asc" }];
    case "price_desc":
      return [{ baseNightlyRate: "desc" }, { name: "asc" }];
    case "rating":
      return [{ ratingAverage: "desc" }, { ratingCount: "desc" }];
    case "newest":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    default:
      return [{ featured: "desc" }, { verificationBadge: "desc" }, { ratingAverage: "desc" }, { createdAt: "desc" }];
  }
}

export const PROPERTY_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  headline: true,
  city: true,
  state: true,
  area: true,
  coverImageUrl: true,
  currency: true,
  baseNightlyRate: true,
  priceBasis: true,
  bedrooms: true,
  bathrooms: true,
  maxGuests: true,
  ratingAverage: true,
  ratingCount: true,
  verificationBadge: true,
  verificationLevel: true,
  instantBooking: true,
  featured: true,
  category: { select: { name: true, slug: true } },
  amenities: {
    take: 6,
    select: { amenity: { select: { name: true, slug: true, icon: true } } },
  },
} satisfies Prisma.PropertySelect;

export type PropertyCard = Prisma.PropertyGetPayload<{ select: typeof PROPERTY_CARD_SELECT }>;

export async function searchProperties(params: SearchParams) {
  const page = Math.max(1, params.page ?? 1);
  const where = buildPropertyWhere(params);

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      select: PROPERTY_CARD_SELECT,
      orderBy: orderByFor(params.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Map view needs coordinates for every match (no pagination limit beyond safety). */
export async function searchPropertiesForMap(params: SearchParams) {
  return prisma.property.findMany({
    where: { ...buildPropertyWhere(params), latitude: { not: null }, longitude: { not: null } },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      latitude: true,
      longitude: true,
      coverImageUrl: true,
      baseNightlyRate: true,
      currency: true,
      priceBasis: true,
      ratingAverage: true,
    },
    take: 200,
  });
}

export async function getPropertyBySlug(slug: string) {
  return prisma.property.findFirst({
    where: { slug, ...PUBLISHABLE },
    include: {
      category: true,
      partner: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          type: true,
          logoUrl: true,
          city: true,
          verificationStatus: true,
          createdAt: true,
        },
      },
      media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      amenities: { include: { amenity: true } },
      categories: { orderBy: { sortOrder: "asc" } },
      units: {
        where: { status: { not: "INACTIVE" } },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        include: {
          rate: true,
          seasonalRates: true,
          category: true,
          media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      },
      cancellationPolicy: true,
      verificationChecks: true,
      reviews: {
        where: { status: "PUBLISHED" },
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export type PropertyDetail = NonNullable<Awaited<ReturnType<typeof getPropertyBySlug>>>;

/** Admin/partner preview — same record regardless of moderation status. */
export async function getPropertyBySlugAnyStatus(slug: string) {
  return prisma.property.findFirst({ where: { slug } });
}

export async function getFeaturedProperties(limit = 8) {
  return prisma.property.findMany({
    where: PUBLISHABLE,
    select: PROPERTY_CARD_SELECT,
    orderBy: [{ featured: "desc" }, { ratingAverage: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function getRecentlyAddedProperties(limit = 8) {
  return prisma.property.findMany({
    where: PUBLISHABLE,
    select: PROPERTY_CARD_SELECT,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function getRecommendedProperties(limit = 8) {
  return prisma.property.findMany({
    where: { ...PUBLISHABLE, verificationBadge: true },
    select: PROPERTY_CARD_SELECT,
    orderBy: [{ ratingAverage: "desc" }, { ratingCount: "desc" }],
    take: limit,
  });
}

export async function getSpecialOffers(limit = 6) {
  const seasons = await prisma.seasonalRate.findMany({
    where: { isPromotion: true, endDate: { gte: new Date() } },
    include: {
      unit: {
        include: {
          property: { select: PROPERTY_CARD_SELECT },
        },
      },
    },
    take: limit * 3,
  });

  const seen = new Set<string>();
  const offers: { property: PropertyCard; label: string; discountHint: string }[] = [];

  for (const season of seasons) {
    const property = season.unit.property;
    if (!property || seen.has(property.id)) continue;
    seen.add(property.id);
    offers.push({
      property,
      label: season.label ?? season.name,
      discountHint: describeDiscount(season, property),
    });
    if (offers.length >= limit) break;
  }

  return offers;
}

function describeDiscount(season: { nightlyRate: number | null; monthlyRate: number | null }, property: PropertyCard) {
  const base = property.baseNightlyRate ?? 0;
  if (season.nightlyRate && base > 0 && season.nightlyRate < base) {
    const percent = Math.round(((base - season.nightlyRate) / base) * 100);
    return percent > 0 ? `${percent}% off selected dates` : "Seasonal rate";
  }
  return "Seasonal rate";
}

export async function getPopularDestinations(limit = 8) {
  return prisma.location.findMany({
    where: { popular: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit,
  });
}

export async function getCategoryHighlights() {
  const categories = await prisma.propertyCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return Promise.all(
    categories.map(async (category) => ({
      category,
      count: await prisma.property.count({ where: { ...PUBLISHABLE, categoryId: category.id } }),
      sample: await prisma.property.findFirst({
        where: { ...PUBLISHABLE, categoryId: category.id },
        select: { coverImageUrl: true, city: true },
        orderBy: { featured: "desc" },
      }),
    })),
  );
}

export async function getDestinationSummary() {
  const grouped = await prisma.property.groupBy({
    by: ["city"],
    where: PUBLISHABLE,
    _count: { _all: true },
    orderBy: { _count: { city: "desc" } },
    take: 12,
  });
  return grouped.map((row) => ({ city: row.city, count: row._count._all }));
}

export type AvailabilityProbe = { checkIn: Date; checkOut: Date } | null;

/** Annotates search cards with availability when dates were supplied. */
export async function withAvailability<T extends { id: string }>(
  properties: T[],
  probe: AvailabilityProbe,
): Promise<(T & { availableUnits: number })[]> {
  if (!probe) return properties.map((property) => ({ ...property, availableUnits: 0 }));

  const units = await prisma.unit.findMany({
    where: { propertyId: { in: properties.map((property) => property.id) }, status: "ACTIVE", isBookable: true },
    select: {
      id: true,
      propertyId: true,
      availabilityBlocks: {
        where: { startDate: { lt: probe.checkOut }, endDate: { gt: probe.checkIn } },
        select: { id: true },
        take: 1,
      },
      reservationUnits: {
        where: { occupiesInventory: true, checkIn: { lt: probe.checkOut }, checkOut: { gt: probe.checkIn } },
        select: { id: true },
        take: 1,
      },
    },
  });

  const counts = new Map<string, number>();
  for (const unit of units) {
    const free = unit.availabilityBlocks.length === 0 && unit.reservationUnits.length === 0;
    if (free) counts.set(unit.propertyId, (counts.get(unit.propertyId) ?? 0) + 1);
  }

  return properties.map((property) => ({ ...property, availableUnits: counts.get(property.id) ?? 0 }));
}

/**
 * Recomputes a property's advertised "from" price from its units. Called after
 * any pricing change so search results never show a stale figure.
 */
export async function recalculatePropertyRate(propertyId: string) {
  const units = await prisma.unit.findMany({
    where: { propertyId, status: { not: "INACTIVE" } },
    include: { rate: true, seasonalRates: true },
  });

  const rates = units
    .map((unit) => {
      if (!unit.rate) return null;
      const input: UnitRateInput = {
        unitId: unit.id,
        label: unit.label,
        maxGuests: unit.maxGuests,
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
      };
      return effectiveNightlyRate(input);
    })
    .filter((value): value is number => typeof value === "number" && value > 0);

  const lowest = rates.length > 0 ? Math.min(...rates) : null;
  const capacity = units.reduce((total, unit) => total + unit.maxGuests, 0);

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: {
      baseNightlyRate: lowest,
      ...(capacity > 0 ? { maxGuests: capacity } : {}),
    },
    select: { id: true, partnerId: true },
  });

  return property;
}

/** Cheapest current nightly price for a property across its units. */
export function lowestNightly(units: { rate: { nightlyRate: number | null } | null }[]) {
  const values = units
    .map((unit) => unit.rate?.nightlyRate ?? null)
    .filter((value): value is number => typeof value === "number" && value > 0);
  return values.length > 0 ? Math.min(...values) : null;
}

export function unitSeasonalPreview(unit: {
  rate: UnitRateInput | null;
  seasonalRates: SeasonalRateInput[];
}) {
  if (!unit.rate) return null;
  const today = new Date();
  return nightlyForDate(
    { rate: unit.rate, seasonalRates: unit.seasonalRates, checkIn: today, checkOut: today },
    today,
  );
}

export function parseSearchParams(searchParams: Record<string, string | string[] | undefined>): SearchParams {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const toNumber = (value: string | undefined) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const amenities = searchParams["amenities"];

  return {
    q: get("q") ?? get("location"),
    category: get("category"),
    checkIn: get("checkIn"),
    checkOut: get("checkOut"),
    guests: toNumber(get("guests")),
    rooms: toNumber(get("rooms")),
    bedrooms: toNumber(get("bedrooms")),
    bathrooms: toNumber(get("bathrooms")),
    minPrice: toNumber(get("minPrice")),
    maxPrice: toNumber(get("maxPrice")),
    rating: toNumber(get("rating")),
    amenities: Array.isArray(amenities) ? amenities : amenities ? [amenities] : undefined,
    instant: get("instant") === "true" || get("instant") === "1",
    verifiedOnly: get("verified") === "true" || get("verified") === "1",
    sort: (get("sort") as PropertySort | undefined) ?? "relevance",
    page: toNumber(get("page")) ?? 1,
  };
}

export function searchParamsToQuery(params: Record<string, string | number | boolean | undefined>) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    usp.set(key, String(value));
  }
  return usp.toString();
}

export type { Property };
