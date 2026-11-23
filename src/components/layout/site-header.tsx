import Link from "next/link";
import { Heart, MessageSquare } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { MobileBrand, MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/lib/auth/session";

const NAV = [
  { href: "/search", label: "Find a stay" },
  { href: "/categories", label: "Categories" },
  { href: "/destinations", label: "Destinations" },
  { href: "/how-it-works", label: "How it works" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="container-page flex h-[65px] items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="RentOps home" className="hidden md:block">
            <Logo />
          </Link>
          <MobileBrand />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[14px] font-medium text-ink-700 transition-colors hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/partners"
            className="hidden text-[14px] font-medium text-ink-700 transition-colors hover:text-brand-700 lg:block"
          >
            List your property
          </Link>

          {user ? (
            <>
              <Link
                href="/account/favourites"
                aria-label="Saved properties"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <Heart className="h-[18px] w-[18px]" />
              </Link>
              <Link
                href="/account/messages"
                aria-label="Messages"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <MessageSquare className="h-[18px] w-[18px]" />
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-ink-100"
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} size="sm" />
                <span className="hidden text-[14px] font-medium text-ink-800 sm:block">{user.firstName}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center px-3.5 text-[14px] font-medium text-ink-800 transition-colors hover:text-brand-700 sm:inline-flex"
              >
                Sign in
              </Link>
              <ButtonLink href="/register" size="sm" className="hidden sm:inline-flex">
                Create account
              </ButtonLink>
            </>
          )}

          <MobileNav isAuthenticated={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
