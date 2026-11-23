import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = {
    xs: "h-7 w-7 text-[10px]",
    sm: "h-9 w-9 text-[11px]",
    md: "h-11 w-11 text-[13px]",
    lg: "h-16 w-16 text-lg",
  }[size];

  const initials =
    (name ?? "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "RT";

  if (src) {
    return (
      // Local avatars may be arbitrary URLs supplied by partners, so the plain
      // img element avoids remote-loader configuration surprises.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "Avatar"}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-line", dimensions, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800 ring-1 ring-brand-200",
        dimensions,
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Rating({
  value,
  count,
  size = "sm",
  showValue = true,
  className,
}: {
  value: number;
  count?: number;
  size?: "xs" | "sm" | "md";
  showValue?: boolean;
  className?: string;
}) {
  const starSize = { xs: "h-3 w-3", sm: "h-3.5 w-3.5", md: "h-4 w-4" }[size];
  const rounded = Math.round(value * 10) / 10;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((index) => (
          <Star
            key={index}
            className={cn(
              starSize,
              index <= Math.round(value) ? "fill-gold-400 text-gold-400" : "text-line-strong",
            )}
          />
        ))}
      </span>
      {showValue ? (
        <span className="text-[13px] font-semibold text-ink-800">
          {rounded > 0 ? rounded.toFixed(1) : "New"}
        </span>
      ) : null}
      {count != null && count > 0 ? (
        <span className="text-[13px] text-ink-500">({count})</span>
      ) : null}
    </span>
  );
}

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-brand-700 px-2 text-[13px] font-bold text-white",
        className,
      )}
    >
      {score.toFixed(1)}
    </span>
  );
}
