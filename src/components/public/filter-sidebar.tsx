import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox, Label } from "@/components/ui/field";
import { NumberSelect, PriceRange, ToggleRow } from "@/components/public/price-range";
import { currentAmenities, firstValue, type RawSearchParams } from "@/components/public/query";
import type { AmenityLite, CategoryLite } from "@/components/public/types";

/**
 * Discovery filters.
 *
 * Everything is a GET form submission, so a filtered result set is a URL that
 * can be shared, bookmarked and crawled, and it works with JavaScript disabled.
 */
export function FilterSidebar({
  params,
  categories,
  amenities,
  basePath = "/search",
}: {
  params: RawSearchParams;
  categories: CategoryLite[];
  amenities: AmenityLite[];
  basePath?: string;
}) {
  const selectedAmenities = currentAmenities(params);

  const rendered = new Set([
    "category",
    "checkIn",
    "checkOut",
    "minPrice",
    "maxPrice",
    "bedrooms",
    "bathrooms",
    "rating",
    "amenities",
    "instant",
    "verified",
    "page",
  ]);

  const preserved = Object.entries(params).filter(([key, value]) => {
    if (rendered.has(key)) return false;
    if (value === undefined || value === "") return false;
    return true;
  });

  const amenityGroups = new Map<string, AmenityLite[]>();
  for (const amenity of amenities) {
    const key = amenity.group?.trim() || "General";
    const bucket = amenityGroups.get(key);
    if (bucket) bucket.push(amenity);
    else amenityGroups.set(key, [amenity]);
  }

  return (
    <form action={basePath} method="get" className="rounded-lg border border-line bg-white p-5 shadow-xs">
      {preserved.map(([key, value]) =>
        (Array.isArray(value) ? value : [value ?? ""]).map((entry, index) => (
          <input key={`${key}-${index}`} type="hidden" name={key} value={entry} />
        )),
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-ink-900">Refine results</h2>
        <Link href={basePath} className="text-[12.5px] text-ink-500 underline-offset-4 hover:text-brand-700 hover:underline">
          Reset
        </Link>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <Label htmlFor="filter-category">Property type</Label>
          <select
            id="filter-category"
            name="category"
            defaultValue={firstValue(params["category"])}
            className="h-10 w-full cursor-pointer rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          >
            <option value="">All accommodation types</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">
            Available dates
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="filter-check-in" className="text-[12px]">
                Check in
              </Label>
              <input
                id="filter-check-in"
                name="checkIn"
                type="date"
                defaultValue={firstValue(params["checkIn"])}
                className="h-10 w-full rounded-md border border-line-strong bg-white px-2.5 text-[13px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              />
            </div>
            <div>
              <Label htmlFor="filter-check-out" className="text-[12px]">
                Check out
              </Label>
              <input
                id="filter-check-out"
                name="checkOut"
                type="date"
                defaultValue={firstValue(params["checkOut"])}
                className="h-10 w-full rounded-md border border-line-strong bg-white px-2.5 text-[13px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              />
            </div>
          </div>
        </fieldset>

        <PriceRange
          minPrice={firstValue(params["minPrice"])}
          maxPrice={firstValue(params["maxPrice"])}
          idPrefix="sidebar"
        />

        <NumberSelect
          name="bedrooms"
          label="Bedrooms"
          defaultValue={firstValue(params["bedrooms"])}
          from={1}
          to={6}
          suffix={(value) => `${value}+ bedroom${value === 1 ? "" : "s"}`}
        />

        <NumberSelect
          name="bathrooms"
          label="Bathrooms"
          defaultValue={firstValue(params["bathrooms"])}
          from={1}
          to={5}
          suffix={(value) => `${value}+ bathroom${value === 1 ? "" : "s"}`}
        />

        <NumberSelect
          name="rating"
          label="Guest rating"
          defaultValue={firstValue(params["rating"])}
          from={3}
          to={5}
          suffix={(value) => `${value}.0 and above`}
        />

        <div className="space-y-3 border-t border-line pt-4">
          <ToggleRow
            id="filter-instant"
            name="instant"
            label="Instant booking only"
            hint="Book and pay immediately without waiting for approval."
            checked={firstValue(params["instant"]) === "true" || firstValue(params["instant"]) === "1"}
          />
          <ToggleRow
            id="filter-verified"
            name="verified"
            label="Verified properties only"
            hint="Identity, ownership and location checks completed."
            checked={firstValue(params["verified"]) === "true" || firstValue(params["verified"]) === "1"}
          />
        </div>

        {amenityGroups.size > 0 ? (
          <details className="border-t border-line pt-4" open={selectedAmenities.length > 0}>
            <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">
              Amenities
            </summary>
            <div className="mt-3 space-y-4">
              {[...amenityGroups.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([group, items]) => (
                  <fieldset key={group}>
                    <legend className="mb-2 text-[12.5px] font-medium text-ink-700">{group}</legend>
                    <div className="space-y-2">
                      {items.map((amenity) => (
                        <label key={amenity.id} htmlFor={`amenity-${amenity.slug}`} className="flex cursor-pointer items-center gap-2.5">
                          <Checkbox
                            id={`amenity-${amenity.slug}`}
                            name="amenities"
                            value={amenity.slug}
                            defaultChecked={selectedAmenities.includes(amenity.slug)}
                          />
                          <span className="text-[13.5px] text-ink-700">{amenity.name}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
            </div>
          </details>
        ) : null}
      </div>

      <Button type="submit" className="mt-6 w-full">
        Apply filters
      </Button>
    </form>
  );
}
