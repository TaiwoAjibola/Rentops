import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountPageHeader } from "@/components/account/page-header";
import { MessageComposer } from "@/components/account/message-composer";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { formatDateTime, relativeTime } from "@/lib/dates";
import type { ConversationStatus } from "@prisma/client";

export const metadata = { title: "Conversation" };

const STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: "Open",
  PENDING_PARTNER: "Partner to reply",
  PENDING_CUSTOMER: "Waiting for you",
  CLOSED: "Closed",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("/account/messages");
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, customerId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      reservation: { select: { reference: true } },
    },
  });

  if (!conversation) notFound();

  const [property, partner] = await Promise.all([
    conversation.propertyId
      ? prisma.property.findUnique({
          where: { id: conversation.propertyId },
          select: { name: true, slug: true },
        })
      : Promise.resolve(null),
    conversation.partnerId
      ? prisma.partner.findUnique({
          where: { id: conversation.partnerId },
          select: { businessName: true },
        })
      : Promise.resolve(null),
  ]);

  const senderIds = Array.from(
    new Set(conversation.messages.map((entry) => entry.senderId).filter((id): id is string => Boolean(id))),
  );
  const senders = senderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, firstName: true },
      })
    : [];
  const senderNames = new Map(senders.map((entry) => [entry.id, entry.firstName]));

  const title = conversation.subject ?? property?.name ?? (conversation.type === "SUPPORT" ? "RentOps support" : "Conversation");

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <nav className="text-sm text-ink-500">
        <Link href="/account/messages" className="hover:text-brand-700">Messages</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-800">{title}</span>
      </nav>

      <AccountPageHeader
        eyebrow={conversation.type === "SUPPORT" ? "Support" : property?.name ?? "Conversation"}
        title={title}
        description={[property?.name, partner?.businessName, conversation.reservation?.reference].filter(Boolean).join(" · ") || undefined}
        actions={<Badge tone={conversation.status === "CLOSED" ? "neutral" : "info"}>{STATUS_LABELS[conversation.status]}</Badge>}
      />

      <div className="rounded-lg border border-line bg-white p-5">
        <div className="space-y-4">
          {conversation.messages.length === 0 ? (
            <p className="text-sm text-ink-500">No messages yet — start the conversation below.</p>
          ) : (
            conversation.messages.map((message) => {
              const fromCustomer = message.senderId === user.id;
              return (
                <div key={message.id} className={`flex ${fromCustomer ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      fromCustomer ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-900"
                    }`}
                  >
                    <p className="text-[13px] leading-relaxed">{message.body}</p>
                    <p
                      className={`mt-1 text-[11px] ${
                        fromCustomer ? "text-white/70" : "text-ink-400"
                      }`}
                    >
                      {fromCustomer
                        ? "You"
                        : message.senderId
                          ? senderNames.get(message.senderId) ?? "RentOps"
                          : "RentOps"}
                      {" · "}
                      {relativeTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <MessageComposer conversationId={conversation.id} />
        </div>
      </div>
    </div>
  );
}
