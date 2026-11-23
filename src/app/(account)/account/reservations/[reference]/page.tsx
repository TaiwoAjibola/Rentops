import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  CalendarCheck,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { CancelReservationDialog } from "@/components/account/cancel-reservation-dialog";
import { RequestRefundDialog } from "@/components/account/request-refund-dialog";
import { ReservationContactActions } from "@/components/account/reservation-contact-actions";
import { ReservationPriceBreakdown } from "@/components/account/quote-breakdown";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Callout, InfoRow } from "@/components/ui/data";
import { ButtonLink } from "@/components/ui/button";
import { DISPUTE_STATUS_LABELS, DISPUTE_STATUS_TONES, RESERVATION_STATUS_LABELS, RESERVATION_STATUS_TONES } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { describeDuration, formatDate, formatDateTime } from "@/lib/dates";
import { computeCancellationOutcome } from "@/lib/reservations";

type PageProps = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Reservation ${reference}` };
}

const CANCELLABLE = ["DRAFT", "PENDING_PAYMENT", "PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN"];

export default async function ReservationDetailPage({ params }: PageProps) {
  const { reference } = await params;
  const user = await requireUser(`/account/reservations/${reference}`);

  // Ownership is enforced by the `userId` scope — never by anything the client sent.
  const reservation = await prisma.reservation.findFirst({
    where: { reference, userId: user.id },
    include: {
      property: {
        include: {
          partner: { select: { businessName: true, phone: true, email: true, whatsapp: true } },
          cancellationPolicy: true,
          media: { where: { type: "IMAGE" }, orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
      units: { select: { unit: { select: { label: true, maxGuests: true, bedrooms: true } } } },
      reviews: { select: { id: true, status: true } },
      disputes: { orderBy: { createdAt: "desc" }, select: { id: true, reference: true, status: true, reason: true } },
    },
  });

  if (!reservation) notFound();

  const { property } = reservation;
  const cover = property.coverImageUrl ?? property.media[0]?.url ?? null;
  const outcome = computeCancellationOutcome({
    grossAmount: reservation.grossAmount,
    checkIn: reservation.checkIn,
    policy: property.cancellationPolicy,
  });

  const cancellable = CANCELLABLE.includes(reservation.status);
  const canReview = reservation.status === "CHECKED_OUT" && reservation.reviews.length === 0;
  const hoursUntilCheckIn = Math.round((reservation.checkIn.getTime() - Date.now()) / 3_600_000);

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <Link
        href="/account/reservations"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All reservations
      </Link>

      <AccountPageHeader
        eyebrow={`Reference ${reservation.reference}`}
        title={property.name}
        description={`${property.addressLine1}${property.area ? `, ${property.area}` : ""}, ${property.city}, ${property.state}`}
        actions={
          <StatusBadge
            label={RESERVATION_STATUS_LABELS[reservation.status]}
            tone={RESERVATION_STATUS_TONES[reservation.status]}
          />
        }
      />

      {reservation.status === "PENDING_PAYMENT" ? (
        <Callout tone="warning" title="Payment is still required" className="mb-6">
          <p>
            This booking is held for you but not confirmed until payment succeeds.{" "}
            <Link href="/account/reservations" className="font-semibold underline">
              Review your reservations
            </Link>{" "}
            and complete payment before the hold expires.
          </p>
        </Callout>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="relative h-48 w-full bg-ink-100 sm:h-56">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={property.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-widest text-ink-400">
                  RentOps
                </span>
              )}
            </div>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-ink-900">{property.name}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-500">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {property.city}, {property.state}
                  </p>
                </div>
                <ButtonLink href={`/properties/${property.slug}`} size="sm" variant="outline">
                  View listing
                </ButtonLink>
              </div>

              <dl className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
                <InfoRow label="Check-in" value={formatDate(reservation.checkIn)} />
                <InfoRow label="Check-out" value={formatDate(reservation.checkOut)} />
                <InfoRow label="Length of stay" value={describeDuration(reservation.nights)} />
                <InfoRow
                  label="Guests"
                  value={`${reservation.guests} (${reservation.adults} adult${reservation.adults === 1 ? "" : "s"}${reservation.children > 0 ? `, ${reservation.children} child${reservation.children === 1 ? "" : "ren"}` : ""}${reservation.infants > 0 ? `, ${reservation.infants} infant${reservation.infants === 1 ? "" : "s"}` : ""})`}
                />
                {reservation.units.length > 0 ? (
                  <InfoRow
                    label="Accommodation booked"
                    value={reservation.units.map((entry) => entry.unit.label).join(", ")}
                  />
                ) : null}
                <InfoRow label="Booking mode" value={reservation.bookingMode === "INSTANT" ? "Instant booking" : "Owner approval"} />
              </dl>

              {reservation.specialRequests ? (
                <div className="rounded-md bg-ink-50 px-4 py-3">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">Your requests</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-700">{reservation.specialRequests}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-[15px] font-semibold text-ink-900">Check-in and check-out</h2>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                <InfoRow label="Check-in from" value={property.checkInFrom ?? "Contact the property"} />
                <InfoRow label="Check-in until" value={property.checkInTo ?? "—"} />
                <InfoRow label="Check-out by" value={property.checkOutUntil ?? "—"} />
                <InfoRow
                  label="Guests per unit"
                  value={reservation.units.map((entry) => `${entry.unit.label}: ${entry.unit.maxGuests}`).join(", ") || "—"}
                />
              </dl>
              {property.houseRules ? (
                <div className="rounded-md border border-line bg-canvas px-4 py-3">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">House rules</p>
                  <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">
                    {property.houseRules}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {reservation.disputes.length > 0 ? (
            <Card>
              <CardBody className="space-y-3">
                <h2 className="text-[15px] font-semibold text-ink-900">Refund requests</h2>
                <ul className="space-y-3">
                  {reservation.disputes.map((dispute) => (
                    <li key={dispute.id} className="rounded-md border border-line px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[12px] uppercase tracking-wide text-ink-500">{dispute.reference}</p>
                        <StatusBadge
                          label={DISPUTE_STATUS_LABELS[dispute.status]}
                          tone={DISPUTE_STATUS_TONES[dispute.status]}
                        />
                      </div>
                      <p className="mt-1.5 text-[14px] text-ink-700">{dispute.reason}</p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-[15px] font-semibold text-ink-900">Price breakdown</h2>
              <ReservationPriceBreakdown
                reservation={{
                  quote: reservation.quote,
                  currency: reservation.currency,
                  nights: reservation.nights,
                  guests: reservation.guests,
                  priceBasis: reservation.priceBasis,
                  accommodationSubtotal: reservation.accommodationSubtotal,
                  extraGuestCharges: reservation.extraGuestCharges,
                  cleaningFee: reservation.cleaningFee,
                  serviceCharge: reservation.serviceCharge,
                  discountAmount: reservation.discountAmount,
                  grossAmount: reservation.grossAmount,
                  refundAmount: reservation.refundAmount,
                }}
              />
              {reservation.cancelledAt ? (
                <p className="text-[13px] text-ink-500">
                  Cancelled {formatDateTime(reservation.cancelledAt)}
                  {reservation.cancellationReason ? ` · ${reservation.cancellationReason}` : ""}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <h2 className="text-[15px] font-semibold text-ink-900">Cancellation policy</h2>
              <p className="text-[14px] font-medium text-ink-800">{property.cancellationPolicy?.name ?? "Standard policy"}</p>
              {property.cancellationPolicy?.description ? (
                <p className="text-[13px] leading-relaxed text-ink-600">{property.cancellationPolicy.description}</p>
              ) : null}
              <p className="text-[13px] text-ink-600">
                {cancellable ? (
                  <>
                    Cancelling now returns{" "}
                    <strong className="text-ink-900">
                      {outcome.refundPercent}% ({outcome.refundPercent === 0 ? "no refund" : "refund due"})
                    </strong>
                    .{" "}
                    {hoursUntilCheckIn > 0
                      ? `There are about ${Math.round(hoursUntilCheckIn / 24)} day(s) until check-in.`
                      : "Check-in has already passed."}
                  </>
                ) : (
                  "This reservation can no longer be cancelled from here — contact support and we will help."
                )}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {cancellable ? (
                  <CancelReservationDialog
                    reference={reservation.reference}
                    propertyName={property.name}
                    refundPercent={outcome.refundPercent}
                    refundAmount={outcome.refundAmount}
                    currency={reservation.currency}
                    policyName={outcome.policyName}
                    checkInLabel={formatDate(reservation.checkIn)}
                  />
                ) : null}
                <RequestRefundDialog
                  reference={reservation.reference}
                  grossAmount={reservation.grossAmount}
                  currency={reservation.currency}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <h2 className="text-[15px] font-semibold text-ink-900">Property contact</h2>
              <dl>
                <InfoRow label="Managed by" value={property.partner.businessName} />
                {property.contactName ? <InfoRow label="Contact" value={property.contactName} /> : null}
                {property.contactPhone || property.partner.phone ? (
                  <InfoRow
                    label="Phone"
                    value={
                      <a
                        href={`tel:${property.contactPhone ?? property.partner.phone}`}
                        className="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                        {property.contactPhone ?? property.partner.phone}
                      </a>
                    }
                  />
                ) : null}
              </dl>
              <ReservationContactActions reference={reservation.reference} />
              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                Keep your conversation on RentOps. If anything goes wrong, we can only help with what
                happened here.
              </p>
            </CardBody>
          </Card>

          {canReview ? (
            <Card className="border-brand-200 bg-brand-50">
              <CardBody className="space-y-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-gold-600">
                  <Star className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="text-[15px] font-semibold text-ink-900">How was your stay?</h2>
                <p className="text-[13px] leading-relaxed text-ink-600">
                  Your review helps the next guest choose well. It takes about a minute.
                </p>
                <ButtonLink href={`/account/reviews/new?reservation=${reservation.reference}`} size="sm">
                  Write a review
                </ButtonLink>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardBody className="space-y-2 text-[13px] text-ink-600">
              <p className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-ink-400" aria-hidden />
                Booked {formatDateTime(reservation.createdAt)}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-ink-400" aria-hidden />
                {describeDuration(reservation.nights)} ·{" "}
                {reservation.priceBasis === "NIGHTLY" ? "nightly" : reservation.priceBasis.toLowerCase()} basis
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-ink-400" aria-hidden />
                {reservation.purposeOfStay ? `Purpose: ${reservation.purposeOfStay}` : "Leisure stay"}
              </p>
              {property.bedrooms ? (
                <p className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-ink-400" aria-hidden />
                  {property.bedrooms} bedroom{property.bedrooms === 1 ? "" : "s"} · up to {property.maxGuests}{" "}
                  guests
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
