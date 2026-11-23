"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronRight, ShieldCheck } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { isPartnerNavActive, visibleNav } from "@/components/partner/nav-config";
import { cn } from "@/lib/utils";
import type { PartnerPermission } from "@/lib/auth/rbac";

export type SidebarStep = { key: string; label: string; done: boolean };

/**
 * Portal navigation.
 *
 * Entries the acting member has no permission for are never rendered, so the
 * sidebar doubles as a live view of what this role can do.
 */
export function PartnerSidebar({
  partnerName,
  verificationLabel,
  verificationTone,
  permissions,
  memberRoleLabel,
  steps,
}: {
  partnerName: string;
  verificationLabel: string;
  verificationTone: "success" | "warning" | "danger" | "info" | "neutral";
  permissions: PartnerPermission[];
  memberRoleLabel: string;
  steps: SidebarStep[];
}) {
  const pathname = usePathname();
  const groups = visibleNav(permissions);
  const completed = steps.filter((step) => step.done).length;
  const onboarded = steps.length > 0 && completed === steps.length;

  return (
    <nav aria-label="Partner portal" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="px-2">
        <Link href="/partner" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 text-brand-700" />
          <span className="font-display text-[17px] tracking-tight text-ink-900">Partner portal</span>
        </Link>
        <div className="mt-3 rounded-md border border-line bg-canvas px-3 py-2.5">
          <p className="truncate text-[13px] font-semibold text-ink-900" title={partnerName}>
            {partnerName}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-500">{memberRoleLabel}</p>
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]",
              verificationTone === "success" && "bg-success-soft text-success",
              verificationTone === "warning" && "bg-warning-soft text-warning",
              verificationTone === "danger" && "bg-danger-soft text-danger",
              verificationTone === "info" && "bg-info-soft text-info",
              verificationTone === "neutral" && "bg-ink-100 text-ink-600",
            )}
          >
            <ShieldCheck className="h-3 w-3" aria-hidden />
            {verificationLabel}
          </span>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isPartnerNavActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-colors duration-150",
                      active ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
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

      {!onboarded ? (
        <div className="rounded-md border border-line bg-white p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">Getting started</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${Math.round((completed / Math.max(1, steps.length)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] text-ink-500">
            {completed} of {steps.length} steps complete
          </p>
          <Link
            href="/partner/onboarding"
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800"
          >
            Continue setup
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}

      <p className="mt-auto flex items-start gap-2 px-2 text-[12px] leading-relaxed text-ink-400">
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
        <span>
          Payouts are released after verified check-in and the settlement hold window. RentOps earns commission only —
          never the gross payment.
        </span>
      </p>
    </nav>
  );
}
