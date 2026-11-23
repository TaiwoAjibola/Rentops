"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notifications";
import { partnerStaffUserIds } from "@/lib/payments/booking";

export type CustomerActionState = { error?: string; success?: string } | null;

type SubRatingKey = "cleanliness" | "accuracy" | "communication" | "locationRating" | "value" | "checkInRating";

const SUB_RATINGS: SubRatingKey[] = [
  "cleanliness",
  "accuracy",
  "communication",
  "locationRating",
  "value",
  "checkInRating",
];

function rating(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return null;
  return Math.round(parsed);
}

/**
 * Writes a guest review for a completed stay. Reviews are moderated, so they
 * land as PENDING and only published ones move the property's aggregate score.
 */
export async function createCustomerReview(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/reviews");

  const reservationReference = String(formData.get("reservation") ?? "").trim();
  if (!reservationReference) return { error: "Reservation not found." };

  const reservation = await prisma.reservation.findFirst({
    where: { reference: reservationReference, userId: user.id },
    include: { property: { select: { id: true, name: true, partnerId: true } }, reviews: { select: { id: true } } },
  });
  if (!reservation) return { error: "Reservation not found." };
  if (reservation.status !== "CHECKED_OUT") {
    return { error: "You can review a stay once you have checked out." };
  }
  if (reservation.reviews.length > 0) {
    return { error: "You have already reviewed this stay." };
  }

  const overall = rating(formData.get("overallRating"));
  if (overall === null) return { error: "Choose an overall rating from 1 to 5." };

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 20) return { error: "Write at least a couple of sentences about your stay." };
  if (title.length > 120) return { error: "Keep your headline under 120 characters." };

  const subRatings: Partial<Record<SubRatingKey, number>> = {};
  for (const key of SUB_RATINGS) {
    const value = rating(formData.get(key));
    if (value !== null) subRatings[key] = value;
  }

  const review = await prisma.review.create({
    data: {
      propertyId: reservation.propertyId,
      userId: user.id,
      reservationId: reservation.id,
      overallRating: overall,
      ...subRatings,
      title: title || null,
      body,
      status: "PENDING",
    },
  });

  await recomputePropertyRating(reservation.propertyId);

  await notify({
    userId: user.id,
    type: "GENERAL",
    title: "Thanks — your review is with our moderators",
    body: `Your review of ${reservation.property.name} will appear once it has been checked.`,
    channels: ["IN_APP"],
    data: { reviewId: review.id },
  });

  const staff = await partnerStaffUserIds(reservation.property.partnerId, ["OWNER", "MANAGER"]);
  if (staff.length > 0) {
    await notifyMany(staff, {
      type: "GENERAL",
      title: `New guest review for ${reservation.property.name}`,
      body: `${overall}/5 — waiting for RentOps moderation.`,
      channels: ["IN_APP"],
      data: { reviewId: review.id },
    });
  }

  revalidatePath("/account/reviews");
  revalidatePath("/account");
  redirect(`/account/reviews?submitted=${encodeURIComponent(reservation.reference)}`);
}

/** Aggregate score is always derived from PUBLISHED reviews only. */
async function recomputePropertyRating(propertyId: string) {
  const aggregate = await prisma.review.aggregate({
    where: { propertyId, status: "PUBLISHED" },
    _avg: { overallRating: true },
    _count: { _all: true },
  });

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      ratingAverage: aggregate._count._all > 0 ? Math.round((aggregate._avg.overallRating ?? 0) * 10) / 10 : null,
      ratingCount: aggregate._count._all,
    },
  });
}
