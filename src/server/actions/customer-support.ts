"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TicketPriority } from "@prisma/client";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ticketReference } from "@/lib/reference";
import { notify, notifyMany } from "@/lib/notifications";

export type CustomerActionState = { error?: string; success?: string } | null;

const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const CATEGORIES = [
  "BOOKING",
  "PAYMENT",
  "PROPERTY",
  "INSPECTION",
  "VERIFICATION",
  "ACCOUNT",
  "PARTNER",
  "OTHER",
];

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export async function createSupportTicket(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/support");

  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = oneOf(String(formData.get("category") ?? "").trim(), CATEGORIES, "OTHER");
  const priority = oneOf(String(formData.get("priority") ?? "").trim(), PRIORITIES, "MEDIUM");
  const reservationReference = String(formData.get("reservation") ?? "").trim();

  if (subject.length < 5) return { error: "Give your ticket a clear subject." };
  if (description.length < 20) {
    return { error: "Describe the problem in a little more detail so we can act quickly." };
  }

  const reservation = reservationReference
    ? await prisma.reservation.findFirst({
        where: { reference: reservationReference, userId: user.id },
        select: { id: true, propertyId: true, reference: true },
      })
    : null;

  // Each ticket gets a linked conversation so replies are threaded, not emailed.
  const conversation = await prisma.conversation.create({
    data: {
      type: "SUPPORT",
      status: "OPEN",
      subject,
      propertyId: reservation?.propertyId ?? null,
      reservationId: reservation?.id ?? null,
      customerId: user.id,
      messages: { create: { senderId: user.id, body: description } },
    },
  });

  const ticket = await prisma.supportTicket.create({
    data: {
      reference: ticketReference(),
      subject,
      description,
      category,
      priority,
      status: "OPEN",
      userId: user.id,
      email: user.email,
      conversationId: conversation.id,
    },
  });

  const staff = await prisma.user.findMany({
    where: { systemRole: { in: ["REMTOPS_SUPPORT", "REMTOPS_ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true },
  });
  await notifyMany(
    staff.map((entry) => entry.id),
    {
      type: "GENERAL",
      title: `New ${priority.toLowerCase()} ticket — ${ticket.reference}`,
      body: subject,
      channels: ["IN_APP"],
      data: { ticketId: ticket.id },
    },
  );

  await notify({
    userId: user.id,
    type: "GENERAL",
    title: `Ticket ${ticket.reference} opened`,
    body: "Reply any time from this ticket — your messages go straight to the support team handling it.",
    channels: ["IN_APP", "EMAIL"],
    data: { ticketId: ticket.id, conversationId: conversation.id },
  });

  revalidatePath("/account/support");
  revalidatePath("/account/messages");
  redirect(`/account/support?ticket=${encodeURIComponent(ticket.reference)}`);
}

/** Replies to an existing ticket through its linked conversation. */
export async function replyToTicket(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/support");

  const reference = String(formData.get("reference") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!reference) return { error: "Ticket not found." };
  if (body.length < 2) return { error: "Write a reply before sending." };

  const ticket = await prisma.supportTicket.findFirst({
    where: { reference, userId: user.id },
  });
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === "CLOSED") return { error: "This ticket is closed. Open a new one if you still need help." };

  let conversationId = ticket.conversationId;

  if (!conversationId) {
    const conversation = await prisma.conversation.create({
      data: {
        type: "SUPPORT",
        status: "OPEN",
        subject: ticket.subject,
        customerId: user.id,
        messages: { create: { senderId: user.id, body: `${ticket.description}\n\n${body}` } },
      },
    });
    conversationId = conversation.id;
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { conversationId: conversation.id } });
  } else {
    await prisma.message.create({ data: { conversationId, senderId: user.id, body } });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), status: "OPEN" },
    });
  }

  if (ticket.status === "RESOLVED") {
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
  }

  const staff = await prisma.user.findMany({
    where: { systemRole: { in: ["REMTOPS_SUPPORT", "REMTOPS_ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true },
  });
  await notifyMany(
    staff.map((entry) => entry.id),
    {
      type: "MESSAGE_RECEIVED",
      title: `Reply on ${ticket.reference}`,
      body: body.slice(0, 160),
      channels: ["IN_APP"],
      data: { ticketId: ticket.id },
    },
  );

  revalidatePath("/account/support");
  revalidatePath(`/account/messages/${conversationId}`);
  return { success: "Reply sent. We will respond here." };
}
