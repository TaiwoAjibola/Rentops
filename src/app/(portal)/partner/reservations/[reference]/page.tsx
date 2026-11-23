import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Callout, InfoRow } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import {
  BOOKING_MODE_LABELS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
} from "@/lib/constants";
import { ReservationActions } from "@/components/partner/reservation-actions";

export default async function PartnerReservationDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { partner } = await requirePartnerContext();
  const { reference } = await params;

  const propertyIds = (
    await prisma.property.findMany({ where: { partnerId: partner.id }, select: { id: true } })
  ).map((entry) => entry.id);

  const reservation = await prisma.reservation.findFirst({
    where: { reference, propertyId: { in: propertyIds } },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      property: { select: { id: true, name: true, slug: true } },
      units: { include: { unit: { select: { label: true } } } },
      payments: true,
    },
  });

  if (!reservation) notFound();

  const quote = (reservation.quote ?? {}) as {
    accommodationSubtotal?: number;
    cleaningFee?: number;
    serviceCharge?: number;
    extraGuestCharges?: number;
    discountAmount?: number;
  };

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-500">
        <Link href="/partner/reservations" className="hover:text-brand-700">Reservations</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-800">{reservation.reference}</span>
      </nav>

      <SectionHeading
        eyebrow={reservation.reference}
        title={`${reservation.user.firstName} ${reservation.user.lastName}`}
        description={reservation.property.name}
        action={
          <Badge tone={RESERVATION_STATUS_TONES[reservation.status]}>
            {RESERVATION_STATUS_LABELS[reservation.status]}
          </Badge>
        }
      />

      {reservation.status === "PENDING_APPROVAL" ? (
        <Callout tone="warning" title="Awaiting your approval">
          This request holds the inventory until you decide. Approving moves it to payment;
          declining releases the dates immediately.
        </Callout>
      ) : null}

      {reservation.dueDiligenceRequired && reservation.dueDiligenceNote ? (
        <Callout tone="info" title="Due diligence">{reservation.dueDiligenceNote}</Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Stay</h2>
            <dl className="mt-3">
              <InfoRow label="Check-in" value={formatDate(reservation.checkIn)} />
              <InfoRow label="Check-out" value={formatDate(reservation.checkOut)} />
              <InfoRow label="Duration" value={`${reservation.nights} nights`} />
              <InfoRow label="Guests" value={reservation.guests} />
              <InfoRow label="Booking mode" value={BOOKING_MODE_LABELS[reservation.bookingMode]} />
              <InfoRow
                label="Units"
                value={reservation.units.map((entry) => entry.unit.label).join(", ") || "—"}
              />
              {reservation.specialRequests ? (
                <InfoRow label="Guest requests" value={reservation.specialRequests} />
              ) : null}
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Money</h2>
            <dl className="mt-3">
              <InfoRow
                label="Accommodation"
                value={formatMoney(quote.accommodationSubtotal ?? reservation.accommodationSubtotal, reservation.currency)}
              />
              {quote.extraGuestCharges ? (
                <InfoRow label="Extra guests" value={formatMoney(quote.extraGuestCharges, reservation.currency)} />
              ) : null}
              {quote.cleaningFee ? (
                <InfoRow label="Cleaning" value={formatMoney(quote.cleaningFee, reservation.currency)} />
              ) : null}
              {quote.serviceCharge ? (
                <InfoRow label="Service charge" value={formatMoney(quote.serviceCharge, reservation.currency)} />
              ) : null}
              {quote.discountAmount ? (
                <InfoRow label="Discount" value={`-${formatMoney(quote.discountAmount, reservation.currency)}`} />
              ) : null}
              <InfoRow label="Customer paid" value={formatMoney(reservation.grossAmount, reservation.currency)} />
              <InfoRow
                label="RentOps commission"
                value={formatMoney(reservation.platformCommission, reservation.currency)}
              />
              <InfoRow
                label="Your payout"
                value={formatMoney(reservation.partnerNetAmount, reservation.currency)}
              />
            </dl>
            <p className="mt-3 text-[13px] text-ink-500">
              The gross payment is not RentOps revenue — only the commission is. Your payout is
              released after verified check-in per the settlement policy.
            </p>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Guest</h2>
            <p className="mt-2 font-medium text-ink-900">
              {reservation.user.firstName} {reservation.user.lastName}
            </p>
            <p className="text-sm text-ink-600">{reservation.user.email}</p>
            <p className="text-sm text-ink-600">{reservation.user.phone ?? "—"}</p>
          </section>

          <ReservationActions
            reservationId={reservation.id}
            status={reservation.status}
            currency={reservation.currency}
            refundAmount={reservation.grossAmount}
          />

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Payments</h2>
            {reservation.payments.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No payment recorded yet.</p>
            ) : (
              <dl className="mt-2">
                {reservation.payments.map((payment) => (
                  <InfoRow
                    key={payment.id}
                    label={`${payment.status} · ${payment.reference}`}
                    value={formatMoney(payment.amount, payment.currency)}
                  />
                ))}
              </dl>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
