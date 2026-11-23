import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requirePlatformStaff } from "@/lib/auth/session";
import { hasPlatformPermission } from "@/lib/auth/rbac";
import { Badge } from "@/components/ui/badge";
import { Callout, InfoRow } from "@/components/ui/data";
import { Rating } from "@/components/ui/avatar";
import { PriceInline } from "@/components/ui/price";
import { PropertyModerationPanel } from "@/components/admin/property-moderation";
import { formatMoney } from "@/lib/money";
import { formatDate, describeDuration } from "@/lib/dates";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  VERIFICATION_LEVEL_LABELS,
  VERIFICATION_STATUS_LABELS,
  RATE_BASIS_LABELS,
} from "@/lib/constants";

export default async function AdminPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requirePlatformStaff();
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      category: true,
      partner: true,
      media: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
      units: { include: { rate: true, media: { select: { id: true } } }, orderBy: { sortOrder: "asc" } },
      fees: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      verificationChecks: true,
      cancellationPolicy: true,
      reviews: { where: { status: "PUBLISHED" }, take: 5 },
    },
  });

  if (!property) notFound();

  const canReview = hasPlatformPermission(staff.systemRole, "property.review");
  const canManage = hasPlatformPermission(staff.systemRole, "property.manage");
  const location = [property.area, property.city, property.state].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-500">
        <Link href="/admin/properties" className="hover:text-brand-700">Properties</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-800">{property.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={PROPERTY_STATUS_TONES[property.status]} dot>
              {PROPERTY_STATUS_LABELS[property.status]}
            </Badge>
            <Badge tone="neutral">{property.category.name}</Badge>
            {property.verificationBadge ? <Badge tone="success">Verified</Badge> : null}
            {!property.isActive ? <Badge tone="danger">Hidden</Badge> : null}
          </div>
          <h1 className="mt-3 font-display text-3xl text-ink-900">{property.name}</h1>
          <p className="mt-1 text-ink-600">{location}</p>
          <div className="mt-2">
            <Rating value={property.ratingAverage ?? 0} count={property.ratingCount ?? 0} />
          </div>
        </div>

        <div className="text-sm text-ink-500">
          <p>Submitted {property.submittedAt ? formatDate(property.submittedAt) : "—"}</p>
          <p>Published {property.publishedAt ? formatDate(property.publishedAt) : "—"}</p>
        </div>
      </header>

      {property.rejectionReason ? (
        <Callout tone="danger" title="Rejection reason">
          {property.rejectionReason}
        </Callout>
      ) : null}
      {property.adminNotes ? (
        <Callout tone="warning" title="Admin notes">{property.adminNotes}</Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Details</h2>
            <dl className="mt-3">
              <InfoRow label="Address" value={property.addressLine1} />
              <InfoRow label="Verification level" value={VERIFICATION_LEVEL_LABELS[property.verificationLevel]} />
              <InfoRow label="Sleeps up to" value={`${property.maxGuests} guests`} />
              <InfoRow label="Bedrooms / bathrooms" value={`${property.bedrooms} / ${property.bathrooms}`} />
              <InfoRow label="Booking mode" value={property.instantBooking ? "Instant" : "Approval required"} />
              <InfoRow label="Minimum stay" value={`${property.minNights} nights`} />
              <InfoRow
                label="Maximum stay"
                value={property.maxNights ? describeDuration(property.maxNights) : "No limit"}
              />
              <InfoRow label="Reserve without paying" value={property.allowPayLater ? `Allowed (${property.unpaidHoldDays ?? 2} day hold)` : "Not allowed"} />
              {property.cancellationPolicy ? (
                <InfoRow label="Cancellation" value={property.cancellationPolicy.name} />
              ) : null}
            </dl>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {property.description}
            </p>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Units, media &amp; pricing</h2>
            {property.units.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No units configured yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {property.units.map((unit) => (
                  <div key={unit.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2 last:border-0">
                    <span className="text-sm text-ink-800">
                      {unit.label}
                      <span className="ml-2 text-ink-500">
                        {unit.status} · sleeps {unit.maxGuests} · {unit.media.length} media item{unit.media.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    {unit.rate?.nightlyRate ? (
                      <PriceInline amount={unit.rate.nightlyRate} currency={property.currency} basis="NIGHTLY" compact />
                    ) : unit.rate?.monthlyRate ? (
                      <span className="text-sm font-medium text-ink-800">{formatMoney(unit.rate.monthlyRate, property.currency, { compact: true })} / month</span>
                    ) : (
                      <span className="text-sm text-ink-500">No rate</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Taxes, caution &amp; fees</h2>
            {property.fees.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No configurable fees set.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-ink-700">
                {property.fees.map((fee) => (
                  <li key={fee.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 last:border-0">
                    <span>
                      {fee.name}{" "}
                      <span className="text-ink-400">
                        ({fee.kind.toLowerCase().replaceAll("_", " ")}, {fee.appliesTo.replace("PER_", "per ").toLowerCase()})
                        {fee.isRefundable ? ", refundable" : ""}
                      </span>
                    </span>
                    <span className="font-medium text-ink-900">
                      {fee.calculation === "VARIABLE"
                        ? "Variable (set per booking)"
                        : fee.calculation === "PERCENTAGE"
                          ? `${fee.percentage ?? 0}%`
                          : formatMoney(fee.amount ?? 0, property.currency, { compact: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Verification checks</h2>
            {property.verificationChecks.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No checks recorded.</p>
            ) : (
              <dl className="mt-3">
                {property.verificationChecks.map((check) => (
                  <InfoRow
                    key={check.id}
                    label={check.type}
                    value={VERIFICATION_STATUS_LABELS[check.status]}
                  />
                ))}
              </dl>
            )}
            {property.amenities.length > 0 ? (
              <p className="mt-4 text-sm text-ink-600">
                <strong>Amenities:</strong> {property.amenities.map((a) => a.amenity.name).join(", ")}
              </p>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Partner</h2>
            <p className="mt-2 font-medium text-ink-900">{property.partner.businessName}</p>
            <p className="text-sm text-ink-500">{property.partner.email}</p>
            <Link
              href={`/admin/partners/${property.partner.id}`}
              className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
            >
              Open partner →
            </Link>
          </section>

          <PropertyModerationPanel
            property={property as never}
            canReview={canReview}
            canManage={canManage}
          />

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Public listing</h2>
            <p className="mt-2 text-sm text-ink-600">
              {property.status === "APPROVED" && property.isActive
                ? "This listing is publicly searchable."
                : "Not visible to customers yet."}
            </p>
            <Link
              href={`/properties/${property.slug}`}
              className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
            >
              View public page →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
