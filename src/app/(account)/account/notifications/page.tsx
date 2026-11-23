import Link from "next/link";
import { Bell } from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { MarkReadButton } from "@/components/account/mark-read-button";
import { CustomerActionForm } from "@/components/account/action-form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { relativeTime } from "@/lib/dates";
import { markAllNotificationsRead } from "@/server/actions/customer-notifications";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/account/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((entry) => !entry.readAt).length;

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <AccountPageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Booking updates, messages and account activity — newest first."
        actions={
          unread > 0 ? (
            <CustomerActionForm
              action={markAllNotificationsRead}
              submitLabel={`Mark all ${unread} as read`}
              submitVariant="outline"
              submitSize="sm"
            />
          ) : (
            <ButtonLink href="/account" size="sm" variant="outline">
              Back to account
            </ButtonLink>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" aria-hidden />}
          title="Nothing yet"
          description="Booking confirmations and updates will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                notification.readAt ? "border-line bg-white" : "border-brand-200 bg-brand-50/40"
              }`}
            >
              <span
                className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                  notification.readAt ? "bg-ink-200" : "bg-brand-600"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-ink-900">{notification.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{notification.body}</p>
                <p className="mt-1.5 text-[11px] uppercase tracking-wide text-ink-400">
                  {notification.channel} · {relativeTime(notification.createdAt)}
                </p>
              </div>
              {!notification.readAt ? <MarkReadButton notificationId={notification.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
