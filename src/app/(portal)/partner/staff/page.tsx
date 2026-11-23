import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { ActionForm } from "@/components/partner/action-form";
import { StaffInviteForm } from "@/components/partner/staff-invite-form";
import { Badge } from "@/components/ui/badge";
import { Callout, EmptyState } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import {
  inviteStaffMember,
  removeStaffMember,
  revokeStaffInvitation,
  updateStaffMemberPermissions,
  updateStaffMemberRole,
} from "@/server/actions/partner-staff";
import { StaffPermissionsForm } from "@/components/partner/staff-permissions-form";
import {
  PARTNER_ROLE_DESCRIPTIONS,
  PARTNER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
} from "@/lib/constants";
import { PARTNER_PERMISSION_GROUPS } from "@/lib/auth/rbac";

const ROLES = ["OWNER", "MANAGER", "FINANCE", "FRONT_DESK", "VIEWER"] as const;

export default async function StaffPage() {
  const { partner, can, user } = await requirePartnerContext();

  if (!can("staff.manage")) {
    return (
      <div className="space-y-6">
        <SectionHeading eyebrow="Account" title="Staff & permissions" />
        <Callout tone="warning" title="Not available to your role">
          Inviting staff and changing roles requires the <strong>staff.manage</strong> permission.
        </Callout>
      </div>
    );
  }

  const [members, invitations] = await Promise.all([
    prisma.partnerMember.findMany({
      where: { partnerId: partner.id, status: { not: "REMOVED" } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.partnerInvitation.findMany({
      where: { partnerId: partner.id, status: "INVITED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Account"
        title="Staff & permissions"
        description="Add as many people as you need, assign the right role, and control who can manage properties, reservations, pricing, and payouts."
      />

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Invite a team member</h2>
        <p className="mt-1 text-sm text-ink-600">
          Owners can act as property managers themselves or delegate access to others (property managers, front desk, finance) with role-based permissions.
        </p>
        <div className="mt-4">
          <StaffInviteForm action={inviteStaffMember} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink-900">Team members</h2>
        {members.length === 0 ? (
          <EmptyState title="No staff yet" description="Invite a colleague to help manage properties." />
        ) : (
          members.map((member) => (
            <div key={member.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">
                    {member.user.firstName} {member.user.lastName}
                    {member.user.id === user.id ? <span className="ml-2 text-xs text-ink-400">(you)</span> : null}
                  </p>
                  <p className="text-sm text-ink-600">{member.user.email}</p>
                  {member.jobTitle ? <p className="text-xs text-ink-500">{member.jobTitle}</p> : null}
                </div>
                <Badge tone={member.status === "ACTIVE" ? "success" : "warning"}>
                  {MEMBER_STATUS_LABELS[member.status]}
                </Badge>
                <Badge tone="info">{PARTNER_ROLE_LABELS[member.role]}</Badge>
              </div>

              <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                <ActionForm action={updateStaffMemberRole} hidden={{ memberId: member.id }} submitLabel="Update role" submitVariant="outline" submitSize="sm" className="grid gap-2">
                  <Field label="Role" htmlFor={`role-${member.id}`}>
                    <Select id={`role-${member.id}`} name="role" defaultValue={member.role}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>{PARTNER_ROLE_LABELS[role]}</option>
                      ))}
                    </Select>
                  </Field>
                </ActionForm>
                <ActionForm
                  action={removeStaffMember}
                  hidden={{ memberId: member.id }}
                  submitLabel="Remove access"
                  submitVariant="danger"
                  submitSize="sm"
                  submitDisabled={member.user.id === user.id}
                  className="flex items-end"
                >
                  {member.user.id === user.id ? <p className="text-[13px] text-ink-500">You cannot remove your own access.</p> : null}
                </ActionForm>
              </div>
              {member.role !== "OWNER" ? (
                <StaffPermissionsForm
                  memberId={member.id}
                  role={member.role}
                  overrides={member.permissions}
                  action={updateStaffMemberPermissions}
                />
              ) : (
                <p className="mt-3 text-[13px] text-ink-500">Owners have full access to all capabilities (including acting as property manager) and can delegate by inviting others with scoped roles/permissions.</p>
              )}
            </div>
          ))
        )}
      </section>

      {invitations.length > 0 ? (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Pending invitations</h2>
          <div className="mt-3 space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-wrap items-center gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <span className="flex-1 text-sm text-ink-800">{invitation.email}</span>
                <Badge tone="neutral">{PARTNER_ROLE_LABELS[invitation.role]}</Badge>
                <span className="text-xs text-ink-400">expires {invitation.expiresAt.toLocaleDateString("en-GB")}</span>
                <ActionForm action={revokeStaffInvitation} hidden={{ invitationId: invitation.id }} submitLabel="Revoke" submitVariant="ghost" submitSize="sm" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Roles, permissions & examples</h2>
        <p className="mt-2 text-sm text-ink-600">
          Assign roles based on responsibility. For example: <strong>Owner</strong> (full control, can delegate), <strong>Property Manager</strong>/Manager (runs listings, units, pricing, reservations), <strong>Front desk</strong> (check-ins, availability, guest messages), <strong>Finance</strong> (payouts, settlements, reports), <strong>Viewer</strong> (read-only oversight).
        </p>
        <dl className="mt-4 space-y-3">
          {Object.entries(PARTNER_ROLE_DESCRIPTIONS).map(([role, description]) => (
            <div key={role}>
              <dt className="text-sm font-semibold text-ink-900">
                {PARTNER_ROLE_LABELS[role as keyof typeof PARTNER_ROLE_LABELS]}
              </dt>
              <dd className="text-sm text-ink-600">{description}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 space-y-3 border-t border-line pt-4">
          {PARTNER_PERMISSION_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="text-[13px] font-semibold text-ink-800">{group.group}</p>
              <p className="text-[13px] text-ink-500">{group.permissions.join(", ")}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
