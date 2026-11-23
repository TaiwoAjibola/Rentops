import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";
import type { DisputeStatus } from "@prisma/client";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Select } from "@/components/ui/field";
import { PageHeader, Panel, param, type SearchParams } from "@/components/admin/ui";
import { DisputeStatusBadge } from "@/components/admin/ui";
import { DISPUTE_STATUS_LABELS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";

const STATUSES: DisputeStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "AWAITING_PARTNER",
  "RESOLVED_CUSTOMER",
  "RESOLVED_PARTNER",
  "CLOSED",
];

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformStaff("dispute.manage");

  const params = await searchParams;
  const status = param(params, "status");

  const disputes = await prisma.dispute.findMany({
    where: status && STATUSES.includes(status as DisputeStatus)
      ? { status: status as DisputeStatus }
      : {},
    include: {
      reservation: {
        select: {
          reference: true,
          property: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookings"
        title="Disputes"
        description="Customer and partner disputes awaiting resolution."
      />

      <Panel title="Filter by status" bodyClassName="py-3">
        <FilterForm action="/admin/disputes" resetHref="/admin/disputes">
          <FilterField label="Status">
            <Select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {DISPUTE_STATUS_LABELS[entry]}
                </option>
              ))}
            </Select>
          </FilterField>
        </FilterForm>
      </Panel>

      {disputes.length === 0 ? (
        <EmptyState title="No disputes" description="There are no disputes in that state." />
      ) : (
        <DataTable headers={["Reference", "Reservation", "Guest", "Reason", "Status", "Opened"]}>
          {disputes.map((dispute) => (
            <TableRow key={dispute.id}>
              <TableCell>{dispute.reference}</TableCell>
              <TableCell>
                <Link href={`/admin/reservations/${dispute.reservation.reference}`} className="hover:underline">
                  {dispute.reservation.reference}
                </Link>
                <span className="block text-[12px] text-ink-500">{dispute.reservation.property.name}</span>
              </TableCell>
              <TableCell>
                {dispute.reservation.user.firstName} {dispute.reservation.user.lastName}
              </TableCell>
              <TableCell>{dispute.reason.slice(0, 80)}</TableCell>
              <TableCell>
                <DisputeStatusBadge status={dispute.status} />
              </TableCell>
              <TableCell>{formatDate(dispute.createdAt)}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
