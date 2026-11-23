"use client";

import dynamic from "next/dynamic";
import { MapPinOff } from "lucide-react";

import { EmptyState } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { RATE_BASIS_LABELS } from "@/lib/constants";
import type { RateBasis } from "@prisma/client";

const MapCanvas = dynamic(() => import("@/components/public/map-canvas"), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-lg border border-line bg-ink-100" />,
});

/** Single-location map for the property page. */
export function PropertyMap({
  latitude,
  longitude,
  name,
  location,
  priceMinor = 0,
  currency = "NGN",
  basis = "NIGHTLY",
  height = 360,
  imageUrl,
}: {
  latitude: number | null;
  longitude: number | null;
  name: string;
  location: string;
  priceMinor?: number;
  currency?: string;
  basis?: RateBasis;
  height?: number;
  imageUrl?: string | null;
}) {
  if (latitude == null || longitude == null) {
    return (
      <EmptyState
        icon={<MapPinOff className="h-5 w-5" />}
        title="No map coordinates published"
        description="This partner has not released a map location for the property yet. The area is shown above."
      />
    );
  }

  return (
    <MapCanvas
      single
      zoom={15}
      height={height}
      pins={[
        {
          id: name,
          href: "#location",
          name,
          location,
          latitude,
          longitude,
          imageUrl,
          priceLabel:
            priceMinor > 0
              ? `${formatMoney(priceMinor, currency, { compact: true })} ${RATE_BASIS_LABELS[basis]}`
              : "View",
        },
      ]}
    />
  );
}
