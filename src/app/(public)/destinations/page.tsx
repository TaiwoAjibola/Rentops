import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { ClosingCta, PageHero } from "@/app/(public)/_components/page-hero";
import { DestinationCard } from "@/components/public/destination-card";
import type { DestinationTile } from "@/components/public/types";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/data";
import { buildPropertyWhere, getDestinationSummary, getPopularDestinations } from "@/lib/properties";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Popular destinations in Nigeria",
  description:
    "Browse accommodation by city and area — Lagos, Abuja, Port Harcourt and beyond — with live counts of places to stay in each destination.",
};

export default async function DestinationsPage() {
  const [popular, summary] = await Promise.all([getPopularDestinations(12), getDestinationSummary()]);

  const destinations: DestinationTile[] = await Promise.all(
    popular.map(async (location) => ({
      slug: location.slug,
      name: location.name,
      city: location.city,
      state: location.state,
      blurb: location.blurb,
      imageUrl: location.imageUrl,
      // Same query the destination page itself runs, so the count always matches.
      count: await prisma.property.count({ where: buildPropertyWhere({ q: location.name }) }),
    })),
  );

  return (
    <div>
      <PageHero
        eyebrow="Destinations"
        title="Where do you need to be?"
        description="Start with a city, or drill into the neighbourhood you know you want. Every destination shows only the listings that are approved and currently active."
      >
        <ButtonLink href="/search" variant="inverse" size="sm">
          Search by dates instead
        </ButtonLink>
      </PageHero>

      <section className="container-page mt-14">
        <SectionHeading
          eyebrow="Popular places"
          title="Destinations travellers and tenants ask for most"
          description="Areas our partners list in most often. Counts update automatically as properties are published, paused or taken down."
        />

        {destinations.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<MapPin className="h-5 w-5" aria-hidden />}
            title="No featured destinations yet"
            description="Once partners publish accommodation, the busiest areas appear here. You can still search every city RentOps covers."
            action={<ButtonLink href="/search">Search accommodation</ButtonLink>}
          />
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((destination) => (
              <DestinationCard key={destination.slug} destination={destination} />
            ))}
          </div>
        )}
      </section>

      {summary.length > 0 ? (
        <section className="container-page mt-16">
          <SectionHeading
            eyebrow="By city"
            title="Every city with accommodation on RentOps"
            description="The full list of cities our partners currently operate in, with the number of active listings in each."
          />

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((entry) => (
              <li key={entry.city}>
                <Link
                  href={`/search?q=${encodeURIComponent(entry.city)}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-white px-5 py-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    <span className="text-[14.5px] font-medium text-ink-900">{entry.city}</span>
                  </span>
                  <Badge tone="neutral">
                    {entry.count} {entry.count === 1 ? "stay" : "stays"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ClosingCta
        title="Own a place in one of these areas?"
        description="Hotels, shortlet owners, serviced apartment operators and landlords list on RentOps to take verified bookings online — you keep control of your pricing and availability."
        primary={<ButtonLink href="/partner/register">Create a partner account</ButtonLink>}
        secondary={
          <ButtonLink href="/partners/pricing" variant="outline" className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15">
            See commissions & payouts
          </ButtonLink>
        }
      />
    </div>
  );
}
