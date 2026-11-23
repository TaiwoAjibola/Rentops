import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";
import type { PaymentStatus } from "@prisma/client";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Select } from "@/components/ui/field";
import {
  PageHeader,
  Panel,
  PaymentStatusBadge,
  param,
  type SearchParams,
} from "@/components/admin/ui";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

const STATUSES: PaymentStatus[] = ["PENDING", "SUCCESS", "FAILED", "REVERSED"];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformStaff("finance.view");

  const params = await searchParams;
  const status = param(params, "status");

  const payments = await prisma.payment.findMany({
    where: status && STATUSES.includes(status as PaymentStatus)
      ? { status: status as PaymentStatus }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reservation: { select: { reference: true, paymentOption: true, holdExpiresAt: true, status: true, property: { select: { name: true } } } },
    },
  });

  const statusSummary = await prisma.payment.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Payments"
        description="Customer payment flow across the platform. Gross is not RentOps revenue — commission is."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((entry) => {
          const row = statusSummary.find((summary) => summary.status === entry);
          return (
            <Panel key={entry} title={entry}>
              <p className="text-2xl font-semibold text-ink-900">{row?._count._all ?? 0}</p>
              <p className="mt-1 text-sm text-ink-500">
                {row ? formatMoney(row._sum.amount ?? 0, "NGN", { compact: true }) : "—"} total
              </p>
            </Panel>
          );
        })}
      </div>

      <Panel title="Filter by status" bodyClassName="py-3">
        <FilterForm action="/admin/payments" resetHref="/admin/payments">
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

      {payments.length === 0 ? (
        <EmptyState title="No payments" description="No payments match that filter." />
      ) : (
        <DataTable headers={["Reference", "Property", "Reservation", "Payment", "Amount", "Status", "Paid at"]}>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{payment.reference}</TableCell>
              <TableCell>{payment.reservation?.property.name ?? "—"}</TableCell>
              <TableCell>
                {payment.reservation ? (
                  <Link href={`/admin/reservations/${payment.reservation.reference}`} className="hover:underline">
                    {payment.reservation.reference}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {payment.reservation ? (
                  <span className="text-[13px] text-ink-700">
                    {payment.reservation.paymentOption === "PAY_LATER" ? "Pay later" : "Pay now"}
                    {payment.reservation.holdExpiresAt ? (
                      <span className="block text-[12px] text-ink-500">hold by {formatDateTime(payment.reservation.holdExpiresAt)}</span>
                    ) : null}
                  </span>
                ) : "—"}
              </TableCell>
              <TableCell>{formatMoney(payment.amount, payment.currency)}</TableCell>
              <TableCell>
                <PaymentStatusBadge status={payment.status} />
              </TableCell>
              <TableCell>{payment.paidAt ? formatDateTime(payment.paidAt) : "—"}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
