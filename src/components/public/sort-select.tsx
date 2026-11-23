"use client";

import { useRouter } from "next/navigation";

import { buildQueryString, type RawSearchParams } from "@/components/public/query";
import type { PropertySort } from "@/lib/properties";

const OPTIONS: { value: PropertySort; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Guest rating" },
  { value: "newest", label: "Newest listings" },
];

/**
 * Result ordering. Navigates immediately for a snappy feel, but stays a real
 * form so it also works without JavaScript (the Apply button only appears then).
 */
export function SortSelect({
  params,
  value = "relevance",
  basePath = "/search",
}: {
  params: RawSearchParams;
  value?: PropertySort;
  basePath?: string;
}) {
  const router = useRouter();

  const preserved = Object.entries(params).filter(([key, entry]) => {
    if (key === "sort" || key === "page") return false;
    if (entry === undefined || entry === "") return false;
    return true;
  });

  return (
    <form action={basePath} method="get" className="flex items-center gap-2">
      {preserved.map(([key, entry]) =>
        (Array.isArray(entry) ? entry : [entry ?? ""]).map((item, index) => (
          <input key={`${key}-${index}`} type="hidden" name={key} value={item} />
        )),
      )}

      <label htmlFor="sort-select" className="whitespace-nowrap text-[13px] text-ink-500">
        Sort
      </label>
      <select
        id="sort-select"
        name="sort"
        value={value}
        onChange={(event) => {
          router.push(`${basePath}${buildQueryString(params, { sort: event.target.value })}`, { scroll: false });
        }}
        className="h-10 cursor-pointer rounded-md border border-line-strong bg-white pl-3 pr-8 text-[13.5px] font-medium text-ink-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <noscript>
        <button type="submit" className="h-10 rounded-md border border-line-strong bg-white px-3 text-[13px] font-medium">
          Apply
        </button>
      </noscript>
    </form>
  );
}
