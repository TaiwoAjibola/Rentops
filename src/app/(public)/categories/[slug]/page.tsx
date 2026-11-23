import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PropertyResults, savedPropertyIds } from "@/app/(public)/_components/property-results";
import { PageHero } from "@/app/(public)/_components/page-hero";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { firstValue, hrefWith, toNumber } from "@/components/public/query";
import { getCurrentUser } from "@/lib/auth/session";
import { searchProperties, type PropertySort } from "@/lib/properties";
import { RATE_BASIS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";

type SlugParams = { params: Promise<{ slug: string }> };

/** Active categories only — an inactive category has no public page. */
async function findCategory(slug: string) {
  const category = await prisma.propertyCategory.findUnique({ where: { slug } });
  if (!category || !category.isActive) return null;
  return category;
}

export async function generateMetadata({ params }: SlugParams): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) return { title: "Category not found" };

  return {
    title: `${category.name} — places to stay on RentOps`,
    description:
      category.description ??
      `Browse ${category.name.toLowerCase()} listings on RentOps — verified accommodation with clear pricing and real availability.`,
  };
}

const SORTS: { value: PropertySort; label: string }[] = [
  { value: "relevance", label: "Recommended" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

function resolveSort(value: string): PropertySort {
  return SORTS.some((option) => option.value === value) ? (value as PropertySort) : "relevance";
}

export default async function CategoryPage({
  params,
  searchParams,
}: SlugParams & { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const query = await searchParams;

  const category = await findCategory(slug);
  if (!category) notFound();

  const sort = resolveSort(firstValue(query["sort"]));
  const page = Math.max(1, toNumber(query["page"]) ?? 1);

  const [results, user] = await Promise.all([
    searchProperties({ category: slug, page, sort }),
    getCurrentUser(),
  ]);

  const savedIds = await savedPropertyIds(
    user?.id ?? null,
    results.properties.map((property) => property.id),
  );

  const basePath = `/categories/${category.slug}`;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="container-page pt-8">
        <ol className="flex items-center gap-1.5 text-[13px] text-ink-500">
          <li>
            <Link href="/categories" className="transition-colors hover:text-brand-700">
              Categories
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li aria-current="page" className="font-medium text-ink-800">
            {category.name}
          </li>
        </ol>
      </nav>

      <PageHero
        eyebrow={`${results.total} ${results.total === 1 ? "listing" : "listings"}`}
        title={category.name}
        description={
          category.description ??
          `Approved ${category.name.toLowerCase()} listings on RentOps, priced ${RATE_BASIS_LABELS[category.suggestedRateBasis]}.`
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/search" variant="inverse" size="sm">
            Search all accommodation
          </ButtonLink>
          <Badge tone="neutral" className="border-white/20 bg-white/10 text-white">
            Usually priced {RATE_BASIS_LABELS[category.suggestedRateBasis]}
          </Badge>
        </div>
      </PageHero>

      <section className="container-page mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] text-ink-600">
            {results.total > 0
              ? `Showing page ${results.page} of ${results.pageCount}`
              : "Nothing listed in this category yet"}
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
            emptyTitle={`No ${category.name.toLowerCase()} listed yet`}
            emptyDescription="Partners publish new places every week. Try another category, or search all accommodation currently available."
          />
        </div>
      </section>
    </div>
  );
}
