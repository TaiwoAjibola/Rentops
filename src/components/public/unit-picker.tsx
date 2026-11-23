"use client";

import { Bath, BedDouble, Users } from "lucide-react";

import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { UnitSummary } from "@/components/public/types";

/**
 * Room / apartment selection.
 *
 * Every unit the partner has configured is listed with its own rates so a guest
 * can compare. Rates always carry their billing period.
 */
export function UnitPicker({
  units,
  value,
  onChange,
  name = "unitId",
  standalone = false,
}: {
  units: UnitSummary[];
  value: string;
  onChange?: (unitId: string) => void;
  name?: string;
  standalone?: boolean;
}) {
  if (units.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-500">
        No bookable rooms or apartments have been configured for this property yet.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2", standalone && "max-h-[420px] overflow-y-auto pr-1")}>
      {units.map((unit) => {
        const selected = unit.id === value;
        return (
          <li key={unit.id}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-all duration-150",
                selected
                  ? "border-brand-600 bg-brand-50/60 shadow-xs"
                  : "border-line bg-white hover:border-brand-300 hover:bg-brand-50/30",
                !unit.available && "opacity-70",
              )}
            >
              <input
                type="radio"
                name={name}
                value={unit.id}
                checked={selected}
                onChange={() => onChange?.(unit.id)}
                disabled={!unit.available}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-700"
              />

              <span className="flex min-w-0 flex-1 gap-3">
                {unit.previewImageUrl ? (
                  <span
                    className="mt-0.5 hidden h-16 w-20 shrink-0 rounded-md bg-brand-100 bg-cover bg-center sm:block"
                    style={{ backgroundImage: `url(${unit.previewImageUrl})` }}
                    aria-hidden
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-[14px] font-semibold text-ink-900">{unit.label}</span>
                    {unit.rates[0] ? (
                      <span className="text-[13px] font-semibold text-ink-900">
                        {formatMoney(unit.rates[0].amount, "NGN", { compact: true })}{" "}
                        <span className="font-normal text-ink-500">{unit.rates[0].basisLabel}</span>
                      </span>
                    ) : null}
                  </span>

                  {unit.categoryName ? (
                    <span className="mt-0.5 block text-[12.5px] text-ink-500">{unit.categoryName}</span>
                  ) : null}

                  {unit.mediaCount > 0 || unit.hasTour ? (
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {unit.mediaCount > 0 ? (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                          {unit.mediaCount} photo{unit.mediaCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {unit.hasTour ? (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                          360° tour
                        </span>
                      ) : null}
                    </span>
                  ) : null}

                <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                    Sleeps {unit.maxGuests}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                    {unit.bedrooms} bed
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Bath className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                    {unit.bathrooms} bath
                  </span>
                </span>

                {unit.rates.length > 1 ? (
                  <span className="mt-2 block text-[12px] text-ink-500">
                    Also {unit.rates.slice(1).map((rate) => `${formatMoney(rate.amount, "NGN", { compact: true })} ${rate.basisLabel}`).join(" · ")}
                  </span>
                ) : null}

                {unit.minNights > 1 || unit.maxNights != null ? (
                  <span className="mt-1.5 block text-[12px] text-ink-500">
                    Stays of {unit.minNights} night{unit.minNights === 1 ? "" : "s"} or more
                    {unit.maxNights != null ? `, up to ${unit.maxNights}` : ""}
                  </span>
                ) : null}

                  {unit.availableFrom ? (
                    <span className="mt-1.5 block text-[12px] text-ink-500">
                      Next free date: {unit.availableFrom}
                    </span>
                  ) : null}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
