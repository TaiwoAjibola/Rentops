import Link from "next/link";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { EmptyState, Stat } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

const MONTHS = 6;

export default async function ReportsPage() {
  const { partner } = await requirePartnerContext();

  const propertyIds = (
    await prisma.property.findMany({ where: { partnerId: partner.id }, select: { id: true } })
  ).map((entry) => entry.id);

  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));

  const reservations = await prisma.reservation.findMany({
    where: {
      propertyId: { in: propertyIds },
      createdAt: { gte: windowStart },
    },
    select: {
      id: true,
      status: true,
      bookingMode: true,
      grossAmount: true,
      partnerNetAmount: true,
      nights: true,
      createdAt: true,
      propertyId: true,
      property: { select: { name: true } },
      units: { select: { unitId: true } },
    },
  });

  const [unitCount, properties, occupiedRows] = await Promise.all([
    prisma.unit.count({ where: { propertyId: { in: propertyIds } } }),
    prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, name: true },
    }),
    prisma.reservationUnit.findMany({
      where: {
        occupiesInventory: true,
        reservation: { propertyId: { in: propertyIds } },
      },
      select: { unitId: true, nights: true },
    }),
  ]);

  const billable = reservations.filter((entry) =>
    ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(entry.status),
  );

  const revenue = billable.reduce((sum, entry) => sum + entry.partnerNetAmount, 0);
  const gross = billable.reduce((sum, entry) => sum + entry.grossAmount, 0);
  const avgValue = billable.length > 0 ? Math.round(gross / billable.length) : 0;
  const avgNights = billable.length > 0 ? Math.round(billable.reduce((s, e) => s + e.nights, 0) / billable.length) : 0;
  const instant = billable.filter((entry) => entry.bookingMode === "INSTANT").length;

  // Occupancy: occupied unit-nights vs available unit-nights across the window.
  const days = Math.max(1, Math.round((now.getTime() - windowStart.getTime()) / 86_400_000));
  const availableUnitNights = unitCount * days;
  const occupiedUnitNights = occupiedRows.reduce((sum, row) => sum + row.nights, 0);
  const occupancy = availableUnitNights > 0 ? (occupiedUnitNights / availableUnitNights) * 100 : 0;

  // Revenue by month
  const byMonth = new Map<string, number>();
  for (const entry of billable) {
    const key = `${entry.createdAt.getUTCFullYear()}-${String(entry.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + entry.partnerNetAmount);
  }
  const monthRows = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
  const maxMonth = Math.max(1, ...monthRows.map(([, value]) => value));

  const perProperty = properties.map((property) => {
    const rows = billable.filter((entry) => entry.propertyId === property.id);
    return {
      id: property.id,
      name: property.name,
      stays: rows.length,
      revenue: rows.reduce((sum, entry) => sum + entry.partnerNetAmount, 0),
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Reports"
        title="Performance"
        description={`Last ${MONTHS} months across your portfolio.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Your earnings" value={formatMoney(revenue, "NGN", { compact: true })} hint="After RentOps commission" />
        <Stat label="Gross booked" value={formatMoney(gross, "NGN", { compact: true })} />
        <Stat label="Average booking" value={formatMoney(avgValue, "NGN", { compact: true })} />
        <Stat label="Average stay" value={`${avgNights} nights`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Occupancy"
          value={`${occupancy.toFixed(1)}%`}
          hint={`${occupiedUnitNights} of ${availableUnitNights} unit-nights`}
        />
        <Stat
          label="Booking mix"
          value={`${billable.length > 0 ? Math.round((instant / billable.length) * 100) : 0}% instant`}
          hint={`${instant} instant · ${billable.length - instant} approval`}
        />
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Earnings by month</h2>
        {monthRows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No completed bookings in this window yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {monthRows.map(([month, value]) => (
              <div key={month} className="flex items-center gap-3">
                <span className="w-20 text-sm text-ink-600">{month}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-ink-100">
                  <div
                    className="h-full rounded bg-brand-600"
                    style={{ width: `${Math.max(2, (value / maxMonth) * 100)}%` }}
                  />
                </div>
                <span className="w-28 text-right text-sm font-medium text-ink-900">
                  {formatMoney(value, "NGN", { compact: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Top properties</h2>
        {perProperty.length === 0 ? (
          <EmptyState title="No properties yet" description="Add a property to start earning." />
        ) : (
          <div className="mt-3 space-y-2">
            {perProperty.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                <Link
                  href={`/partner/properties/${row.id}`}
                  className="text-sm font-medium text-ink-900 hover:text-brand-700"
                >
                  {row.name}
                </Link>
                <span className="text-sm text-ink-600">
                  {row.stays} stay{row.stays === 1 ? "" : "s"} ·{" "}
                  <strong className="text-ink-900">{formatMoney(row.revenue, "NGN", { compact: true })}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
