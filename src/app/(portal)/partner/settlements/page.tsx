import Link from "next/link";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Callout, EmptyState, Stat } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { SETTLEMENT_STATUS_LABELS, SETTLEMENT_STATUS_TONES } from "@/lib/constants";

export default async function SettlementsPage() {
  const { partner, can } = await requirePartnerContext();

  if (!can("finance.view")) {
    return (
      <div className="space-y-6">
        <SectionHeading eyebrow="Finance" title="Settlements" />
        <Callout tone="warning" title="Not available to your role">
          Viewing settlements requires the <strong>finance.view</strong> permission.
        </Callout>
      </div>
    );
  }

  const settlements = await prisma.settlement.findMany({
    where: { partnerId: partner.id },
    include: {
      reservations: {
        select: {
          reference: true,
          property: { select: { name: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pending = settlements
    .filter((entry) => ["PENDING", "ON_HOLD", "SCHEDULED", "PROCESSING"].includes(entry.status))
    .reduce((sum, entry) => sum + entry.netPayable, 0);
  const paid = settlements
    .filter((entry) => entry.status === "PAID")
    .reduce((sum, entry) => sum + entry.paidAmount, 0);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Finance"
        title="Settlements"
        description="Payouts released after verified check-in, subject to the settlement hold."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Awaiting payout" value={formatMoney(pending, "NGN", { compact: true })} tone="info" />
        <Stat label="Paid to date" value={formatMoney(paid, "NGN", { compact: true })} tone="success" />
        <Stat label="Settlements" value={settlements.length} />
      </div>

      <Callout tone="info" title="Release policy">
        For platform-collected bookings the payout is held until check-in is verified, plus the
        settlement hold window, then paid to your primary bank account.
      </Callout>

      {settlements.length === 0 ? (
        <EmptyState
          title="No settlements yet"
          description="Settlements are created automatically once a guest is checked in."
        />
      ) : (
        <div className="space-y-2">
          {settlements.map((settlement) => (
            <Link
              key={settlement.id}
              href={`/partner/settlements/${settlement.reference}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4 transition-colors hover:bg-brand-50/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">{settlement.reference}</p>
                <p className="text-sm text-ink-500">
                  {settlement.reservations.map((entry) => entry.reference).join(", ") || "—"}
                </p>
                {settlement.holdUntil ? (
                  <p className="text-xs text-ink-400">
                    holds until {formatDate(settlement.holdUntil)}
                  </p>
                ) : null}
              </div>

              <div className="text-right">
                <p className="font-semibold text-ink-900">
                  {formatMoney(settlement.netPayable, settlement.currency, { compact: true })}
                </p>
                <p className="text-xs text-ink-500">
                  commission {formatMoney(settlement.commissionDeducted, settlement.currency, { compact: true })}
                </p>
              </div>

              <Badge tone={SETTLEMENT_STATUS_TONES[settlement.status]}>
                {SETTLEMENT_STATUS_LABELS[settlement.status]}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
