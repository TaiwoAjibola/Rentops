"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { disputeReference } from "@/lib/reference";
import { notify, notifyMany } from "@/lib/notifications";
import { cancelReservation } from "@/lib/reservations";
import { recordAudit } from "@/lib/audit";

export type CustomerActionState = { error?: string; success?: string } | null;

const CANCELLABLE = ["DRAFT", "PENDING_PAYMENT", "PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN"] as const;

async function ownReservation(userId: string, reference: string) {
  return prisma.reservation.findFirst({
    where: { reference, userId },
    include: { property: { include: { cancellationPolicy: true, partner: true } } },
  });
}

export async function cancelCustomerReservation(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/reservations");

  const reference = String(formData.get("reference") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reference) return { error: "Reservation not found." };

  const reservation = await ownReservation(user.id, reference);
  if (!reservation) return { error: "Reservation not found." };
  if (!CANCELLABLE.includes(reservation.status as (typeof CANCELLABLE)[number])) {
    return { error: "This reservation can no longer be cancelled here. Contact support and we will help." };
  }

  const result = await cancelReservation({
    reservationId: reservation.id,
    actorId: user.id,
    reason: reason || "Cancelled by guest",
    issueRefund: true,
  });

  if (!result) return { error: "This reservation cannot be cancelled. Contact support for help." };

  await recordAudit({
    actorId: user.id,
    action: "CUSTOMER_RESERVATION_CANCEL",
    entityType: "Reservation",
    entityId: reservation.id,
    summary: `Guest cancelled ${reservation.reference}`,
    after: { refundAmount: result.refundAmount, refundPercent: result.outcome.refundPercent },
  });

  await notify({
    userId: user.id,
    type: "BOOKING_CANCELLED",
    title: `Reservation ${reservation.reference} cancelled`,
    body:
      result.refundAmount > 0
        ? `A refund of ${result.outcome.refundPercent}% is being processed.`
        : "This booking was outside the free-cancellation window, so no refund is due.",
    channels: ["IN_APP", "EMAIL"],
    data: { reservationId: reservation.id },
  });

  revalidatePath(`/account/reservations/${reference}`);
  revalidatePath("/account/reservations");
  revalidatePath("/account");
  return {
    success:
      result.refundAmount > 0
        ? "Reservation cancelled. Your refund is being processed."
        : "Reservation cancelled.",
  };
}

/** Opens a refund claim. A Dispute row is created for RentOps to review. */
export async function requestReservationRefund(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/reservations");

  const reference = String(formData.get("reference") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const desiredOutcome = String(formData.get("desiredOutcome") ?? "").trim();
  if (!reference) return { error: "Reservation not found." };
  if (reason.length < 10) return { error: "Tell us a little more about why you are requesting a refund." };

  const reservation = await ownReservation(user.id, reference);
  if (!reservation) return { error: "Reservation not found." };

  const existing = await prisma.dispute.findFirst({
    where: { reservationId: reservation.id, status: { in: ["OPEN", "UNDER_REVIEW", "AWAITING_PARTNER"] } },
  });
  if (existing) return { error: "A refund request for this reservation is already being reviewed." };

  const dispute = await prisma.dispute.create({
    data: {
      reference: disputeReference(),
      reservationId: reservation.id,
      openedById: user.id,
      category: "REFUND",
      reason,
      desiredOutcome: desiredOutcome || "Full refund",
      status: "OPEN",
    },
  });

  const staff = await prisma.user.findMany({
    where: { systemRole: { in: ["REMTOPS_SUPPORT", "REMTOPS_ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true },
  });
  await notifyMany(
    staff.map((entry) => entry.id),
    {
      type: "DISPUTE_UPDATE",
      title: `Refund requested — ${reservation.reference}`,
      body: reason.slice(0, 180),
      channels: ["IN_APP"],
      data: { disputeId: dispute.id, reservationId: reservation.id },
    },
  );

  await notify({
    userId: user.id,
    type: "REFUND_UPDATE",
    title: `Refund request received (${dispute.reference})`,
    body: "Our support team will review your request and update you here.",
    channels: ["IN_APP"],
    data: { disputeId: dispute.id },
  });

  revalidatePath(`/account/reservations/${reference}`);
  revalidatePath("/account/support");
  return { success: `Refund request ${dispute.reference} submitted. We will update you here.` };
}

/**
 * Opens (or reuses) a conversation about a reservation — either with the
 * property partner or with RentOps support — and sends the customer to it.
 */
export async function openReservationConversation(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/reservations");

  const reference = String(formData.get("reference") ?? "").trim();
  const audience = String(formData.get("audience") ?? "").trim() === "SUPPORT" ? "SUPPORT" : "PARTNER";
  const message = String(formData.get("message") ?? "").trim();
  if (!reference) return { error: "Reservation not found." };

  const reservation = await prisma.reservation.findFirst({
    where: { reference, userId: user.id },
    include: { property: { select: { id: true, name: true, partnerId: true } } },
  });
  if (!reservation) return { error: "Reservation not found." };

  const type = audience === "SUPPORT" ? "SUPPORT" : "BOOKING";
  const existing = await prisma.conversation.findFirst({
    where: {
      customerId: user.id,
      reservationId: reservation.id,
      ...(audience === "SUPPORT" ? { type: "SUPPORT" } : { type: { in: ["BOOKING", "ENQUIRY"] } }),
    },
    orderBy: { createdAt: "desc" },
  });

  let conversationId = existing?.id;

  if (!conversationId) {
    const created = await prisma.conversation.create({
      data: {
        type,
        subject: audience === "SUPPORT" ? `Support needed · ${reservation.reference}` : reservation.property.name,
        propertyId: reservation.propertyId,
        reservationId: reservation.id,
        customerId: user.id,
        partnerId: audience === "SUPPORT" ? null : reservation.property.partnerId,
        status: audience === "SUPPORT" ? "OPEN" : "PENDING_PARTNER",
      },
    });
    conversationId = created.id;
  }

  if (message) {
    await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        body: message,
      },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), status: audience === "SUPPORT" ? "OPEN" : "PENDING_PARTNER" },
    });
  }

  revalidatePath("/account/messages");
  redirect(`/account/messages/${conversationId}`);
}
