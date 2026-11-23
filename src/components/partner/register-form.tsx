"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/partner/submit-button";
import { registerPartner } from "@/server/actions/partner-auth";
import type { PartnerActionState } from "@/components/partner/action-state";
import { NIGERIAN_STATES, PARTNER_TYPE_LABELS } from "@/lib/constants";
import type { PartnerType, PayoutModel } from "@prisma/client";

const PARTNER_TYPES: PartnerType[] = [
  "HOTEL",
  "SHORTLET_OWNER",
  "SERVICED_APARTMENT_OPERATOR",
  "INDIVIDUAL_OWNER",
  "PROPERTY_MANAGEMENT_COMPANY",
  "PROPERTY_DEVELOPER",
  "OTHER",
];

const PAYOUT_MODELS: { value: PayoutModel; label: string; hint: string }[] = [
  {
    value: "PLATFORM_COLLECTED",
    label: "RentOps collects payment (recommended)",
    hint: "Guests pay through RentOps. We release your payout after verified check-in plus the settlement hold.",
  },
  {
    value: "PARTNER_DIRECT",
    label: "You collect payment directly",
    hint: "You take payment yourself. RentOps invoices its commission separately.",
  },
  {
    value: "HYBRID",
    label: "Hybrid",
    hint: "Some stays are collected by RentOps, others by your front desk.",
  },
];

export function PartnerRegisterForm() {
  const [state, formAction] = useActionState<PartnerActionState, FormData>(registerPartner, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? <FormError>{state.error}</FormError> : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">About your business</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          This is how guests and RentOps will identify your organisation.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="What describes you best?" htmlFor="reg-type" required className="sm:col-span-2">
            <Select id="reg-type" name="type" defaultValue="HOTEL" required>
              {PARTNER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PARTNER_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Business / trading name" htmlFor="reg-businessName" required>
            <Input id="reg-businessName" name="businessName" required placeholder="Adunni Suites" />
          </Field>

          <Field label="Registered legal name" htmlFor="reg-legalName" hint="If different from your trading name.">
            <Input id="reg-legalName" name="legalName" placeholder="Adunni Hospitality Ltd" />
          </Field>

          <Field label="Registration number" htmlFor="reg-regNumber" hint="CAC or equivalent.">
            <Input id="reg-regNumber" name="registrationNumber" placeholder="RC 1234567" />
          </Field>

          <Field label="Tax identification number" htmlFor="reg-taxId">
            <Input id="reg-taxId" name="taxId" placeholder="TIN" />
          </Field>

          <Field label="Business email" htmlFor="reg-email" required>
            <Input id="reg-email" name="email" type="email" autoComplete="email" required placeholder="hello@adunnisuites.com" />
          </Field>

          <Field label="Business phone" htmlFor="reg-phone" required>
            <Input id="reg-phone" name="phone" type="tel" required placeholder="+234 801 234 5678" />
          </Field>

          <Field label="WhatsApp" htmlFor="reg-whatsapp" hint="Optional — used for booking notifications.">
            <Input id="reg-whatsapp" name="whatsapp" type="tel" placeholder="+234 801 234 5678" />
          </Field>

          <Field label="Website" htmlFor="reg-website">
            <Input id="reg-website" name="website" type="url" placeholder="https://" />
          </Field>

          <Field label="City" htmlFor="reg-city">
            <Input id="reg-city" name="city" placeholder="Lagos" />
          </Field>

          <Field label="State" htmlFor="reg-state">
            <Select id="reg-state" name="state" defaultValue="Lagos">
              {NIGERIAN_STATES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Country" htmlFor="reg-country">
            <Input id="reg-country" name="country" defaultValue="Nigeria" />
          </Field>

          <Field label="Business address" htmlFor="reg-address" className="sm:col-span-2">
            <Input id="reg-address" name="addressLine" placeholder="14 Admiralty Way, Lekki Phase 1" />
          </Field>

          <Field
            label="Describe your accommodation"
            htmlFor="reg-description"
            className="sm:col-span-2"
            hint="A sentence or two. Guests never see this — it helps our review team."
          >
            <Textarea id="reg-description" name="description" className="min-h-20" />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">How you get paid</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          You can change this later in settings. RentOps only ever earns its commission — never the guest&apos;s
          gross payment.
        </p>

        <div className="mt-4 space-y-2.5">
          {PAYOUT_MODELS.map((model) => (
            <label
              key={model.value}
              className="flex cursor-pointer gap-3 rounded-md border border-line p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="payoutModel"
                value={model.value}
                defaultChecked={model.value === "PLATFORM_COLLECTED"}
                className="mt-0.5 h-4 w-4 accent-brand-700"
              />
              <span>
                <span className="block text-[14px] font-medium text-ink-900">{model.label}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-500">{model.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">Contact person &amp; sign-in</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          Your RentOps account. Your system role stays a customer — portal access comes from being an owner of
          this partner account.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="reg-firstName" required>
            <Input id="reg-firstName" name="firstName" autoComplete="given-name" required />
          </Field>
          <Field label="Last name" htmlFor="reg-lastName" required>
            <Input id="reg-lastName" name="lastName" autoComplete="family-name" required />
          </Field>
          <Field label="Contact email" htmlFor="reg-contactEmail" required>
            <Input
              id="reg-contactEmail"
              name="contactEmail"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Contact phone" htmlFor="reg-contactPhone">
            <Input id="reg-contactPhone" name="contactPhone" type="tel" autoComplete="tel" />
          </Field>
          <Field label="Password" htmlFor="reg-password" required hint="At least 8 characters.">
            <Input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          <Field label="Confirm password" htmlFor="reg-confirm" required>
            <Input
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">Verification documents</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          Optional now, required before payouts are released. RentOps reviews every document manually.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business registration (PDF or image)" htmlFor="reg-businessDoc">
            <Input
              id="reg-businessDoc"
              name="businessDocument"
              type="file"
              accept="application/pdf,image/*"
              className="py-2"
            />
          </Field>
          <Field label="Contact person identity (PDF or image)" htmlFor="reg-identityDoc">
            <Input
              id="reg-identityDoc"
              name="identityDocument"
              type="file"
              accept="application/pdf,image/*"
              className="py-2"
            />
          </Field>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-md border border-line bg-white px-4 py-3.5">
        <Checkbox id="reg-terms" name="acceptTerms" className="mt-0.5" required />
        <label htmlFor="reg-terms" className="text-[13px] leading-relaxed text-ink-600">
          I confirm I am authorised to list these properties, and I accept the RentOps partner terms. I
          understand payouts are released after verified check-in and the settlement hold window.
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-500">
          Already registered?{" "}
          <Link href="/login?next=%2Fpartner" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
        <SubmitButton size="lg" pendingLabel="Creating your account…">
          Create partner account
        </SubmitButton>
      </div>
    </form>
  );
}
