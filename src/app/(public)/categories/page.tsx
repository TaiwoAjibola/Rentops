import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  Building2,
  Castle,
  Hotel,
  Home,
  KeyRound,
  Landmark,
  Tent,
  TreePalm,
  Warehouse,
  Waves,
} from "lucide-react";

import { PageHero } from "@/app/(public)/_components/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, SectionHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/data";
import { getCategoryHighlights } from "@/lib/properties";
import { RATE_BASIS_LABELS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Browse accommodation categories",
  description:
    "Hotels, shortlet apartments, serviced apartments, homes to let and more. Browse every RentOps accommodation category with live listing counts.",
};

/** Stable icon rotation so a category always renders the same glyph. */
const CATEGORY_ICONS: LucideIcon[] = [
  Hotel,
  Home,
  Building2,
  BedDouble,
  Waves,
  KeyRound,
  Tent,
  Castle,
  Landmark,
  Warehouse,
  TreePalm,
];

export default async function CategoriesPage() {
  const highlights = await getCategoryHighlights();

  return (
    <div>
      <PageHero
        eyebrow="Categories"
        title="Every kind of stay, in one marketplace"
        description="A hotel room for two nights, a serviced apartment for a quarter, a family home for a year. Pick the type of accommodation that fits how long you are staying — the counts below are live."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/search" variant="inverse" size="sm">
            Search all stays
          </ButtonLink>
          <ButtonLink
            href="/destinations"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15"
          >
            Browse destinations
          </ButtonLink>
        </div>
      </PageHero>

      <section className="container-page mt-14">
        <SectionHeading
          eyebrow="All categories"
          title="Choose how you want to stay"
          description="Each category carries the kinds of rates its listings are usually advertised with, so short stays and long leases are easy to tell apart."
        />

        {highlights.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Search className="h-5 w-5" aria-hidden />}
            title="Categories are being set up"
            description="No accommodation categories have been published yet. You can still search everything currently listed on RentOps."
            action={<ButtonLink href="/search">Search accommodation</ButtonLink>}
          />
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map(({ category, count }, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length] ?? Building2;

              return (
                <li key={category.id} className="h-full">
                  <Card className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                    <Link href={`/categories/${category.slug}`} className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <Badge tone={count > 0 ? "success" : "neutral"}>
                          {count === 0
                            ? "Coming soon"
                            : `${count} ${count === 1 ? "stay" : "stays"}`}
                        </Badge>
                      </div>

                      <h2 className="mt-4 text-[16px] font-semibold text-ink-900 group-hover:text-brand-800">
                        {category.name}
                      </h2>

                      <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-600">
                        {category.description ??
                          `Approved ${category.name.toLowerCase()} listings across Nigeria.`}
                      </p>

                      <p className="mt-4 text-[12.5px] uppercase tracking-[0.06em] text-ink-500">
                        Usually priced {RATE_BASIS_LABELS[category.suggestedRateBasis]}
                      </p>

                      <span className="mt-4 inline-flex items-center gap-1.5 border-t border-line pt-4 text-[13.5px] font-medium text-brand-700">
                        Browse {category.name.toLowerCase()}
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="container-page mt-20">
        <div className="rounded-lg border border-line bg-white p-8 shadow-xs sm:p-10">
          <SectionHeading
            eyebrow="Not sure where to start?"
            title="Short stay or long lease — both work the same way"
            description="Search your city, add your dates and filter by what matters. Every listing states its own minimum stay, cancellation terms and whether it books instantly or needs owner approval."
            action={
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/search">Start searching</ButtonLink>
                <ButtonLink href="/how-it-works" variant="outline">
                  How RentOps works
                </ButtonLink>
              </div>
            }
          />
        </div>
      </section>
    </div>
  );
}
