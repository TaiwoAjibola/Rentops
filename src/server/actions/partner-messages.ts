"use server";

import { revalidatePath } from "next/cache";
import type { ConversationStatus } from "@prisma/client";

import type { PartnerActionState } from "@/components/partner/action-state";
import { str } from "@/components/partner/guards";
import { requirePartnerPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";

/**
 * Partner-side messaging.
 *
 * A conversation only ever belongs to the partner resolved from the session —
 * the conversation id comes from the page, but every lookup is scoped by
 * `partnerId`, so guessing another partner's thread id finds nothing.
 */

const CONVERSATION_STATUSES: ConversationStatus[] = ["OPEN", "PENDING_PARTNER", "PENDING_CUSTOMER", "CLOSED"];

/** Loads a conversation only when it belongs to the acting partner. */
async function ownConversation(partnerId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, partnerId },
    include: { reservation: { select: { id: true, reference: true } } },
  });
}

export async function sendPartnerMessage(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("message.manage");

  const conversationId = str(formData, "conversationId");
  const body = str(formData, "body");

  if (!conversationId) return { error: "Conversation not found." };
  if (body.length < 2) return { error: "Write a message before sending." };
  if (body.length > 4000) return { error: "Messages are limited to 4000 characters." };

  const conversation = await ownConversation(partner.id, conversationId);
  if (!conversation) return { error: "Conversation not found." };

  await prisma.$transaction([
    prisma.message.create({ data: { conversationId: conversation.id, senderId: user.id, body } }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: "PENDING_CUSTOMER" },
    }),
  ]);

  // Replying implies you have read everything already in the thread.
  await markRead(conversation.id, user.id);

  if (conversation.customerId) {
    await notify({
      userId: conversation.customerId,
      type: "MESSAGE_RECEIVED",
      title: `Reply from ${partner.businessName}`,
      body: body.slice(0, 160),
      channels: ["IN_APP", "EMAIL"],
      data: { conversationId: conversation.id },
    });
  }

  revalidatePath(`/partner/messages/${conversation.id}`);
  revalidatePath("/partner/messages");
  revalidatePath("/partner", "layout");
  return { success: "Message sent." };
}

export async function markConversationRead(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("message.manage");

  const conversationId = str(formData, "conversationId");
  const conversation = await ownConversation(partner.id, conversationId);
  if (!conversation) return { error: "Conversation not found." };

  const marked = await markRead(conversation.id, user.id);

  revalidatePath(`/partner/messages/${conversation.id}`);
  revalidatePath("/partner/messages");
  revalidatePath("/partner", "layout");
  return { success: marked === 0 ? "You are already up to date." : `Marked ${marked} message(s) as read.` };
}

export async function setConversationStatus(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("message.manage");

  const conversationId = str(formData, "conversationId");
  const status = str(formData, "status") as ConversationStatus;
  if (!CONVERSATION_STATUSES.includes(status)) return { error: "Choose a valid conversation state." };

  const conversation = await ownConversation(partner.id, conversationId);
  if (!conversation) return { error: "Conversation not found." };

  await prisma.conversation.update({ where: { id: conversation.id }, data: { status } });

  revalidatePath(`/partner/messages/${conversation.id}`);
  revalidatePath("/partner/messages");
  return {
    success: status === "CLOSED" ? "Conversation closed. Replying reopens it." : "Conversation reopened.",
  };
}

async function markRead(conversationId: string, userId: string) {
  const unread = await prisma.message.findMany({
    where: { conversationId, senderId: { not: userId }, reads: { none: { userId } } },
    select: { id: true },
  });

  if (unread.length === 0) return 0;

  await prisma.messageRead.createMany({
    data: unread.map((message) => ({ messageId: message.id, userId })),
    skipDuplicates: true,
  });

  return unread.length;
}
