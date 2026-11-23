import type { ReactNode } from "react";
import Link from "next/link";
import type {
  BookingMode,
  PropertyStatus,
  ReservationStatus,
  SettlementStatus,
  UnitStatus,
  VerificationStatus,
} from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  BOOKING_MODE_LABELS,
  PARTNER_ROLE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_TONES,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MemberStatus, PartnerMemberRole } from "@prisma/client";

/** Page-level header used across the partner portal. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-[26px] leading-tight text-ink-900 sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Card with a title bar. The portal's workhorse container. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-white shadow-xs", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-ink-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return <StatusBadge label={PROPERTY_STATUS_LABELS[status]} tone={PROPERTY_STATUS_TONES[status]} />;
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <StatusBadge label={RESERVATION_STATUS_LABELS[status]} tone={RESERVATION_STATUS_TONES[status]} />;
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  return <StatusBadge label={SETTLEMENT_STATUS_LABELS[status]} tone={SETTLEMENT_STATUS_TONES[status]} />;
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  return <StatusBadge label={VERIFICATION_STATUS_LABELS[status]} tone={VERIFICATION_STATUS_TONES[status]} />;
}

const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  ACTIVE: "Bookable",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked",
  INACTIVE: "Inactive",
};

const UNIT_STATUS_TONES = {
  ACTIVE: "success",
  MAINTENANCE: "warning",
  BLOCKED: "info",
  INACTIVE: "neutral",
} as const;

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return <StatusBadge label={UNIT_STATUS_LABELS[status]} tone={UNIT_STATUS_TONES[status]} />;
}

export function BookingModeBadge({ mode }: { mode: BookingMode }) {
  return <Badge tone={mode === "INSTANT" ? "success" : "warning"}>{BOOKING_MODE_LABELS[mode]}</Badge>;
}

const MEMBER_STATUS_TONES = {
  INVITED: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  REMOVED: "neutral",
} as const;

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const label = { INVITED: "Invited", ACTIVE: "Active", SUSPENDED: "Suspended", REMOVED: "Removed" }[status];
  return <StatusBadge label={label} tone={MEMBER_STATUS_TONES[status]} />;
}

export function RoleBadge({ role }: { role: PartnerMemberRole }) {
  return <Badge tone={role === "OWNER" ? "info" : "neutral"}>{PARTNER_ROLE_LABELS[role]}</Badge>;
}

/** Small square cover/thumbnail. Local uploads and remote URLs both supported. */
export function Thumb({
  src,
  alt,
  className,
  size = "md",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = {
    sm: "h-10 w-10",
    md: "h-12 w-16",
    lg: "h-20 w-28",
  }[size];

  if (!src) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-brand-50 text-[10px] font-semibold uppercase tracking-wide text-brand-600 ring-1 ring-brand-100",
          box,
          className,
        )}
      >
        No image
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("shrink-0 rounded-md object-cover ring-1 ring-line", box, className)}
    />
  );
}

export function PersonCell({
  name,
  email,
  avatarUrl,
  secondary,
}: {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} src={avatarUrl} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-ink-900">{name}</p>
        {email ? <p className="truncate text-[12px] text-ink-500">{email}</p> : null}
        {secondary ? <div className="mt-0.5 text-[12px] text-ink-500">{secondary}</div> : null}
      </div>
    </div>
  );
}

/** Renders a number (0–1) as a labelled horizontal meter. No chart library. */
export function Meter({
  value,
  label,
  className,
}: {
  value: number;
  label?: ReactNode;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
      {label ? <p className="mt-1.5 text-[12px] text-ink-500">{label}</p> : null}
    </div>
  );
}

/** Simple CSS bar list used by the reports pages. */
export function BarList({
  items,
  formatValue,
}: {
  items: { label: string; value: number }[];
  formatValue: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3">
          <span className="truncate text-[13px] text-ink-600">{item.label}</span>
          <span className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
            <span
              className="block h-full rounded-full bg-brand-600"
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-[13px] font-medium tabular-nums text-ink-900">{formatValue(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 py-2.5">
          <dt className="text-[13px] text-ink-500">{item.label}</dt>
          <dd className="text-right text-[14px] font-medium text-ink-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Link-driven tab bar. Keeps the URL as the single source of truth. */
export function Tabs({ items, className }: { items: { href: string; label: string; active: boolean }[]; className?: string }) {
  return (
    <nav aria-label="Sections" className={cn("no-scrollbar -mx-4 overflow-x-auto px-4 lg:-mx-8 lg:px-8", className)}>
      <ul className="flex w-max gap-1 border-b border-line">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors",
                item.active
                  ? "border-brand-600 text-brand-800"
                  : "border-transparent text-ink-500 hover:border-line-strong hover:text-ink-800",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Money shown with its billing period, right-aligned for tables. */
export function MoneyCell({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="block whitespace-nowrap text-right tabular-nums">
      <span className="text-[14px] font-medium text-ink-900">{children}</span>
      {hint ? <span className="ml-1 text-[12px] text-ink-500">{hint}</span> : null}
    </span>
  );
}
