import Link from "next/link";

import { cn } from "@/lib/utils";

export type FilterTabItem = {
  href: string;
  label: string;
  count?: number;
  active: boolean;
};

/** Link-driven filter tabs (e.g. reservation status). No client JS required. */
export function FilterTabs({ items, label = "Filter" }: { items: FilterTabItem[]; label?: string }) {
  return (
    <nav aria-label={label} className="-mx-4 mb-5 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">
      <ul className="flex w-max min-w-full gap-1 rounded-lg border border-line bg-white p-1 lg:w-auto">
        {items.map((item) => (
          <li key={item.href} className="flex-1 lg:flex-none">
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-[13px] font-medium transition-colors",
                item.active
                  ? "bg-brand-700 text-white shadow-sm"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                    item.active ? "bg-white/20 text-white" : "bg-ink-100 text-ink-600",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
