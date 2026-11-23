"use client";

import { useActionState, type ReactNode } from "react";

import { FormError, FormSuccess } from "@/components/ui/field";
import { SubmitButton } from "@/components/partner/submit-button";
import type { PartnerActionState } from "@/components/partner/action-state";
import { cn } from "@/lib/utils";

export type PartnerFormAction = (state: PartnerActionState, formData: FormData) => Promise<PartnerActionState>;

/**
 * Wrapper that wires a `"use server"` action to `useActionState`.
 *
 * Server Components pass the action down as a prop (serialisable by definition)
 * and keep their markup declarative; every form in the portal gets the same
 * error/success surface and pending handling for free.
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
  action: PartnerFormAction;
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
  resetOnSuccess?: boolean;
  /** Only render `success` messages (used by inline rows). */
  successOnly?: boolean;
}) {
  const [state, formAction] = useActionState<PartnerActionState, FormData>(action, null);

  return (
    // A keyed form lets React remount (and therefore clear) inputs after success.
    <form
      key={resetOnSuccess ? `${state?.success ?? "idle"}` : undefined}
      action={formAction}
      encType="multipart/form-data"
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
