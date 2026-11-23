import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { SmartImage } from "@/components/public/media";
import type { DestinationTile } from "@/components/public/types";
import { cn } from "@/lib/utils";

/** Destination / area card with real listing counts. */
export function DestinationCard({
  destination,
  size = "md",
  className,
}: {
  destination: DestinationTile;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className={cn(
        "group relative block overflow-hidden rounded-lg border border-line bg-ink-100 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        size === "lg" ? "aspect-[4/3]" : "aspect-[3/2]",
        className,
      )}
    >
      <SmartImage
        src={destination.imageUrl}
        alt={`${destination.name}, ${destination.city}`}
        sizes={size === "lg" ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
        className="group-hover:scale-[1.04]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" aria-hidden />

      <span className="absolute inset-x-0 bottom-0 p-4 text-white">
        <span className="block font-display text-lg leading-tight">{destination.name}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-white/80">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {destination.city}
          {destination.state ? `, ${destination.state}` : ""}
        </span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white/90">
          {destination.count > 0 ? `${destination.count} places to stay` : "Coming soon"}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </span>
      </span>
    </Link>
  );
}
