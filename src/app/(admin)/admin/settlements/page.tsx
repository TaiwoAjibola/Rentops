import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";
import type { SettlementStatus } from "@prisma/client";

import { DataTable, EmptyState, Stat, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Select } from "@/components/ui/field";
import {
  PageHeader,
  Panel,
  SettlementStatusBadge,
  param,
  type SearchParams,
} from "@/components/admin/ui";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateShort } from "@/lib/dates";

const STATUSES: SettlementStatus[] = ["PENDING", "ON_HOLD", "SCHEDULED", "PROCESSING", "PAID", "FAILED", "CANCELLED"];

export default async function AdminSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformStaff("settlement.manage");

  const params = await searchParams;
  const status = param(params, "status");

  const [settlements, summary] = await Promise.all([
    prisma.settlement.findMany({
      where: status && STATUSES.includes(status as SettlementStatus)
        ? { status: status as SettlementStatus }
        : {},
      include: {
        partner: { select: { id: true, businessName: true } },
        reservations: { select: { reference: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.settlement.aggregate({
      _sum: { netPayable: true, paidAmount: true },
    }),
  ]);

  const pending = settlements
    .filter((entry) => ["PENDING", "ON_HOLD", "SCHEDULED", "PROCESSING"].includes(entry.status))
    .reduce((total, entry) => total + entry.netPayable, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Settlements"
        description="Partner payouts after commission and fees, subject to verified check-in and the hold window."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Net payable" value={formatMoney(summary._sum.netPayable ?? 0, "NGN", { compact: true })} />
        <Stat label="Paid out" value={formatMoney(summary._sum.paidAmount ?? 0, "NGN", { compact: true })} tone="success" />
        <Stat label="Awaiting payout" value={settlements.filter((entry) => entry.status !== "PAID").length} />
        <Stat label="Pending net" value={formatMoney(pending, "NGN", { compact: true })} tone="warning" />
      </div>

      <Panel title="Filter by status" bodyClassName="py-3">
        <FilterForm action="/admin/settlements" resetHref="/admin/settlements">
          <FilterField label="Status">
            <Select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </FilterField>
        </FilterForm>
      </Panel>

      {settlements.length === 0 ? (
        <EmptyState title="No settlements" description="No settlements match that filter." />
      ) : (
        <DataTable headers={["Reference", "Partner", "Reservations", "Net payable", "Held until", "Status"]}>
          {settlements.map((settlement) => (
            <TableRow key={settlement.id}>
              <TableCell>{settlement.reference}</TableCell>
              <TableCell>
                <Link href={`/admin/partners/${settlement.partner.id}`} className="hover:underline">
                  {settlement.partner.businessName}
                </Link>
              </TableCell>
              <TableCell>
                {settlement.reservations.map((entry) => entry.reference).join(", ") || "—"}
              </TableCell>
              <TableCell>{formatMoney(settlement.netPayable, settlement.currency, { compact: true })}</TableCell>
              <TableCell>{settlement.holdUntil ? formatDateShort(settlement.holdUntil) : "—"}</TableCell>
              <TableCell>
                <SettlementStatusBadge status={settlement.status} />
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
