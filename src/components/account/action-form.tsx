"use client";

import { useActionState, type ReactNode } from "react";

import { FormError, FormSuccess } from "@/components/ui/field";
import { SubmitButton } from "@/components/account/submit-button";
import { cn } from "@/lib/utils";
import type { CustomerActionState } from "@/server/actions/customer-notifications";

export type CustomerFormAction = (
  state: CustomerActionState,
  formData: FormData,
) => Promise<CustomerActionState>;

/**
 * Wrapper that wires a `"use server"` action to `useActionState`.
 * Mirrors the partner ActionForm so customer pages get the same pending /
 * error / success surface for free.
 */
export function CustomerActionForm({
  action,
  children,
  className,
  hidden,
  submitLabel,
  submitPendingLabel,
  submitVariant = "primary",
  submitSize = "md",
  submitDisabled,
  showStatus = true,
  encType,
}: {
  action: CustomerFormAction;
  children?: ReactNode;
  className?: string;
  hidden?: Record<string, string>;
  submitLabel?: string;
  submitPendingLabel?: string;
  submitVariant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
  submitSize?: "sm" | "md" | "lg";
  submitDisabled?: boolean;
  showStatus?: boolean;
  /** Needed when the action reads files via FormData. */
  encType?: string;
}) {
  const [state, formAction] = useActionState<CustomerActionState, FormData>(action, null);

  return (
    <form action={formAction} className={cn("space-y-4", className)} encType={encType}>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {state?.error ? <FormError>{state.error}</FormError> : null}
      {state?.success ? (showStatus ? <FormSuccess>{state.success}</FormSuccess> : null) : null}
      {children}
      {submitLabel ? (
        <SubmitButton variant={submitVariant} size={submitSize} disabled={submitDisabled} pendingLabel={submitPendingLabel ?? "Working…"}>
          {submitLabel}
        </SubmitButton>
      ) : null}
    </form>
  );
}
