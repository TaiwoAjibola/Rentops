import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReservationStatus } from "@prisma/client";
import { FileText, Landmark } from "lucide-react";

import { requirePlatformStaff } from "@/lib/auth/session";
import { hasPlatformPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { getAuditTrail } from "@/lib/audit";
import {
  PARTNER_ROLE_LABELS,
  PARTNER_TYPE_LABELS,
  VERIFICATION_TYPE_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/dates";

import { Badge } from "@/components/ui/badge";
import { DataTable, EmptyState, InfoRow, Stat, TableCell, TableRow } from "@/components/ui/data";
import { Callout } from "@/components/ui/data";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PriceInline } from "@/components/ui/price";
import { ActionForm } from "@/components/admin/action-form";
import {
  reviewPartnerDocument,
  setPartnerVerification,
  updatePartnerCommercials,
  verifyPartnerBankAccount,
} from "@/server/actions/admin-partners";
import {
  KeyValue,
  Money,
  PageHeader,
  Panel,
  PersonCell,
  PropertyStatusBadge,
  SmallLabel,
  Thumb,
  VerificationStatusBadge,
  When,
} from "@/components/admin/ui";

const PAID_STATUSES: ReservationStatus[] = [
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "DISPUTED",
  "REFUND_PENDING",
  "REFUNDED",
];

const PAYOUT_MODELS = [
  { value: "PLATFORM_COLLECTED", label: "Platform collects payment" },
  { value: "PARTNER_DIRECT", label: "Partner collects directly" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

export default async function AdminPartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformStaff("partner.view");
  const { id } = await params;

  const partner = await prisma.partner.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
      },
      bankAccounts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      },
      properties: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          status: true,
          isActive: true,
          coverImageUrl: true,
          baseNightlyRate: true,
          currency: true,
          priceBasis: true,
        },
      },
      _count: { select: { properties: true, documents: true, members: true } },
    },
  });

  if (!partner) notFound();

  const [trade, settlementAggregate, audits] = await Promise.all([
    prisma.reservation.aggregate({
      where: { property: { partnerId: partner.id }, status: { in: PAID_STATUSES } },
      _sum: { grossAmount: true, partnerNetAmount: true, platformCommission: true },
      _count: { _all: true },
    }),
    prisma.settlement.aggregate({
      where: { partnerId: partner.id, status: { in: ["PENDING", "ON_HOLD", "SCHEDULED", "PROCESSING", "PAID"] } },
      _sum: { netPayable: true, paidAmount: true },
    }),
    getAuditTrail("Partner", partner.id, 20),
  ]);

  const canVerify = hasPlatformPermission(admin.systemRole, "partner.verify");
  const canFinance = hasPlatformPermission(admin.systemRole, "finance.manage");
  const outstanding = Math.max(0, (settlementAggregate._sum.netPayable ?? 0) - (settlementAggregate._sum.paidAmount ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={PARTNER_TYPE_LABELS[partner.type]}
        title={partner.businessName}
        description={`${partner.email} · ${partner.phone}${partner.city ? ` · ${partner.city}, ${partner.state ?? ""}` : ""}`}
        actions={
          <Link
            href={`/admin/properties?partnerId=${partner.id}`}
            className="inline-flex h-11 items-center rounded-md border border-line-strong bg-white px-4 text-[13px] font-medium text-ink-800 transition-colors hover:bg-ink-50"
          >
            View all properties
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Properties" value={partner._count.properties} hint={`${partner.documents.filter((doc) => doc.status === "VERIFIED").length} verified documents`} />
        <Stat
          label="Bookings value"
          value={<Money value={trade._sum.grossAmount ?? 0} compact />}
          hint={`${trade._count._all} paid reservations`}
        />
        <Stat
          label="RentOps commission"
          value={<Money value={trade._sum.platformCommission ?? 0} compact />}
          hint="Revenue retained by the platform"
          tone="success"
        />
        <Stat
          label="Outstanding settlement"
          value={<Money value={outstanding} compact />}
          hint={formatMoneyHint(partner.settlementHoldDays)}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Business record" className="lg:col-span-2">
          <KeyValue
            items={[
              { label: "Legal name", value: partner.legalName ?? "—" },
              { label: "Registration number", value: partner.registrationNumber ?? "—" },
              { label: "Tax ID", value: partner.taxId ?? "—" },
              { label: "Email", value: partner.email },
              { label: "Phone / WhatsApp", value: `${partner.phone}${partner.whatsapp ? ` · ${partner.whatsapp}` : ""}` },
              { label: "Website", value: partner.website ?? "—" },
              {
                label: "Address",
                value: [partner.addressLine, partner.city, partner.state, partner.country].filter(Boolean).join(", ") || "—",
              },
              { label: "Joined", value: formatDate(partner.createdAt) },
              { label: "Onboarding step", value: partner.onboardingStep },
            ]}
          />
          {partner.description ? (
            <p className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-ink-600">{partner.description}</p>
          ) : null}
        </Panel>

        <Panel
          title="Verification"
          description="Overall standing drives what the partner is allowed to publish."
          action={<VerificationStatusBadge status={partner.verificationStatus} />}
        >
          <dl>
            <InfoRow label="Status" value={<VerificationStatusBadge status={partner.verificationStatus} />} />
            <InfoRow
              label="Verified at"
              value={partner.verifiedAt ? formatDate(partner.verifiedAt) : "Not verified"}
            />
          </dl>

          {canVerify ? (
            <div className="mt-4 border-t border-line pt-4">
              <ActionForm
                action={setPartnerVerification}
                hidden={{ partnerId: partner.id }}
                submitLabel="Save decision"
                submitPendingLabel="Saving…"
              >
                <Field label="Decision" htmlFor="status">
                  <Select name="status" id="status" defaultValue={partner.verificationStatus}>
                    <option value="VERIFIED">Verified</option>
                    <option value="IN_REVIEW">In review</option>
                    <option value="PENDING">Pending</option>
                    <option value="UNVERIFIED">Unverified</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="REJECTED">Rejected</option>
                  </Select>
                </Field>
                <Field label="Note to partner" htmlFor="notes">
                  <Textarea name="notes" id="notes" placeholder="Explain what was checked or what is missing" />
                </Field>
              </ActionForm>
            </div>
          ) : (
            <Callout className="mt-4" tone="info">
              Your role can view partner verification but not change it.
            </Callout>
          )}
        </Panel>
      </div>

      {canFinance ? (
        <Panel title="Commercial terms" description="Overrides applied to this partner only; platform defaults apply where blank.">
          <ActionForm action={updatePartnerCommercials} hidden={{ partnerId: partner.id }} submitLabel="Save terms">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Commission override (%)" hint="Blank = platform default" htmlFor="commissionRate">
                <Input
                  name="commissionRate"
                  id="commissionRate"
                  inputMode="decimal"
                  defaultValue={partner.commissionRate ?? ""}
                  placeholder="e.g. 10"
                />
              </Field>
              <Field label="Service fee (%)" hint="Blank = platform default" htmlFor="serviceFeeRate">
                <Input
                  name="serviceFeeRate"
                  id="serviceFeeRate"
                  inputMode="decimal"
                  defaultValue={partner.serviceFeeRate ?? ""}
                  placeholder="e.g. 0"
                />
              </Field>
              <Field label="Payout model" htmlFor="payoutModel">
                <Select name="payoutModel" id="payoutModel" defaultValue={partner.payoutModel}>
                  {PAYOUT_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Settlement hold (days)"
                hint="Days held after verified check-in before payout is released"
                htmlFor="settlementHoldDays"
              >
                <Input
                  name="settlementHoldDays"
                  id="settlementHoldDays"
                  inputMode="numeric"
                  defaultValue={partner.settlementHoldDays ?? ""}
                  placeholder="Platform default"
                />
              </Field>
            </div>
          </ActionForm>
        </Panel>
      ) : null}

      <Panel
        title="Documents"
        description={`${partner.documents.length} document${partner.documents.length === 1 ? "" : "s"} uploaded for verification`}
        bodyClassName="px-0 py-0"
      >
        {partner.documents.length === 0 ? (
          <EmptyState
            className="m-5"
            icon={<FileText className="h-5 w-5" />}
            title="No documents uploaded"
            description="Uploaded documents are reviewed before the partner can be verified."
          />
        ) : (
          <DataTable headers={["Document", "Type", "Uploaded by", "Uploaded", "Status", "Decision"]}>
            {partner.documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <p className="truncate text-[13px] font-medium text-ink-900">
                    {document.label ?? VERIFICATION_TYPE_LABELS[document.type]}
                  </p>
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] font-medium text-brand-700 hover:text-brand-800"
                  >
                    Open file
                  </a>
                </TableCell>
                <TableCell className="text-[13px] text-ink-600">{VERIFICATION_TYPE_LABELS[document.type]}</TableCell>
                <TableCell className="text-[13px] text-ink-600">
                  {document.uploadedBy ? `${document.uploadedBy.firstName} ${document.uploadedBy.lastName}` : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-[13px] text-ink-500">
                  {formatDate(document.createdAt)}
                </TableCell>
                <TableCell>
                  <VerificationStatusBadge status={document.status} />
                  {document.notes ? <p className="mt-1 max-w-[18rem] text-[12px] text-ink-500">{document.notes}</p> : null}
                </TableCell>
                <TableCell>
                  {canVerify ? (
                    <ActionForm
                      action={reviewPartnerDocument}
                      hidden={{ documentId: document.id }}
                      className="flex flex-wrap items-center gap-2"
                      showStatus={false}
                      resetOnSuccess
                    >
                      <Select name="decision" defaultValue="VERIFIED" className="h-9 w-32 text-[13px]" aria-label="Decision">
                        <option value="VERIFIED">Approve</option>
                        <option value="IN_REVIEW">In review</option>
                        <option value="REJECTED">Reject</option>
                      </Select>
                      <Input name="notes" placeholder="Note" className="h-9 w-40 text-[13px]" aria-label="Note" />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-md bg-brand-700 px-3 text-[13px] font-medium text-white transition-colors hover:bg-brand-800"
                      >
                        Save
                      </button>
                    </ActionForm>
                  ) : (
                    <span className="text-[13px] text-ink-500">Read only</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Team members" description="Everyone with access to this partner account">
          {partner.members.length === 0 ? (
            <EmptyState title="No members" description="Invitations are managed by the partner owner." />
          ) : (
            <ul className="divide-y divide-line">
              {partner.members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <PersonCell
                    name={`${member.user.firstName} ${member.user.lastName}`}
                    email={member.user.email}
                    avatarUrl={member.user.avatarUrl}
                    secondary={
                      <Link href={`/admin/users/${member.user.id}`} className="text-brand-700 hover:text-brand-800">
                        Open account
                      </Link>
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Badge tone={member.role === "OWNER" ? "info" : "neutral"}>{PARTNER_ROLE_LABELS[member.role]}</Badge>
                    <span className="text-[12px] uppercase tracking-[0.06em] text-ink-500">{member.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Payout accounts" description="Where RentOps sends settled funds">
          {partner.bankAccounts.length === 0 ? (
            <EmptyState icon={<Landmark className="h-5 w-5" />} title="No bank accounts" description="The partner has not added a payout account yet." />
          ) : (
            <ul className="divide-y divide-line">
              {partner.bankAccounts.map((account) => (
                <li key={account.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink-900">{account.bankName}</p>
                    <p className="text-[12px] text-ink-500">
                      {account.accountNumber} · {account.accountName} · {account.currency}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {account.isPrimary ? <Badge tone="info">Primary</Badge> : null}
                      {account.verifiedAt ? (
                        <Badge tone="success">Verified {formatDate(account.verifiedAt)}</Badge>
                      ) : (
                        <Badge tone="warning">Unverified</Badge>
                      )}
                    </div>
                  </div>
                  {canFinance ? (
                    <ActionForm
                      action={verifyPartnerBankAccount}
                      hidden={{ accountId: account.id, verified: account.verifiedAt ? "false" : "true" }}
                      submitSize="sm"
                      submitVariant={account.verifiedAt ? "outline" : "secondary"}
                      submitLabel={account.verifiedAt ? "Remove verification" : "Mark verified"}
                      className="shrink-0"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Properties" description={`${partner._count.properties} listing${partner._count.properties === 1 ? "" : "s"}`} bodyClassName="px-0 py-0">
        {partner.properties.length === 0 ? (
          <EmptyState className="m-5" title="No properties yet" description="Listings created by this partner will appear here." />
        ) : (
          <DataTable headers={["", "Property", "Location", "Rate", "Status", ""]}>
            {partner.properties.map((property) => (
              <TableRow key={property.id}>
                <TableCell>
                  <Thumb src={property.coverImageUrl} alt={property.name} size="sm" />
                </TableCell>
                <TableCell className="font-medium text-ink-900">{property.name}</TableCell>
                <TableCell className="text-[13px] text-ink-600">{property.city}</TableCell>
                <TableCell>
                  {property.baseNightlyRate != null ? (
                    <PriceInline
                      amount={property.baseNightlyRate}
                      currency={property.currency}
                      basis={property.priceBasis}
                    />
                  ) : (
                    <span className="text-[13px] text-ink-400">No rate</span>
                  )}
                </TableCell>
                <TableCell>
                  <PropertyStatusBadge status={property.status} />
                  {!property.isActive ? <p className="mt-1 text-[12px] text-danger">Hidden</p> : null}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/properties/${property.id}`}
                    className="text-[13px] font-medium text-brand-700 hover:text-brand-800"
                  >
                    Review
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Panel>

      <Panel title="Audit trail" description="Administrative decisions recorded against this partner">
        {audits.length === 0 ? (
          <EmptyState title="No recorded actions" />
        ) : (
          <ul className="divide-y divide-line">
            {audits.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink-900">{entry.summary ?? entry.action}</p>
                  <p className="text-[12px] text-ink-500">
                    {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "System"}
                  </p>
                </div>
                <When value={entry.createdAt} className="text-[12px] text-ink-500" />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-line pt-3">
          <SmallLabel>Partner slug</SmallLabel>
          <p className="mt-1 font-mono text-[12px] text-ink-600">{partner.slug}</p>
        </div>
      </Panel>
    </div>
  );
}

function formatMoneyHint(holdDays: number | null) {
  return holdDays == null ? "Platform default hold applies" : `${holdDays}-day settlement hold`;
}
