import type {
  Amenity,
  Location,
  MediaType,
  PropertyCategory,
  PropertyVerificationCheck,
  RateBasis,
} from "@prisma/client";

import type { PropertyCard, PropertyDetail } from "@/lib/properties";

/** Shared view-model types for the public (customer-facing) site. */

export type PropertyReview = PropertyDetail["reviews"][number];
export type PropertyMediaItem = PropertyDetail["media"][number];
export type PropertyUnitRecord = PropertyDetail["units"][number];
export type PropertyAmenityRecord = PropertyDetail["amenities"][number];

export type CategoryTile = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  suggestedRateBasis: RateBasis;
  count: number;
  imageUrl: string | null;
};

export type DestinationTile = {
  slug: string;
  name: string;
  city: string;
  state: string | null;
  count: number;
  imageUrl: string | null;
  blurb: string | null;
};

export type UnitAvailabilityWindow = {
  unitId: string;
  from: string;
  to: string;
};

/** Serializable unit summary handed to the booking widget. */
export type UnitSummary = {
  id: string;
  label: string;
  unitNumber: string | null;
  floor: string | null;
  categoryName: string | null;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds: string | null;
  sizeSqm: number | null;
  minNights: number;
  maxNights: number | null;
  rates: { basis: RateBasis; amount: number; basisLabel: string }[];
  availableFrom: string | null;
  available: boolean;
  previewImageUrl: string | null;
  mediaCount: number;
  hasTour: boolean;
};

export type MediaGroup = "IMAGE" | "VIDEO" | "YOUTUBE" | "TOUR" | "FLOOR_PLAN";

export function mediaGroupFor(type: MediaType): MediaGroup {
  switch (type) {
    case "VIDEO":
      return "VIDEO";
    case "YOUTUBE":
      return "YOUTUBE";
    case "VIRTUAL_TOUR":
    case "VIRTUAL_TOUR_360":
      return "TOUR";
    case "FLOOR_PLAN":
      return "FLOOR_PLAN";
    default:
      return "IMAGE";
  }
}

export function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match?.[1]) return match[1];
  }
  return null;
}

// -----------------------------------------------------------------------------
// Virtual tours
//
// A tour is only ever rendered as an interactive 360 experience when the media
// row genuinely carries scenes. Anything else (a walkthrough video, a hosted
// tour with no scene data) is presented as video — never dressed up as a tour.
// -----------------------------------------------------------------------------

export type TourHotspot = {
  yaw: number;
  pitch: number;
  to: string;
  label: string;
};

export type TourScene = {
  id: string;
  name: string;
  panorama: string;
  hotspots: TourHotspot[];
};

export type ParsedTour = {
  provider: string | null;
  scenes: TourScene[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Safely reads `meta` into a scene list. Returns null when there are no scenes. */
export function parseTourMeta(meta: unknown): ParsedTour | null {
  const record = asRecord(meta);
  const rawScenes = record["scenes"];
  if (!Array.isArray(rawScenes)) return null;

  const scenes: TourScene[] = [];
  for (const entry of rawScenes) {
    const scene = asRecord(entry);
    const id = typeof scene["id"] === "string" ? scene["id"] : "";
    const panorama = typeof scene["panorama"] === "string" ? scene["panorama"] : "";
    if (!id || !panorama) continue;

    const hotspots: TourHotspot[] = [];
    const rawHotspots = scene["hotspots"];
    if (Array.isArray(rawHotspots)) {
      for (const spot of rawHotspots) {
        const hotspot = asRecord(spot);
        const to = typeof hotspot["to"] === "string" ? hotspot["to"] : "";
        if (!to) continue;
        hotspots.push({
          yaw: asNumber(hotspot["yaw"]),
          pitch: asNumber(hotspot["pitch"]),
          to,
          label: typeof hotspot["label"] === "string" ? hotspot["label"] : "",
        });
      }
    }

    scenes.push({
      id,
      name: typeof scene["name"] === "string" && scene["name"] ? scene["name"] : "View",
      panorama,
      hotspots,
    });
  }

  if (scenes.length === 0) return null;

  const provider = typeof record["provider"] === "string" ? record["provider"] : null;
  return { provider, scenes };
}

export type AmenityLite = Pick<Amenity, "id" | "name" | "slug" | "group" | "icon">;
export type CategoryLite = Pick<PropertyCategory, "id" | "name" | "slug" | "icon" | "description">;
export type LocationLite = Pick<Location, "id" | "name" | "city" | "state" | "slug" | "imageUrl" | "blurb">;
export type VerificationCheck = Pick<PropertyVerificationCheck, "id" | "type" | "status" | "note">;
export type { PropertyCard, PropertyDetail };
