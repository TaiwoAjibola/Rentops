import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-md border bg-white text-[15px] text-ink-900 placeholder:text-ink-400 transition-colors duration-150 " +
  "focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 disabled:bg-ink-50 disabled:text-ink-400";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-medium text-ink-700", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-11 px-3.5 border-line-strong", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(CONTROL, "min-h-28 px-3.5 py-3 border-line-strong leading-relaxed", className)} {...props} />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "h-11 cursor-pointer border-line-strong px-3.5 pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-brand-700 accent-brand-700 focus:ring-brand-500/30",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Fieldset({ legend, children, className }: { legend?: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("rounded-lg border border-line bg-white p-5", className)}>
      {legend ? (
        <legend className="px-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">{legend}</legend>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-md border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
      {children}
    </div>
  );
}
