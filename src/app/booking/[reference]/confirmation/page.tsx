import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate, describeDuration } from "@/lib/dates";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_TONES } from "@/lib/constants";

export const metadata = { title: "Booking confirmation" };

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const user = await requireUser(`/booking/${reference}/confirmation`);

  const reservation = await prisma.reservation.findUnique({
    where: { reference },
    include: {
      property: { select: { name: true, slug: true, city: true, checkInFrom: true } },
      units: { include: { unit: { select: { label: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Never show another customer's booking.
  if (!reservation || reservation.userId !== user.id) notFound();

  const confirmed = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(reservation.status);
  const latestPayment = reservation.payments[0];

  return (
    <div className="mx-auto w-full max-w-[720px] py-12 text-center">
      <span
        className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${
          confirmed ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
        }`}
        aria-hidden
      >
        {confirmed ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
      </span>

      <h1 className="mt-4 font-display text-3xl text-ink-900">
        {confirmed ? "You're booked!" : "Payment pending"}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-600">
        {confirmed
          ? `Your stay at ${reservation.property.name} is confirmed. A confirmation is on its way to ${user.email}.`
          : `We are still waiting for payment confirmation for ${reservation.property.name} — this usually takes a few seconds.`}
      </p>

      <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2">
        <Badge tone={RESERVATION_STATUS_TONES[reservation.status]} dot>
          {RESERVATION_STATUS_LABELS[reservation.status]}
        </Badge>
        <span className="text-[15px] font-semibold tracking-wide text-ink-900">{reservation.reference}</span>
      </div>

      <div className="mx-auto mt-6 max-w-md rounded-lg border border-line bg-white p-5 text-left">
        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Property</dt>
            <dd className="font-medium text-ink-900">{reservation.property.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Location</dt>
            <dd className="font-medium text-ink-900">{reservation.property.city}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Dates</dt>
            <dd className="font-medium text-ink-900">
              {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Stay</dt>
            <dd className="font-medium text-ink-900">{describeDuration(reservation.nights)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Units</dt>
            <dd className="font-medium text-ink-900">
              {reservation.units.map((entry) => entry.unit.label).join(", ") || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2">
            <dt className="text-ink-500">Paid</dt>
            <dd className="font-semibold text-ink-900">
              {latestPayment ? formatMoney(latestPayment.amount, latestPayment.currency) : formatMoney(reservation.grossAmount, reservation.currency)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/account/reservations">View my reservations</ButtonLink>
        <ButtonLink href="/search" variant="outline">
          Browse more places
        </ButtonLink>
      </div>
    </div>
  );
}
