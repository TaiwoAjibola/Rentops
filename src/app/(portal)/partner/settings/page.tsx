import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import type { PayoutModel, VerificationType } from "@prisma/client";

import { ActionForm } from "@/components/partner/action-form";
import { PageHeader, Panel } from "@/components/partner/ui";
import { SubmitButton } from "@/components/partner/submit-button";
import {
  saveNotificationSettings,
  updatePartnerSettings,
  updatePayoutSettings,
} from "@/server/actions/partner-settings";
import { uploadPartnerDocument } from "@/server/actions/partner-onboarding";
import { requirePartnerContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Callout, EmptyState, InfoRow } from "@/components/ui/data";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatDate } from "@/lib/dates";
import {
  PARTNER_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
  VERIFICATION_TYPE_LABELS,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Settings · RentOps partner",
  description: "Business profile, payout model, verification and notifications.",
};

const DOCUMENT_TYPES: VerificationType[] = ["IDENTITY", "BUSINESS", "OWNERSHIP", "ADDRESS"];

const PAYOUT_MODEL_LABELS: Record<PayoutModel, string> = {
  PLATFORM_COLLECTED: "RentOps collects payment",
  PARTNER_DIRECT: "I collect payment directly",
  HYBRID: "Hybrid — some properties direct, some collected",
};

const PAYOUT_MODEL_HELP: Record<PayoutModel, string> = {
  PLATFORM_COLLECTED:
    "RentOps takes the guest's payment, holds it through the settlement window and pays your share to your primary bank account after check-in.",
  PARTNER_DIRECT:
    "You take payment from the guest yourself. RentOps invoices you for its commission and service fee.",
  HYBRID:
    "Mixed portfolio: set collection per property. Anything RentOps collects settles to your bank account; the rest you invoice yourself.",
};

function documentTone(status: string) {
  if (status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  if (status === "IN_REVIEW") return "info" as const;
  return "warning" as const;
}

export default async function PartnerSettingsPage() {
  const { partner, user, membership, can } = await requirePartnerContext();

  const [documents, preferences] = await Promise.all([
    prisma.partnerDocument.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
  ]);

  const canEdit = can("settings.manage");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Settings"
        title={partner.businessName}
        description="How your business appears to guests, how you are paid, and how RentOps reaches your team."
        actions={
          <ButtonLink href="/partner/bank-accounts" variant="outline" size="sm">
            Payout accounts
          </ButtonLink>
        }
      />

      {!canEdit ? (
        <Callout tone="warning" title="Read-only for your role" className="mb-6">
          Your role ({membership.role.toLowerCase().replace(/_/g, " ")}) cannot change organisation
          settings. Ask an owner to update anything below.
        </Callout>
      ) : null}

      <div className="space-y-6">
        <Panel
          title="Verification"
          description="RentOps reviews every partner before payouts are released."
          action={
            <Badge tone={VERIFICATION_STATUS_TONES[partner.verificationStatus]} dot>
              {VERIFICATION_STATUS_LABELS[partner.verificationStatus]}
            </Badge>
          }
        >
          <dl>
            <InfoRow label="Business type" value={PARTNER_TYPE_LABELS[partner.type]} />
            <InfoRow label="Legal name" value={partner.legalName ?? "Not provided"} />
            <InfoRow label="Registration number" value={partner.registrationNumber ?? "Not provided"} />
            <InfoRow label="Tax ID" value={partner.taxId ?? "Not provided"} />
            <InfoRow
              label="Reviewed"
              value={partner.verifiedAt ? formatDate(partner.verifiedAt) : "Not yet reviewed"}
            />
            <InfoRow
              label="Contact on file"
              value={
                <span>
                  {user.email}
                  <span className="ml-1 text-ink-500">
                    ({user.emailVerifiedAt ? "verified" : "unverified"})
                  </span>
                </span>
              }
            />
          </dl>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-line bg-canvas px-4 py-3 text-[13px] leading-relaxed text-ink-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              {partner.verificationStatus === "VERIFIED"
                ? "Your account is verified. Payouts are released on the normal settlement schedule."
                : "Until verification passes your listings can be submitted, but payouts stay held. Upload the documents below if anything is missing."}
            </span>
          </div>

          {documents.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={<FileText className="h-5 w-5" aria-hidden />}
              title="No documents uploaded"
              description="Verification documents are uploaded once and reviewed by the RentOps team."
            />
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-md border border-line">
              {documents.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink-900">
                      {document.label ?? VERIFICATION_TYPE_LABELS[document.type]}
                    </p>
                    <p className="text-[12px] text-ink-500">
                      Uploaded {formatDate(document.createdAt)}
                      {document.notes ? ` · ${document.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={documentTone(document.status)}>{document.status.toLowerCase().replace(/_/g, " ")}</Badge>
                    <a
                      href={document.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-medium text-brand-700 hover:underline"
                    >
                      View
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 rounded-md border border-line bg-canvas/60 p-4">
            <p className="text-[13px] font-semibold text-ink-900">Upload another document</p>
            <p className="mt-1 text-[12px] text-ink-500">
              PDF or image. Each upload re-enters the manual review queue.
            </p>
            <ActionForm action={uploadPartnerDocument} className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Document type" htmlFor="document-type">
                <Select id="document-type" name="type" defaultValue="BUSINESS">
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {VERIFICATION_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="File" htmlFor="document-file" required>
                <Input
                  id="document-file"
                  name="file"
                  type="file"
                  accept="application/pdf,image/*"
                  required
                  className="h-auto py-2 text-[13px]"
                />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton size="sm" variant="secondary" pendingLabel="Uploading…">
                  Upload document
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </Panel>

        <Panel
          title="Business profile"
          description="Guests see this on your listings and booking confirmations."
        >
          {canEdit ? (
            <ActionForm
              action={updatePartnerSettings}
              submitLabel="Save profile"
              submitPendingLabel="Saving…"
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field label="Business name" htmlFor="businessName" required className="sm:col-span-2">
                <Input id="businessName" name="businessName" defaultValue={partner.businessName} required />
              </Field>
              <Field label="Business email" htmlFor="businessEmail" required>
                <Input id="businessEmail" name="email" type="email" defaultValue={partner.email} required />
              </Field>
              <Field label="Phone" htmlFor="businessPhone" required>
                <Input id="businessPhone" name="phone" defaultValue={partner.phone} required />
              </Field>
              <Field label="WhatsApp" htmlFor="businessWhatsapp" hint="Optional.">
                <Input id="businessWhatsapp" name="whatsapp" defaultValue={partner.whatsapp ?? ""} />
              </Field>
              <Field label="Address" htmlFor="businessAddress">
                <Input id="businessAddress" name="addressLine" defaultValue={partner.addressLine ?? ""} />
              </Field>
              <Field label="City" htmlFor="businessCity">
                <Input id="businessCity" name="city" defaultValue={partner.city ?? ""} />
              </Field>
              <Field label="State" htmlFor="businessState">
                <Input id="businessState" name="state" defaultValue={partner.state ?? ""} />
              </Field>
              <Field
                label="Description"
                htmlFor="businessDescription"
                hint="One or two sentences about the properties you operate."
                className="sm:col-span-2"
              >
                <Textarea
                  id="businessDescription"
                  name="description"
                  defaultValue={partner.description ?? ""}
                  rows={4}
                />
              </Field>
            </ActionForm>
          ) : (
            <dl>
              <InfoRow label="Business name" value={partner.businessName} />
              <InfoRow label="Email" value={partner.email} />
              <InfoRow label="Phone" value={partner.phone} />
              <InfoRow label="WhatsApp" value={partner.whatsapp ?? "Not set"} />
              <InfoRow
                label="Address"
                value={[partner.addressLine, partner.city, partner.state].filter(Boolean).join(", ") || "Not set"}
              />
              <InfoRow label="Description" value={partner.description ?? "Not set"} />
            </dl>
          )}
        </Panel>

        <Panel
          title="Payout model"
          description="Who collects the guest's money. This drives settlements and commission invoicing."
        >
          <dl>
            <InfoRow
              label="Current model"
              value={PAYOUT_MODEL_LABELS[partner.payoutModel]}
            />
            <InfoRow label="Settlement currency" value={partner.defaultCurrency} />
            <InfoRow
              label="Commission override"
              value={partner.commissionRate ? `${partner.commissionRate}%` : "Platform default"}
            />
            <InfoRow
              label="Settlement hold"
              value={partner.settlementHoldDays ? `${partner.settlementHoldDays} days` : "Platform default"}
            />
          </dl>

          <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
            {PAYOUT_MODEL_HELP[partner.payoutModel]}
          </p>

          {canEdit ? (
            <div className="mt-5">
              <ActionForm
                action={updatePayoutSettings}
                submitLabel="Save payout model"
                submitPendingLabel="Saving…"
                className="max-w-xl space-y-4"
              >
                <Field label="Change payout model" htmlFor="payoutModel">
                  <Select id="payoutModel" name="payoutModel" defaultValue={partner.payoutModel}>
                    {(Object.keys(PAYOUT_MODEL_LABELS) as PayoutModel[]).map((model) => (
                      <option key={model} value={model}>
                        {PAYOUT_MODEL_LABELS[model]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </ActionForm>
              <p className="mt-3 text-[13px] text-ink-500">
                Payouts always go to your{" "}
                <Link href="/partner/bank-accounts" className="font-medium text-brand-700 hover:underline">
                  primary bank account
                </Link>
                .
              </p>
            </div>
          ) : null}
        </Panel>

        <Panel
          title="Notifications"
          description="How RentOps alerts you about bookings, payouts and disputes."
        >
          <ActionForm
            action={saveNotificationSettings}
            submitLabel="Save preferences"
            submitPendingLabel="Saving…"
            className="space-y-3"
          >
            <p className="flex items-start gap-2.5">
              <Checkbox
                id="notify-inapp"
                name="inApp"
                defaultChecked
                disabled
                aria-label="In-app notifications"
              />
              <label htmlFor="notify-inapp" className="text-[13px] text-ink-600">
                <span className="font-medium text-ink-900">In-app notifications</span> — always on. Payout,
                verification and dispute notices must reach you.
              </label>
            </p>
            <p className="flex items-start gap-2.5">
              <Checkbox id="notify-email" name="email" defaultChecked={preferences?.email ?? true} />
              <label htmlFor="notify-email" className="text-[13px] text-ink-600">
                <span className="font-medium text-ink-900">Email</span> — booking requests, payments and
                settlements.
              </label>
            </p>
            <p className="flex items-start gap-2.5">
              <Checkbox id="notify-sms" name="sms" defaultChecked={preferences?.sms ?? false} />
              <label htmlFor="notify-sms" className="text-[13px] text-ink-600">
                <span className="font-medium text-ink-900">SMS</span> — same-day arrival and check-in alerts.
              </label>
            </p>
            <p className="flex items-start gap-2.5">
              <Checkbox id="notify-whatsapp" name="whatsapp" defaultChecked={preferences?.whatsapp ?? false} />
              <label htmlFor="notify-whatsapp" className="text-[13px] text-ink-600">
                <span className="font-medium text-ink-900">WhatsApp</span> — guest messages and urgent alerts.
              </label>
            </p>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
