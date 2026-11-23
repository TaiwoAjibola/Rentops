"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PasswordField } from "@/app/(auth)/_components/password-field";
import type { AuthFormState } from "@/app/(auth)/_components/form-state";
import { FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/account/submit-button";
import { resetPassword } from "@/server/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(resetPassword, null);

  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-ink-900">Choose a new password</h1>
      <p className="mt-2 text-[14px] text-ink-600">
        Use at least 8 characters. You will sign in with it immediately afterwards.
      </p>

      <form action={formAction} className="mt-7 space-y-4">
        <input type="hidden" name="token" value={token} />

        {state?.error ? <FormError>{state.error}</FormError> : null}

        <PasswordField
          name="password"
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters."
        />

        <PasswordField
          name="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Repeat your new password"
        />

        <SubmitButton size="lg" className="w-full" pendingLabel="Updating password…">
          Update password
        </SubmitButton>
      </form>

      <p className="mt-7 border-t border-line pt-6 text-[14px] text-ink-600">
        Trouble resetting?{" "}
        <Link href="/forgot-password" className="font-semibold text-brand-700 hover:underline">
          Request a new link
        </Link>
      </p>
    </div>
  );
}
