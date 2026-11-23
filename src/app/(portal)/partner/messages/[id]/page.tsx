import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Callout } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { MessageComposer } from "@/components/account/message-composer";

export default async function PartnerMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { partner, can } = await requirePartnerContext();
  const { id } = await params;

  if (!can("message.manage")) {
    return (
      <Callout tone="warning" title="Not available to your role">
        Messaging requires the <strong>message.manage</strong> permission.
      </Callout>
    );
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, partnerId: partner.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  const [property, customer] = await Promise.all([
    conversation.propertyId
      ? prisma.property.findUnique({
          where: { id: conversation.propertyId },
          select: { name: true, slug: true },
        })
      : Promise.resolve(null),
    conversation.customerId
      ? prisma.user.findUnique({
          where: { id: conversation.customerId },
          select: { firstName: true, lastName: true, email: true },
        })
      : Promise.resolve(null),
  ]);

  const senderIds = Array.from(
    new Set(conversation.messages.map((entry) => entry.senderId).filter((id): id is string => Boolean(id))),
  );
  const senders =
    senderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
  const senderNames = new Map(
    senders.map((entry) => [entry.id, `${entry.firstName} ${entry.lastName}`]),
  );

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-500">
        <Link href="/partner/messages" className="hover:text-brand-700">Messages</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-800">{conversation.subject ?? "Conversation"}</span>
      </nav>

      <SectionHeading
        eyebrow="Conversation"
        title={conversation.subject ?? (customer ? `${customer.firstName} ${customer.lastName}` : "Conversation")}
        description={
          [property?.name, customer?.email].filter(Boolean).join(" · ") || undefined
        }
      />

      <div className="rounded-lg border border-line bg-white p-5">
        <div className="space-y-4">
          {conversation.messages.length === 0 ? (
            <p className="text-sm text-ink-500">No messages yet — start the conversation below.</p>
          ) : (
            conversation.messages.map((message) => {
              const isPartner = senderNames.has(message.senderId ?? "");
              return (
                <div
                  key={message.id}
                  className={`flex ${isPartner ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      isPartner ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-900"
                    }`}
                  >
                    <p className="text-[13px] leading-relaxed">{message.body}</p>
                    <p
                      className={`mt-1 text-[11px] ${
                        isPartner ? "text-white/70" : "text-ink-400"
                      }`}
                    >
                      {message.senderId
                        ? senderNames.get(message.senderId) ?? "Guest"
                        : "System"}
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
