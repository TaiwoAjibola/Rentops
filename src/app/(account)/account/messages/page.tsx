import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { relativeTime } from "@/lib/dates";
import type { ConversationStatus } from "@prisma/client";

export const metadata = { title: "Messages" };

const STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: "Open",
  PENDING_PARTNER: "Needs reply",
  PENDING_CUSTOMER: "Awaiting you",
  CLOSED: "Closed",
};

const STATUS_TONES: Record<ConversationStatus, "success" | "warning" | "info" | "neutral"> = {
  OPEN: "info",
  PENDING_PARTNER: "warning",
  PENDING_CUSTOMER: "warning",
  CLOSED: "neutral",
};

export default async function MessagesPage() {
  const user = await requireUser("/account/messages");

  const conversations = await prisma.conversation.findMany({
    where: { customerId: user.id },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });

  // Conversation only stores scalar ids — resolve names separately.
  const propertyIds = conversations.map((entry) => entry.propertyId).filter((id): id is string => Boolean(id));
  const partnerIds = conversations.map((entry) => entry.partnerId).filter((id): id is string => Boolean(id));

  const [properties, partners] = await Promise.all([
    propertyIds.length > 0
      ? prisma.property.findMany({ where: { id: { in: propertyIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    partnerIds.length > 0
      ? prisma.partner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, businessName: true } })
      : Promise.resolve([]),
  ]);

  const propertyNames = new Map(properties.map((entry) => [entry.id, entry.name]));
  const partnerNames = new Map(partners.map((entry) => [entry.id, entry.businessName]));

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <AccountPageHeader
        eyebrow="Talk"
        title="Messages"
        description="Conversations with properties and RentOps support."
        actions={<ButtonLink href="/account/messages/new" size="sm" variant="outline">Message a property</ButtonLink>}
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" aria-hidden />}
          title="No messages yet"
          description="Ask a property a question before you book, or contact RentOps support from your reservation."
          action={<ButtonLink href="/search" size="sm">Browse properties</ButtonLink>}
        />
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => {
            const last = conversation.messages[0];
            const title = conversation.subject ?? propertyNames.get(conversation.propertyId ?? "") ?? "Conversation";
            const context = conversation.propertyId
              ? propertyNames.get(conversation.propertyId)
              : conversation.type === "SUPPORT"
                ? "RentOps support"
                : undefined;

            return (
              <li key={conversation.id}>
                <Link
                  href={`/account/messages/${conversation.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4 transition-colors hover:bg-brand-50/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">{title}</p>
                    <p className="truncate text-[13px] text-ink-500">{last ? last.body : "No messages yet"}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-400">
                      {context ?? "Conversation"}
                      {conversation.partnerId ? ` · ${partnerNames.get(conversation.partnerId) ?? ""}` : ""}
                    </p>
                  </div>
                  <span className="text-[12px] text-ink-400">{relativeTime(conversation.lastMessageAt)}</span>
                  <Badge tone={STATUS_TONES[conversation.status] ?? "neutral"}>
                    {STATUS_LABELS[conversation.status]}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
