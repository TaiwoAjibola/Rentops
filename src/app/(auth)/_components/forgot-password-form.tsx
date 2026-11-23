"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import type { AuthFormState } from "@/app/(auth)/_components/form-state";
import { Field, FormError, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/account/submit-button";
import { requestPasswordReset } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(requestPasswordReset, null);

  if (state?.success && !state.error) {
    return (
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-[28px] leading-tight text-ink-900">Check your inbox</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{state.success}</p>
        <p className="mt-6 text-[13px] text-ink-500">
          The link stays valid for a short time. If it expires, request a new one here.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex text-[14px] font-semibold text-brand-700 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-ink-900">Reset your password</h1>
      <p className="mt-2 text-[14px] text-ink-600">
        Enter the email address on your account and we will send you a reset link.
      </p>

      <form action={formAction} className="mt-7 space-y-4">
        {state?.error ? <FormError>{state.error}</FormError> : null}

        <Field label="Email address" htmlFor="forgot-email" required>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <SubmitButton size="lg" className="w-full" pendingLabel="Sending link…">
          Send reset link
        </SubmitButton>
      </form>

      <p className="mt-7 border-t border-line pt-6 text-[14px] text-ink-600">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
