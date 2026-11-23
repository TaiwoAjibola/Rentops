import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import {
  KeyValue,
  LedgerTypeBadge,
  PageHeader,
  Panel,
} from "@/components/admin/ui";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { getLedgerSummary } from "@/lib/ledger";

export default async function AdminFinancePage() {
  await requirePlatformStaff("finance.manage");

  const [ledger, recentEntries] = await Promise.all([
    getLedgerSummary(),
    prisma.ledgerEntry.findMany({
      include: { reservation: { select: { reference: true } } },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Commission & fees"
        description="Gross customer payments are money held in settlement for partners — RentOps revenue is commission and service fees only."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Panel title="Gross customer payments">
          <p className="text-3xl font-semibold text-ink-900">{formatMoney(ledger.customerPayments, "NGN", { compact: true })}</p>
          <p className="mt-1 text-sm text-ink-500">Not RentOps revenue — money in transit</p>
        </Panel>
        <Panel title="RentOps revenue">
          <p className="text-3xl font-semibold text-ink-900">{formatMoney(ledger.commissionRevenue, "NGN", { compact: true })}</p>
          <p className="mt-1 text-sm text-ink-500">Commission + service fees</p>
        </Panel>
        <Panel title="Partner payouts">
          <p className="text-3xl font-semibold text-ink-900">{formatMoney(ledger.partnerPayouts, "NGN", { compact: true })}</p>
          <p className="mt-1 text-sm text-ink-500">Paid out to partners</p>
        </Panel>
        <Panel title="Partner payable">
          <p className="text-3xl font-semibold text-ink-900">{formatMoney(ledger.partnerPayable, "NGN", { compact: true })}</p>
          <p className="mt-1 text-sm text-ink-500">Still held in the ledger</p>
        </Panel>
        <Panel title="Refunds">
          <p className="text-3xl font-semibold text-ink-900">{formatMoney(ledger.refunds, "NGN", { compact: true })}</p>
          <p className="mt-1 text-sm text-ink-500">Refunds recorded</p>
        </Panel>
      </div>

      <Panel title="Settlement guidance">
        <ol className="list-inside list-decimal space-y-2 text-sm text-ink-600">
          <li>Confirm charge succeeded and ledger shows the customer payment.</li>
          <li>Commission and fees are separated out — only those count as platform revenue.</li>
          <li>After check-in is verified and hold window passed, a settlement is released to the partner.</li>
        </ol>
      </Panel>

      {recentEntries.length === 0 ? (
        <EmptyState title="No ledger entries" description="Ledger entries appear once bookings are paid." />
      ) : (
        <DataTable headers={["Occurred", "Type", "Description", "Amount", "Reference"]}>
          {recentEntries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDateTime(entry.occurredAt)}</TableCell>
              <TableCell>
                <LedgerTypeBadge type={entry.type} />
              </TableCell>
              <TableCell>{entry.description ?? "—"}</TableCell>
              <TableCell>{formatMoney(entry.amount, entry.currency, { compact: true })}</TableCell>
              <TableCell>{entry.reservation?.reference ?? "—"}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
