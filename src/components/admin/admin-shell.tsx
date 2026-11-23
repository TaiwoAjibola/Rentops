"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, LogOut, Menu, X } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { ADMIN_NAV_ITEMS, isAdminNavActive, visibleAdminNav, type AdminNavItem } from "@/components/admin/nav-config";
import { logout } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

export type AdminIdentity = {
  name: string;
  email: string;
  roleLabel: string;
};

/**
 * The command-centre chrome: a dark, fixed sidebar with grouped navigation and
 * a top bar that always identifies the acting staff member.
 *
 * The content area stays on the light canvas so every shared UI primitive
 * (tables, cards, forms) reads correctly and money is legible.
 */
export function AdminShell({
  admin,
  permissions,
  children,
}: {
  admin: AdminIdentity;
  permissions: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = visibleAdminNav(permissions);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const active = ADMIN_NAV_ITEMS.filter((item) => isAdminNavActive(pathname, item)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

  return (
    <div className="flex min-h-screen bg-canvas">
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-ink-950/60 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col border-r border-white/10 bg-ink-950 transition-transform duration-300 ease-out",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Admin navigation"
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-white/10 px-5">
          <Link href="/admin" className="flex items-center gap-2.5 text-white" onClick={() => setOpen(false)}>
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-[15px] leading-none">
              RentOps
              <span className="mt-1 block text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-brand-300">
                Super admin
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title} className="mb-5">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] text-ink-500">Signed in as</p>
          <p className="truncate text-[13px] font-medium text-white">{admin.email}</p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-brand-300 transition-colors hover:text-brand-200"
          >
            View marketplace
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-ink-950 px-4 text-white sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 text-ink-200 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-white">
              {active?.label ?? "RentOps control room"}
            </p>
            <p className="truncate text-[11px] text-ink-400">
              {admin.roleLabel} · {admin.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-brand-400/30 bg-brand-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-200 sm:inline-flex">
              {admin.roleLabel}
            </span>
            <span className="hidden h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-1 pr-3.5 md:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {admin.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("") || "RT"}
              </span>
              <span className="text-[13px] font-medium text-white">{admin.name}</span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-3 text-[13px] font-medium text-ink-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive = isAdminNavActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150",
        isActive ? "bg-brand-600/20 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white",
      )}
    >
      {isActive ? <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand-400" aria-hidden /> : null}
      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-brand-300" : "text-ink-500 group-hover:text-ink-300")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
