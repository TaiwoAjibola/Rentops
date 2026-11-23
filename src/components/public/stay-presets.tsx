"use client";

import { cn } from "@/lib/utils";
import { STAY_PRESETS } from "@/lib/constants";

/**
 * Stay-length presets.
 *
 * These are shortcuts that fill the date fields — they are never restrictions.
 * What a property will actually accept is decided entirely by the partner's own
 * minimum and maximum nights, read from the listing itself.
 */
export function StayPresets({
  active,
  onSelect,
  className,
}: {
  active: number | null;
  onSelect: (nights: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label="Stay length">
      {STAY_PRESETS.map((preset) => {
        const selected = active === preset.nights;
        return (
          <button
            key={preset.nights}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(preset.nights)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150",
              selected
                ? "border-brand-700 bg-brand-700 text-white shadow-xs"
                : "border-line-strong bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800",
            )}
          >
            {preset.label}
            <span className={cn("ml-1.5 text-[11px]", selected ? "text-white/70" : "text-ink-400")}>
              {preset.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
