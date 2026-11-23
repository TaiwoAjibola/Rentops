"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type PartnerMemberRole } from "@prisma/client";

import type { PartnerActionState } from "@/components/partner/action-state";
import type { StaffInviteState } from "@/components/partner/staff-invite-form";
import { isEmail, lower, str } from "@/components/partner/guards";
import { hashToken, requirePartnerPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { inviteToken } from "@/lib/reference";

/**
 * Staff & permissions.
 *
 * Members are the only route into a partner account, so every mutation here is
 * restricted to `staff.manage` and re-checks ownership through the shared
 * guards rather than trusting a row id from the client. Removing a member is a
 * soft delete (`status: REMOVED`) because the membership history — and the
 * audit trail attached to it — must survive.
 */

const ROLES: PartnerMemberRole[] = ["OWNER", "MANAGER", "FINANCE", "FRONT_DESK", "VIEWER"];

/** How long an invitation stays valid. Not a stay-length rule. */
const INVITE_TTL_DAYS = 7;

function revalidateStaff() {
  revalidatePath("/partner/staff");
  revalidatePath("/partner", "layout");
}

export async function inviteStaffMember(
  _state: StaffInviteState,
  formData: FormData,
): Promise<StaffInviteState> {
  const { partner, user } = await requirePartnerPermission("staff.manage");

  const email = lower(formData, "email");
  const role = str(formData, "role") as PartnerMemberRole;
  const jobTitle = str(formData, "jobTitle");
  const message = str(formData, "message");

  if (!isEmail(email)) return { error: "Enter a valid email address for the person you are inviting." };
  if (!ROLES.includes(role)) return { error: "Choose the role this person should have." };
  if (email === user.email.toLowerCase()) return { error: "You are already a member of this account." };

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existingUser) {
    const membership = await prisma.partnerMember.findUnique({
      where: { partnerId_userId: { partnerId: partner.id, userId: existingUser.id } },
      select: { id: true, status: true },
    });
    if (membership && membership.status !== "REMOVED") {
      return { error: "That person is already on your team. Change their role instead." };
    }
  }

  const token = inviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);

  const invitation = await prisma.partnerInvitation.create({
    data: {
      partnerId: partner.id,
      email,
      role,
      tokenHash: hashToken(token),
      invitedById: user.id,
      message: message || null,
      status: "INVITED",
      expiresAt,
    },
  });

  if (existingUser) {
    await notify({
      userId: existingUser.id,
      type: "GENERAL",
      title: `${partner.businessName} invited you to their RentOps team`,
      body: `You have been invited as ${role.toLowerCase().replace(/_/g, " ")}. Accept the invitation from your sign-in page using the token your team sent you.`,
      channels: ["IN_APP", "EMAIL"],
      data: { partnerId: partner.id, invitationId: invitation.id },
    });
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_MEMBER_INVITED",
    entityType: "PartnerInvitation",
    entityId: invitation.id,
    summary: `Invited ${email} as ${role.toLowerCase().replace(/_/g, " ")}`,
    after: { email, role, jobTitle: jobTitle || null },
  });

  revalidateStaff();
  return {
    success: `Invitation created for ${email}. Copy the token below and send it to them — it is shown once and expires in ${INVITE_TTL_DAYS} days.`,
    inviteToken: token,
  };
}

export async function updateStaffMemberRole(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("staff.manage");

  const memberId = str(formData, "memberId");
  const role = str(formData, "role") as PartnerMemberRole;
  if (!ROLES.includes(role)) return { error: "Choose a valid role." };

  const member = await prisma.partnerMember.findFirst({
    where: { id: memberId, partnerId: partner.id },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  if (!member) return { error: "That person is not on this team." };

  if (member.userId === user.id && member.role === "OWNER" && role !== "OWNER") {
    return { error: "You cannot remove your own owner access. Ask another owner to do it." };
  }

  if (member.role === "OWNER" && role !== "OWNER") {
    const otherOwners = await prisma.partnerMember.count({
      where: { partnerId: partner.id, role: "OWNER", status: "ACTIVE", id: { not: member.id } },
    });
    if (otherOwners === 0) {
      return { error: "This account must keep at least one owner." };
    }
  }

  const jobTitle = str(formData, "jobTitle");
  await prisma.partnerMember.update({
    where: { id: member.id },
    data: { role, jobTitle: jobTitle || member.jobTitle },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_MEMBER_ROLE_CHANGED",
    entityType: "PartnerMember",
    entityId: member.id,
    summary: `${member.user.email} changed from ${member.role.toLowerCase()} to ${role.toLowerCase().replace(/_/g, " ")}`,
    before: { role: member.role },
    after: { role },
  });

  revalidateStaff();
  return { success: `${member.user.firstName} is now ${role.toLowerCase().replace(/_/g, " ")}.` };
}

export async function removeStaffMember(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("staff.manage");

  const memberId = str(formData, "memberId");
  const member = await prisma.partnerMember.findFirst({
    where: { id: memberId, partnerId: partner.id },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  if (!member) return { error: "That person is not on this team." };
  if (member.userId === user.id) return { error: "You cannot remove your own access." };
  if (member.role === "OWNER") {
    const otherOwners = await prisma.partnerMember.count({
      where: { partnerId: partner.id, role: "OWNER", status: "ACTIVE", id: { not: member.id } },
    });
    if (otherOwners === 0) return { error: "This account must keep at least one owner." };
  }

  await prisma.partnerMember.update({ where: { id: member.id }, data: { status: "REMOVED" } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_MEMBER_REMOVED",
    entityType: "PartnerMember",
    entityId: member.id,
    summary: `${member.user.email} removed from ${partner.businessName}`,
  });

  revalidateStaff();
  return { success: `${member.user.firstName} no longer has access to this account.` };
}

export async function revokeStaffInvitation(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("staff.manage");

  const invitationId = str(formData, "invitationId");
  const invitation = await prisma.partnerInvitation.findFirst({
    where: { id: invitationId, partnerId: partner.id },
  });
  if (!invitation) return { error: "That invitation is not on this account." };
  if (invitation.acceptedAt) return { error: "That invitation was already accepted. Change the member's role instead." };

  await prisma.partnerInvitation.update({
    where: { id: invitation.id },
    data: { status: "REMOVED", expiresAt: new Date() },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_INVITATION_REVOKED",
    entityType: "PartnerInvitation",
    entityId: invitation.id,
    summary: `Invitation for ${invitation.email} revoked`,
  });

  revalidateStaff();
  return { success: `Invitation for ${invitation.email} revoked.` };
}


export async function updateStaffMemberPermissions(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("staff.manage");

  const memberId = str(formData, "memberId");
  const member = await prisma.partnerMember.findFirst({
    where: { id: memberId, partnerId: partner.id },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  if (!member) return { error: "That person is not on this team." };
  if (member.role === "OWNER") {
    return { error: "Owners always have full access. Change role if you need to limit access." };
  }

  const mode = str(formData, "permissionsMode");
  let permissions: string[] | null = null;
  if (mode === "custom") {
    const selected = formData.getAll("permissions").map((v) => String(v));
    const allowed = new Set(["property.view","property.create","property.update","property.submit","property.delete","unit.manage","rate.manage","availability.manage","reservation.view","reservation.manage","reservation.checkin","reservation.cancel","guest.view","message.manage","finance.view","settlement.manage","report.view","staff.manage","settings.manage"]);
    permissions = selected.filter((p) => allowed.has(p));
    if (permissions.length === 0) return { error: "Select at least one permission, or use the role defaults." };
  }

  await prisma.partnerMember.update({ where: { id: member.id }, data: { permissions: permissions === null ? Prisma.DbNull : permissions } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_MEMBER_PERMISSIONS_UPDATED",
    entityType: "PartnerMember",
    entityId: member.id,
    summary: permissions ? `Custom permissions set for ${member.user.email}` : `Permissions reset to role defaults for ${member.user.email}`,
    after: { permissions: permissions ?? "ROLE_DEFAULTS" },
  });

  revalidateStaff();
  return { success: permissions ? `Custom permissions saved for ${member.user.firstName}.` : `${member.user.firstName} now uses default permissions for their role.` };
}

