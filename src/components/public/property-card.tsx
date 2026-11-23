import Link from "next/link";
import { BadgeCheck, Bath, BedDouble, Sparkles, Users, Zap } from "lucide-react";

import { Rating } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PriceInline } from "@/components/ui/price";
import { FavouriteButton } from "@/components/public/favourite-button";
import { SmartImage } from "@/components/public/media";
import type { PropertyCard as PropertyCardRecord } from "@/lib/properties";
import { cn } from "@/lib/utils";

/**
 * The canonical listing card.
 *
 * The advertised price always carries its billing period (per night / week /
 * month / year) — a bare number is never shown anywhere on RentOps.
 */
export function PropertyCard({
  property,
  signedIn = false,
  saved = false,
  availableUnits = null,
  datesLabel = null,
  priority = false,
  className,
}: {
  property: PropertyCardRecord;
  signedIn?: boolean;
  saved?: boolean;
  /** Number of units free for the searched dates (null = no dates searched). */
  availableUnits?: number | null;
  datesLabel?: string | null;
  priority?: boolean;
  className?: string;
}) {
  const href = `/properties/${property.slug}`;
  const location = [property.area, property.city].filter(Boolean).join(", ");
  const hasPrice = typeof property.baseNightlyRate === "number" && property.baseNightlyRate > 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        <SmartImage
          src={property.coverImageUrl}
          alt={property.name}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="group-hover:scale-[1.03]"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            {property.verificationBadge ? (
              <Badge tone="success" className="bg-white/95 backdrop-blur-sm">
                <BadgeCheck className="h-3 w-3" aria-hidden />
                Verified
              </Badge>
            ) : null}
            {property.featured ? (
              <Badge tone="info" className="bg-white/95 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" aria-hidden />
                Featured
              </Badge>
            ) : null}
            {property.instantBooking ? (
              <Badge tone="neutral" className="bg-white/95 backdrop-blur-sm">
                <Zap className="h-3 w-3" aria-hidden />
                Instant booking
              </Badge>
            ) : null}
          </div>

          {signedIn ? (
            <FavouriteButton propertyId={property.id} saved={saved} returnTo={href} />
          ) : null}
        </div>

        {property.category ? (
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink-950/55 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] text-white backdrop-blur-sm">
            {property.category.name}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-semibold leading-snug text-ink-900">
          <Link href={href} className="transition-colors after:absolute after:inset-0 hover:text-brand-700">
            {property.name}
          </Link>
        </h3>

        <p className="mt-1 text-[13px] text-ink-500">{location || property.state}</p>

        {property.headline ? (
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-600">{property.headline}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-ink-400" aria-hidden />
            {property.maxGuests} guest{property.maxGuests === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5 text-ink-400" aria-hidden />
            {property.bedrooms} bed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bath className="h-3.5 w-3.5 text-ink-400" aria-hidden />
            {property.bathrooms} bath
          </span>
        </div>

        {availableUnits !== null && datesLabel ? (
          <p
            className={cn(
              "mt-2.5 text-[12.5px] font-medium",
              availableUnits > 0 ? "text-success" : "text-ink-500",
            )}
          >
            {availableUnits > 0
              ? `${availableUnits} available for ${datesLabel}`
              : `Fully booked for ${datesLabel}`}
          </p>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
          <Rating value={property.ratingAverage ?? 0} count={property.ratingCount} />
          {hasPrice ? (
            <PriceInline
              amount={property.baseNightlyRate ?? 0}
              currency={property.currency}
              basis={property.priceBasis}
              compact
              className="shrink-0"
            />
          ) : (
            <span className="shrink-0 text-[13px] font-medium text-ink-500">Rate on request</span>
          )}
        </div>
      </div>
    </article>
  );
}
