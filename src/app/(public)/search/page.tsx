import Link from "next/link";
import type { Metadata } from "next";

import { PropertyCard } from "@/components/public/property-card";
import { EmptyState } from "@/components/ui/data";
import { parseSearchParams, searchProperties } from "@/lib/properties";
import prisma from "@/lib/db";

export const metadata: Metadata = {
  title: "Search accommodation",
  description: "Find hotels, shortlets, serviced apartments and homes to let across Nigeria.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const params = parseSearchParams(raw);

  const [result, categories, amenities] = await Promise.all([
    searchProperties(params),
    prisma.propertyCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.amenity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const base = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) value.forEach((entry) => base.append(key, entry));
    else base.set(key, value);
  });

  const toggle = (key: string, value: string) => {
    const next = new URLSearchParams(base);
    const existing = next.get(key);
    if (existing === value) next.delete(key);
    else next.set(key, value);
    return `/search?${next.toString()}`;
  };

  const sorts = [
    { value: "relevance", label: "Relevance" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "rating", label: "Top rated" },
    { value: "newest", label: "Newest" },
  ];

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-ink-900">Places to stay</h1>
        <p className="mt-2 text-ink-600">
          {result.total} listing{result.total === 1 ? "" : "s"} match your search.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters -------------------------------------------------------- */}
        <aside className="space-y-6">
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">Category</h2>
            <ul className="mt-3 space-y-1.5">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={toggle("category", category.slug)}
                    className={`text-sm ${raw.category === category.slug ? "font-semibold text-brand-700" : "text-ink-700 hover:text-brand-700"}`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">Sort</h2>
            <ul className="mt-3 space-y-1.5">
              {sorts.map((sort) => (
                <li key={sort.value}>
                  <Link
                    href={toggle("sort", sort.value)}
                    className={`text-sm ${raw.sort === sort.value ? "font-semibold text-brand-700" : "text-ink-700 hover:text-brand-700"}`}
                  >
                    {sort.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">Filters</h2>
            <ul className="mt-3 space-y-1.5">
              <li>
                <Link href={toggle("instant", "true")} className="text-sm text-ink-700 hover:text-brand-700">
                  Instant booking
                </Link>
              </li>
              <li>
                <Link href={toggle("verified", "true")} className="text-sm text-ink-700 hover:text-brand-700">
                  Verified only
                </Link>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">Amenities</h2>
            <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {amenities.slice(0, 18).map((amenity) => (
                <li key={amenity.id}>
                  <Link
                    href={toggle("amenities", amenity.slug)}
                    className="text-sm text-ink-700 hover:text-brand-700"
                  >
                    {amenity.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <Link
            href="/search"
            className="inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            Clear all filters
          </Link>
        </aside>

        {/* Results -------------------------------------------------------- */}
        <section>
          {result.properties.length === 0 ? (
            <EmptyState
              title="No places match yet"
              description="Try widening your search — remove a filter or search a different city."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {result.properties.map((property) => (
                <PropertyCard key={property.id} property={property} signedIn={false} />
              ))}
            </div>
          )}

          {result.pageCount > 1 ? (
            <nav className="mt-10 flex items-center justify-center gap-2">
              {result.page > 1 ? (
                <Link
                  href={`/search?${withPage(base, result.page - 1).toString()}`}
                  className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                >
                  Previous
                </Link>
              ) : null}
              <span className="px-3 text-sm text-ink-500">
                Page {result.page} of {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <Link
                  href={`/search?${withPage(base, result.page + 1).toString()}`}
                  className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function withPage(base: URLSearchParams, page: number) {
  const next = new URLSearchParams(base);
  next.set("page", String(page));
  return next;
}
