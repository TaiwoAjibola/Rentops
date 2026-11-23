import type { Metadata } from "next";
import { Heart } from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { SavedPropertyCard } from "@/components/account/saved-property-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PROPERTY_CARD_SELECT } from "@/lib/properties";

export const metadata: Metadata = { title: "Favourites" };

export default async function FavouritesPage() {
  const user = await requireUser("/account/favourites");

  const saved = await prisma.savedProperty.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      createdAt: true,
      property: { select: PROPERTY_CARD_SELECT },
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <AccountPageHeader
        eyebrow="Favourites"
        title="Saved properties"
        description="Places you shortlisted. Prices always show the period they apply to — per night, week, month or year."
        actions={
          saved.length > 0 ? (
            <ButtonLink href="/properties" size="sm" variant="outline">
              Keep browsing
            </ButtonLink>
          ) : undefined
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-5 w-5" aria-hidden />}
          title="You have not saved any properties yet"
          description="Tap the heart on any listing to keep it here while you compare — nothing is shared with the property until you message them."
          action={
            <ButtonLink href="/properties" size="sm">
              Browse properties
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((entry) => (
            <li key={entry.id}>
              <SavedPropertyCard property={entry.property} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
