import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/app/(public)/_components/page-hero";
import { PropertyResults, savedPropertyIds } from "@/app/(public)/_components/property-results";
import { SmartImage } from "@/components/public/media";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/card";
import { firstValue, hrefWith, toNumber } from "@/components/public/query";
import { getCurrentUser } from "@/lib/auth/session";
import { getPopularDestinations, searchProperties, type PropertySort } from "@/lib/properties";
import { prisma } from "@/lib/db";

type SlugParams = { params: Promise<{ slug: string }> };

async function findDestination(slug: string) {
  return prisma.location.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: SlugParams): Promise<Metadata> {
  const { slug } = await params;
  const location = await findDestination(slug);
  if (!location) return { title: "Destination not found" };

  return {
    title: `Places to stay in ${location.name}`,
    description:
      location.blurb ??
      `Hotels, shortlets, serviced apartments and homes to let in ${location.name}, ${location.city}. Verified listings with clear pricing.`,
  };
}

const SORTS: { value: PropertySort; label: string }[] = [
  { value: "relevance", label: "Recommended" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

function resolveSort(value: string): PropertySort {
  return SORTS.some((option) => option.value === value) ? (value as PropertySort) : "relevance";
}

export default async function DestinationPage({
  params,
  searchParams,
}: SlugParams & { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const query = await searchParams;

  const location = await findDestination(slug);
  if (!location) notFound();

  const sort = resolveSort(firstValue(query["sort"]));
  const page = Math.max(1, toNumber(query["page"]) ?? 1);

  const [results, user, popular] = await Promise.all([
    // Searching the location name is what makes this page truthful: it matches
    // the city, the state and the neighbourhood recorded on every listing.
    searchProperties({ q: location.name, page, sort }),
    getCurrentUser(),
    getPopularDestinations(8),
  ]);

  const savedIds = await savedPropertyIds(
    user?.id ?? null,
    results.properties.map((property) => property.id),
  );

  const basePath = `/destinations/${location.slug}`;
  const others = popular.filter((entry) => entry.slug !== location.slug).slice(0, 6);
  const place = [location.name, location.city, location.state].filter(Boolean).join(", ");

  return (
    <div>
      <nav aria-label="Breadcrumb" className="container-page pt-8">
        <ol className="flex items-center gap-1.5 text-[13px] text-ink-500">
          <li>
            <Link href="/destinations" className="transition-colors hover:text-brand-700">
              Destinations
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li aria-current="page" className="font-medium text-ink-800">
            {location.name}
          </li>
        </ol>
      </nav>

      <PageHero
        eyebrow={`${results.total} ${results.total === 1 ? "place to stay" : "places to stay"}`}
        title={`Places to stay in ${location.name}`}
        description={
          location.blurb ??
          `Approved accommodation in ${place} — priced per night, per week, per month or per year depending on how long you want to stay.`
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href={`/search?q=${encodeURIComponent(location.name)}`} variant="inverse" size="sm">
            Search with dates
          </ButtonLink>
          <Badge tone="neutral" className="border-white/20 bg-white/10 text-white">
            {location.city}
            {location.state ? `, ${location.state}` : ""}
          </Badge>
        </div>
      </PageHero>

      {location.imageUrl ? (
        <div className="container-page mt-10">
          <div className="relative h-56 overflow-hidden rounded-lg border border-line bg-ink-100 sm:h-72">
            <SmartImage
              src={location.imageUrl}
              alt={`${location.name}, ${location.city}`}
              sizes="(max-width: 1024px) 100vw, 1280px"
              priority
            />
          </div>
        </div>
      ) : null}

      <section className="container-page mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] text-ink-600">
            {results.total > 0
              ? `Showing page ${results.page} of ${results.pageCount}`
              : "Nothing listed in this area yet"}
          </p>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sort listings">
            {SORTS.map((option) => {
              const active = option.value === sort;
              return (
                <Link
                  key={option.value}
                  href={hrefWith(basePath, query, { sort: option.value })}
                  aria-current={active ? "true" : undefined}
                  className={
                    active
                      ? "inline-flex h-9 items-center rounded-md border border-brand-700 bg-brand-700 px-3 text-[13px] font-medium text-white"
                      : "inline-flex h-9 items-center rounded-md border border-line-strong bg-white px-3 text-[13px] font-medium text-ink-700 transition-colors hover:bg-ink-50"
                  }
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <PropertyResults
            properties={results.properties}
            savedIds={savedIds}
            signedIn={Boolean(user)}
            basePath={basePath}
            params={query}
            page={results.page}
            pageCount={results.pageCount}
            emptyTitle={`No listings in ${location.name} yet`}
            emptyDescription="Partners publish new places every week. Try a nearby area, or search the whole of Nigeria for something similar."
          />
        </div>
      </section>

      {others.length > 0 ? (
        <section className="container-page mt-16">
          <SectionHeading
            eyebrow="Nearby"
            title="Other popular destinations"
            action={
              <ButtonLink href="/destinations" variant="ghost">
                All destinations
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            }
          />
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {others.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/destinations/${entry.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-[13.5px] font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  {entry.name}
                  <span className="text-ink-400">{entry.city}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
