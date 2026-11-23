import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-[14px] text-ink-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function DataTable({
  headers,
  children,
  className,
}: {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-line bg-ink-50/60">
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-brand-50/40", className)}>{children}</tr>;
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3.5 align-middle text-ink-700", className)}>{children}</td>;
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const iconTone = {
    default: "bg-ink-100 text-ink-600",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  }[tone];

  return (
    <div className={cn("rounded-lg border border-line bg-white p-5 shadow-xs", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-500">{label}</p>
        {icon ? <span className={cn("rounded-md p-2", iconTone)}>{icon}</span> : null}
      </div>
      <p className="mt-3 font-display text-2xl leading-none text-ink-900">{value}</p>
      {hint ? <p className="mt-2 text-[13px] text-ink-500">{hint}</p> : null}
    </div>
  );
}

export function InfoRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0", className)}>
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd className="text-right text-[14px] font-medium text-ink-900">{value}</dd>
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-info/25 bg-info-soft text-info",
    success: "border-success/25 bg-success-soft text-success",
    warning: "border-warning/25 bg-warning-soft text-warning",
    danger: "border-danger/25 bg-danger-soft text-danger",
  }[tone];

  return (
    <div className={cn("rounded-md border px-4 py-3 text-[13px] leading-relaxed", tones, className)}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}
