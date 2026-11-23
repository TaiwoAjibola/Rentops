"use client";

import dynamic from "next/dynamic";
import { MapPinOff } from "lucide-react";

import { EmptyState } from "@/components/ui/data";
import type { MapPin } from "@/components/public/map-canvas";

// Leaflet touches `window` on import, so the canvas is only ever loaded in the
// browser. Nothing about the results page depends on it being available.
const MapCanvas = dynamic(() => import("@/components/public/map-canvas"), {
  ssr: false,
  loading: () => <div className="h-[560px] w-full animate-pulse rounded-lg border border-line bg-ink-100" />,
});

/** Search-result pins with price labels and a hover card. */
export function MapView({
  pins,
  height = 620,
  emptyHint = "None of the matching properties have map coordinates yet.",
}: {
  pins: MapPin[];
  height?: number;
  emptyHint?: string;
}) {
  if (pins.length === 0) {
    return (
      <EmptyState
        icon={<MapPinOff className="h-5 w-5" />}
        title="Nothing to plot on the map"
        description={emptyHint}
      />
    );
  }

  return <MapCanvas pins={pins} height={height} />;
}
