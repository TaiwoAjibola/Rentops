"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Submit control wired to `useFormStatus` so an action can never fire twice. */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  disabled,
  className,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} className={className} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function FormPending({ className }: { className?: string }) {
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

/** Destructive control that needs a second, explicit click before it submits. */
export function ConfirmSubmit({
  label,
  confirmLabel = "Yes, confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  size = "sm",
  className,
  pendingLabel = "Working…",
}: {
  label: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  pendingLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  if (!armed) {
    return (
      <Button type="button" variant="outline" size={size} className={className} onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {pending ? pendingLabel : confirmLabel}
      </Button>
      <Button type="button" variant="ghost" size={size} onClick={() => setArmed(false)}>
        {cancelLabel}
      </Button>
    </span>
  );
}
