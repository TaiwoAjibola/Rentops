import { AccountSidebar } from "@/components/account/account-sidebar";
import { AccountTopBar } from "@/components/account/account-top-bar";
import { MobileTabBar } from "@/components/account/mobile-tab-bar";
import { requireUser } from "@/lib/auth/session";
import { unreadCount } from "@/lib/notifications";

/**
 * Customer account shell.
 *
 * Every account page is behind this guard, so pages below can assume an
 * authenticated customer and always scope their queries to `user.id`.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const unread = await unreadCount(user.id);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AccountTopBar
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatarUrl: user.avatarUrl,
        }}
        unread={unread}
      />

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-line bg-white lg:block">
          <AccountSidebar />
        </aside>

        <main id="account-content" className="min-w-0 flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-16 lg:pt-8">
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
