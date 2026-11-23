"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PasswordField } from "@/app/(auth)/_components/password-field";
import type { AuthFormState } from "@/app/(auth)/_components/form-state";
import { Checkbox, Field, FormError, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/account/submit-button";
import { registerCustomer } from "@/server/actions/auth";

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(registerCustomer, null);

  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-ink-900">Create your account</h1>
      <p className="mt-2 text-[14px] text-ink-600">
        One account for short stays, long leases, inspections and messages.
      </p>

      <form action={formAction} className="mt-7 space-y-4">
        <input type="hidden" name="next" value={next} />

        {state?.error ? <FormError>{state.error}</FormError> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="register-firstName" required>
            <Input id="register-firstName" name="firstName" autoComplete="given-name" required />
          </Field>
          <Field label="Last name" htmlFor="register-lastName" required>
            <Input id="register-lastName" name="lastName" autoComplete="family-name" required />
          </Field>
        </div>

        <Field label="Email address" htmlFor="register-email" required>
          <Input
            id="register-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field
          label="Phone number"
          htmlFor="register-phone"
          hint="Used only for your reservations and inspections."
        >
          <Input
            id="register-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+234 801 234 5678"
          />
        </Field>

        <PasswordField
          name="password"
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
        />

        <PasswordField
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
        />

        <div className="flex items-start gap-3 rounded-md border border-line bg-white px-3.5 py-3">
          <Checkbox id="register-terms" name="terms" value="accepted" required className="mt-0.5" />
          <label htmlFor="register-terms" className="text-[13px] leading-relaxed text-ink-600">
            I agree to the RentOps terms of service and privacy notice, and I understand that
            payments are processed securely through the platform.
          </label>
        </div>

        <SubmitButton size="lg" className="w-full" pendingLabel="Creating your account…">
          Create account
        </SubmitButton>
      </form>

      <p className="mt-7 border-t border-line pt-6 text-[14px] text-ink-600">
        Already have an account?{" "}
        <Link
          href={`/login${next && next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
