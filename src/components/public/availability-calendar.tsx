"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AvailabilityDay } from "@/lib/availability";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Read-only availability calendar for customers.
 *
 * Day state is computed on the server from real blocks and reservations
 * (`getUnitCalendar`) and handed down as plain data; nothing here guesses.
 */
export function AvailabilityCalendar({
  days,
  currency = "NGN",
  caption,
  className,
}: {
  days: AvailabilityDay[];
  currency?: string;
  caption?: string;
  className?: string;
}) {
  const months = useMemo(() => groupByMonth(days), [days]);
  const [position, setPosition] = useState(0);

  if (months.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-500">
        Availability has not been published for this property yet.
      </p>
    );
  }

  const month = months[Math.min(position, months.length - 1)];
  if (!month) return null;

  return (
    <div className={cn("rounded-lg border border-line bg-white p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPosition((current) => Math.max(0, current - 1))}
          disabled={position === 0}
          aria-label="Previous month"
          className="rounded-md p-1.5 text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-[14px] font-semibold text-ink-900">
          {MONTHS[month.monthIndex]} {month.year}
        </p>
        <button
          type="button"
          onClick={() => setPosition((current) => Math.min(months.length - 1, current + 1))}
          disabled={position >= months.length - 1}
          aria-label="Next month"
          className="rounded-md p-1.5 text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="pb-1 text-center text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-400">
            {day.slice(0, 2)}
          </div>
        ))}

        {Array.from({ length: month.leadingBlanks }).map((_, index) => (
          <div key={`blank-${index}`} aria-hidden />
        ))}

        {month.cells.map((cell) => (
          <div
            key={cell.date}
            title={
              cell.day.rate > 0 && cell.day.available
                ? `${formatMoney(cell.day.rate, currency, { compact: true })} per night`
                : REASON_LABELS[cell.day.reason]
            }
            className={cn(
              "flex aspect-square flex-col items-center justify-center rounded-md text-[12.5px] tabular-nums",
              cell.day.available && "bg-brand-50 font-medium text-brand-800",
              cell.day.reason === "BOOKED" && "bg-danger-soft text-danger/70 line-through",
              cell.day.reason === "BLOCKED" && "bg-ink-100 text-ink-400 line-through",
              cell.day.reason === "PAST" && "text-ink-300",
            )}
          >
            <span>{cell.dayNumber}</span>
            {cell.day.available && cell.day.rate > 0 ? (
              <span className="text-[9px] leading-none text-brand-600 opacity-80">
                {formatMoney(cell.day.rate, currency, { compact: true })}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-600">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-brand-50 ring-1 ring-brand-200" aria-hidden />
          Available
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-danger-soft ring-1 ring-danger/20" aria-hidden />
          Booked
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-ink-100 ring-1 ring-line" aria-hidden />
          Held by the owner
        </li>
      </ul>

      {caption ? <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{caption}</p> : null}
    </div>
  );
}

const REASON_LABELS: Record<AvailabilityDay["reason"], string> = {
  AVAILABLE: "Available",
  BLOCKED: "Not released for booking",
  BOOKED: "Already booked",
  PAST: "Past date",
};

type MonthGroup = {
  year: number;
  monthIndex: number;
  leadingBlanks: number;
  cells: { date: string; dayNumber: number; day: AvailabilityDay }[];
};

function groupByMonth(days: AvailabilityDay[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const day of days) {
    const [yearPart, monthPart, dayPart] = day.date.split("-");
    const year = Number(yearPart);
    const monthIndex = Number(monthPart) - 1;
    const dayNumber = Number(dayPart);
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(dayNumber)) continue;

    const key = `${year}-${monthIndex}`;
    let group = groups.get(key);
    if (!group) {
      // JS Date is only used to work out the weekday column; day data itself is
      // already normalised to UTC by the availability service.
      const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
      group = { year, monthIndex, leadingBlanks: (firstWeekday + 6) % 7, cells: [] };
      groups.set(key, group);
    }
    group.cells.push({ date: day.date, dayNumber, day });
  }

  return [...groups.values()].sort((a, b) => (a.year - b.year) || (a.monthIndex - b.monthIndex));
}
