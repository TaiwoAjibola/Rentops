import { notFound, redirect } from "next/navigation";

import Link from "next/link";

import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { evaluateDueDiligence } from "@/lib/due-diligence";
import { CheckoutPaymentForm } from "@/components/account/checkout-payment-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Callout, EmptyState, InfoRow } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate, describeDuration } from "@/lib/dates";
import { PROPERTY_STATUS_LABELS } from "@/lib/constants";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const user = await requireUser(`/checkout/${reference}`);

  const reservation = await prisma.reservation.findUnique({
    where: { reference },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          city: true,
          checkInFrom: true,
          checkInTo: true,
          checkOutUntil: true,
          dueDiligenceEnabled: true,
          dueDiligenceThresholdDays: true,
          mandatoryVerification: true,
        },
      },
      units: { include: { unit: { select: { label: true } } } },
      promotion: { select: { code: true } },
    },
  });

  if (!reservation || reservation.userId !== user.id) notFound();

  // Booking already resolved? Go straight to the outcome page.
  if (["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "REFUNDED", "REFUND_PENDING", "CANCELLED"].includes(reservation.status)) {
    redirect(`/booking/${reference}/confirmation`);
  }

  const dueDiligence = await evaluateDueDiligence({
    nights: reservation.nights,
    property: reservation.property,
  });

  if (reservation.status === "PENDING_APPROVAL") {
    return (
      <div className="mx-auto w-full max-w-[720px] py-6">
        <SectionHeading
          eyebrow="Almost there"
          title="Your stay is waiting for the property's approval"
          description={`${reservation.property.name} reviews approval requests before payment is taken — nothing is charged yet.`}
        />
        <div className="rounded-lg border border-line bg-white p-6">
          <Badge tone="warning" dot>Pending owner approval</Badge>
          <p className="mt-3 text-sm text-ink-600">
            You will be notified here as soon as the property approves. Approval lets you complete payment;
            a decline cancels the hold with no charge.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href={`/properties/${reservation.property.slug}`} variant="outline">
              View property
            </ButtonLink>
            <ButtonLink href="/account/reservations">My reservations</ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  if (reservation.status !== "PENDING_PAYMENT") {
    return (
      <div className="mx-auto w-full max-w-[720px] py-6">
        <EmptyState
          title="This booking is not awaiting payment"
          description="It may have expired or been cancelled. Browse availability to book again."
          action={<ButtonLink href="/search">Browse properties</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] py-6">
      <nav className="text-sm text-ink-500">
        <Link href={`/properties/${reservation.property.slug}`} className="hover:text-brand-700">
          {reservation.property.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-800">Checkout</span>
      </nav>

      <SectionHeading
        eyebrow="Checkout"
        title="Complete your booking"
        description={`${reservation.property.name} · ${formatDate(reservation.checkIn)} → ${formatDate(reservation.checkOut)} · ${describeDuration(reservation.nights)} · ${reservation.guests} guest${reservation.guests === 1 ? "" : "s"}`}
      />

      {dueDiligence.required ? (
        <Callout
          tone={dueDiligence.mandatory ? "warning" : "info"}
          title={dueDiligence.mandatory ? "Verification required" : "Recommended for this stay"}
        >
          {dueDiligence.message}
          {dueDiligence.verificationTypes.length > 0 ? (
            <p className="mt-1.5 text-[13px] opacity-90">
              What we may ask for: {dueDiligence.verificationTypes.join(", ").toLowerCase().replaceAll("_", " ")}.
            </p>
          ) : null}
        </Callout>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Your stay</h2>
          <dl className="mt-3">
            <InfoRow label="Property" value={reservation.property.name} />
            <InfoRow label="Location" value={reservation.property.city} />
            <InfoRow
              label="Units"
              value={reservation.units.map((entry) => entry.unit.label).join(", ") || "—"}
            />
            <InfoRow label="Check-in" value={formatDate(reservation.checkIn)} />
            <InfoRow label="Check-out" value={formatDate(reservation.checkOut)} />
            <InfoRow
              label="Check-in window"
              value={`${reservation.property.checkInFrom ?? "14:00"} – ${reservation.property.checkInTo ?? "22:00"}`}
            />
            <InfoRow label="Check-out by" value={reservation.property.checkOutUntil ?? "12:00"} />
            <InfoRow label="Booking reference" value={reservation.reference} />
          </dl>
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Price breakdown</h2>
            <dl className="mt-3">
              <InfoRow
                label={`Accommodation${reservation.nights > 0 ? ` · ${reservation.nights} night${reservation.nights === 1 ? "" : "s"}` : ""}`}
                value={formatMoney(reservation.accommodationSubtotal, reservation.currency)}
              />
              {reservation.extraGuestCharges > 0 ? (
                <InfoRow
                  label="Extra guest fees"
                  value={formatMoney(reservation.extraGuestCharges, reservation.currency)}
                />
              ) : null}
              {reservation.cleaningFee > 0 ? (
                <InfoRow label="Cleaning fee" value={formatMoney(reservation.cleaningFee, reservation.currency)} />
              ) : null}
              {reservation.taxAmount > 0 ? (
                <InfoRow label="Tax" value={formatMoney(reservation.taxAmount, reservation.currency)} />
              ) : null}
              {reservation.cautionAmount > 0 ? (
                <InfoRow label="Caution / deposit" value={formatMoney(reservation.cautionAmount, reservation.currency)} />
              ) : null}
              {reservation.serviceCharge > 0 ? (
                <InfoRow label="Service charge" value={formatMoney(reservation.serviceCharge, reservation.currency)} />
              ) : null}
              {Array.isArray(reservation.appliedFees)
                ? (reservation.appliedFees as any[])
                    .filter((fee) => fee && !fee.isVariable && fee.amount > 0 && fee.kind !== "TAX" && fee.kind !== "CAUTION_DEPOSIT")
                    .map((fee, idx) => (
                      <InfoRow
                        key={String(fee.id ?? idx)}
                        label={`${fee.name}${fee.isRefundable ? " (refundable)" : ""}`}
                        value={formatMoney(Number(fee.amount) || 0, reservation.currency)}
                      />
                    ))
                : null}
              {reservation.discountAmount > 0 ? (
                <InfoRow
                  label={`Discount${reservation.promotion ? ` · ${reservation.promotion.code}` : ""}`}
                  value={`−${formatMoney(reservation.discountAmount, reservation.currency)}`}
                />
              ) : null}
              {Array.isArray(reservation.appliedFees) && (reservation.appliedFees as any[]).some((fee) => fee?.isVariable) ? (
                <InfoRow
                  label="Additional fees (amount to be confirmed)"
                  value={(reservation.appliedFees as any[]).filter((fee) => fee?.isVariable).map((fee) => fee.name).join(", ")}
                />
              ) : null}
              <InfoRow
                label={reservation.paymentOption === "PAY_LATER" ? "Total due" : "Total due now"}
                value={<strong className="text-ink-900">{formatMoney(reservation.grossAmount, reservation.currency)}</strong>}
              />
            </dl>
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl text-ink-900">Payment</h2>
            {reservation.holdExpiresAt ? (
              <Callout tone={reservation.paymentOption === "PAY_LATER" ? "info" : "warning"} title={reservation.paymentOption === "PAY_LATER" ? "Reservation held without payment" : "Payment window"}>
                {reservation.paymentOption === "PAY_LATER"
                  ? `These dates are reserved for you. Complete payment by ${formatDate(reservation.holdExpiresAt, { dateStyle: "medium", timeStyle: "short" })} or the reservation will be released and the dates opened to others.`
                  : `Complete payment by ${formatDate(reservation.holdExpiresAt, { dateStyle: "medium", timeStyle: "short" })} to keep this booking.`}
              </Callout>
            ) : null}
            <p className="mt-2 text-[13px] text-ink-500">
              Payment is collected by our licensed provider — RentOps never holds your money as escrow.
            </p>
            <div className="mt-4">
              <CheckoutPaymentForm reference={reservation.reference} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
