import type { PartnerMemberRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { initializePayment, verifyPayment } from "@/lib/payments";
import { postBookingPaymentEntries, postLedgerEntry } from "@/lib/ledger";
import { notify, notifyMany } from "@/lib/notifications";
import { paymentReference as makePaymentReference } from "@/lib/reference";
import { holdExpired } from "@/lib/reservations";

/**
 * Orchestrates the money side of a reservation. Kept separate from the booking
 * engine so that payment state can never be inferred from booking state alone.
 */

export async function partnerStaffUserIds(partnerId: string, roles?: PartnerMemberRole[]) {
  const members = await prisma.partnerMember.findMany({
    where: {
      partnerId,
      status: "ACTIVE",
      ...(roles ? { role: { in: roles } } : {}),
    },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

export async function startReservationPayment(options: {
  reservationId: string;
  userId: string;
  email: string;
  callbackUrl?: string;
}) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: options.reservationId },
    include: { property: { include: { partner: true } } },
  });

  if (!reservation) return { ok: false as const, error: "Reservation not found." };
  if (reservation.userId !== options.userId) return { ok: false as const, error: "Not your reservation." };
  if (reservation.status !== "PENDING_PAYMENT") {
    return { ok: false as const, error: "This reservation is not awaiting payment." };
  }
  if (holdExpired(reservation)) {
    await prisma.reservation.update({ where: { id: reservation.id }, data: { status: "EXPIRED" } });
    return { ok: false as const, error: "This reservation has expired. Please search for availability again." };
  }

  const existing = await prisma.payment.findFirst({
    where: { reservationId: reservation.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return { ok: true as const, reference: existing.reference, authorizationUrl: `/payments/test/${existing.reference}`, paymentId: existing.id };
  }

  const reference = makePaymentReference();

  const payment = await prisma.payment.create({
    data: {
      reference,
      provider: "PAYSTACK",
      status: "PENDING",
      amount: reservation.grossAmount,
      currency: reservation.currency,
      purpose: "BOOKING",
      userId: reservation.userId,
      reservationId: reservation.id,
      metadata: { reservationReference: reservation.reference },
    },
  });

  const result = await initializePayment({
    reference,
    amount: reservation.grossAmount,
    currency: reservation.currency,
    email: options.email,
    callbackUrl: options.callbackUrl,
    metadata: {
      reservationId: reservation.id,
      reservationReference: reservation.reference,
      partnerId: reservation.property.partnerId,
    },
  });

  await notify({
    userId: reservation.userId,
    type: "PAYMENT_INITIATED",
    title: `Complete payment for ${reservation.reference}`,
    body: `We are holding your accommodation for ${reservation.nights} night(s). Complete payment to confirm.`,
    channels: ["IN_APP"],
    data: { reservationId: reservation.id },
  });

  return { ok: true as const, reference, authorizationUrl: result.authorizationUrl, paymentId: payment.id };
}

export async function markPaymentSuccess(options: {
  reference: string;
  amount?: number;
  providerReference?: string | null;
  channel?: string | null;
  raw?: unknown;
  webhookVerified?: boolean;
  actorId?: string | null;
}) {
  const payment = await prisma.payment.findUnique({
    where: { reference: options.reference },
    include: { reservation: { include: { property: { include: { partner: true } } } } },
  });

  if (!payment) return { ok: false as const, error: "Payment not found." };
  if (payment.status === "SUCCESS") return { ok: true as const, alreadyProcessed: true, reservationId: payment.reservationId };

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCESS",
      paidAt: new Date(),
      providerReference: options.providerReference ?? null,
      channel: options.channel ?? null,
      amount: options.amount ?? payment.amount,
      rawPayload: (options.raw ?? {}) as object,
      webhookVerified: options.webhookVerified ?? false,
    },
  });

  const reservation = payment.reservation;
  if (!reservation) return { ok: true as const, reservationId: null };

  if (reservation.status === "PENDING_PAYMENT") {
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        holdExpiresAt: null,
        verifiedStay: true,
      },
    });
  }

  await postBookingPaymentEntries({
    reservationId: reservation.id,
    paymentId: payment.id,
    partnerId: reservation.property.partnerId,
    currency: reservation.currency,
    grossAmount: reservation.grossAmount,
    platformCommission: reservation.platformCommission,
    processingFee: reservation.processingFee,
    partnerNetAmount: reservation.partnerNetAmount,
    reference: reservation.reference,
    createdById: options.actorId ?? null,
  });

  await notify({
    userId: reservation.userId,
    type: "BOOKING_CONFIRMED",
    title: `Booking confirmed — ${reservation.reference}`,
    body: `Your stay at ${reservation.property.name} is confirmed. Check-in ${reservation.checkIn.toISOString().slice(0, 10)}.`,
    channels: ["IN_APP", "EMAIL"],
    data: { reservationId: reservation.id },
  });

  const staff = await partnerStaffUserIds(reservation.property.partnerId, ["OWNER", "MANAGER", "FRONT_DESK"]);
  await notifyMany(staff, {
    type: "BOOKING_CONFIRMED_PARTNER",
    title: `New booking ${reservation.reference}`,
    body: `${reservation.property.name} · ${reservation.nights} night(s) · ${reservation.guests} guest(s).`,
    channels: ["IN_APP", "EMAIL"],
    data: { reservationId: reservation.id },
  });

  return { ok: true as const, reservationId: reservation.id, paymentId: updated.id };
}

export async function markPaymentFailed(options: { reference: string; reason?: string }) {
  const payment = await prisma.payment.findUnique({ where: { reference: options.reference } });
  if (!payment || payment.status !== "PENDING") return null;

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", failedAt: new Date(), failureReason: options.reason ?? "Payment failed" },
  });

  if (updated.userId) {
    await notify({
      userId: updated.userId,
      type: "PAYMENT_FAILED",
      title: "Payment was not completed",
      body: options.reason ?? "We could not confirm your payment. Please try again.",
      channels: ["IN_APP"],
      data: { reference: updated.reference },
    });
  }

  return updated;
}

/** Re-checks a payment with the provider (used after provider redirect). */
export async function reconcilePayment(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return { ok: false as const, error: "Payment not found." };

  const result = await verifyPayment(reference);
  if (result.status === "SUCCESS") {
    await markPaymentSuccess({
      reference,
      amount: result.amount || payment.amount,
      providerReference: result.providerReference,
      channel: result.channel,
      raw: result.raw,
      webhookVerified: true,
    });
    return { ok: true as const, status: "SUCCESS" as const };
  }

  if (result.status === "FAILED") {
    await markPaymentFailed({ reference, reason: "Provider reported failure" });
    return { ok: true as const, status: "FAILED" as const };
  }

  return { ok: true as const, status: "PENDING" as const };
}

export async function issueRefund(options: {
  reservationId: string;
  amount: number;
  actorId: string;
  reason?: string;
}) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: options.reservationId },
    include: { property: true },
  });
  if (!reservation) return null;

  const payment = await prisma.payment.findFirst({
    where: { reservationId: reservation.id, status: "SUCCESS" },
    orderBy: { paidAt: "desc" },
  });

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "REFUNDED",
      refundAmount: options.amount,
      refundedAt: new Date(),
    },
  });

  await postLedgerEntry({
    type: "REFUND",
    direction: "OUTFLOW",
    amount: options.amount,
    currency: reservation.currency,
    description: options.reason ?? `Refund for ${reservation.reference}`,
    reservationId: reservation.id,
    paymentId: payment?.id ?? null,
    partnerId: reservation.property.partnerId,
    createdById: options.actorId,
  });

  await notify({
    userId: reservation.userId,
    type: "REFUND_UPDATE",
    title: `Refund processed for ${reservation.reference}`,
    body: `A refund of your payment has been initiated. It may take a few working days to settle.`,
    channels: ["IN_APP", "EMAIL"],
    data: { reservationId: reservation.id },
  });

  return updated;
}
