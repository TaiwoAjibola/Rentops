import Link from "next/link";
import { Bell, ExternalLink, LifeBuoy, LogOut, ShieldCheck } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { PartnerContextSwitcher } from "@/components/partner/context-switcher";
import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/server/actions/auth";

/**
 * Portal top bar. RentOps staff (including SUPER_ADMIN) get an explicit badge
 * plus a shortcut back to the admin console so elevated access is never
 * ambiguous while they are operating inside a partner account.
 */
export function PartnerTopBar({
  firstName,
  lastName,
  email,
  avatarUrl,
  unread,
  isPlatformStaff,
  partnerId,
  memberships,
}: {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  unread: number;
  isPlatformStaff: boolean;
  partnerId: string;
  memberships: { id: string; businessName: string; roleLabel: string }[];
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-white/95 px-4 backdrop-blur lg:px-6">
      <Link href="/partner" className="flex items-center gap-2 lg:hidden" aria-label="Partner overview">
        <LogoMark className="h-7 w-7 text-brand-700" />
      </Link>

      <div className="hidden min-w-0 lg:block">
        <p className="truncate text-[13px] font-medium text-ink-500">
          Signed in as {firstName} {lastName}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <PartnerContextSwitcher partnerId={partnerId} memberships={memberships} />

        {isPlatformStaff ? (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-md border border-gold-200 bg-gold-50 px-2.5 py-1.5 text-[12px] font-semibold text-gold-700 transition-colors hover:bg-gold-100"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">RentOps staff</span>
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        ) : null}

        <Link
          href="/partner/messages"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>

        <a
          href="mailto:partners@rentops.com"
          className="hidden items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 md:inline-flex"
        >
          <LifeBuoy className="h-[18px] w-[18px]" aria-hidden />
          Support
        </a>

        <div className="flex items-center gap-2 border-l border-line pl-2 sm:pl-3">
          <Avatar name={`${firstName} ${lastName}`} src={avatarUrl} size="sm" />
          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-[13px] font-medium text-ink-900">
              {firstName} {lastName}
            </p>
            <p className="truncate text-[11px] text-ink-500">{email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
