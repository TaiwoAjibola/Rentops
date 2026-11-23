import Link from "next/link";

import { prisma } from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { PriceInline } from "@/components/ui/price";
import { SectionHeading } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUS_TONES } from "@/lib/constants";

/**
 * The partner's property portfolio.
 *
 * Every query is scoped to the signed-in partner, so one partner can never see
 * another partner's listings.
 */
export default async function PartnerPropertiesPage() {
  const { partner } = await requirePartnerContext();

  const properties = await prisma.property.findMany({
    where: { partnerId: partner.id },
    include: {
      category: true,
      _count: { select: { units: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Properties"
        title="Your properties"
        description="Create a listing, then manage its units, pricing and availability."
        action={<ButtonLink href="/partner/properties/new">Add property</ButtonLink>}
      />

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add your first property so customers can find and book it."
          action={<ButtonLink href="/partner/properties/new">Add your first property</ButtonLink>}
        />
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <div
              key={property.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white p-4"
            >
              <div
                className="h-16 w-24 shrink-0 rounded-md bg-brand-100 bg-cover bg-center"
                style={{ backgroundImage: property.coverImageUrl ? `url(${property.coverImageUrl})` : undefined }}
                role="img"
                aria-label={property.name}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={PROPERTY_STATUS_TONES[property.status]} dot>
                    {PROPERTY_STATUS_LABELS[property.status]}
                  </Badge>
                  <Badge tone="neutral">{property.category.name}</Badge>
                </div>
                <h3 className="mt-2 font-semibold text-ink-900">{property.name}</h3>
                <p className="text-sm text-ink-500">
                  {[property.area, property.city].filter(Boolean).join(", ")}
                  {" · "}
                  {property._count.units} unit{property._count.units === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-right">
                {property.baseNightlyRate ? (
                  <PriceInline
                    amount={property.baseNightlyRate}
                    currency={property.currency}
                    basis={property.priceBasis}
                    compact
                  />
                ) : (
                  <span className="text-sm text-ink-500">No rate set</span>
                )}
                <p className="mt-1 text-xs text-ink-400">
                  Added {formatDate(property.createdAt)}
                </p>
              </div>

              <ButtonLink href={`/partner/properties/${property.id}`} size="sm">
                Manage
              </ButtonLink>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-ink-500">
        Need to update settlement details instead?{" "}
        <Link href="/partner/onboarding" className="font-medium text-brand-700 hover:underline">
          Go to onboarding
        </Link>
        .
      </p>
    </div>
  );
}
