import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReservationStatus } from "@prisma/client";
import { ShieldAlert } from "lucide-react";

import { requirePlatformStaff } from "@/lib/auth/session";
import { hasPlatformPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { getAuditTrail } from "@/lib/audit";
import { SYSTEM_ROLE_LABELS, VERIFICATION_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";

import { Badge } from "@/components/ui/badge";
import { DataTable, Callout, EmptyState, InfoRow, Stat, TableCell, TableRow } from "@/components/ui/data";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { ActionForm } from "@/components/admin/action-form";
import { changeUserRole, setUserAccountStatus } from "@/server/actions/admin-users";
import { reviewVerificationRecord } from "@/server/actions/admin-verification";
import {
  AccountStatusBadge,
  KeyValue,
  Money,
  PageHeader,
  Panel,
  ReservationStatusBadge,
  SmallLabel,
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

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformStaff("user.view");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      memberships: { include: { partner: { select: { id: true, businessName: true, slug: true } } } },
      verificationRecords: { orderBy: { createdAt: "desc" }, take: 20 },
      savedProperties: {
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { property: { select: { id: true, name: true, slug: true, city: true, coverImageUrl: true } } },
      },
      _count: { select: { reservations: true, savedProperties: true } },
    },
  });

  if (!user) notFound();

  const [spend, recentReservations, audits] = await Promise.all([
    prisma.reservation.aggregate({
      where: { userId: user.id, status: { in: PAID_STATUSES } },
      _sum: { grossAmount: true },
      _count: { _all: true },
    }),
    prisma.reservation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { property: { select: { name: true, city: true } } },
    }),
    getAuditTrail("User", user.id, 15),
  ]);

  const canManageUsers = hasPlatformPermission(admin.systemRole, "user.manage");
  const canManageRoles = hasPlatformPermission(admin.systemRole, "role.manage");
  const canVerify = hasPlatformPermission(admin.systemRole, "partner.verify");
  const isStaff = user.systemRole !== "CUSTOMER";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isStaff ? "RentOps staff" : "Customer"}
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Account" className="lg:col-span-2">
          <div className="flex flex-wrap items-start gap-5">
            <Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={isStaff ? "info" : "neutral"}>{SYSTEM_ROLE_LABELS[user.systemRole]}</Badge>
                <AccountStatusBadge status={user.status} />
                {user.profile ? <VerificationStatusBadge status={user.profile.verificationStatus} /> : null}
                {user.emailVerifiedAt ? <Badge tone="success">Email verified</Badge> : <Badge tone="warning">Email unverified</Badge>}
              </div>
              <KeyValue
                className="mt-4"
                items={[
                  { label: "Full name", value: `${user.firstName} ${user.lastName}` },
                  { label: "Email", value: user.email },
                  { label: "Phone", value: user.phone ?? "Not provided" },
                  { label: "Joined", value: formatDate(user.createdAt) },
                  { label: "Last sign-in", value: user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never" },
                  { label: "Referral code", value: user.referralCode ?? "—" },
                ]}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Activity">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Stat label="Bookings" value={user._count.reservations} hint={`${spend._count._all} paid`} />
            <Stat
              label="Lifetime spend"
              value={<Money value={spend._sum.grossAmount ?? 0} compact />}
              hint="Customer payments across paid stays"
            />
            <Stat label="Saved properties" value={user._count.savedProperties} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {canManageUsers ? (
          <Panel
            title="Account access"
            description="Suspending revokes every live session immediately."
          >
            <ActionForm
              action={setUserAccountStatus}
              hidden={{ userId: user.id, status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }}
              submitVariant={user.status === "ACTIVE" ? "danger" : "primary"}
              submitPendingLabel="Applying…"
              submitLabel={user.status === "ACTIVE" ? "Suspend account" : "Reactivate account"}
            >
              <Field label="Reason shown to the customer" htmlFor="reason">
                <Textarea name="reason" id="reason" placeholder="Explain why access is being changed" />
              </Field>
            </ActionForm>
          </Panel>
        ) : null}

        {canManageRoles ? (
          <Panel title="Platform role" description="Role changes are audit-logged with before/after snapshots.">
            <ActionForm
              action={changeUserRole}
              hidden={{ userId: user.id }}
              submitLabel="Update role"
              submitPendingLabel="Updating…"
            >
              <Field label="Role" htmlFor="systemRole">
                <Select name="systemRole" id="systemRole" defaultValue={user.systemRole}>
                  {(Object.keys(SYSTEM_ROLE_LABELS) as (keyof typeof SYSTEM_ROLE_LABELS)[]).map((role) => (
                    <option key={role} value={role}>
                      {SYSTEM_ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Reason" htmlFor="roleReason">
                <Input name="reason" id="roleReason" placeholder="Why is this access changing?" />
              </Field>
            </ActionForm>
          </Panel>
        ) : (
          <Panel title="Platform role">
            <Callout tone="info">
              Your role does not include <span className="font-mono">role.manage</span>. Contact a super
              administrator to change RentOps access levels.
            </Callout>
          </Panel>
        )}
      </div>

      {user.profile ? (
        <Panel title="Customer profile" description="Identity details captured during onboarding">
          <div className="grid gap-x-8 md:grid-cols-2">
            <dl>
              <InfoRow label="Date of birth" value={user.profile.dateOfBirth ? formatDate(user.profile.dateOfBirth) : "—"} />
              <InfoRow label="Nationality" value={user.profile.nationality ?? "—"} />
              <InfoRow label="ID type" value={user.profile.idType ?? "—"} />
              <InfoRow label="ID number" value={user.profile.idNumber ?? "—"} />
            </dl>
            <dl>
              <InfoRow
                label="Address"
                value={
                  [user.profile.addressLine, user.profile.city, user.profile.state, user.profile.country]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <InfoRow label="Employment" value={user.profile.employmentStatus ?? "—"} />
              <InfoRow label="Employer" value={user.profile.employerName ?? "—"} />
              <InfoRow
                label="Emergency contact"
                value={
                  user.profile.emergencyContactName
                    ? `${user.profile.emergencyContactName} · ${user.profile.emergencyContactPhone ?? ""}`
                    : "—"
                }
              />
            </dl>
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Verification records"
        description="Identity, address and background checks submitted by this account"
        bodyClassName="px-0 py-0"
      >
        {user.verificationRecords.length === 0 ? (
          <EmptyState
            className="m-5"
            icon={<ShieldAlert className="h-5 w-5" />}
            title="No verification records"
            description="Checks requested by this account will be listed here."
          />
        ) : (
          <DataTable headers={["Type", "Status", "Provider", "Charge", "Submitted", "Decision"]}>
            {user.verificationRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium text-ink-900">{VERIFICATION_TYPE_LABELS[record.type]}</TableCell>
                <TableCell>
                  <VerificationStatusBadge status={record.status} />
                </TableCell>
                <TableCell className="text-[13px] text-ink-600">{record.provider ?? "Internal"}</TableCell>
                <TableCell>{record.chargeMinor > 0 ? <Money value={record.chargeMinor} currency={record.currency} /> : "—"}</TableCell>
                <TableCell className="text-[13px] text-ink-500">{formatDate(record.submittedAt)}</TableCell>
                <TableCell>
                  {canVerify && record.status !== "VERIFIED" ? (
                    <ActionForm
                      action={reviewVerificationRecord}
                      hidden={{ recordId: record.id }}
                      className="flex flex-wrap items-center gap-2"
                      showStatus={false}
                      resetOnSuccess
                    >
                      <Select name="decision" defaultValue="VERIFIED" className="h-9 w-36 text-[13px]" aria-label="Decision">
                        <option value="VERIFIED">Approve</option>
                        <option value="IN_REVIEW">Keep in review</option>
                        <option value="REJECTED">Reject</option>
                      </Select>
                      <Input name="notes" placeholder="Note" className="h-9 w-40 text-[13px]" aria-label="Note" />
                      <SubmitCompact />
                    </ActionForm>
                  ) : (
                    <span className="text-[13px] text-ink-500">{record.notes ?? "—"}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent reservations" bodyClassName="px-0 py-0">
          {recentReservations.length === 0 ? (
            <EmptyState className="m-5" title="No reservations" description="This account has not booked yet." />
          ) : (
            <DataTable headers={["Reference", "Property", "Stay", "Status", "Total"]}>
              {recentReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/reservations/${reservation.reference}`} className="hover:text-brand-700">
                      {reservation.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {reservation.property.name}
                    <span className="block text-[12px] text-ink-500">{reservation.property.city}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[13px]">
                    {formatDate(reservation.checkIn, { day: "numeric", month: "short" })} →{" "}
                    {formatDate(reservation.checkOut, { day: "numeric", month: "short" })}
                  </TableCell>
                  <TableCell>
                    <ReservationStatusBadge status={reservation.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    <Money value={reservation.grossAmount} currency={reservation.currency} />
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          )}
        </Panel>

        <Panel title="Saved properties" description={`${user._count.savedProperties} saved in total`}>
          {user.savedProperties.length === 0 ? (
            <EmptyState title="Nothing saved" description="Properties saved by this customer appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {user.savedProperties.map((saved) => (
                <li key={saved.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink-900">{saved.property.name}</p>
                    <p className="text-[12px] text-ink-500">
                      {saved.property.city} · {saved.listName}
                    </p>
                  </div>
                  <Link
                    href={`/admin/properties/${saved.property.id}`}
                    className="shrink-0 text-[13px] font-medium text-brand-700 hover:text-brand-800"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {user.memberships.length > 0 ? (
        <Panel title="Partner memberships" description="Property partners this account belongs to">
          <ul className="divide-y divide-line">
            {user.memberships.map((membership) => (
              <li key={membership.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-ink-900">{membership.partner.businessName}</p>
                  <p className="text-[12px] text-ink-500">
                    {membership.role} · {membership.status}
                  </p>
                </div>
                <Link
                  href={`/admin/partners/${membership.partner.id}`}
                  className="text-[13px] font-medium text-brand-700 hover:text-brand-800"
                >
                  Open partner
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title="Audit history for this account" description="Administrative actions taken against this user">
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
      </Panel>

      <Card>
        <CardBody>
          <SmallLabel>Data handling</SmallLabel>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
            Identity documents are only ever referenced by URL. Access to this record is logged in the audit trail
            whenever an administrative change is made.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

/** Compact submit used inside dense table rows. */
function SubmitCompact() {
  return (
    <button
      type="submit"
      className="inline-flex h-9 items-center rounded-md bg-brand-700 px-3 text-[13px] font-medium text-white transition-colors hover:bg-brand-800"
    >
      Save
    </button>
  );
}
