import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import type { RateBasis, ReservationStatus } from "@prisma/client";

import { StatusBadge } from "@/components/ui/badge";
import { describeDuration, formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_TONES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ReservationRowData = {
  reference: string;
  status: ReservationStatus;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  guests: number;
  currency: string;
  priceBasis: RateBasis;
  grossAmount: number;
  specialRequests?: string | null;
  property: {
    name: string;
    slug: string;
    city: string;
    state: string;
    coverImageUrl: string | null;
  };
  units?: { label: string }[];
};

export function ReservationRow({
  reservation,
  className,
}: {
  reservation: ReservationRowData;
  className?: string;
}) {
  const { property } = reservation;
  const unitLabels = reservation.units?.map((unit) => unit.label).filter(Boolean) ?? [];

  return (
    <Link
      href={`/account/reservations/${reservation.reference}`}
      className={cn(
        "group flex flex-col gap-4 rounded-lg border border-line bg-white p-4 shadow-xs transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:gap-5",
        className,
      )}
    >
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-md bg-ink-100 sm:h-20 sm:w-28">
        {property.coverImageUrl ? (
          // Cover images come from partner uploads (local or Cloudinary), so the
          // plain element avoids per-host image-loader configuration.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.coverImageUrl}
            alt={`${property.name}, ${property.city}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-widest text-ink-400">
            RentOps
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={RESERVATION_STATUS_LABELS[reservation.status]}
            tone={RESERVATION_STATUS_TONES[reservation.status]}
          />
          <span className="font-mono text-[12px] uppercase tracking-wide text-ink-400">
            {reservation.reference}
          </span>
        </div>

        <h3 className="mt-2 truncate text-[15px] font-semibold text-ink-900">{property.name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {property.city}, {property.state}
          </span>
        </p>
        <p className="mt-1.5 text-[13px] text-ink-600">
          {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)} ·{" "}
          {describeDuration(reservation.nights)} · {reservation.guests} guest
          {reservation.guests === 1 ? "" : "s"}
          {unitLabels.length > 0 ? ` · ${unitLabels.join(", ")}` : ""}
        </p>
      </div>

      <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-1">
        <p className="font-display text-lg leading-none text-ink-900">
          {formatMoney(reservation.grossAmount, reservation.currency)}
        </p>
        <p className="text-[12px] text-ink-500">for {describeDuration(reservation.nights)}</p>
        <ChevronRight className="hidden h-5 w-5 text-ink-300 transition-colors group-hover:text-brand-600 sm:block" aria-hidden />
      </div>
    </Link>
  );
}
