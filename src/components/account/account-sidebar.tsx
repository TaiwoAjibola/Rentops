"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { ACCOUNT_NAV, isNavItemActive } from "@/components/account/nav-config";
import { cn } from "@/lib/utils";

export function AccountSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className={cn("flex h-full flex-col gap-6 overflow-y-auto px-3 py-6", className)}>
      {ACCOUNT_NAV.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
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
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-colors duration-150",
                      active
                        ? "bg-brand-50 font-semibold text-brand-800"
                        : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600",
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-auto space-y-3 px-1">
        <Link
          href="/properties"
          className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-3.5 py-3 text-[13px] font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
        >
          Browse properties
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="flex items-start gap-2 rounded-md bg-ink-50 px-3.5 py-3 text-[12px] leading-relaxed text-ink-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          <span>
            RentOps never asks for payment outside the platform. Pay only through your reservation page.
          </span>
        </p>
      </div>
    </nav>
  );
}
