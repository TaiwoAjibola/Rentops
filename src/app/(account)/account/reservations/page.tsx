import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import type { ReservationStatus } from "@prisma/client";

import { AccountPageHeader } from "@/components/account/page-header";
import { FilterTabs } from "@/components/account/filter-tabs";
import { ReservationRow, type ReservationRowData } from "@/components/account/reservation-row";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { startOfTodayUtc } from "@/lib/dates";

export const metadata: Metadata = { title: "Reservations" };

const UPCOMING: ReservationStatus[] = ["PENDING_PAYMENT", "PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN"];
const COMPLETED: ReservationStatus[] = ["CHECKED_OUT"];
const CANCELLED: ReservationStatus[] = ["CANCELLED", "REFUND_PENDING", "REFUNDED", "EXPIRED", "DISPUTED"];

const TABS = [
  { key: "upcoming", label: "Upcoming", statuses: UPCOMING, needsFutureCheckout: true },
  { key: "completed", label: "Completed", statuses: COMPLETED, needsFutureCheckout: false },
  { key: "cancelled", label: "Cancelled", statuses: CANCELLED, needsFutureCheckout: false },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const RESERVATION_SELECT = {
  reference: true,
  status: true,
  checkIn: true,
  checkOut: true,
  nights: true,
  guests: true,
  currency: true,
  priceBasis: true,
  grossAmount: true,
  property: { select: { name: true, slug: true, city: true, state: true, coverImageUrl: true } },
  units: { select: { unit: { select: { label: true } } } },
} as const;

function hrefFor(tab: string) {
  return tab === "upcoming" ? "/account/reservations" : `/account/reservations?tab=${tab}`;
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await requireUser("/account/reservations");
  const params = await searchParams;
  const raw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: TabKey = TABS.some((entry) => entry.key === raw) ? (raw as TabKey) : "upcoming";
  const active = TABS.find((entry) => entry.key === tab) ?? TABS[0];

  const today = startOfTodayUtc();
  const onlyFutureCheckout = active.needsFutureCheckout ? { checkOut: { gte: today } } : {};

  const [reservations, counts] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: user.id, status: { in: [...active.statuses] }, ...onlyFutureCheckout },
      orderBy: { checkIn: tab === "upcoming" ? "asc" : "desc" },
      take: 60,
      select: RESERVATION_SELECT,
    }),
    Promise.all(
      TABS.map((entry) =>
        prisma.reservation.count({
          where: {
            userId: user.id,
            status: { in: [...entry.statuses] },
            ...(entry.needsFutureCheckout ? { checkOut: { gte: today } } : {}),
          },
        }),
      ),
    ),
  ]);

  const rows: ReservationRowData[] = reservations.map((reservation) => ({
    ...reservation,
    units: reservation.units.map((entry) => ({ label: entry.unit.label })),
  }));

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <AccountPageHeader
        eyebrow="Reservations"
        title="Your bookings and leases"
        description="Short stays and long leases both live here. Open one for its full price breakdown, check-in details and cancellation policy."
        actions={
          <ButtonLink href="/properties" size="sm" variant="outline">
            Book another stay
          </ButtonLink>
        }
      />

      <FilterTabs
        label="Reservation status"
        items={TABS.map((entry, index) => ({
          href: hrefFor(entry.key),
          label: entry.label,
          count: counts[index],
          active: entry.key === tab,
        }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" aria-hidden />}
          title={
            tab === "upcoming"
              ? "No upcoming reservations"
              : tab === "completed"
                ? "No completed stays yet"
                : "Nothing cancelled"
          }
          description={
            tab === "upcoming"
              ? "When you book a stay it appears here immediately, with its check-in date and total."
              : tab === "completed"
                ? "Stays move here after you check out, and you can review them straight away."
                : "Cancelled and refunded bookings are kept here for your records."
          }
          action={
            tab === "upcoming" ? (
              <ButtonLink href="/properties" size="sm">
                Find somewhere to stay
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((reservation) => (
            <li key={reservation.reference}>
              <ReservationRow reservation={reservation} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
