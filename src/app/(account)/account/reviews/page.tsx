import Link from "next/link";
import { Star } from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { CustomerActionForm } from "@/components/account/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_TONES } from "@/lib/constants";
import { createCustomerReview } from "@/server/actions/customer-reviews";

export const metadata = { title: "Reviews" };

const SUB_RATINGS: Array<{ name: string; label: string }> = [
  { name: "cleanliness", label: "Cleanliness" },
  { name: "accuracy", label: "Accuracy" },
  { name: "communication", label: "Communication" },
  { name: "locationRating", label: "Location" },
  { name: "value", label: "Value" },
  { name: "checkInRating", label: "Check-in" },
];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser("/account/reviews");
  const query = await searchParams;

  const [reviews, reviewableStays] = await Promise.all([
    prisma.review.findMany({
      where: { userId: user.id },
      include: { property: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.reservation.findMany({
      where: { userId: user.id, status: "CHECKED_OUT", reviews: { none: {} } },
      include: { property: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <AccountPageHeader
        eyebrow="Your voice"
        title="Reviews"
        description="What you say about stays helps other travellers — and shapes the ranking."
      />

      {query.submitted ? (
        <p className="mb-4 rounded-md border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Thanks — your review of {query.submitted} is waiting for moderation.
        </p>
      ) : null}

      {reviewableStays.length > 0 ? (
        <section className="mb-6 rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Rate a recent stay</h2>
          <p className="mt-1 text-sm text-ink-500">Only stays you have checked out of can be reviewed.</p>
          <div className="mt-4 space-y-4">
            {reviewableStays.map((reservation) => (
              <CustomerActionForm
                key={reservation.id}
                action={createCustomerReview}
                hidden={{ reservation: reservation.reference }}
                submitLabel="Submit review"
                className="rounded-md border border-line bg-ink-50/40 p-4"
              >
                <p className="text-[14px] font-semibold text-ink-900">
                  {reservation.property.name} <span className="font-normal text-ink-500">· {reservation.reference}</span>
                </p>
                <Field label="Overall rating (1–5)" htmlFor={`review-overall-${reservation.id}`} required>
                  <Select id={`review-overall-${reservation.id}`} name="overallRating" defaultValue="" required>
                    <option value="">Choose…</option>
                    <option value="5">5 — Exceptional</option>
                    <option value="4">4 — Very good</option>
                    <option value="3">3 — Good</option>
                    <option value="2">2 — Fair</option>
                    <option value="1">1 — Poor</option>
                  </Select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  {SUB_RATINGS.map(({ name, label }) => (
                    <Field key={name} label={`${label} (1–5, optional)`} htmlFor={`review-${name}-${reservation.id}`}>
                      <Select id={`review-${name}-${reservation.id}`} name={name} defaultValue="">
                        <option value="">—</option>
                        <option value="5">5</option>
                        <option value="4">4</option>
                        <option value="3">3</option>
                        <option value="2">2</option>
                        <option value="1">1</option>
                      </Select>
                    </Field>
                  ))}
                </div>
                <Field label="Headline" htmlFor={`review-title-${reservation.id}`}>
                  <Input id={`review-title-${reservation.id}`} name="title" />
                </Field>
                <Field label="Your experience" htmlFor={`review-body-${reservation.id}`} required hint="At least a couple of sentences.">
                  <Textarea id={`review-body-${reservation.id}`} name="body" rows={3} required />
                </Field>
              </CustomerActionForm>
            ))}
          </div>
        </section>
      ) : null}

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-5 w-5" aria-hidden />}
          title="No reviews yet"
          description="After a stay you check out of, you can rate it here — it helps future guests."
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/properties/${review.property.slug}`} className="font-semibold text-ink-900 hover:text-brand-700">
                    {review.property.name}
                  </Link>
                  <p className="text-[12px] text-ink-500">{formatDate(review.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink-900">★ {review.overallRating}</span>
                  <Badge tone={REVIEW_STATUS_TONES[review.status]}>{REVIEW_STATUS_LABELS[review.status]}</Badge>
                </div>
              </div>
              {review.title ? <p className="mt-2 font-medium text-ink-800">{review.title}</p> : null}
              <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
