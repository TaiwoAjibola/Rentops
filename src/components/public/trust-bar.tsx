import { BadgeCheck, CalendarX2, MessageSquareText, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TrustItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const DEFAULT_TRUST_ITEMS: TrustItem[] = [
  {
    icon: BadgeCheck,
    title: "Verified listings",
    description: "Identity, ownership and location checks before a property goes live.",
  },
  {
    icon: ShieldCheck,
    title: "Secure payments",
    description: "Payments are collected by a licensed provider — never into a personal account.",
  },
  {
    icon: CalendarX2,
    title: "Free cancellation on many stays",
    description: "Each listing states its own cancellation terms before you pay.",
  },
  {
    icon: MessageSquareText,
    title: "Talk to the property first",
    description: "Ask questions or request a physical inspection before committing.",
  },
];

/** Small band of reassurance signals used under hero sections and CTAs. */
export function TrustBar({
  items = DEFAULT_TRUST_ITEMS,
  tone = "light",
  className,
}: {
  items?: TrustItem[];
  tone?: "light" | "inverse";
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.title} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                tone === "inverse" ? "bg-white/12 text-white" : "bg-brand-50 text-brand-700",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span
                className={cn(
                  "block text-[13.5px] font-semibold",
                  tone === "inverse" ? "text-white" : "text-ink-900",
                )}
              >
                {item.title}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-[12.5px] leading-relaxed",
                  tone === "inverse" ? "text-white/70" : "text-ink-500",
                )}
              >
                {item.description}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
