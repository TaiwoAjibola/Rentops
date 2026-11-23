import type { ReactNode } from "react";
import type {
  AccountStatus,
  BookingMode,
  DisputeStatus,
  LedgerEntryType,
  PaymentStatus,
  PropertyStatus,
  PropertyVerificationLevel,
  ReservationStatus,
  ReviewStatus,
  SettlementStatus,
  TicketPriority,
  TicketStatus,
  VerificationStatus,
} from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  BOOKING_MODE_LABELS,
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_TONES,
  LEDGER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_TONES,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_TONES,
  VERIFICATION_LEVEL_LABELS,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
  type StatusTone,
} from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Page furniture                                                              */
/* -------------------------------------------------------------------------- */

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
    <header className={cn("mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-[26px] leading-tight text-ink-900 sm:text-[30px]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-line bg-white shadow-xs", className)}>
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

export function KeyValue({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 py-2.5">
          <dt className="text-[13px] text-ink-500">{item.label}</dt>
          <dd className="text-right text-[14px] font-medium text-ink-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SmallLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500", className)}>{children}</p>
  );
}

/** Every monetary figure in the portal renders through here. */
export function Money({
  value,
  currency = "NGN",
  compact = false,
  className,
}: {
  value: number;
  currency?: string;
  compact?: boolean;
  className?: string;
}) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(value, currency, { compact })}</span>;
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
  const box = { sm: "h-10 w-10", md: "h-12 w-16", lg: "h-20 w-28" }[size];

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
    // Local uploads and partner-supplied URLs both need to render, so the plain
    // img element avoids remote-loader configuration surprises.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("shrink-0 rounded-md object-cover ring-1 ring-line", box, className)} />
  );
}

/** Renders 0–1 as a labelled horizontal meter. */
export function Meter({ value, label, className }: { value: number; label?: ReactNode; className?: string }) {
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

/* -------------------------------------------------------------------------- */
/* Status badges                                                               */
/* -------------------------------------------------------------------------- */

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return <StatusBadge label={PROPERTY_STATUS_LABELS[status]} tone={PROPERTY_STATUS_TONES[status]} />;
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <StatusBadge label={RESERVATION_STATUS_LABELS[status]} tone={RESERVATION_STATUS_TONES[status]} />;
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  return <StatusBadge label={VERIFICATION_STATUS_LABELS[status]} tone={VERIFICATION_STATUS_TONES[status]} />;
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  return <StatusBadge label={SETTLEMENT_STATUS_LABELS[status]} tone={SETTLEMENT_STATUS_TONES[status]} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge label={PAYMENT_STATUS_LABELS[status]} tone={PAYMENT_STATUS_TONES[status]} />;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <StatusBadge label={REVIEW_STATUS_LABELS[status]} tone={REVIEW_STATUS_TONES[status]} />;
}

export function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  return <StatusBadge label={DISPUTE_STATUS_LABELS[status]} tone={DISPUTE_STATUS_TONES[status]} />;
}

export function BookingModeBadge({ mode }: { mode: BookingMode }) {
  return <Badge tone={mode === "INSTANT" ? "success" : "warning"}>{BOOKING_MODE_LABELS[mode]}</Badge>;
}

export function VerificationLevelBadge({ level }: { level: PropertyVerificationLevel }) {
  const tone: Record<PropertyVerificationLevel, StatusTone> = {
    NONE: "neutral",
    BASIC: "info",
    VERIFIED: "success",
    PREMIUM: "success",
  };
  return <StatusBadge label={VERIFICATION_LEVEL_LABELS[level]} tone={tone[level]} />;
}

const LEDGER_TONES: Record<LedgerEntryType, StatusTone> = {
  CUSTOMER_PAYMENT: "info",
  PARTNER_PAYABLE: "warning",
  PLATFORM_COMMISSION: "success",
  PROCESSING_FEE: "neutral",
  SERVICE_FEE: "success",
  PARTNER_PAYOUT: "info",
  REFUND: "danger",
  CHARGEBACK: "danger",
  ADJUSTMENT: "neutral",
};

export function LedgerTypeBadge({ type }: { type: LedgerEntryType }) {
  return <StatusBadge label={LEDGER_TYPE_LABELS[type]} tone={LEDGER_TONES[type]} />;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_STATUS_TONES: Record<TicketStatus, StatusTone> = {
  OPEN: "danger",
  PENDING: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TICKET_PRIORITY_TONES: Record<TicketPriority, StatusTone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  DELETED: "Deleted",
};

export const ACCOUNT_STATUS_TONES: Record<AccountStatus, StatusTone> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
  DELETED: "neutral",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <StatusBadge label={TICKET_STATUS_LABELS[status]} tone={TICKET_STATUS_TONES[status]} />;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <StatusBadge label={TICKET_PRIORITY_LABELS[priority]} tone={TICKET_PRIORITY_TONES[priority]} />;
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <StatusBadge label={ACCOUNT_STATUS_LABELS[status]} tone={ACCOUNT_STATUS_TONES[status]} />;
}

export function YesNo({ value }: { value: boolean }) {
  return <Badge tone={value ? "success" : "neutral"}>{value ? "Yes" : "No"}</Badge>;
}

/* -------------------------------------------------------------------------- */
/* Search params                                                               */
/* -------------------------------------------------------------------------- */

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(params: SearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function paramPage(params: SearchParams) {
  const parsed = Number.parseInt(param(params, "page"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Active filters without `page`, ready for pagination links. */
export function queryWithoutPage(params: SearchParams): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query[key] = single;
  }
  return query;
}

/** Deterministic date + time rendering to avoid hydration drift. */
export function When({ value, className }: { value: Date | string | null | undefined; className?: string }) {
  if (!value) return <span className={cn("text-ink-400", className)}>—</span>;
  const date = value instanceof Date ? value : new Date(value);
  return (
    <time dateTime={date.toISOString()} className={className}>
      {new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(date)}
    </time>
  );
}
