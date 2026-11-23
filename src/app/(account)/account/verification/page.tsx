import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { CustomerActionForm } from "@/components/account/action-form";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_TONES, VERIFICATION_TYPE_LABELS } from "@/lib/constants";
import { submitCustomerVerification } from "@/server/actions/customer-verification";

export const metadata = { title: "Verification" };

export default async function VerificationPage() {
  const user = await requireUser("/account/verification");

  const [profile, records] = await Promise.all([
    prisma.customerProfile.findUnique({ where: { userId: user.id } }),
    prisma.verificationRecord.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),
  ]);

  const verificationStatus = profile?.verificationStatus ?? "UNVERIFIED";
  const isPending = records.some((record) => record.status === "PENDING" || record.status === "IN_REVIEW");

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <AccountPageHeader
        eyebrow="Trust"
        title="Verify your identity"
        description="Verification makes longer leases and higher-value stays possible — most landlords ask for it before confirming."
        actions={
          <Badge tone={VERIFICATION_STATUS_TONES[verificationStatus]} dot>
            {VERIFICATION_STATUS_LABELS[verificationStatus]}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Submit documents</h2>
          <p className="mt-1 text-sm text-ink-500">
            Upload a photo or scan of a government-issued ID. Optionally add a proof of address and consent to a background check.
          </p>

          <div className="mt-4">
            <CustomerActionForm
              action={submitCustomerVerification}
              submitLabel="Submit for review"
              encType="multipart/form-data"
              className="space-y-4"
            >
              <Field label="ID type" htmlFor="id-type" required>
                <Select id="id-type" name="idType" defaultValue={profile?.idType ?? ""} required>
                  <option value="">Choose…</option>
                  <option value="NIN">National Identification Number (NIN)</option>
                  <option value="BVN">Bank Verification Number (BVN)</option>
                  <option value="DRIVERS_LICENCE">Driver&apos;s Licence</option>
                  <option value="PASSPORT">International Passport</option>
                  <option value="VOTERS_CARD">Voter&apos;s Card</option>
                </Select>
              </Field>

              <Field label="ID number" htmlFor="id-number" required>
                <Input id="id-number" name="idNumber" defaultValue={profile?.idNumber ?? ""} required />
              </Field>

              <Field label="ID document" htmlFor="identity-document" required hint="JPG, PNG or PDF, up to 10MB.">
                <Input id="identity-document" name="identityDocument" type="file" accept="image/*,application/pdf" required />
              </Field>

              <div className="rounded-md border border-line bg-ink-50/40 p-4">
                <p className="text-[13px] font-semibold text-ink-800">Address check (optional)</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Address line" htmlFor="address-line" className="sm:col-span-2">
                    <Input id="address-line" name="addressLine" defaultValue={profile?.addressLine ?? ""} />
                  </Field>
                  <Field label="City" htmlFor="address-city">
                    <Input id="address-city" name="city" defaultValue={profile?.city ?? ""} />
                  </Field>
                  <Field label="State" htmlFor="address-state">
                    <Input id="address-state" name="state" defaultValue={profile?.state ?? ""} />
                  </Field>
                  <Field label="Proof of address" htmlFor="address-document" className="sm:col-span-2">
                    <Input id="address-document" name="addressDocument" type="file" accept="image/*,application/pdf" />
                  </Field>
                </div>
              </div>

              <Field label="Background check" htmlFor="background-consent">
                <span className="flex items-start gap-2.5 pt-2">
                  <Checkbox id="background-consent" name="backgroundConsent" defaultChecked />
                  <label htmlFor="background-consent" className="text-[13px] leading-relaxed text-ink-600">
                    I consent to a background check where required for longer leases.
                  </label>
                </span>
              </Field>
            </CustomerActionForm>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Your submissions</h2>
          {records.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No documents submitted yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {records.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{VERIFICATION_TYPE_LABELS[record.type]}</p>
                    <p className="text-xs text-ink-500">{formatDate(record.submittedAt)}</p>
                  </div>
                  <Badge tone={VERIFICATION_STATUS_TONES[record.status]}>{VERIFICATION_STATUS_LABELS[record.status]}</Badge>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 rounded-md bg-info-soft px-4 py-3 text-[13px] leading-relaxed text-info">
            Verified guests are preferred by hosts for leases longer than 30 nights, and can book
            higher-value shortlets with ID on file.
          </div>
        </section>
      </div>
    </div>
  );
}
