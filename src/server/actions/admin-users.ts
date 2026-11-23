"use server";

import { revalidatePath } from "next/cache";
import type { SystemRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { PLATFORM_STAFF_ROLES, PLATFORM_ROLE_PERMISSIONS } from "@/lib/auth/rbac";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";

import { auditAction, enumField, requireAdmin, text } from "@/server/actions/admin-context";
import type { AdminActionState } from "@/components/admin/action-state";

const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "DELETED"] as const;
const ROLES = Object.keys(SYSTEM_ROLE_LABELS) as SystemRole[];

/** Suspends or reactivates a customer or staff account. */
export async function setUserAccountStatus(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("user.manage");
  const userId = text(formData, "userId");
  const status = enumField(formData, "status", ACCOUNT_STATUSES, "SUSPENDED");
  const reason = text(formData, "reason");

  if (!userId) return { error: "Missing account reference." };
  if (userId === admin.id) return { error: "You cannot change the status of your own account." };
  if (status === "DELETED") return { error: "Account deletion is not available from the portal." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, status: true, systemRole: true },
  });
  if (!user) return { error: "Account not found." };
  if (PLATFORM_STAFF_ROLES.includes(user.systemRole) && user.systemRole === "SUPER_ADMIN" && admin.systemRole !== "SUPER_ADMIN") {
    return { error: "Only a super administrator can suspend another super administrator." };
  }

  const before = { status: user.status };
  await prisma.user.update({ where: { id: userId }, data: { status } });

  if (status !== "ACTIVE") {
    // Access is revoked immediately by destroying every active session.
    await prisma.session.deleteMany({ where: { userId } });
  }

  await auditAction(admin, {
    action: status === "ACTIVE" ? "USER_REACTIVATED" : "USER_SUSPENDED",
    entityType: "User",
    entityId: userId,
    summary:
      status === "ACTIVE"
        ? `Reactivated ${user.email}${reason ? ` — ${reason}` : ""}`
        : `Suspended ${user.email}${reason ? ` — ${reason}` : ""}`,
    before,
    after: { status, reason: reason || null },
  });

  await notify({
    userId,
    type: "ACCOUNT_STATUS",
    title: status === "ACTIVE" ? "Your account is active again" : "Your account has been suspended",
    body:
      status === "ACTIVE"
        ? "Your RentOps access has been restored. You can sign in again."
        : reason || "Your RentOps access has been suspended. Contact support for more information.",
    channels: ["IN_APP", "EMAIL"],
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: status === "ACTIVE" ? "Account reactivated." : "Account suspended and sessions revoked." };
}

/** Changes a user's platform role. Requires `role.manage` and is always audited. */
export async function changeUserRole(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin("role.manage");
  const userId = text(formData, "userId");
  const role = enumField(formData, "systemRole", ROLES, "CUSTOMER");
  const reason = text(formData, "reason");

  if (!userId) return { error: "Missing account reference." };
  if (userId === admin.id) return { error: "You cannot change your own role." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, systemRole: true, status: true },
  });
  if (!user) return { error: "Account not found." };

  const before = { systemRole: user.systemRole };
  if (before.systemRole === role) return { error: "That is already the account's role." };

  if (admin.systemRole !== "SUPER_ADMIN" && (role === "SUPER_ADMIN" || user.systemRole === "SUPER_ADMIN")) {
    return { error: "Only a super administrator can grant or revoke super administrator access." };
  }

  await prisma.user.update({ where: { id: userId }, data: { systemRole: role } });

  // Removing staff access must also invalidate live sessions.
  if (role === "CUSTOMER" && PLATFORM_STAFF_ROLES.includes(user.systemRole)) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await auditAction(admin, {
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: userId,
    summary: `Changed ${user.email} from ${SYSTEM_ROLE_LABELS[user.systemRole]} to ${SYSTEM_ROLE_LABELS[role]}`,
    before,
    after: { systemRole: role, permissions: PLATFORM_ROLE_PERMISSIONS[role], reason: reason || null },
  });

  await notify({
    userId,
    type: "ACCOUNT_ROLE",
    title: "Your RentOps access level changed",
    body: `Your role is now ${SYSTEM_ROLE_LABELS[role]}.${reason ? ` Reason: ${reason}` : ""}`,
    channels: ["IN_APP", "EMAIL"],
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
  return { success: `Role updated to ${SYSTEM_ROLE_LABELS[role]}.` };
}

