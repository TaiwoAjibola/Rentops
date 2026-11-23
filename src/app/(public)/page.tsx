import Link from "next/link";

import { PriceInline } from "@/components/ui/price";
import { Rating } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/card";
import {
  getFeaturedProperties,
  getRecentlyAddedProperties,
  getPopularDestinations,
} from "@/lib/properties";

/**
 * RentOps homepage.
 *
 * Every listing shown here is read from the database — featured, recently added
 * and popular destinations are real queries, and every price renders with the
 * billing period ("per night", "per month", …) that applies to it.
 */
export default async function HomePage() {
  const [featured, recent, destinations] = await Promise.all([
    getFeaturedProperties(6),
    getRecentlyAddedProperties(6),
    getPopularDestinations(6),
  ]);

  return (
    <div className="dobule pb-4">
      {/* Hero ------------------------------------------------------------- */}
      <section className="bg-brand-900 text-white">
        <div className="container-page py-20">
          <Badge tone="neutral" className="mb-6">
            Lagos · Nigeria
          </Badge>
          <h1 className="max-w-3xl text-balance font-display text-4xl sm:text-5xl">
            Find a place to stay — for one night, or for years.
          </h1>
          <p className="mt-5 max-w-2xl text-white/90">
            Hotels, shortlets, serviced apartments and homes to let, in one marketplace. Search, compare and book — or apply to lease.
          </p>

          <form method="get" action="/search" className="mt-10 rounded-lg bg-white p-4 shadow-lg">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                name="q"
                placeholder="City or area"
                className="h-11 rounded-md border border-line px-3.5 text-ink-900"
              />
            </div>
            <ButtonLink href="/search" size="sm" className="mt-4">
              Search accommodation
            </ButtonLink>
          </form>
        </div>
      </section>

      {/* Featured --------------------------------------------------------- */}
      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="Featured"
          title="Places travellers and tenants love"
          action={<ButtonLink href="/search" variant="secondary">View all</ButtonLink>}
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((property) => (
            <ListingCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      {/* Destinations ------------------------------------------------------ */}
      {destinations.length > 0 ? (
        <section className="container-page mt-20">
          <SectionHeading eyebrow="Destinations" title="Popular places to stay" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((destination) => (
              <Link
                key={destination.id}
                href={`/search?q=${encodeURIComponent(destination.name)}`}
                className="rounded-lg border border-line bg-white p-5 shadow-xs transition-all hover:border-brand-300 hover:shadow-md"
              >
                <h3 className="font-semibold text-ink-900">{destination.name}</h3>
                <p className="mt-1 text-sm text-ink-500">{destination.city}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Recently added ---------------------------------------------------- */}
      <section className="container-page mt-20">
        <SectionHeading eyebrow="New" title="Recently added" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((property) => (
            <ListingCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      {/* Partner CTA ------------------------------------------------------- */}
      <section className="container-page mt-24">
        <div className="rounded-lg bg-brand-50 px-6 py-16 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl text-ink-900">
            Own accommodation? Put it in front of thousands.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-600">
            RentOps gives hotels, shortlet owners, landlords and property managers the technology, visibility and payment infrastructure to take bookings online — you keep control of your pricing, availability and duration rules.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/partner/register">Create a partner account</ButtonLink>
            <ButtonLink href="/search" variant="outline">Browse the marketplace</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}

type Listing = Awaited<ReturnType<typeof getFeaturedProperties>>[number];

function ListingCard({ property }: { property: Listing }) {
  return (
    <Link
      href={`/properties/${property.slug}`}
      className="group overflow-hidden rounded-lg border border-line bg-white shadow-xs transition-all hover:shadow-md"
    >
      <div className="h-44 w-full bg-brand-100 bg-cover bg-center" style={{ background: `url(${property.coverImageUrl})` }}>
        {property.verificationBadge ? (
          <Badge tone="success" dot className="m-3">
            Verified
          </Badge>
        ) : null}
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-[0.08em] text-ink-500">
          {property.category.slug} · {property.city}
        </p>
        <h3 className="mt-2 font-semibold text-ink-900 group-hover:text-brand-700">{property.name}</h3>
        <div className="mt-2">
          <Rating value={property.ratingAverage ?? 0} count={property.ratingCount ?? 0} size="sm" />
        </div>
        <p className="mt-2 text-sm text-ink-500">
          {property.bedrooms} bed · {property.maxGuests} guests
        </p>
        <div className="mt-4 flex items-end justify-between">
          {property.baseNightlyRate ? (
            <PriceInline amount={property.baseNightlyRate} currency={property.currency} basis={property.priceBasis} compact />
          ) : (
            <span className="text-sm text-ink-500">Enquire for pricing</span>
          )}
          <span className="text-sm font-medium text-brand-700">View</span>
        </div>
      </div>
    </Link>
  );
}
