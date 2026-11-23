import { cn } from "@/lib/utils";

/**
 * Hand-built visuals. The portal renders bars and sparklines directly so no
 * charting dependency is needed and everything stays server-rendered.
 */

export function BarList({
  items,
  formatValue,
  emptyLabel = "No data yet",
  className,
}: {
  items: { label: string; value: number }[];
  formatValue: (value: number) => string;
  emptyLabel?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-[13px] text-ink-500">{emptyLabel}</p>;
  }

  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
          <span className="truncate text-[13px] text-ink-600" title={item.label}>
            {item.label}
          </span>
          <span className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
            <span
              className="block h-full rounded-full bg-brand-600"
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-[13px] font-medium tabular-nums text-ink-900">{formatValue(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Vertical column chart with value labels; scales to the largest value. */
export function ColumnChart({
  data,
  formatValue,
  height = 120,
  className,
}: {
  data: { label: string; value: number }[];
  formatValue: (value: number) => string;
  height?: number;
  className?: string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-[13px] text-ink-500">No data in this period</p>;
  }

  const max = Math.max(1, ...data.map((point) => point.value));

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] font-medium tabular-nums text-ink-600">
              {point.value > 0 ? formatValue(point.value) : ""}
            </span>
            <div
              className="w-full rounded-t-sm bg-brand-600 transition-all"
              style={{ height: `${Math.max(2, Math.round((point.value / max) * (height - 26)))}px` }}
              title={`${point.label}: ${formatValue(point.value)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        {data.map((point) => (
          <span key={point.label} className="min-w-0 flex-1 truncate text-center text-[10px] text-ink-500">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Inline SVG sparkline. `values` are plotted left to right. */
export function Sparkline({
  values,
  width = 160,
  height = 40,
  className,
  strokeClassName = "text-brand-600",
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeClassName?: string;
}) {
  if (values.length === 0) {
    return <p className="text-[13px] text-ink-500">No trend data</p>;
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const area = `M0,${height} L${points.join(" L")} L${width},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-10 w-full", className)}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Trend across ${values.length} periods, latest ${values[values.length - 1] ?? 0}`}
    >
      <path d={area} className="fill-brand-100" />
      <polyline
        points={points.join(" ")}
        className={cn("fill-none stroke-current", strokeClassName)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Compact proportion bar for status mixes. */
export function ProportionBar({
  segments,
  className,
}: {
  segments: { label: string; value: number; className?: string }[];
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total === 0) return <div className={cn("h-2 w-full rounded-full bg-ink-100", className)} />;

  return (
    <div className={cn("flex h-2 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      {segments.map((segment) => (
        <div
          key={segment.label}
          className={segment.className ?? "bg-brand-600"}
          style={{ width: `${(segment.value / total) * 100}%` }}
          title={`${segment.label}: ${segment.value}`}
        />
      ))}
    </div>
  );
}
