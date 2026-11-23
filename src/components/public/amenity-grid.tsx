import { Check } from "lucide-react";

import { EmptyState } from "@/components/ui/data";

import type { AmenityLite } from "@/components/public/types";

/**
 * Amenities grouped the way they are maintained in the catalogue (Comfort,
 * Security, Kitchen, Connectivity…) so a guest can scan rather than read a wall
 * of icons.
 */
export function AmenityGrid({
  amenities,
  columns = 3,
}: {
  amenities: AmenityLite[];
  columns?: 2 | 3;
}) {
  if (amenities.length === 0) {
    return (
      <EmptyState
        icon={<Check className="h-5 w-5" />}
        title="No amenities listed"
        description="This partner has not published an amenity list yet. Ask them a question before you book."
      />
    );
  }

  const groups = new Map<string, AmenityLite[]>();
  for (const amenity of amenities) {
    const key = amenity.group?.trim() || "General";
    const bucket = groups.get(key);
    if (bucket) bucket.push(amenity);
    else groups.set(key, [amenity]);
  }

  const entries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={columns === 3 ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-6 sm:grid-cols-2"}>
      {entries.map(([group, items]) => (
        <section key={group}>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">{group}</h3>
          <ul className="mt-3 space-y-2">
            {items.map((amenity) => (
              <li key={amenity.id} className="flex items-start gap-2 text-[14px] text-ink-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <span>{amenity.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
