"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarX2, Info, Lock, Wrench } from "lucide-react";

import { ActionForm } from "@/components/partner/action-form";
import { SubmitButton } from "@/components/partner/submit-button";
import { Thumb } from "@/components/partner/ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/data";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AvailabilityDay } from "@/lib/availability";
import {
  blockDatesAction as blockUnitDates,
  createManualReservationAction as createManualReservation,
  unblockDatesAction as unblockUnitDates,
} from "@/server/actions/partner-units";

export type CalendarUnit = {
  id: string;
  label: string;
  propertyId: string;
  propertyName: string;
  coverImageUrl: string | null;
};

export type CalendarBlock = {
  id: string;
  startDate: string;
  endDate: string;
  reason: "MAINTENANCE" | "OWNER_USE" | "MANUAL_BOOKING" | "OTHER";
  note: string | null;
};

const BLOCK_LABELS: Record<CalendarBlock["reason"], string> = {
  MAINTENANCE: "Maintenance",
  OWNER_USE: "Owner use",
  MANUAL_BOOKING: "Offline booking",
  OTHER: "Other",
};

const DAY_STYLES: Record<AvailabilityDay["reason"], string> = {
  AVAILABLE: "bg-white text-ink-800 hover:border-brand-400",
  BLOCKED: "bg-warning-soft text-warning border-warning/25",
  BOOKED: "bg-brand-50 text-brand-800 border-brand-200",
  PAST: "bg-ink-50 text-ink-300",
};

/**
 * Availability board.
 *
 * Booked dates are read-only — they come from reservations and can only change
 * by changing the reservation. Everything else the partner can block or release
 * with an explicit reason, which is written to the audit trail.
 */
export function AvailabilityBoard({
  units,
  selectedUnitId,
  days,
  blocks,
  monthLabel,
  prevHref,
  nextHref,
  todayHref,
  basePath,
}: {
  units: CalendarUnit[];
  selectedUnitId: string;
  days: AvailabilityDay[];
  blocks: CalendarBlock[];
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  /** Used to build unit-switch links; keeps the same calendar elsewhere. */
  basePath: string;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const unit = units.find((entry) => entry.id === selectedUnitId) ?? units[0];

  const selectable = useMemo(() => new Set(days.filter((day) => day.reason !== "BOOKED" && day.reason !== "PAST").map((day) => day.date)), [days]);

  const inRange = (date: string) => Boolean(startDate && endDate && date >= startDate && date <= endDate);

  function toggle(date: string, reason: AvailabilityDay["reason"]) {
    if (reason === "BOOKED" || reason === "PAST") return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate("");
      return;
    }
    if (date < startDate) {
      setStartDate(date);
      return;
    }
    // Blocks are half-open: the final night is the night OF the last date.
    setEndDate(date);
  }

  if (!unit) {
    return (
      <EmptyState
        icon={<CalendarX2 className="h-5 w-5" />}
        title="No units yet"
        description="Add a room or apartment to your property first — the calendar is driven by real inventory."
        action={
          <Link href="/partner/properties" className="text-[13px] font-semibold text-brand-700 hover:underline">
            Go to properties
          </Link>
        }
      />
    );
  }

  const firstWeekday = days[0] ? new Date(`${days[0].date}T00:00:00Z`).getUTCDay() : 0;
  const pad = Array.from({ length: firstWeekday }, (_, index) => index);

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-lg border border-line bg-white p-4 shadow-xs">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">Inventory</p>
          <ul className="space-y-1">
            {units.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`${basePath}?unitId=${entry.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                    entry.id === unit.id ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-600 hover:bg-ink-50",
                  )}
                >
                  <Thumb src={entry.coverImageUrl} alt="" size="sm" className="h-7 w-7" />
                  <span className="min-w-0">
                    <span className="block truncate">{entry.label}</span>
                    <span className="block truncate text-[11px] font-normal text-ink-500">{entry.propertyName}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-line bg-white p-4 text-[12px] leading-relaxed text-ink-500 shadow-xs">
          <p className="mb-2 font-semibold uppercase tracking-[0.1em] text-ink-500">Legend</p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded border border-line bg-white" /> Available
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded border border-brand-200 bg-brand-50" /> Booked (read-only)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded border border-warning/25 bg-warning-soft" /> Blocked by you
            </li>
          </ul>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-xs">
          <div>
            <p className="text-[15px] font-semibold text-ink-900">{monthLabel}</p>
            <p className="text-[12px] text-ink-500">
              Click the first night, then the last night you want to block.
            </p>
            <Link
              href={`/partner/properties/${unit.propertyId}?tab=pricing`}
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:underline"
            >
              Set your price for {units.find((entry) => entry.id === unit.id)?.propertyName ?? "this property"} →
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={prevHref}
              className="inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-[13px] text-ink-700 hover:bg-ink-50"
            >
              Previous
            </Link>
            <Link
              href={todayHref}
              className="inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-[13px] text-ink-700 hover:bg-ink-50"
            >
              This month
            </Link>
            <Link
              href={nextHref}
              className="inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-[13px] text-ink-700 hover:bg-ink-50"
            >
              Next
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4 shadow-xs">
          <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {pad.map((index) => (
              <span key={`pad-${index}`} />
            ))}
            {days.map((day) => {
              const selected = day.date === startDate || day.date === endDate || inRange(day.date);
              const disabled = !selectable.has(day.date);
              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => toggle(day.date, day.reason)}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center rounded-md border text-[13px] transition-colors disabled:cursor-not-allowed",
                    DAY_STYLES[day.reason],
                    selected && "border-brand-600 ring-2 ring-brand-500/30",
                  )}
                  title={
                    day.reason === "BOOKED"
                      ? "Booked — read-only"
                      : day.reason === "BLOCKED"
                        ? "Blocked by you"
                        : day.reason === "PAST"
                          ? "Past date"
                          : formatMoney(day.rate)
                  }
                >
                  <span className="font-medium">{Number(day.date.slice(-2))}</span>
                  <span className="text-[10px] tabular-nums opacity-80">
                    {day.reason === "AVAILABLE" && day.rate > 0 ? formatMoney(day.rate, "NGN", { compact: true }) : ""}
                    {day.reason === "BLOCKED" ? "blocked" : ""}
                    {day.reason === "BOOKED" ? "booked" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-white p-4 shadow-xs">
            <h3 className="text-[14px] font-semibold text-ink-900">Block selected dates</h3>
            {startDate ? (
              <p className="mt-1 text-[13px] text-ink-500">
                {startDate}
                {endDate ? ` → ${endDate}` : " → pick the last night"}
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-ink-500">Nothing selected yet.</p>
            )}

            <div className="mt-4">
              <ActionForm
                action={blockUnitDates}
                hidden={{ unitId: unit.id, startDate, endDate: endDate || startDate }}
                submitLabel={endDate || startDate ? "Block dates" : "Select dates first"}
                submitDisabled={!startDate}
                className="space-y-3"
              >
                <Field label="Reason" htmlFor="block-reason" required>
                  <Select id="block-reason" name="reason" defaultValue="MAINTENANCE" required>
                    <option value="MAINTENANCE">Maintenance / refurbishment</option>
                    <option value="OWNER_USE">Owner or staff use</option>
                    <option value="MANUAL_BOOKING">Booked offline by me</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </Field>
                <Field label="Note" htmlFor="block-note" hint="Optional — recorded with the audit entry.">
                  <Textarea id="block-note" name="note" className="min-h-16" />
                </Field>
              </ActionForm>
            </div>

            <p className="mt-4 inline-flex items-start gap-2 rounded-md bg-info-soft px-3 py-2.5 text-[12px] leading-relaxed text-info">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              For an offline or walk-in booking use the form below — that keeps the guest record, commission and
              settlement correct.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-white p-4 shadow-xs">
              <h3 className="text-[14px] font-semibold text-ink-900">Current blocks</h3>
              {blocks.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-500">No blocks on this unit yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {blocks.map((block) => (
                    <li
                      key={block.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink-900">
                          {block.startDate} → {block.endDate}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone="warning">{BLOCK_LABELS[block.reason]}</Badge>
                          {block.note ? (
                            <span className="text-[12px] text-ink-500">{block.note}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <ActionForm action={unblockUnitDates} hidden={{ blockId: block.id }} submitLabel="Release" submitSize="sm" submitVariant="outline" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ManualBookingForm unitId={unit.id} maxGuests={0} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Manual (walk-in / phone) booking form. Rendered by the board so the operator
 * always has it to hand next to the calendar.
 */
export function ManualBookingForm({ unitId, maxGuests }: { unitId: string; maxGuests: number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
        <Lock className="h-4 w-4 text-ink-400" aria-hidden />
        Record an offline booking
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
        For walk-ins and phone reservations. The booking runs through the same engine as an online booking —
        inventory, due diligence and settlement all still apply.
      </p>

      <div className="mt-4">
        <ManualBookingFields unitId={unitId} maxGuests={maxGuests} />
      </div>
    </div>
  );
}

function ManualBookingFields({ unitId, maxGuests }: { unitId: string; maxGuests: number }) {
  return (
    <ActionForm action={createManualReservation} hidden={{ unitId }} submitLabel="Record booking" className="grid gap-3 sm:grid-cols-2">
      <Field label="Guest name" htmlFor="manual-guest" required>
        <Input id="manual-guest" name="guestName" required />
      </Field>
      <Field label="Guest email" htmlFor="manual-email" required>
        <Input id="manual-email" name="guestEmail" type="email" required />
      </Field>
      <Field label="Guest phone" htmlFor="manual-phone">
        <Input id="manual-phone" name="guestPhone" type="tel" />
      </Field>
      <Field label="Guests" htmlFor="manual-guests" hint={maxGuests > 0 ? `Sleeps up to ${maxGuests}.` : undefined}>
        <Input id="manual-guests" name="guests" type="number" min={1} defaultValue={1} required />
      </Field>
      <Field label="Arrival" htmlFor="manual-checkin" required>
        <Input id="manual-checkin" name="checkIn" type="date" required />
      </Field>
      <Field label="Departure" htmlFor="manual-checkout" required>
        <Input id="manual-checkout" name="checkOut" type="date" required />
      </Field>
      <Field label="Internal note" htmlFor="manual-note" className="sm:col-span-2">
        <Textarea id="manual-note" name="note" className="min-h-16" />
      </Field>
    </ActionForm>
  );
}

export const AvailabilityBoardActions = { blockUnitDates, unblockUnitDates };

export function MaintenanceHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-start gap-2 text-[12px] leading-relaxed text-ink-500">
      <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

export function ConfirmToggle({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={`toggle-${name}`} name={name} />
      <label htmlFor={`toggle-${name}`} className="text-[13px] text-ink-600">
        {label}
      </label>
    </div>
  );
}

export { SubmitButton };
