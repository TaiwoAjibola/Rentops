"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isPartnerNavActive, PARTNER_NAV_ITEMS } from "@/components/partner/nav-config";
import { cn } from "@/lib/utils";
import type { PartnerPermission } from "@/lib/auth/rbac";

/** Compact scrollable navigation for narrow screens. */
export function PartnerMobileNav({ permissions }: { permissions: PartnerPermission[] }) {
  const pathname = usePathname();
  const items = PARTNER_NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));

  return (
    <nav aria-label="Partner portal (compact)" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:hidden">
      <ul className="flex w-max gap-1.5 pb-0.5">
        {items.map((item) => {
          const active = isPartnerNavActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                  active
                    ? "border-brand-200 bg-brand-50 font-semibold text-brand-800"
                    : "border-line bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
