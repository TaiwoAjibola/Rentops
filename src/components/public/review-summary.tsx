import { ScoreBadge } from "@/components/ui/avatar";

import type { PropertyReview } from "@/components/public/types";

/** Headline rating panel for a property page. */
export function ReviewSummary({
  reviews,
  ratingAverage,
  ratingCount,
}: {
  reviews: PropertyReview[];
  ratingAverage: number | null;
  ratingCount: number;
}) {
  const average = ratingAverage ?? 0;
  const verifiedStays = reviews.filter((review) => review.reservationId).length;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border border-line bg-white p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <ScoreBadge score={average} className="h-12 min-w-12 text-lg" />
        <div>
          <p className="font-display text-lg leading-none text-ink-900">
            {average > 0 ? WORDING(average) : "No ratings yet"}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-500">
            {ratingCount > 0
              ? `${ratingCount} guest review${ratingCount === 1 ? "" : "s"}`
              : "Be the first to review this property"}
          </p>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
        <div>
          <dt className="text-ink-500">Published reviews</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{reviews.length}</dd>
        </div>
        <div>
          <dt className="text-ink-500">From completed stays</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{verifiedStays}</dd>
        </div>
      </dl>
    </div>
  );
}

function WORDING(score: number) {
  if (score >= 4.6) return "Exceptional";
  if (score >= 4.2) return "Excellent";
  if (score >= 3.8) return "Very good";
  if (score >= 3.2) return "Good";
  if (score > 0) return "Fair";
  return "Not yet rated";
}
