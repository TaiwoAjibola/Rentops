import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  LifeBuoy,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ReservationStatus } from "@prisma/client";

import { requirePlatformStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getLedgerSummary } from "@/lib/ledger";
import { getRecentAudit } from "@/lib/audit";
import { addDays, formatDate, startOfTodayUtc } from "@/lib/dates";
import { INVENTORY_HOLDING_STATUSES } from "@/lib/constants";
import { formatMoney } from "@/lib/money";

import { ButtonLink } from "@/components/ui/button";
import { DataTable, EmptyState, Stat, TableCell, TableRow } from "@/components/ui/data";
import { Card, CardBody } from "@/components/ui/card";
import { BarList, ColumnChart, Sparkline } from "@/components/admin/charts";
import { Money, PageHeader, Panel, ReservationStatusBadge, SmallLabel, When } from "@/components/admin/ui";

/** Statuses representing stays the customer actually paid for. */
const BOOKED_STATUSES: ReservationStatus[] = [
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "DISPUTED",
  "REFUND_PENDING",
  "REFUNDED",
  "CANCELLED",
];

const OPEN_SETTLEMENT_STATUSES = ["PENDING", "ON_HOLD", "SCHEDULED", "PROCESSING", "FAILED"] as const;

const TREND_WEEKS = 8;

export default async function AdminDashboardPage() {
  await requirePlatformStaff();

  const today = startOfTodayUtc();
  const windowStart = today;
  const windowEnd = addDays(today, 30);
  const trendStart = addDays(today, -7 * TREND_WEEKS);

  const [
    customerCount,
    partnerCount,
    approvedCount,
    activeCount,
    submittedCount,
    totalBookings,
    completedCount,
    cancelledCount,
    grossAggregate,
    ledger,
    settlementAggregate,
    bookableUnits,
    occupiedRows,
    recentReservations,
    recentAudit,
    trendRows,
    propertyBookingRows,
    pendingDocuments,
    pendingRecords,
    pendingChecks,
    openDisputes,
    refundPending,
    openTickets,
    pendingPaymentHolds,
    expiredHolds24h,
  ] = await Promise.all([
    prisma.user.count({ where: { systemRole: "CUSTOMER" } }),
    prisma.partner.count(),
    prisma.property.count({ where: { status: "APPROVED" } }),
    prisma.property.count({ where: { status: "APPROVED", isActive: true } }),
    prisma.property.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: "CHECKED_OUT" } }),
    prisma.reservation.count({ where: { status: "CANCELLED" } }),
    prisma.reservation.aggregate({ where: { status: { in: BOOKED_STATUSES } }, _sum: { grossAmount: true } }),
    getLedgerSummary(),
    prisma.settlement.aggregate({
      where: { status: { in: [...OPEN_SETTLEMENT_STATUSES] } },
      _sum: { netPayable: true, paidAmount: true },
    }),
    prisma.unit.count({
      where: { isBookable: true, status: "ACTIVE", property: { status: "APPROVED", isActive: true } },
    }),
    prisma.reservationUnit.findMany({
      where: {
        occupiesInventory: true,
        reservation: { status: { in: INVENTORY_HOLDING_STATUSES } },
        checkIn: { lt: windowEnd },
        checkOut: { gt: windowStart },
      },
      select: { checkIn: true, checkOut: true },
      take: 5000,
    }),
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        property: { select: { name: true, city: true } },
      },
    }),
    getRecentAudit(10),
    prisma.reservation.findMany({
      where: { createdAt: { gte: trendStart } },
      select: { createdAt: true },
      take: 5000,
    }),
    prisma.reservation.groupBy({
      by: ["propertyId"],
      where: { status: { in: BOOKED_STATUSES } },
      _count: { _all: true },
    }),
    prisma.partnerDocument.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } }),
    prisma.verificationRecord.count({
      where: { status: { in: ["PENDING", "IN_REVIEW"] }, subjectType: { in: ["USER", "PARTNER"] } },
    }),
    prisma.propertyVerificationCheck.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.reservation.count({ where: { status: "REFUND_PENDING" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    prisma.reservation.count({ where: { status: "PENDING_PAYMENT", holdExpiresAt: { not: null } } }),
    prisma.reservation.count({ where: { status: "EXPIRED", updatedAt: { gte: addDays(today, -1) } } }),
  ]);

  const grossBookingValue = grossAggregate._sum.grossAmount ?? 0;
  const outstandingSettlements = Math.max(
    0,
    (settlementAggregate._sum.netPayable ?? 0) - (settlementAggregate._sum.paidAmount ?? 0),
  );

  const occupiedNights = occupiedRows.reduce((total, row) => {
    const start = row.checkIn > windowStart ? row.checkIn : windowStart;
    const end = row.checkOut < windowEnd ? row.checkOut : windowEnd;
    return total + Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  }, 0);
  const availableNights = bookableUnits * 30;
  const occupancyRate = availableNights > 0 ? occupiedNights / availableNights : 0;

  const demandGroups = await prisma.reservation.groupBy({
    by: ["propertyId"],
    where: { status: { in: BOOKED_STATUSES } },
    _count: { _all: true },
  });

  const demandProperties = demandGroups.length
    ? await prisma.property.findMany({
        where: { id: { in: demandGroups.map((group) => group.propertyId) } },
        select: { id: true, city: true, state: true, category: { select: { name: true } } },
      })
    : [];

  const trend = buildTrend(
    trendRows.map((row) => row.createdAt),
    today,
  );
  const { cities, categories } = buildDemandBreakdown(demandGroups, demandProperties);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="RentOps control room"
        title="Platform dashboard"
        description="Live marketplace performance. Gross customer payments are money held in settlement for partners — RentOps revenue is commission and service fees only."
        actions={
          <>
            <ButtonLink href="/admin/verification" variant="outline" size="sm">
              Verification queue
            </ButtonLink>
            <ButtonLink href="/admin/properties?status=SUBMITTED" size="sm">
              Review properties
            </ButtonLink>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Platform revenue"
          value={formatMoney(ledger.commissionRevenue)}
          hint="Commission + service fees retained"
          tone="success"
          icon={<Banknote className="h-4 w-4" />}
        />
        <Stat
          label="Gross booking value"
          value={formatMoney(grossBookingValue)}
          hint="Charged to customers — not RentOps revenue"
          icon={<Wallet className="h-4 w-4" />}
        />
        <Stat
          label="Outstanding settlements"
          value={formatMoney(outstandingSettlements)}
          hint={`${formatMoney(ledger.partnerPayable)} payable in the ledger`}
          tone="warning"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <Stat
          label="Occupancy (30 days)"
          value={`${Math.round(occupancyRate * 100)}%`}
          hint={`${occupiedNights} of ${availableNights} bookable unit-nights`}
          tone="info"
          icon={<CalendarCheck className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Registered customers" value={customerCount} icon={<Users className="h-4 w-4" />} />
        <Stat label="Property partners" value={partnerCount} icon={<BadgeCheck className="h-4 w-4" />} />
        <Stat
          label="Approved properties"
          value={approvedCount}
          hint={`${activeCount} publicly active · ${submittedCount} awaiting review`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <Stat
          label="Bookings"
          value={totalBookings}
          hint={`${completedCount} completed · ${cancelledCount} cancelled`}
          icon={<ClipboardList className="h-4 w-4" />}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Booking volume"
          description={`Reservations created per week, last ${TREND_WEEKS} weeks`}
          className="lg:col-span-2"
          action={<Sparkline values={trend.map((point) => point.value)} className="w-32" />}
        >
          <ColumnChart data={trend} formatValue={(value) => String(value)} />
        </Panel>

        <Panel title="Action queue" description="Everything waiting on a RentOps decision">
          <ul className="space-y-2">
            <QueueRow href="/admin/properties?status=SUBMITTED" icon={<Building2 className="h-4 w-4" />} label="Properties awaiting review" count={submittedCount} />
            <QueueRow href="/admin/verification" icon={<ScrollText className="h-4 w-4" />} label="Verification items" count={pendingDocuments + pendingRecords + pendingChecks} />
            <QueueRow href="/admin/reservations?status=PENDING_PAYMENT" icon={<CreditCard className="h-4 w-4" />} label="Unpaid holds (reserve now, pay later)" count={pendingPaymentHolds} />
            <QueueRow href="/admin/reservations?status=EXPIRED" icon={<AlertTriangle className="h-4 w-4" />} label="Holds expired (last 24h)" count={expiredHolds24h} />
            <QueueRow href="/admin/disputes" icon={<LifeBuoy className="h-4 w-4" />} label="Open disputes" count={openDisputes} />
            <QueueRow href="/admin/refunds" icon={<Wallet className="h-4 w-4" />} label="Refunds to process" count={refundPending} />
            <QueueRow href="/admin/support" icon={<ClipboardList className="h-4 w-4" />} label="Support tickets open" count={openTickets} />
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Most popular locations" description="Paid bookings grouped by property city">
          <BarList items={cities} formatValue={(value) => `${value} booking${value === 1 ? "" : "s"}`} />
        </Panel>
        <Panel title="Most booked categories" description="Paid bookings grouped by property category">
          <BarList items={categories} formatValue={(value) => `${value} booking${value === 1 ? "" : "s"}`} />
        </Panel>
      </div>

      <Panel
        title="Recent bookings"
        description="Latest reservation activity across the marketplace"
        action={
          <Link
            href="/admin/reservations"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800"
          >
            All reservations
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
        bodyClassName="px-0 py-0"
      >
        {recentReservations.length === 0 ? (
          <EmptyState
            className="m-5"
            icon={<CalendarCheck className="h-5 w-5" />}
            title="No bookings yet"
            description="Reservations created by customers will appear here immediately."
          />
        ) : (
          <DataTable headers={["Reference", "Guest", "Property", "Stay", "Status", "Total"]}>
            {recentReservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium text-ink-900">
                  <Link href={`/admin/reservations/${reservation.reference}`} className="hover:text-brand-700">
                    {reservation.reference}
                  </Link>
                </TableCell>
                <TableCell>
                  <p className="truncate text-[13px] text-ink-800">
                    {reservation.user.firstName} {reservation.user.lastName}
                  </p>
                  <p className="truncate text-[12px] text-ink-500">{reservation.user.email}</p>
                </TableCell>
                <TableCell>
                  <p className="truncate text-[13px] text-ink-800">{reservation.property.name}</p>
                  <p className="text-[12px] text-ink-500">{reservation.property.city}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-[13px]">
                  {formatDate(reservation.checkIn, { day: "numeric", month: "short" })} →{" "}
                  {formatDate(reservation.checkOut, { day: "numeric", month: "short" })}
                </TableCell>
                <TableCell>
                  <ReservationStatusBadge status={reservation.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  <Money value={reservation.grossAmount} currency={reservation.currency} />
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Panel>

      <Panel title="Recent audit activity" description="Every sensitive action recorded against its actor">
        {recentAudit.length === 0 ? (
          <EmptyState
            title="No audit entries yet"
            description="Administrative actions will be recorded here with before/after snapshots."
          />
        ) : (
          <ul className="divide-y divide-line">
            {recentAudit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink-900">{entry.summary ?? entry.action}</p>
                  <p className="text-[12px] text-ink-500">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-ink-600">{entry.action}</span>
                    {" · "}
                    {entry.entityType}
                    {entry.actor ? ` · by ${entry.actor.firstName} ${entry.actor.lastName}` : " · system"}
                  </p>
                </div>
                <When value={entry.createdAt} className="text-[12px] text-ink-500" />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Card>
        <CardBody className="flex flex-wrap items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <SmallLabel>Financial reporting rule</SmallLabel>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
              RentOps earns commission and service fees. The{" "}
              <span className="font-medium text-ink-800">{formatMoney(grossBookingValue)}</span> of customer payments
              above is held in settlement for partners and is never counted as revenue. Refunds recorded to date:{" "}
              <Money value={ledger.refunds} className="font-medium text-ink-800" />. Partner payouts to date:{" "}
              <Money value={ledger.partnerPayouts} className="font-medium text-ink-800" />.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function QueueRow({ href, icon, label, count }: { href: string; icon: ReactNode; label: string; count: number }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-md border border-line px-3.5 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
      >
        <span className="flex min-w-0 items-center gap-2.5 text-[13px] text-ink-700">
          <span className="text-ink-400">{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <span
          className={
            count > 0
              ? "rounded-full bg-brand-700 px-2 py-0.5 text-[12px] font-semibold text-white"
              : "rounded-full bg-ink-100 px-2 py-0.5 text-[12px] font-semibold text-ink-500"
          }
        >
          {count}
        </span>
      </Link>
    </li>
  );
}

/** Groups reservation creation dates into weekly buckets ending today. */
function buildTrend(dates: Date[], today: Date) {
  const labels: string[] = [];
  for (let week = 7; week >= 0; week -= 1) {
    labels.push(formatDate(addDays(today, -7 * week), { day: "numeric", month: "short" }));
  }

  const values = new Array<number>(labels.length).fill(0);
  for (const date of dates) {
    const weeksAgo = Math.floor((today.getTime() - date.getTime()) / (7 * 86_400_000));
    if (weeksAgo < 0 || weeksAgo >= labels.length) continue;
    const index = labels.length - 1 - weeksAgo;
    values[index] = (values[index] ?? 0) + 1;
  }

  return labels.map((label, index) => ({ label, value: values[index] ?? 0 }));
}

type DemandGroup = { propertyId: string; _count: { _all: number } };
type DemandProperty = { id: string; city: string; state: string; category: { name: string } };

/** Bookings grouped by property city and by category. */
function buildDemandBreakdown(groups: DemandGroup[], properties: DemandProperty[]) {
  if (groups.length === 0) return { cities: [], categories: [] };

  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const cityCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const group of groups) {
    const property = propertyById.get(group.propertyId);
    if (!property) continue;
    const city = `${property.city}, ${property.state}`;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + group._count._all);
    categoryCounts.set(property.category.name, (categoryCounts.get(property.category.name) ?? 0) + group._count._all);
  }

  const rank = (map: Map<string, number>) =>
    Array.from(map, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

  return { cities: rank(cityCounts), categories: rank(categoryCounts) };
}
