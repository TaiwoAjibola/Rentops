import Link from "next/link";
import { Bell } from "lucide-react";

import { AccountUserMenu, type AccountUserMenuUser } from "@/components/account/account-user-menu";
import { Logo } from "@/components/brand/logo";
import { logout } from "@/server/actions/auth";

/**
 * Compact account top bar. Deliberately self-contained: the public site header
 * is not reused here so the dashboard chrome never collides with it.
 */
export function AccountTopBar({
  user,
  unread,
}: {
  user: AccountUserMenuUser;
  unread: number;
}) {
  const signOut = (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] text-ink-700 transition-colors hover:bg-danger-soft hover:text-danger"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-400" fill="none" aria-hidden>
          <path
            d="M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Sign out
      </button>
    </form>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="shrink-0" aria-label="RentOps home">
            <Logo />
          </Link>
          <span className="hidden h-6 w-px bg-line sm:block" aria-hidden />
          <span className="hidden text-[13px] font-medium uppercase tracking-[0.14em] text-ink-400 sm:block">
            My account
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/account/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-600 transition-colors hover:border-line-strong hover:text-ink-900"
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications, none unread"
            }
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>

          <AccountUserMenu user={user} signOut={signOut} />
        </div>
      </div>
    </header>
  );
}
