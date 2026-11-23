"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PasswordField } from "@/app/(auth)/_components/password-field";
import type { AuthFormState } from "@/app/(auth)/_components/form-state";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/account/submit-button";
import { login } from "@/server/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(login, null);

  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-ink-900">Welcome back</h1>
      <p className="mt-2 text-[14px] text-ink-600">
        Sign in to manage reservations, saved properties and messages.
      </p>

      <form action={formAction} className="mt-7 space-y-4">
        <input type="hidden" name="next" value={next} />

        {state?.error ? <FormError>{state.error}</FormError> : null}

        <Field label="Email address" htmlFor="login-email" required>
          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue="chidi@example.com"
            required
          />
        </Field>

        <PasswordField
          name="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          defaultValue="Password123!"
          hint="Demo password is pre-filled — just press Sign in."
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-ink-500">We keep you signed in on this device.</p>
          <Link
            href="/forgot-password"
            className="text-[13px] font-medium text-brand-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton size="lg" className="w-full" pendingLabel="Signing you in…">
          Sign in
        </SubmitButton>
      </form>

      {state?.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <p className="mt-7 border-t border-line pt-6 text-[14px] text-ink-600">
        New to RentOps?{" "}
        <Link
          href={`/register${next && next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
