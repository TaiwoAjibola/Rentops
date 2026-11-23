import Link from "next/link";
import { X } from "lucide-react";

import { buildQueryString, currentAmenities, firstValue, type RawSearchParams } from "@/components/public/query";
import { formatMoney } from "@/lib/money";
import { RATE_BASIS_LABELS } from "@/lib/constants";

export type FilterChip = { key: string; label: string; clear: Record<string, string | number | boolean | readonly string[] | null> };

/** Removable summary of everything currently narrowing the results. */
export function AppliedFilters({
  chips,
  params,
  basePath = "/search",
}: {
  chips: FilterChip[];
  params: RawSearchParams;
  basePath?: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] text-ink-500">Filters:</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={`${basePath}${buildQueryString(params, chip.clear)}`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[12.5px] font-medium text-brand-800 transition-colors hover:border-brand-300 hover:bg-brand-100"
        >
          {chip.label}
          <X className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" aria-hidden />
          <span className="sr-only">Remove filter</span>
        </Link>
      ))}
    </div>
  );
}

export function buildFilterChips(
  params: RawSearchParams,
  labels: { amenityLabels: Record<string, string>; },
): FilterChip[] {
  const chips: FilterChip[] = [];

  const q = firstValue(params["q"]);
  if (q) chips.push({ key: "q", label: `“${q}”`, clear: { q: null } });

  const checkIn = firstValue(params["checkIn"]);
  const checkOut = firstValue(params["checkOut"]);
  if (checkIn || checkOut) {
    chips.push({
      key: "dates",
      label: checkIn && checkOut ? `${checkIn} → ${checkOut}` : checkIn ? `From ${checkIn}` : `Until ${checkOut}`,
      clear: { checkIn: null, checkOut: null },
    });
  }

  const guests = firstValue(params["guests"]);
  if (guests && Number(guests) > 1) {
    chips.push({ key: "guests", label: `${guests} guests`, clear: { guests: null } });
  }

  const bedrooms = firstValue(params["bedrooms"]);
  if (bedrooms) chips.push({ key: "bedrooms", label: `${bedrooms}+ bedrooms`, clear: { bedrooms: null } });

  const bathrooms = firstValue(params["bathrooms"]);
  if (bathrooms) chips.push({ key: "bathrooms", label: `${bathrooms}+ bathrooms`, clear: { bathrooms: null } });

  const minPrice = firstValue(params["minPrice"]);
  if (minPrice) chips.push({ key: "minPrice", label: `From ${formatMoney(Number(minPrice) * 100, "NGN", { compact: true })}`, clear: { minPrice: null } });

  const maxPrice = firstValue(params["maxPrice"]);
  if (maxPrice) {
    chips.push({
      key: "maxPrice",
      label: `Up to ${formatMoney(Number(maxPrice) * 100, "NGN", { compact: true })} ${RATE_BASIS_LABELS.NIGHTLY}`,
      clear: { maxPrice: null },
    });
  }

  const rating = firstValue(params["rating"]);
  if (rating) chips.push({ key: "rating", label: `${rating}.0+ rating`, clear: { rating: null } });

  const instant = firstValue(params["instant"]);
  if (instant === "true" || instant === "1") {
    chips.push({ key: "instant", label: "Instant booking", clear: { instant: null } });
  }

  const verified = firstValue(params["verified"]);
  if (verified === "true" || verified === "1") {
    chips.push({ key: "verified", label: "Verified only", clear: { verified: null } });
  }

  const amenities = currentAmenities(params);
  for (const slug of amenities) {
    chips.push({
      key: `amenity-${slug}`,
      label: labels.amenityLabels[slug] ?? slug,
      clear: { amenities: amenities.filter((entry) => entry !== slug) },
    });
  }

  return chips;
}
