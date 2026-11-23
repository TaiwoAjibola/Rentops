"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = ButtonProps & {
  /** Replaces the label while the action is in flight. */
  pendingLabel?: string;
};

/**
 * Submit control that disables itself while the surrounding form's server
 * action is pending (`useFormStatus`), so an action can never be double-fired.
 */
export function SubmitButton({ children, pendingLabel, disabled, className, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(className)}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** Lightweight inline "Saving…" indicator for forms without a custom label. */
export function FormPendingDot({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-2 text-[13px] text-ink-500", className)}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" />
      Working…
    </span>
  );
}
