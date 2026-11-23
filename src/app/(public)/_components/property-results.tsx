import { SearchX } from "lucide-react";

import { PropertyCard } from "@/components/public/property-card";
import { Pagination } from "@/components/public/pagination";
import type { RawSearchParams } from "@/components/public/query";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import type { PropertyCard as PropertyCardRecord } from "@/lib/properties";
import { prisma } from "@/lib/db";

/**
 * Listing grid shared by the category and destination pages.
 *
 * Nothing here invents a result: when a category or destination genuinely has no
 * approved, active listings we render an empty state and point the visitor back
 * at search rather than padding the grid with filler.
 */

export async function savedPropertyIds(
  userId: string | null,
  propertyIds: string[],
): Promise<Set<string>> {
  if (!userId || propertyIds.length === 0) return new Set();

  const rows = await prisma.savedProperty.findMany({
    where: { userId, propertyId: { in: propertyIds } },
    select: { propertyId: true },
  });

  return new Set(rows.map((row) => row.propertyId));
}

export function PropertyResults({
  properties,
  savedIds,
  signedIn,
  basePath,
  params,
  page,
  pageCount,
  emptyTitle,
  emptyDescription,
}: {
  properties: PropertyCardRecord[];
  savedIds: Set<string>;
  signedIn: boolean;
  basePath: string;
  params: RawSearchParams;
  page: number;
  pageCount: number;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (properties.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="h-5 w-5" aria-hidden />}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <ButtonLink href="/search" variant="outline">
            Search all accommodation
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property, index) => (
          <PropertyCard
            key={property.id}
            property={property}
            signedIn={signedIn}
            saved={savedIds.has(property.id)}
            priority={page === 1 && index < 3}
          />
        ))}
      </div>

      <div className="mt-10">
        <Pagination page={page} pageCount={pageCount} params={params} basePath={basePath} />
      </div>
    </div>
  );
}
