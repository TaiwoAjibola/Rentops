import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import {
  PageHeader,
  Panel,
  ReservationStatusBadge,
} from "@/components/admin/ui";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { getLedgerSummary } from "@/lib/ledger";

export default async function AdminRefundsPage() {
  await requirePlatformStaff("refund.manage");

  const [refunds, ledger] = await Promise.all([
    prisma.reservation.findMany({
      where: { status: { in: ["REFUND_PENDING", "REFUNDED"] } },
      include: {
        property: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getLedgerSummary(),
  ]);

  const pending = refunds.filter((entry) => entry.status === "REFUND_PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookings"
        title="Refunds"
        description="Refund requests awaiting platform action, and refunds already paid out."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Awaiting action">
          <p className="text-3xl font-semibold text-ink-900">{pending}</p>
          <p className="mt-1 text-sm text-ink-500">Reservations flagged for a refund</p>
        </Panel>
        <Panel title="Refunds paid">
          <p className="text-3xl font-semibold text-ink-900">{formatMoney(ledger.refunds)}</p>
          <p className="mt-1 text-sm text-ink-500">Refunds recorded in the ledger</p>
        </Panel>
        <Panel title="Outstanding">
          <p className="text-3xl font-semibold text-ink-900">{formatMoney(ledger.partnerPayable)}</p>
          <p className="mt-1 text-sm text-ink-500">Net payable still held by the platform</p>
        </Panel>
      </div>

      {refunds.length === 0 ? (
        <EmptyState title="No refunds" description="There are no refunds awaiting action." />
      ) : (
        <DataTable headers={["Reference", "Property", "Guest", "Amount", "Status", "Requested"]}>
          {refunds.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell>
                <Link href={`/admin/reservations/${reservation.reference}`} className="hover:underline">
                  {reservation.reference}
                </Link>
              </TableCell>
              <TableCell>{reservation.property.name}</TableCell>
              <TableCell>
                {reservation.user.firstName} {reservation.user.lastName}
                <span className="block text-[12px] text-ink-500">{reservation.user.email}</span>
              </TableCell>
              <TableCell>{formatMoney(reservation.grossAmount, reservation.currency)}</TableCell>
              <TableCell>
                <ReservationStatusBadge status={reservation.status} />
              </TableCell>
              <TableCell>{formatDate(reservation.createdAt)}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
