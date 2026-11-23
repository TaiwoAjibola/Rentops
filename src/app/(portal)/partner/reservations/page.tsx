import Link from "next/link";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_TONES } from "@/lib/constants";

const TABS = [
  { key: "all", label: "All", statuses: [] },
  { key: "pending", label: "Pending approval", statuses: ["PENDING_APPROVAL"] },
  { key: "upcoming", label: "Upcoming", statuses: ["CONFIRMED"] },
  { key: "inhouse", label: "In-house", statuses: ["CHECKED_IN"] },
  { key: "completed", label: "Completed", statuses: ["CHECKED_OUT"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "REFUNDED", "EXPIRED", "REFUND_PENDING"] },
] as const;

export default async function PartnerReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { partner } = await requirePartnerContext();
  const query = await searchParams;

  const propertyIds = (
    await prisma.property.findMany({ where: { partnerId: partner.id }, select: { id: true } })
  ).map((entry) => entry.id);

  const tab = TABS.find((entry) => entry.key === (query.tab ?? "all")) ?? TABS[0];

  const reservations = await prisma.reservation.findMany({
    where: {
      propertyId: { in: propertyIds },
      ...(tab.statuses.length > 0 ? { status: { in: [...tab.statuses] } } : {}),
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      property: { select: { name: true } },
      units: { select: { unit: { select: { label: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Reservations"
        title="Bookings & lease applications"
        description="Approve requests, record arrivals and manage stays."
      />

      <nav className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Link
            key={entry.key}
            href={`/partner/reservations?tab=${entry.key}`}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              tab.key === entry.key
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-line bg-white text-ink-700 hover:bg-ink-50"
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {reservations.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="No reservations match this filter."
        />
      ) : (
        <div className="space-y-2">
          {reservations.map((reservation) => (
            <Link
              key={reservation.id}
              href={`/partner/reservations/${reservation.reference}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4 transition-colors hover:bg-brand-50/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">
                  {reservation.user.firstName} {reservation.user.lastName}
                </p>
                <p className="text-sm text-ink-500">
                  {reservation.property.name} · {formatDate(reservation.checkIn)} →{" "}
                  {formatDate(reservation.checkOut)} · {reservation.nights} night
                  {reservation.nights === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-ink-400">
                  {reservation.units.map((entry) => entry.unit.label).join(", ") || "—"}
                </p>
              </div>

              <span className="text-sm font-semibold text-ink-900">
                {formatMoney(reservation.grossAmount, reservation.currency, { compact: true })}
              </span>
              <Badge tone={RESERVATION_STATUS_TONES[reservation.status]}>
                {RESERVATION_STATUS_LABELS[reservation.status]}
              </Badge>
              <span className="text-xs text-ink-400">{reservation.reference}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
