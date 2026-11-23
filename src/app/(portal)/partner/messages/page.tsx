import Link from "next/link";
import type { ConversationStatus } from "@prisma/client";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Callout, EmptyState } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { relativeTime } from "@/lib/dates";

const STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: "Open",
  PENDING_PARTNER: "Your reply needed",
  PENDING_CUSTOMER: "Awaiting guest",
  CLOSED: "Closed",
};

export default async function MessagesPage() {
  const { partner, can } = await requirePartnerContext();

  if (!can("message.manage")) {
    return (
      <div className="space-y-6">
        <SectionHeading eyebrow="Communication" title="Messages" />
        <Callout tone="warning" title="Not available to your role">
          Messaging requires the <strong>message.manage</strong> permission.
        </Callout>
      </div>
    );
  }

  const conversations = await prisma.conversation.findMany({
    where: { partnerId: partner.id },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });

  // Conversation only stores scalar ids, so resolve display names separately.
  const propertyIds = Array.from(
    new Set(conversations.map((entry) => entry.propertyId).filter((id): id is string => Boolean(id))),
  );
  const customerIds = Array.from(
    new Set(conversations.map((entry) => entry.customerId).filter((id): id is string => Boolean(id))),
  );

  const [properties, customers] = await Promise.all([
    propertyIds.length > 0
      ? prisma.property.findMany({ where: { id: { in: propertyIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    customerIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
  ]);

  const propertyNames = new Map(properties.map((entry) => [entry.id, entry.name]));
  const customerNames = new Map(
    customers.map((entry) => [entry.id, `${entry.firstName} ${entry.lastName}`]),
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Communication"
        title="Messages"
        description="Questions from guests and booking conversations."
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="When a guest asks about a property it will appear here."
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => {
            const last = conversation.messages[0];
            const guest = conversation.customerId
              ? customerNames.get(conversation.customerId)
              : undefined;

            return (
              <Link
                key={conversation.id}
                href={`/partner/messages/${conversation.id}`}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4 transition-colors hover:bg-brand-50/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">
                    {conversation.subject ?? guest ?? "Conversation"}
                  </p>
                  <p className="truncate text-sm text-ink-500">{last ? last.body : "No messages yet"}</p>
                  {conversation.propertyId ? (
                    <p className="text-xs text-ink-400">
                      {propertyNames.get(conversation.propertyId) ?? "Property"}
                      {guest ? ` · ${guest}` : ""}
                    </p>
                  ) : null}
                </div>

                <span className="text-xs text-ink-400">{relativeTime(conversation.lastMessageAt)}</span>
                <Badge tone={conversation.status === "CLOSED" ? "neutral" : "info"}>
                  {STATUS_LABELS[conversation.status]}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
