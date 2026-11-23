import { Star } from "lucide-react";

import { Avatar, Rating } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/data";
import { formatDate } from "@/lib/dates";

import type { PropertyReview } from "@/components/public/types";

export function ReviewList({ reviews, take = 6 }: { reviews: PropertyReview[]; take?: number }) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-5 w-5" />}
        title="No published reviews yet"
        description="Reviews can only be written by guests who completed a stay, so what you read here comes from real bookings."
      />
    );
  }

  const shown = reviews.slice(0, take);

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white shadow-xs">
      {shown.map((review) => {
        const author = `${review.user.firstName} ${review.user.lastName.charAt(0)}.`;
        const dimensions = [
          { label: "Cleanliness", value: review.cleanliness },
          { label: "Accuracy", value: review.accuracy },
          { label: "Communication", value: review.communication },
          { label: "Location", value: review.locationRating },
          { label: "Value", value: review.value },
          { label: "Check-in", value: review.checkInRating },
        ].filter((entry): entry is { label: string; value: number } => typeof entry.value === "number" && entry.value > 0);

        return (
          <li key={review.id} className="p-5">
            <div className="flex items-start gap-3">
              <Avatar name={author} src={review.user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-[14px] font-semibold text-ink-900">{author}</p>
                  {review.reservationId ? (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                      Stayed here
                    </span>
                  ) : null}
                  <span className="text-[12.5px] text-ink-400">{formatDate(review.publishedAt ?? review.createdAt)}</span>
                </div>

                <div className="mt-1.5">
                  <Rating value={review.overallRating} size="xs" />
                </div>

                {review.title ? <p className="mt-2 text-[14px] font-semibold text-ink-900">{review.title}</p> : null}
                <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">{review.body}</p>

                {dimensions.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {dimensions.map((dimension) => (
                      <li
                        key={dimension.label}
                        className="rounded-full bg-ink-50 px-2.5 py-1 text-[11.5px] text-ink-600"
                      >
                        {dimension.label} {dimension.value}/5
                      </li>
                    ))}
                  </ul>
                ) : null}

                {review.partnerResponse ? (
                  <div className="mt-4 rounded-md border-l-2 border-brand-300 bg-brand-50/50 px-3.5 py-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-700">
                      Response from the property
                    </p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">{review.partnerResponse}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
