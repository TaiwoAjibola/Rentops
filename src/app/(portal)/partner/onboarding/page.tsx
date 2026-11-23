import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  FileText,
  Landmark,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PAYOUT_POLICY_SHORT, PAYOUT_POLICY_LONG } from "@/components/partner/copy";
import { SubmitButton } from "@/components/partner/submit-button";
import { ActionForm } from "@/components/partner/action-form";
import { PageHeader, Panel } from "@/components/partner/ui";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/data";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { requirePartnerContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { requestContactVerification, saveBankAccount, uploadPartnerDocument } from "@/server/actions/partner-onboarding";
import type { VerificationType } from "@prisma/client";

const DOCUMENT_STEPS: { type: VerificationType; label: string; hint: string }[] = [
  {
    type: "BUSINESS",
    label: "Business registration",
    hint: "CAC certificate, partnership deed or acceptance letter.",
  },
  {
    type: "IDENTITY",
    label: "Contact person identity",
    hint: "National ID, passport or driver's licence of the account owner.",
  },
  {
    type: "OWNERSHIP",
    label: "Ownership / listing authority",
    hint: "Deed, tenancy agreement or a management mandate for each property.",
  },
  {
    type: "ADDRESS",
    label: "Proof of business address",
    hint: "Utility bill or tenancy document dated within the last three months.",
  },
];

function StepShell({
  index,
  title,
  done,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <Panel
      title={
        <span className="flex flex-wrap items-center gap-2.5">
          {done ? (
            <CheckCircle2 className="h-[18px] w-[18px] text-success" aria-hidden />
          ) : (
            <Circle className="h-[18px] w-[18px] text-ink-300" aria-hidden />
          )}
          <span>
            Step {index}: {title}
          </span>
          <Badge tone={done ? "success" : "neutral"}>{done ? "Complete" : "To do"}</Badge>
        </span>
      }
    >
      {children}
    </Panel>
  );
}

export default async function PartnerOnboardingPage() {
  const { user, partner, can } = await requirePartnerContext();

  const [documents, bankAccounts, properties] = await Promise.all([
    prisma.partnerDocument.findMany({ where: { partnerId: partner.id }, orderBy: { createdAt: "desc" } }),
    prisma.partnerBankAccount.findMany({
      where: { partnerId: partner.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    }),
    prisma.property.findMany({
      where: { partnerId: partner.id },
      select: { id: true, name: true, status: true, city: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const contactVerified = Boolean(user.emailVerifiedAt ?? user.phoneVerifiedAt);
  const completedCount = [true, contactVerified, documents.length > 0, bankAccounts.length > 0, properties.length > 0].filter(
    Boolean,
  ).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Getting started"
        title={`Welcome, ${partner.businessName}`}
        description="Five short steps and you can start taking bookings. RentOps reviews your documents and payout details before releasing money — nothing goes live without that review."
      />

      <div className="mb-6 rounded-lg border border-line bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-ink-600">{completedCount} of 5 steps complete</p>
          <p className="text-[13px] text-ink-500">
            Verification:{" "}
            <span className="font-semibold text-ink-800">
              {partner.verificationStatus.toLowerCase().replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-500"
            style={{ width: `${Math.round((completedCount / 5) * 100)}%` }}
          />
        </div>
      </div>

      {partner.verificationStatus === "REJECTED" ? (
        <Callout tone="danger" title="Verification rejected" className="mb-6">
          Our reviews team rejected the submitted documents. Upload replacements in step 3 — payouts stay frozen
          until verification passes.
        </Callout>
      ) : null}

      <div className="space-y-5">
        <StepShell index={1} title="Account created" done>
          <p className="text-[14px] leading-relaxed text-ink-600">
            <span className="font-medium text-ink-900">{partner.businessName}</span> is registered as a{" "}
            {partner.type.toLowerCase().replace(/_/g, " ")}. You sign in with{" "}
            <span className="font-medium text-ink-900">{user.email}</span>.
          </p>
          <div className="mt-3">
            <ButtonLink href="/partner/settings" variant="outline" size="sm">
              Review business profile
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </ButtonLink>
          </div>
        </StepShell>

        <StepShell index={2} title="Confirm your contact details" done={contactVerified}>
          {contactVerified ? (
            <p className="text-[14px] text-ink-600">
              Verified {formatDate(user.emailVerifiedAt ?? user.phoneVerifiedAt ?? new Date())}.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-[14px] leading-relaxed text-ink-600">
                We need to confirm the email on your account before payouts can be released to you.
              </p>
              <ActionForm action={requestContactVerification} submitLabel="Send verification link" submitSize="sm" />
            </div>
          )}
        </StepShell>

        <StepShell index={3} title="Upload verification documents" done={documents.length > 0}>
          <div className="mb-4 flex items-start gap-2 rounded-md border border-info/25 bg-info-soft px-4 py-3 text-[13px] leading-relaxed text-info">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              RentOps reviews every document manually. Until verification passes your listings can be submitted,
              but payouts are held.
            </span>
          </div>

          {documents.length > 0 ? (
            <ul className="mb-5 divide-y divide-line rounded-md border border-line">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                    <span className="truncate text-[14px] text-ink-800">
                      {document.label ?? document.type.toLowerCase()}
                    </span>
                    <Badge
                      tone={
                        document.status === "VERIFIED"
                          ? "success"
                          : document.status === "REJECTED"
                            ? "danger"
                            : document.status === "IN_REVIEW"
                              ? "info"
                              : "warning"
                      }
                    >
                      {document.status.toLowerCase().replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[13px] font-medium text-brand-700 hover:underline"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {DOCUMENT_STEPS.map((step) => (
              <ActionForm
                key={step.type}
                action={uploadPartnerDocument}
                hidden={{ type: step.type }}
                className="space-y-3 rounded-md border border-line bg-canvas/60 p-3.5"
              >
                <div>
                  <p className="text-[13px] font-semibold text-ink-900">{step.label}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{step.hint}</p>
                </div>
                <Field label="File" htmlFor={`doc-${step.type}`}>
                  <Input
                    id={`doc-${step.type}`}
                    name="file"
                    type="file"
                    accept="application/pdf,image/*"
                    required
                    className="h-auto py-2 text-[13px]"
                  />
                </Field>
                <SubmitButton size="sm" variant="secondary" pendingLabel="Uploading…">
                  Upload {step.label.toLowerCase()}
                </SubmitButton>
              </ActionForm>
            ))}
          </div>
        </StepShell>

        <StepShell index={4} title="Settlement details" done={bankAccounts.length > 0}>
          {can("settlement.manage") ? (
            <div className="space-y-5">
              <p className="text-[14px] leading-relaxed text-ink-600">{PAYOUT_POLICY_SHORT}</p>

              {bankAccounts.length > 0 ? (
                <ul className="divide-y divide-line rounded-md border border-line">
                  {bankAccounts.map((account) => (
                    <li key={account.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-ink-900">{account.bankName}</p>
                        <p className="text-[12px] text-ink-500">
                          {account.accountName} · ••••{account.accountNumber.slice(-4)}
                        </p>
                      </div>
                      {account.isPrimary ? <Badge tone="success">Primary</Badge> : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              <ActionForm
                action={saveBankAccount}
                submitLabel="Save payout account"
                className="grid gap-4 sm:grid-cols-2"
              >
                <Field label="Bank name" htmlFor="bank-name" required>
                  <Input id="bank-name" name="bankName" required placeholder="First Bank" />
                </Field>
                <Field label="Bank code" htmlFor="bank-code" hint="Optional sort code.">
                  <Input id="bank-code" name="bankCode" placeholder="011" />
                </Field>
                <Field label="Account number" htmlFor="bank-number" required hint="10 digits.">
                  <Input
                    id="bank-number"
                    name="accountNumber"
                    inputMode="numeric"
                    pattern="\d{10}"
                    required
                    placeholder="0123456789"
                  />
                </Field>
                <Field label="Account name" htmlFor="bank-account-name" required>
                  <Input id="bank-account-name" name="accountName" required placeholder="Adunni Hospitality Ltd" />
                </Field>
                <div className="flex items-center gap-2.5 sm:col-span-2">
                  <Checkbox id="bank-primary" name="isPrimary" />
                  <label htmlFor="bank-primary" className="text-[13px] text-ink-600">
                    Make this my primary payout account
                  </label>
                </div>
              </ActionForm>
            </div>
          ) : (
            <Callout tone="warning" title="Finance permission required">
              Bank and settlement details need the <span className="font-semibold">settlement.manage</span>{" "}
              permission. Your role cannot see or change payout accounts — ask an owner or finance user to finish
              this step.
            </Callout>
          )}
        </StepShell>

        <StepShell index={5} title="Add your first property" done={properties.length > 0}>
          {properties.length > 0 ? (
            <div className="space-y-3">
              <ul className="divide-y divide-line rounded-md border border-line">
                {properties.map((property) => (
                  <li key={property.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink-900">{property.name}</p>
                      <p className="text-[12px] text-ink-500">
                        {property.city} · {property.status.toLowerCase().replace(/_/g, " ")}
                      </p>
                    </div>
                    <Link
                      href={`/partner/properties/${property.id}`}
                      className="shrink-0 text-[13px] font-medium text-brand-700 hover:underline"
                    >
                      Open workspace
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/partner/properties/new" variant="secondary" size="sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Add another property
              </ButtonLink>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[14px] leading-relaxed text-ink-600">
                Describe the property, its rooms or apartments, the pricing periods you actually use and your
                availability. Nothing is public until RentOps approves it.
              </p>
              <ButtonLink href="/partner/properties/new" size="md">
                <Building2 className="h-4 w-4" aria-hidden />
                Add your first property
              </ButtonLink>
            </div>
          )}
        </StepShell>
      </div>

      <p className="mt-8 flex items-start gap-2 border-t border-line pt-6 text-[13px] leading-relaxed text-ink-500">
        <Landmark className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {PAYOUT_POLICY_LONG}
      </p>
    </div>
  );
}
