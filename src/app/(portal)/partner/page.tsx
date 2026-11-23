import Link from "next/link";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Callout, EmptyState, Stat } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { PARTNER_ROLE_LABELS, RESERVATION_STATUS_LABELS, RESERVATION_STATUS_TONES } from "@/lib/constants";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function PartnerDashboardPage() {
  const { partner, membership, can } = await requirePartnerContext();
  const role = membership.role;

  const properties = await prisma.property.findMany({
    where: { partnerId: partner.id },
    select: { id: true, name: true, status: true },
  });
  const propertyIds = properties.map((entry) => entry.id);

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [
    propertyCount,
    unitCount,
    unitsWithoutRate,
    upcoming,
    arrivalsToday,
    departuresToday,
    pendingApproval,
    recent,
    monthAggregate,
    pendingSettlement,
  ] = await Promise.all([
    Promise.resolve(properties.length),
    propertyIds.length ? prisma.unit.count({ where: { propertyId: { in: propertyIds } } }) : Promise.resolve(0),
    propertyIds.length
      ? prisma.unit.count({ where: { propertyId: { in: propertyIds }, rate: { is: null } } })
      : Promise.resolve(0),
    propertyIds.length
      ? prisma.reservation.findMany({
          where: { propertyId: { in: propertyIds }, status: { in: ["CONFIRMED"] }, checkIn: { gte: new Date() } },
          include: { user: { select: { firstName: true, lastName: true } }, property: { select: { name: true } } },
          orderBy: { checkIn: "asc" },
          take: 6,
        })
      : Promise.resolve([]),
    propertyIds.length
      ? prisma.reservation.findMany({
          where: { propertyId: { in: propertyIds }, status: { in: ["CONFIRMED", "PENDING_APPROVAL", "PENDING_PAYMENT"] }, checkIn: { gte: todayStart, lte: todayEnd } },
          include: { user: { select: { firstName: true, lastName: true } }, property: { select: { name: true } } },
          orderBy: { checkIn: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    propertyIds.length
      ? prisma.reservation.findMany({
          where: { propertyId: { in: propertyIds }, status: { in: ["CONFIRMED", "CHECKED_IN"] }, checkOut: { gte: todayStart, lte: todayEnd } },
          include: { user: { select: { firstName: true, lastName: true } }, property: { select: { name: true } } },
          orderBy: { checkOut: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    propertyIds.length
      ? prisma.reservation.count({ where: { propertyId: { in: propertyIds }, status: "PENDING_APPROVAL" } })
      : Promise.resolve(0),
    propertyIds.length
      ? prisma.reservation.findMany({
          where: { propertyId: { in: propertyIds } },
          include: { user: { select: { firstName: true, lastName: true } }, property: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      : Promise.resolve([]),
    propertyIds.length
      ? prisma.reservation.aggregate({
          where: { propertyId: { in: propertyIds }, status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] }, createdAt: { gte: startOfMonth } },
          _sum: { partnerNetAmount: true },
        })
      : Promise.resolve({ _sum: { partnerNetAmount: 0 } }),
    prisma.settlement.aggregate({
      where: { partnerId: partner.id, status: { in: ["PENDING", "SCHEDULED"] } },
      _sum: { netPayable: true },
    }),
  ]);

  const viewLabel = {
    OWNER: "Owner view — full control (you can also act as property manager)",
    MANAGER: "Property manager view — listings, units, pricing & reservations",
    FRONT_DESK: "Front desk view — arrivals, departures & guest operations",
    FINANCE: "Finance view — earnings, payouts & settlements",
    VIEWER: "Viewer view — read-only portfolio overview",
  }[role];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={PARTNER_ROLE_LABELS[role]}
        title={partner.businessName}
        description={viewLabel}
        action={can("property.create") ? <ButtonLink href="/partner/properties/new">Add property</ButtonLink> : undefined}
      />

      {role === "FRONT_DESK" ? (
        <Callout tone="info" title="Front desk focus">
          Prioritize today’s arrivals/departures, reservation status, availability, and guest communication. Use Reservations and Messages for daily operations.
        </Callout>
      ) : null}
      {role === "FINANCE" ? (
        <Callout tone="info" title="Finance focus">
          Monitor earnings, settlement status, and payout readiness. Gross booking payments belong to bookings; your net share is shown after RentOps commission/fees.
        </Callout>
      ) : null}
      {role === "MANAGER" ? (
        <Callout tone="info" title="Property manager focus">
          Manage listings, units, media, pricing, availability, and reservation handling. Owners can also act in this role or delegate it to your team.
        </Callout>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Properties" value={propertyCount} />
        <Stat label="Units" value={unitCount} hint={unitsWithoutRate > 0 ? `${unitsWithoutRate} without pricing` : "All units priced"} tone={unitsWithoutRate > 0 ? "warning" : "default"} />
        <Stat label="Pending approval" value={pendingApproval} tone={pendingApproval > 0 ? "warning" : "default"} />
        <Stat label="Awaiting payout" value={formatMoney(pendingSettlement._sum.netPayable ?? 0, "NGN", { compact: true })} tone="info" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Earnings this month (your share)" value={formatMoney(monthAggregate._sum.partnerNetAmount ?? 0, "NGN", { compact: true })} hint="Partner net after RentOps commission" />
        <Stat label="Upcoming arrivals" value={upcoming.length} hint={upcoming[0] ? `Next: ${formatDate(upcoming[0].checkIn)}` : "Nothing scheduled"} />
      </div>

      {(role === "FRONT_DESK" || role === "MANAGER" || role === "OWNER") ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl text-ink-900">Arrivals today</h2>
            {arrivalsToday.length === 0 ? (
              <EmptyState className="mt-3" title="No arrivals today" description="No check-ins scheduled for today." />
            ) : (
              <ul className="mt-3 space-y-2">
                {arrivalsToday.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white p-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{r.user.firstName} {r.user.lastName}</p>
                      <p className="text-[13px] text-ink-500">{r.property.name} · {formatDate(r.checkIn)}</p>
                    </div>
                    <Badge tone={RESERVATION_STATUS_TONES[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="font-display text-xl text-ink-900">Departures today</h2>
            {departuresToday.length === 0 ? (
              <EmptyState className="mt-3" title="No departures today" description="No check-outs scheduled for today." />
            ) : (
              <ul className="mt-3 space-y-2">
                {departuresToday.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white p-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{r.user.firstName} {r.user.lastName}</p>
                      <p className="text-[13px] text-ink-500">{r.property.name} · out {formatDate(r.checkOut)}</p>
                    </div>
                    <Badge tone={RESERVATION_STATUS_TONES[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl text-ink-900">Recent reservations</h2>
          <Link href="/partner/properties" className="text-sm font-medium text-brand-700 hover:underline">Properties</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState className="mt-4" title="No reservations yet" description="Once customers book your properties they will appear here." />
        ) : (
          <div className="mt-4 space-y-2">
            {recent.map((reservation) => (
              <div key={reservation.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">{reservation.user.firstName} {reservation.user.lastName}</p>
                  <p className="text-sm text-ink-500">
                    {reservation.property.name} · {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
                  </p>
                </div>
                <Badge tone={RESERVATION_STATUS_TONES[reservation.status]}>{RESERVATION_STATUS_LABELS[reservation.status]}</Badge>
                <span className="text-sm font-semibold text-ink-900">
                  {formatMoney(reservation.grossAmount, reservation.currency, { compact: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
