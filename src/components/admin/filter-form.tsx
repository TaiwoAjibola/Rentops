"use client";

import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * GET filter form.
 *
 * Select changes submit immediately so operators can drill into a queue without
 * hunting for an apply button; the reset link clears every filter.
 */
export function FilterForm({
  action,
  children,
  className,
  resetHref,
  showApply = true,
}: {
  action: string;
  children: ReactNode;
  className?: string;
  resetHref?: string;
  showApply?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={action}
      method="get"
      className={cn("flex flex-wrap items-end gap-3", className)}
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLSelectElement) form.current?.requestSubmit();
      }}
    >
      {children}
      {showApply ? (
        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
      ) : null}
      {resetHref ? (
        <a
          href={resetHref}
          className="inline-flex h-9 items-center px-2 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-800"
        >
          Clear
        </a>
      ) : null}
    </form>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</span>
      {children}
    </label>
  );
}
