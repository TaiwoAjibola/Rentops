import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Heart,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AccountPageHeader, AccountSection } from "@/components/account/page-header";
import { ReservationRow, type ReservationRowData } from "@/components/account/reservation-row";
import { EmptyState, Stat } from "@/components/ui/data";
import { StatusBadge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/data";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate, relativeTime, startOfTodayUtc } from "@/lib/dates";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_TONES } from "@/lib/constants";
import { NOTIFICATION_CHANNEL_LABELS } from "@/components/account/labels";

export const metadata: Metadata = { title: "Overview" };

const UPCOMING_STATUSES = ["PENDING_PAYMENT", "PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN"] as const;

export default async function AccountOverviewPage() {
  const user = await requireUser("/account");
  const today = startOfTodayUtc();

  const [upcoming, upcomingCount, savedCount, unreadNotifications, unreadMessages, notifications, profile] =
    await Promise.all([
      prisma.reservation.findMany({
        where: {
          userId: user.id,
          status: { in: [...UPCOMING_STATUSES] },
          checkOut: { gte: today },
        },
        orderBy: { checkIn: "asc" },
        take: 3,
        select: {
          reference: true,
          status: true,
          checkIn: true,
          checkOut: true,
          nights: true,
          guests: true,
          currency: true,
          priceBasis: true,
          grossAmount: true,
          property: {
            select: { name: true, slug: true, city: true, state: true, coverImageUrl: true },
          },
        },
      }),
      prisma.reservation.count({
        where: { userId: user.id, status: { in: [...UPCOMING_STATUSES] }, checkOut: { gte: today } },
      }),
      prisma.savedProperty.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      prisma.message.count({
        where: {
          conversation: { customerId: user.id },
          senderId: { not: user.id },
          reads: { none: { userId: user.id } },
        },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.customerProfile.findUnique({
        where: { userId: user.id },
        select: { verificationStatus: true },
      }),
    ]);

  const verificationStatus = profile?.verificationStatus ?? "UNVERIFIED";
  const needsVerification = verificationStatus !== "VERIFIED";
  const firstName = user.firstName;

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <AccountPageHeader
        eyebrow="Overview"
        title={`Welcome back, ${firstName}`}
        description="Everything about your stays, applications and conversations in one place."
        actions={
          <ButtonLink href="/properties" size="sm">
            <Sparkles className="h-4 w-4" aria-hidden />
            Find a place
          </ButtonLink>
        }
      />

      {needsVerification ? (
        <Callout tone="info" title="Verify your identity" className="mb-6">
          <p>
            Verification is quick and unlocks smoother bookings — particularly for longer leases, where
            most landlords ask for it before they will confirm.{" "}
            <Link href="/account/verification" className="font-semibold underline">
              Start verification
            </Link>
          </p>
        </Callout>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Upcoming stays"
          value={upcomingCount}
          hint={upcomingCount === 1 ? "1 booking ahead" : `${upcomingCount} bookings ahead`}
          icon={<CalendarDays className="h-[18px] w-[18px]" aria-hidden />}
          tone="info"
        />
        <Stat
          label="Saved properties"
          value={savedCount}
          hint="Shortlists you have built"
          icon={<Heart className="h-[18px] w-[18px]" aria-hidden />}
        />
        <Stat
          label="Unread messages"
          value={unreadMessages}
          hint={unreadMessages > 0 ? "Replies waiting for you" : "You are all caught up"}
          icon={<MessageSquare className="h-[18px] w-[18px]" aria-hidden />}
          tone={unreadMessages > 0 ? "warning" : "default"}
        />
        <Stat
          label="Verification"
          value={VERIFICATION_STATUS_LABELS[verificationStatus]}
          hint={needsVerification ? "Recommended for long leases" : "Trusted guest status"}
          icon={<ShieldCheck className="h-[18px] w-[18px]" aria-hidden />}
          tone={verificationStatus === "VERIFIED" ? "success" : "default"}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AccountSection
          title="Your next stays"
          description="The three bookings closest to check-in."
          action={
            <Link
              href="/account/reservations"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline"
            >
              All reservations
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" aria-hidden />}
              title="No upcoming stays yet"
              description="When you book a short stay or a lease, it appears here with its check-in details."
              action={
                <ButtonLink href="/properties" size="sm" variant="primary">
                  Browse properties
                </ButtonLink>
              }
            />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((reservation) => (
                <li key={reservation.reference}>
                  <ReservationRow reservation={reservation as ReservationRowData} />
                </li>
              ))}
            </ul>
          )}
        </AccountSection>

        <div className="space-y-5">
          <AccountSection title="Quick actions">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/properties"
                  className="flex items-center justify-between rounded-md border border-line px-3.5 py-3 text-[14px] text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
                >
                  Browse and save properties
                  <ArrowRight className="h-4 w-4 text-ink-400" aria-hidden />
                </Link>
              </li>
              <li>
                <Link
                  href="/account/inspections"
                  className="flex items-center justify-between rounded-md border border-line px-3.5 py-3 text-[14px] text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
                >
                  Manage inspection visits
                  <ArrowRight className="h-4 w-4 text-ink-400" aria-hidden />
                </Link>
              </li>
              <li>
                <Link
                  href="/account/support"
                  className="flex items-center justify-between rounded-md border border-line px-3.5 py-3 text-[14px] text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
                >
                  Get help from RentOps
                  <ArrowRight className="h-4 w-4 text-ink-400" aria-hidden />
                </Link>
              </li>
            </ul>
          </AccountSection>

          <AccountSection
            title="Recent activity"
            action={
              <Link
                href="/account/notifications"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline"
              >
                See all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          >
            {notifications.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-500">
                Nothing yet. Your booking and message updates will land here.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((notification) => (
                  <li key={notification.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        notification.readAt ? "bg-ink-100 text-ink-500" : "bg-brand-50 text-brand-700"
                      }`}
                      aria-hidden
                    >
                      {notification.channel === "IN_APP" ? (
                        <Bell className="h-3.5 w-3.5" />
                      ) : (
                        <ClipboardCheck className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink-900">{notification.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-500">{notification.body}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-400">
                        {NOTIFICATION_CHANNEL_LABELS[notification.channel]} · {relativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AccountSection>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-5 py-4 shadow-xs">
        <StatusBadge
          label={`Identity: ${VERIFICATION_STATUS_LABELS[verificationStatus]}`}
          tone={VERIFICATION_STATUS_TONES[verificationStatus]}
        />
        <p className="text-[13px] text-ink-500">
          Joined {formatDate(user.createdAt)} · {user.email}
        </p>
      </div>
    </div>
  );
}
