"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { ACCOUNT_NAV, MOBILE_TAB_HREFS, isNavItemActive } from "@/components/account/nav-config";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const pinned = MOBILE_TAB_HREFS.map((href) =>
  ACCOUNT_NAV.flatMap((group) => group.items).find((item) => item.href === href),
).filter((item): item is NonNullable<typeof item> => Boolean(item));

/**
 * Mobile navigation: a five-slot tab bar for the destinations people use most,
 * plus a full drawer for everything else. Kept thumb-reachable and outside the
 * public site chrome.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const moreActive = !pinned.some((item) => isNavItemActive(pathname, item));

  return (
    <>
      <nav
        aria-label="Account (mobile)"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {pinned.map((item) => {
            const active = isNavItemActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-brand-700" : "text-ink-500",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="truncate">{item.short ?? item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="account-drawer"
              className={cn(
                "flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors",
                moreActive ? "text-brand-700" : "text-ink-500",
              )}
            >
              <Menu className="h-5 w-5" aria-hidden />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close account menu"
            className="absolute inset-0 cursor-default bg-ink-950/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            id="account-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Account menu"
            className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto border-l border-line bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <LogoMark className="text-brand-700" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close account menu"
                className="rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-6 px-4 py-5">
              {ACCOUNT_NAV.map((group) => (
                <div key={group.title}>
                  <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                    {group.title}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isNavItemActive(pathname, item);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-3 text-[15px] transition-colors",
                              active
                                ? "bg-brand-50 font-semibold text-brand-800"
                                : "text-ink-700 hover:bg-ink-50",
                            )}
                          >
                            <Icon className="h-[18px] w-[18px] shrink-0 text-ink-400" aria-hidden />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-4">
              <Link
                href="/properties"
                className="block rounded-md bg-brand-700 px-4 py-3 text-center text-[14px] font-medium text-white"
              >
                Browse properties
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
