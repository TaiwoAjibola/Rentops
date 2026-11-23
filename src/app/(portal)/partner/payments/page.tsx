import Link from "next/link";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Callout, EmptyState, Stat } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_TONES } from "@/lib/constants";
import { getLedgerSummary } from "@/lib/ledger";

export default async function PaymentsPage() {
  const { partner, can } = await requirePartnerContext();

  if (!can("finance.view")) {
    return (
      <div className="space-y-6">
        <SectionHeading eyebrow="Finance" title="Payments" />
        <Callout tone="warning" title="Not available to your role">
          Viewing financial records requires the <strong>finance.view</strong> permission.
        </Callout>
      </div>
    );
  }

  const propertyIds = (
    await prisma.property.findMany({ where: { partnerId: partner.id }, select: { id: true } })
  ).map((entry) => entry.id);

  const [reservations, ledger] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        propertyId: { in: propertyIds },
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "REFUND_PENDING", "REFUNDED"] },
      },
      include: {
        property: { select: { name: true } },
        payments: { where: { status: "SUCCESS" }, select: { id: true, paidAt: true } },
        settlements: { select: { reference: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getLedgerSummary({ partnerId: partner.id }),
  ]);

  const earned = reservations.reduce((sum, entry) => sum + entry.partnerNetAmount, 0);
  const commission = reservations.reduce((sum, entry) => sum + entry.platformCommission, 0);
  const settled = reservations.reduce((sum, entry) =>
    sum + entry.settlements.filter((s) => s.status === "PAID").reduce((inner) => inner + entry.partnerNetAmount, 0), 0);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Finance"
        title="Payments & earnings"
        description="What customers paid, what RentOps keeps, and what is owed to you."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Customer payments" value={formatMoney(ledger.customerPayments, "NGN", { compact: true })} />
        <Stat label="RentOps commission" value={formatMoney(commission, "NGN", { compact: true })} tone="warning" />
        <Stat label="Your earnings" value={formatMoney(earned, "NGN", { compact: true })} tone="success" />
        <Stat label="Outstanding to you" value={formatMoney(ledger.partnerPayable, "NGN", { compact: true })} tone="info" />
      </div>

      <Callout tone="info" title="How the money works">
        The customer's gross payment is <strong>not</strong> RentOps revenue. Only the commission is.
        Your payout is released after verified check-in, subject to the settlement hold.
      </Callout>

      {reservations.length === 0 ? (
        <EmptyState title="No payments yet" description="Completed bookings will show here." />
      ) : (
        <div className="space-y-2">
          {reservations.map((reservation) => {
            const settlement = reservation.settlements[0];
            return (
              <div key={reservation.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-900">{reservation.property.name}</p>
                    <p className="text-sm text-ink-500">
                      {reservation.reference} · {formatDate(reservation.checkIn)}
                      {settlement ? ` · settlement ${settlement.reference}` : ""}
                    </p>
                  </div>
                  <Badge tone={RESERVATION_STATUS_TONES[reservation.status]}>
                    {RESERVATION_STATUS_LABELS[reservation.status]}
                  </Badge>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-ink-500">Customer paid</p>
                    <p className="font-semibold text-ink-900">
                      {formatMoney(reservation.grossAmount, reservation.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500">Commission</p>
                    <p className="font-semibold text-ink-900">
                      {formatMoney(reservation.platformCommission, reservation.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500">Your share</p>
                    <p className="font-semibold text-ink-900">
                      {formatMoney(reservation.partnerNetAmount, reservation.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500">Settlement</p>
                    <p className="font-semibold text-ink-900">
                      {settlement ? (
                        <Link
                          href={`/partner/settlements/${settlement.reference}`}
                          className="text-brand-700 hover:underline"
                        >
                          {settlement.status}
                        </Link>
                      ) : (
                        "Not created yet"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
