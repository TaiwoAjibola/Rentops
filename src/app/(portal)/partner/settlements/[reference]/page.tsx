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
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_TONES,
} from "@/lib/constants";

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { partner, can } = await requirePartnerContext();
  const { reference } = await params;

  if (!can("finance.view")) {
    return (
      <Callout tone="warning" title="Not available to your role">
        Viewing settlements requires the <strong>finance.view</strong> permission.
      </Callout>
    );
  }

  const settlement = await prisma.settlement.findFirst({
    where: { reference, partnerId: partner.id },
    include: {
      reservations: {
        include: {
          property: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      },
      ledgerEntries: true,
    },
  });

  if (!settlement) notFound();

  const bankAccount = await prisma.partnerBankAccount.findFirst({
    where: { partnerId: partner.id, isPrimary: true },
  });

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-500">
        <Link href="/partner/settlements" className="hover:text-brand-700">Settlements</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-800">{settlement.reference}</span>
      </nav>

      <SectionHeading
        eyebrow="Settlement"
        title={settlement.reference}
        description="Included stays and payout status"
        action={
          <Badge tone={SETTLEMENT_STATUS_TONES[settlement.status]}>
            {SETTLEMENT_STATUS_LABELS[settlement.status]}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Included reservations</h2>
          <div className="mt-3 space-y-2">
            {settlement.reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="flex flex-wrap items-center gap-3 border-b border-line pb-2 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{reservation.property.name}</p>
                  <p className="text-sm text-ink-500">
                    {reservation.user.firstName} {reservation.user.lastName} ·{" "}
                    {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
                  </p>
                </div>
                <span className="text-sm text-ink-900">
                  {formatMoney(reservation.partnerNetAmount, reservation.currency)}
                </span>
                <Badge tone={RESERVATION_STATUS_TONES[reservation.status]}>
                  {RESERVATION_STATUS_LABELS[reservation.status]}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Breakdown</h2>
          <dl className="mt-3">
            <InfoRow label="Gross to you" value={formatMoney(settlement.grossAmount, settlement.currency)} />
            <InfoRow
              label="Commission deducted"
              value={formatMoney(settlement.commissionDeducted, settlement.currency)}
            />
            <InfoRow
              label="Processing"
              value={formatMoney(settlement.processingFeeDeducted, settlement.currency)}
            />
            <InfoRow label="Net payable" value={formatMoney(settlement.netPayable, settlement.currency)} />
            <InfoRow label="Paid" value={formatMoney(settlement.paidAmount, settlement.currency)} />
            {settlement.holdUntil ? (
              <InfoRow label="Held until" value={formatDate(settlement.holdUntil)} />
            ) : null}
            {settlement.paidAt ? <InfoRow label="Paid at" value={formatDate(settlement.paidAt)} /> : null}
          </dl>

          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm text-ink-600">
              <strong>Pays to:</strong>{" "}
              {bankAccount
                ? `${bankAccount.bankName} · ${bankAccount.accountNumber}`
                : "No primary bank account set"}
            </p>
            {!bankAccount ? (
              <Link
                href="/partner/bank-accounts"
                className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline"
              >
                Add a bank account →
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
