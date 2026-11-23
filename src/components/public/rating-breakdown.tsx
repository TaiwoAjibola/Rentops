import type { PropertyReview } from "@/components/public/types";

const DIMENSIONS: { key: keyof Pick<PropertyReview, "cleanliness" | "accuracy" | "communication" | "locationRating" | "value" | "checkInRating">; label: string }[] = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "accuracy", label: "Accuracy" },
  { key: "communication", label: "Communication" },
  { key: "locationRating", label: "Location" },
  { key: "value", label: "Value for money" },
  { key: "checkInRating", label: "Check-in" },
];

/** Aggregate sub-scores across published reviews. */
export function RatingBreakdown({ reviews }: { reviews: PropertyReview[] }) {
  const rows = DIMENSIONS.map((dimension) => {
    const values = reviews
      .map((review) => review[dimension.key])
      .filter((value): value is number => typeof value === "number" && value > 0);
    const average = values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0;
    return { label: dimension.label, average, count: values.length };
  }).filter((row) => row.count > 0);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-xs">
      <h3 className="text-[14px] font-semibold text-ink-900">How guests rate this property</h3>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[104px_1fr_38px] items-center gap-3">
            <span className="text-[13px] text-ink-600">{row.label}</span>
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100" aria-hidden>
              <span
                className="block h-full rounded-full bg-brand-600"
                style={{ width: `${Math.round((row.average / 5) * 100)}%` }}
              />
            </span>
            <span className="text-right text-[13px] font-semibold tabular-nums text-ink-800">
              {row.average.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-ink-500">Scored out of 5 by guests who completed a stay.</p>
    </div>
  );
}
