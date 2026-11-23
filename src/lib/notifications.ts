import type { NotificationChannel } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Notifications.
 *
 * In-app delivery is always persisted. Email / SMS / WhatsApp are dispatched
 * through pluggable drivers; when credentials are absent the entry is recorded
 * as QUEUED and clearly marked undelivered rather than silently pretending to
 * have been sent.
 */

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  data?: object;
};

export type NotificationTemplates =
  | "REGISTRATION"
  | "VERIFICATION_UPDATE"
  | "BOOKING_REQUESTED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_DECLINED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_FAILED"
  | "BOOKING_CANCELLED"
  | "REFUND_UPDATE"
  | "CHECK_IN_REMINDER"
  | "CHECK_OUT_REMINDER"
  | "SETTLEMENT_UPDATE"
  | "PROPERTY_STATUS"
  | "MESSAGE_RECEIVED"
  | "INSPECTION_UPDATE"
  | "DISPUTE_UPDATE"
  | "GENERAL";

export async function notify(input: NotifyInput) {
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: input.userId },
  });

  const wantsInApp = preferences?.inApp ?? true;
  const wantsEmail = preferences?.email ?? true;
  const wantsSms = preferences?.sms ?? false;
  const wantsWhatsapp = preferences?.whatsapp ?? false;

  const requested = input.channels ?? (["IN_APP"] as NotificationChannel[]);
  const created: { id: string; channel: NotificationChannel }[] = [];

  const shouldWrite = (channel: NotificationChannel) =>
    requested.includes(channel) &&
    (channel === "IN_APP"
      ? wantsInApp
      : channel === "EMAIL"
        ? wantsEmail
        : channel === "SMS"
          ? wantsSms
          : wantsWhatsapp);

  for (const channel of requested) {
    if (!shouldWrite(channel)) continue;

    const delivered = await dispatch(channel, input);

    const record = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        channel,
        status: delivered ? "SENT" : "QUEUED",
        sentAt: delivered ? new Date() : null,
        data: input.data ?? undefined,
      },
    });
    created.push({ id: record.id, channel });
  }

  return created;
}

async function dispatch(channel: NotificationChannel, input: NotifyInput): Promise<boolean> {
  if (channel === "IN_APP") return true;

  const configured =
    (channel === "EMAIL" && Boolean(process.env.EMAIL_API_KEY)) ||
    (channel === "SMS" && Boolean(process.env.SMS_API_KEY)) ||
    (channel === "WHATSAPP" && Boolean(process.env.WHATSAPP_API_KEY));

  if (!configured) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[notifications:${channel.toLowerCase()}] no provider configured — queued for ${input.userId}: ${input.title}`,
      );
    }
    return false;
  }

  // Provider adapters hook in here. Until a provider is wired, delivery is
  // reported as queued so the platform never claims a send that did not happen.
  return false;
}

export async function notifyMany(userIds: string[], input: Omit<NotifyInput, "userId">) {
  for (const userId of Array.from(new Set(userIds))) {
    if (!userId) continue;
    await notify({ ...input, userId });
  }
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function latestNotifications(userId: string, take = 12) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
