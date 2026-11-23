import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requirePlatformStaff } from "@/lib/auth/session";
import { platformPermissionsFor } from "@/lib/auth/rbac";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { default: "Control room", template: "%s · RentOps admin" },
  robots: { index: false, follow: false },
};

/**
 * RentOps staff shell.
 *
 * Every route under this layout is guarded by `requirePlatformStaff`, which is
 * driven by `User.systemRole` alone — the client never supplies authority.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requirePlatformStaff();

  return (
    <AdminShell
      admin={{
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        roleLabel: SYSTEM_ROLE_LABELS[admin.systemRole],
      }}
      permissions={platformPermissionsFor(admin.systemRole)}
    >
      {children}
    </AdminShell>
  );
}
