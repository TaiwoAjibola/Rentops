import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Callout, EmptyState } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_TONES } from "@/lib/constants";

export default async function GuestsPage() {
  const { partner, can } = await requirePartnerContext();

  if (!can("guest.view")) {
    return (
      <div className="space-y-6">
        <SectionHeading eyebrow="Customers" title="Guests" />
        <Callout tone="warning" title="Not available to your role">
          Viewing guest details requires the <strong>guest.view</strong> permission.
        </Callout>
      </div>
    );
  }

  const propertyIds = (
    await prisma.property.findMany({ where: { partnerId: partner.id }, select: { id: true } })
  ).map((entry) => entry.id);

  const reservations = await prisma.reservation.findMany({
    where: { propertyId: { in: propertyIds } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      property: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by guest so each customer appears once with their totals.
  const guests = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      stays: number;
      spend: number;
      first: Date;
      lastStatus: string;
      lastProperty: string;
    }
  >();

  for (const reservation of reservations) {
    const existing = guests.get(reservation.user.id);
    const paid = reservation.status !== "CANCELLED" && reservation.status !== "EXPIRED";
    const spend = paid ? reservation.grossAmount : 0;

    if (existing) {
      existing.stays += 1;
      existing.spend += spend;
      if (reservation.createdAt < existing.first) existing.first = reservation.createdAt;
    } else {
      guests.set(reservation.user.id, {
        id: reservation.user.id,
        name: `${reservation.user.firstName} ${reservation.user.lastName}`,
        email: reservation.user.email,
        phone: reservation.user.phone,
        stays: 1,
        spend,
        first: reservation.createdAt,
        lastStatus: reservation.status,
        lastProperty: reservation.property.name,
      });
    }
  }

  const rows = Array.from(guests.values()).sort((a, b) => b.spend - a.spend);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Customers"
        title="Guests"
        description="Everyone who has booked with you, with their lifetime value."
      />

      {rows.length === 0 ? (
        <EmptyState title="No guests yet" description="Guests appear here once you receive bookings." />
      ) : (
        <div className="space-y-2">
          {rows.map((guest) => (
            <div
              key={guest.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">{guest.name}</p>
                <p className="text-sm text-ink-600">{guest.email}</p>
                <p className="text-xs text-ink-400">
                  {guest.phone ?? "—"} · first stay {formatDate(guest.first)} · last at{" "}
                  {guest.lastProperty}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-ink-600">
                  {guest.stays} stay{guest.stays === 1 ? "" : "s"}
                </p>
                <p className="font-semibold text-ink-900">{formatMoney(guest.spend, "NGN", { compact: true })}</p>
              </div>

              <Badge tone={RESERVATION_STATUS_TONES[guest.lastStatus as keyof typeof RESERVATION_STATUS_TONES]}>
                {RESERVATION_STATUS_LABELS[guest.lastStatus as keyof typeof RESERVATION_STATUS_LABELS]}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
