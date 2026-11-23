import type { PartnerMemberRole, SystemRole } from "@prisma/client";

/**
 * Role-based access control.
 *
 * Two independent scopes:
 *  1. Platform scope — driven by User.systemRole (customer + RentOps staff).
 *  2. Partner scope  — driven by PartnerMember.role plus optional per-member
 *     `permissions` overrides. No partner can ever reach another partner's data.
 */

export const PARTNER_PERMISSIONS = [
  "property.view",
  "property.create",
  "property.update",
  "property.submit",
  "property.delete",
  "unit.manage",
  "rate.manage",
  "availability.manage",
  "reservation.view",
  "reservation.manage",
  "reservation.checkin",
  "reservation.cancel",
  "guest.view",
  "message.manage",
  "finance.view",
  "settlement.manage",
  "report.view",
  "staff.manage",
  "settings.manage",
] as const;

export type PartnerPermission = (typeof PARTNER_PERMISSIONS)[number];

export const PARTNER_PERMISSION_GROUPS: { group: string; permissions: PartnerPermission[] }[] = [
  {
    group: "Properties",
    permissions: ["property.view", "property.create", "property.update", "property.submit", "property.delete"],
  },
  {
    group: "Inventory & pricing",
    permissions: ["unit.manage", "rate.manage", "availability.manage"],
  },
  {
    group: "Reservations",
    permissions: ["reservation.view", "reservation.manage", "reservation.checkin", "reservation.cancel", "guest.view"],
  },
  { group: "Communication", permissions: ["message.manage"] },
  { group: "Finance", permissions: ["finance.view", "settlement.manage"] },
  { group: "Account", permissions: ["report.view", "staff.manage", "settings.manage"] },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<PartnerMemberRole, PartnerPermission[]> = {
  OWNER: [...PARTNER_PERMISSIONS],
  MANAGER: [
    "property.view",
    "property.create",
    "property.update",
    "property.submit",
    "unit.manage",
    "rate.manage",
    "availability.manage",
    "reservation.view",
    "reservation.manage",
    "reservation.checkin",
    "reservation.cancel",
    "guest.view",
    "message.manage",
    "report.view",
    "finance.view",
  ],
  FINANCE: [
    "property.view",
    "unit.manage",
    "rate.manage",
    "reservation.view",
    "guest.view",
    "finance.view",
    "settlement.manage",
    "report.view",
  ],
  FRONT_DESK: [
    "property.view",
    "availability.manage",
    "reservation.view",
    "reservation.manage",
    "reservation.checkin",
    "guest.view",
    "message.manage",
  ],
  VIEWER: ["property.view", "reservation.view", "guest.view", "finance.view", "report.view"],
};

export const PLATFORM_PERMISSIONS = [
  "user.view",
  "user.manage",
  "partner.view",
  "partner.verify",
  "property.review",
  "property.manage",
  "booking.view",
  "booking.manage",
  "dispute.manage",
  "refund.manage",
  "finance.view",
  "finance.manage",
  "settlement.manage",
  "support.manage",
  "category.manage",
  "promotion.manage",
  "audit.view",
  "platform.config",
  "role.manage",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const PLATFORM_ROLE_PERMISSIONS: Record<SystemRole, PlatformPermission[]> = {
  CUSTOMER: [],
  REMTOPS_SUPPORT: ["support.manage", "user.view", "booking.view", "partner.view", "property.review"],
  REMTOPS_OPERATIONS: [
    "support.manage",
    "user.view",
    "partner.view",
    "partner.verify",
    "property.review",
    "booking.view",
    "booking.manage",
    "dispute.manage",
    "refund.manage",
    "finance.view",
    "audit.view",
  ],
  REMTOPS_ADMIN: [
    "support.manage",
    "user.view",
    "user.manage",
    "partner.view",
    "partner.verify",
    "property.review",
    "property.manage",
    "booking.view",
    "booking.manage",
    "dispute.manage",
    "refund.manage",
    "finance.view",
    "finance.manage",
    "settlement.manage",
    "category.manage",
    "promotion.manage",
    "audit.view",
  ],
  SUPER_ADMIN: [...PLATFORM_PERMISSIONS],
};

export const PLATFORM_STAFF_ROLES: SystemRole[] = [
  "REMTOPS_SUPPORT",
  "REMTOPS_OPERATIONS",
  "REMTOPS_ADMIN",
  "SUPER_ADMIN",
];

export function platformPermissionsFor(role: SystemRole): PlatformPermission[] {
  return PLATFORM_ROLE_PERMISSIONS[role] ?? [];
}

export function hasPlatformPermission(role: SystemRole, permission: PlatformPermission): boolean {
  return platformPermissionsFor(role).includes(permission);
}

export function resolvePartnerPermissions(
  role: PartnerMemberRole,
  overrides: unknown,
): PartnerPermission[] {
  if (Array.isArray(overrides) && overrides.length > 0) {
    return overrides.filter((permission): permission is PartnerPermission =>
      PARTNER_PERMISSIONS.includes(permission as PartnerPermission),
    );
  }
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

export function partnerPermissionLabels(): Record<PartnerPermission, string> {
  return {
    "property.view": "View properties",
    "property.create": "Create properties",
    "property.update": "Edit property details",
    "property.submit": "Submit properties for approval",
    "property.delete": "Delete properties",
    "unit.manage": "Manage rooms and units",
    "rate.manage": "Manage pricing",
    "availability.manage": "Manage availability calendar",
    "reservation.view": "View reservations",
    "reservation.manage": "Manage reservations",
    "reservation.checkin": "Record check-in / check-out",
    "reservation.cancel": "Cancel reservations",
    "guest.view": "View guest details",
    "message.manage": "Send and reply to messages",
    "finance.view": "View financial records",
    "settlement.manage": "Manage settlement details and payouts",
    "report.view": "View reports",
    "staff.manage": "Invite and manage staff",
    "settings.manage": "Manage account settings",
  };
}
