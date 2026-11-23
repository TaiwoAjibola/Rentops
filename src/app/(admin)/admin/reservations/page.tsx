import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";
import type { ReservationStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { Input, Select } from "@/components/ui/field";
import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Pagination } from "@/components/admin/pagination";
import {
  PageHeader,
  Panel,
  ReservationStatusBadge,
  param,
  paramPage,
  queryWithoutPage,
  type SearchParams,
} from "@/components/admin/ui";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";

const PAGE_SIZE = 25;
const STATUSES: ReservationStatus[] = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PENDING_APPROVAL",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "REFUNDED",
  "REFUND_PENDING",
  "EXPIRED",
  "DISPUTED",
];

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformStaff("booking.view");

  const params = await searchParams;
  const page = paramPage(params);
  const q = param(params, "q");
  const status = param(params, "status");

  const where: Prisma.ReservationWhereInput = {
    ...(status && STATUSES.includes(status as ReservationStatus)
      ? { status: status as ReservationStatus }
      : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { property: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { firstName: { contains: q, mode: "insensitive" } } },
            { user: { lastName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, city: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.reservation.count({ where }),
  ]);

  const query = queryWithoutPage(params);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookings"
        title="Reservations"
        description="Every short stay and long lease on the platform."
      />

      <Panel title="Filter" bodyClassName="py-3">
        <FilterForm action="/admin/reservations" resetHref="/admin/reservations">
          <FilterField label="Search">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Reference, property or guest…" />
          </FilterField>
          <FilterField label="Status">
            <Select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </FilterField>
        </FilterForm>
      </Panel>

      {reservations.length === 0 ? (
        <EmptyState title="No reservations found" description="No reservations match that filter." />
      ) : (
        <DataTable
          headers={["Reference", "Property", "Guest", "Check-in", "Payment / hold", "Gross", "Status", ""]}
        >
          {reservations.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell>
                <Link
                  href={`/admin/reservations/${reservation.reference}`}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  {reservation.reference}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/admin/properties/${reservation.property.id}`} className="hover:underline">
                  {reservation.property.name}
                </Link>
                <span className="block text-[12px] text-ink-500">{reservation.property.city}</span>
              </TableCell>
              <TableCell>
                {reservation.user.firstName} {reservation.user.lastName}
                <span className="block text-[12px] text-ink-500">{reservation.user.email}</span>
              </TableCell>
              <TableCell>{formatDate(reservation.checkIn)}</TableCell>
              <TableCell>
                <span className="text-[13px] text-ink-700">
                  {reservation.paymentOption === "PAY_LATER" ? "Pay later" : "Pay now"}
                </span>
                {reservation.holdExpiresAt && ["PENDING_PAYMENT", "PENDING_APPROVAL"].includes(reservation.status) ? (
                  <span className="block text-[12px] text-ink-500">
                    by {formatDate(reservation.holdExpiresAt, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{formatMoney(reservation.grossAmount, reservation.currency, { compact: true })}</TableCell>
              <TableCell>
                <ReservationStatusBadge status={reservation.status} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/reservations/${reservation.reference}`}
                  className="text-[13px] font-medium text-brand-700 hover:underline"
                >
                  Open
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Pagination basePath="/admin/reservations" query={query} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
