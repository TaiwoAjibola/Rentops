"use client";

import { useActionState, type ReactNode } from "react";

import { FormError, FormSuccess } from "@/components/ui/field";
import { SubmitButton } from "@/components/admin/submit-button";
import type { AdminActionState } from "@/components/admin/action-state";
import { cn } from "@/lib/utils";

export type AdminFormAction = (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;

/**
 * Wires a `"use server"` action to React 19 `useActionState`.
 *
 * Server Components pass the action down as a prop and keep their markup
 * declarative; every admin form then gets the same error/success surface,
 * pending handling and optional reset-on-success behaviour.
 */
export function ActionForm({
  action,
  children,
  className,
  hidden,
  submitLabel,
  submitPendingLabel,
  submitVariant = "primary",
  submitSize = "md",
  submitDisabled,
  submitClassName,
  showStatus = true,
  resetOnSuccess = false,
  successOnly = false,
}: {
  action: AdminFormAction;
  children?: ReactNode;
  className?: string;
  /** Name/value pairs rendered as hidden inputs. */
  hidden?: Record<string, string>;
  submitLabel?: string;
  submitPendingLabel?: string;
  submitVariant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold" | "inverse";
  submitSize?: "sm" | "md" | "lg";
  submitDisabled?: boolean;
  submitClassName?: string;
  showStatus?: boolean;
  /** Remount (clearing inputs) whenever the action reports success. */
  resetOnSuccess?: boolean;
  /** Only render success messages — used by dense inline rows. */
  successOnly?: boolean;
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, null);

  return (
    <form
      key={resetOnSuccess ? state?.success ?? "idle" : undefined}
      action={formAction}
      className={cn("space-y-4", className)}
    >
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {!successOnly && state?.error ? <FormError>{state.error}</FormError> : null}
      {state?.success && showStatus ? <FormSuccess>{state.success}</FormSuccess> : null}
      {children}
      {submitLabel ? (
        <SubmitButton
          variant={submitVariant}
          size={submitSize}
          disabled={submitDisabled}
          pendingLabel={submitPendingLabel ?? "Saving…"}
          className={submitClassName}
        >
          {submitLabel}
        </SubmitButton>
      ) : null}
    </form>
  );
}

/** Row-friendly variant: renders inline and keeps its status message. */
export function InlineForm({
  action,
  hidden,
  children,
  className,
}: {
  action: AdminFormAction;
  hidden?: Record<string, string>;
  children?: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, null);

  return (
    <form action={formAction} className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {children}
      {state?.error ? <span className="text-[12px] text-danger">{state.error}</span> : null}
      {state?.success ? <span className="text-[12px] text-success">{state.success}</span> : null}
    </form>
  );
}
