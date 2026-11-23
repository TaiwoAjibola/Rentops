"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notifications";
import { partnerStaffUserIds } from "@/lib/payments/booking";

export type CustomerActionState = { error?: string; success?: string } | null;

/**
 * Conversations always belong to the session user — never a client-supplied id.
 * `propertyId` is a plain column on Conversation, so the property is resolved
 * separately when it is needed.
 */
async function ownConversation(userId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, customerId: userId },
    include: { reservation: { select: { id: true, reference: true } } },
  });
}

export async function sendCustomerMessage(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/messages");

  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!conversationId) return { error: "Conversation not found." };
  if (body.length < 2) return { error: "Write a message before sending." };
  if (body.length > 4000) return { error: "Messages are limited to 4000 characters." };

  const conversation = await ownConversation(user.id, conversationId);
  if (!conversation) return { error: "Conversation not found." };

  await prisma.$transaction([
    prisma.message.create({ data: { conversationId: conversation.id, senderId: user.id, body } }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        status: conversation.type === "SUPPORT" ? "OPEN" : "PENDING_PARTNER",
      },
    }),
  ]);

  // Anything the customer has not read yet is implicitly read once they reply.
  await prisma.messageRead.createMany({
    data: (await unreadMessageIds(conversation.id, user.id)).map((messageId) => ({ messageId, userId: user.id })),
    skipDuplicates: true,
  });

  if (conversation.type !== "SUPPORT") {
    const staff = conversation.partnerId
      ? await partnerStaffUserIds(conversation.partnerId, ["OWNER", "MANAGER", "FRONT_DESK"])
      : [];
    if (staff.length > 0) {
      await notifyMany(staff, {
        type: "MESSAGE_RECEIVED",
        title: `New message from ${user.firstName}`,
        body: body.slice(0, 160),
        channels: ["IN_APP", "EMAIL"],
        data: { conversationId: conversation.id },
      });
    }
  }

  revalidatePath(`/account/messages/${conversation.id}`);
  revalidatePath("/account/messages");
  revalidatePath("/account");
  return { success: "Message sent." };
}

/** Starts a RentOps support conversation from anywhere in the account area. */
export async function startSupportConversation(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/support");

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const reservationId = String(formData.get("reservationId") ?? "").trim();
  if (subject.length < 3) return { error: "Give your request a short subject." };
  if (body.length < 10) return { error: "Tell us what you need help with." };

  const reservation = reservationId
    ? await prisma.reservation.findFirst({
        where: { id: reservationId, userId: user.id },
        select: { id: true, reference: true, propertyId: true },
      })
    : null;

  const conversation = await prisma.conversation.create({
    data: {
      type: "SUPPORT",
      status: "OPEN",
      subject,
      propertyId: reservation?.propertyId ?? null,
      reservationId: reservation?.id ?? null,
      customerId: user.id,
      partnerId: null,
      messages: { create: { senderId: user.id, body } },
    },
  });

  const staff = await prisma.user.findMany({
    where: { systemRole: { in: ["REMTOPS_SUPPORT", "REMTOPS_ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true },
  });
  await notifyMany(
    staff.map((entry) => entry.id),
    {
      type: "MESSAGE_RECEIVED",
      title: `Support request: ${subject}`,
      body: `${user.firstName} ${user.lastName} — ${body.slice(0, 140)}`,
      channels: ["IN_APP"],
      data: { conversationId: conversation.id },
    },
  );

  await notify({
    userId: user.id,
    type: "GENERAL",
    title: "Support request opened",
    body: "Our team replies here in your messages. Most requests are answered the same day.",
    channels: ["IN_APP"],
    data: { conversationId: conversation.id },
  });

  revalidatePath("/account/messages");
  redirect(`/account/messages/${conversation.id}`);
}

async function unreadMessageIds(conversationId: string, userId: string) {
  const messages = await prisma.message.findMany({
    where: { conversationId, senderId: { not: userId }, reads: { none: { userId } } },
    select: { id: true },
  });
  return messages.map((message) => message.id);
}

/** Starts an ENQUIRY conversation with a property/partner from anywhere in the account area. */
export async function startPropertyEnquiry(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/messages");

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const reservationId = String(formData.get("reservationId") ?? "").trim();
  if (!propertyId) return { error: "Choose the property you want to message." };
  if (subject.length < 3) return { error: "Give your enquiry a short subject." };
  if (body.length < 10) return { error: "Ask your question — the property will reply here." };

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      partnerId: true,
    },
  });
  if (!property || property.status !== "APPROVED") {
    return { error: "That property is not currently taking enquiries." };
  }

  const reservation = reservationId
    ? await prisma.reservation.findFirst({
        where: { id: reservationId, userId: user.id, propertyId: property.id },
        select: { id: true },
      })
    : null;

  const conversation = await prisma.conversation.create({
    data: {
      type: "ENQUIRY",
      status: "PENDING_PARTNER",
      subject,
      propertyId: property.id,
      reservationId: reservation?.id ?? null,
      customerId: user.id,
      partnerId: property.partnerId,
      messages: { create: { senderId: user.id, body } },
    },
  });

  const staff = await partnerStaffUserIds(property.partnerId, ["OWNER", "MANAGER", "FRONT_DESK"]);
  await notifyMany(staff, {
    type: "MESSAGE_RECEIVED",
    title: `Enquiry for ${property.name}`,
    body: `${user.firstName} ${user.lastName} — ${body.slice(0, 140)}`,
    channels: ["IN_APP", "EMAIL"],
    data: { conversationId: conversation.id, propertyId: property.id },
  });

  await notify({
    userId: user.id,
    type: "GENERAL",
    title: "Enquiry sent",
    body: "The property will reply right here in your messages.",
    channels: ["IN_APP"],
    data: { conversationId: conversation.id },
  });

  revalidatePath("/account/messages");
  redirect(`/account/messages/${conversation.id}`);
}
