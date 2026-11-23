import {
  BadgeCheck,
  Banknote,
  CalendarCheck,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  Percent,
  Receipt,
  ScrollText,
  ShieldCheck,
  Tags,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Admin navigation.
 *
 * Entries are gated by `PlatformPermission` strings so the acting staff member
 * only ever sees what `User.systemRole` actually grants. Visibility here is a
 * convenience — every page and every server action re-checks authority
 * server-side.
 */

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Required platform permission; hidden when the acting role lacks it. */
  permission?: string;
  /** Only the exact href activates the entry. */
  exact?: boolean;
};

export type AdminNavGroup = { title: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: "Command centre",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/verification", label: "Verification queue", icon: ShieldCheck, permission: "partner.verify" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/users", label: "Customers & staff", icon: Users, permission: "user.view" },
      { href: "/admin/partners", label: "Property partners", icon: BadgeCheck, permission: "partner.view" },
    ],
  },
  {
    title: "Supply",
    items: [{ href: "/admin/properties", label: "Property review", icon: Receipt, permission: "property.review" }],
  },
  {
    title: "Bookings",
    items: [
      { href: "/admin/reservations", label: "Reservations", icon: CalendarCheck, permission: "booking.view" },
      { href: "/admin/reviews", label: "Review moderation", icon: Tags, permission: "property.review" },
      { href: "/admin/disputes", label: "Disputes", icon: LifeBuoy, permission: "dispute.manage" },
      { href: "/admin/refunds", label: "Refunds", icon: Wallet, permission: "refund.manage" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/admin/payments", label: "Payments", icon: CreditCard, permission: "finance.view" },
      { href: "/admin/settlements", label: "Settlements", icon: Banknote, permission: "settlement.manage" },
      { href: "/admin/finance", label: "Commission & fees", icon: Percent, permission: "finance.manage" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { href: "/admin/promotions", label: "Promotions", icon: Percent, permission: "promotion.manage" },
      { href: "/admin/categories", label: "Categories & locations", icon: Tags, permission: "category.manage" },
      { href: "/admin/support", label: "Support desk", icon: Headphones, permission: "support.manage" },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/due-diligence", label: "Due diligence", icon: ShieldCheck, permission: "platform.config" },
      { href: "/admin/audit", label: "Audit trail", icon: ScrollText, permission: "audit.view" },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items);

export function isAdminNavActive(pathname: string, item: AdminNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function visibleAdminNav(permissions: readonly string[]): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0);
}
