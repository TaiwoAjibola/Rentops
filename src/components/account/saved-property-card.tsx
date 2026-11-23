import Link from "next/link";
import { BedDouble, MapPin } from "lucide-react";

import { RemoveFavouriteButton } from "@/components/account/remove-favourite-button";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/avatar";
import { PriceTag } from "@/components/ui/price";
import type { PropertyCard } from "@/lib/properties";

export function SavedPropertyCard({ property }: { property: PropertyCard }) {
  const price = property.baseNightlyRate ?? 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xs transition-shadow hover:shadow-md">
      <Link
        href={`/properties/${property.slug}`}
        className="relative block aspect-[16/10] overflow-hidden bg-ink-100"
      >
        {property.coverImageUrl ? (
          // Partner uploads may be local files or Cloudinary URLs; the plain
          // element avoids per-host loader configuration.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.coverImageUrl}
            alt={`${property.name} in ${property.city}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-widest text-ink-400">
            RentOps
          </span>
        )}
        {property.verificationBadge ? (
          <span className="absolute left-3 top-3">
            <Badge tone="success" dot>
              Verified
            </Badge>
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {property.area ? `${property.area}, ` : ""}
            {property.city}
          </span>
        </p>

        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink-900">
          <Link href={`/properties/${property.slug}`} className="hover:underline">
            {property.name}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" aria-hidden />
            {property.bedrooms} bed{property.bedrooms === 1 ? "" : "s"}
          </span>
          <span>{property.maxGuests} guests</span>
          {property.ratingCount > 0 ? (
            <Rating value={property.ratingAverage ?? 0} count={property.ratingCount} size="xs" />
          ) : (
            <span>No reviews yet</span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3.5">
          {price > 0 ? (
            <PriceTag amount={price} currency={property.currency} basis={property.priceBasis} size="sm" />
          ) : (
            <p className="text-[13px] text-ink-500">Rates on request</p>
          )}

          <RemoveFavouriteButton propertyId={property.id} propertyName={property.name} />
        </div>
      </div>
    </article>
  );
}
