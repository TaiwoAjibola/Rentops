import type { RateBasis } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { RATE_BASIS_LABELS } from "@/lib/constants";

/**
 * RentOps never shows a bare number. Every price is rendered with the billing
 * period it applies to — per night, per week, per month or per year.
 */
export function PriceTag({
  amount,
  currency = "NGN",
  basis = "NIGHTLY",
  compact = false,
  size = "md",
  className,
  emphasis = true,
}: {
  amount: number;
  currency?: string;
  basis?: RateBasis;
  compact?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  emphasis?: boolean;
}) {
  const text = {
    sm: "text-[15px]",
    md: "text-lg",
    lg: "text-2xl",
    xl: "font-display text-3xl",
  }[size];

  const basisSize = { sm: "text-[11px]", md: "text-[11px]", lg: "text-[12px]", xl: "text-[13px]" }[size];

  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className={cn("leading-none", emphasis ? "font-semibold text-ink-900" : "text-ink-700", text)}>
        {formatMoney(amount, currency, { compact })}
      </span>
      <span className={cn("mt-1 uppercase tracking-[0.07em] text-ink-500", basisSize)}>
        {RATE_BASIS_LABELS[basis]}
      </span>
    </span>
  );
}

export function PriceInline({
  amount,
  currency = "NGN",
  basis = "NIGHTLY",
  compact = false,
  className,
}: {
  amount: number;
  currency?: string;
  basis?: RateBasis;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className="font-semibold text-ink-900">{formatMoney(amount, currency, { compact })}</span>
      <span className="text-[12px] text-ink-500">{RATE_BASIS_LABELS[basis]}</span>
    </span>
  );
}

export function PriceBreakdown({
  rows,
  total,
  currency = "NGN",
  className,
}: {
  rows: { label: string; amount: number; muted?: boolean }[];
  total?: { label: string; amount: number };
  currency?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {rows.map((row, index) => (
        <div key={index} className="flex items-baseline justify-between gap-4 text-[14px]">
          <span className={row.muted ? "text-ink-500" : "text-ink-700"}>{row.label}</span>
          <span className={cn("tabular-nums", row.muted ? "text-ink-500" : "text-ink-900")}>
            {formatMoney(row.amount, currency)}
          </span>
        </div>
      ))}
      {total ? (
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <span className="text-[15px] font-semibold text-ink-900">{total.label}</span>
          <span className="font-display text-xl text-ink-900 tabular-nums">
            {formatMoney(total.amount, currency)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
