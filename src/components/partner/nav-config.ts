import type { PartnerPermission } from "@/lib/auth/rbac";
import {
  Banknote,
  BarChart3,
  BedDouble,
  Building2,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type PartnerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Required partner capability; the entry is hidden when the acting member lacks it. */
  permission?: PartnerPermission;
  /** Only the exact href activates the entry (used for the overview). */
  exact?: boolean;
};

export type PartnerNavGroup = { title: string; items: PartnerNavItem[] };

export const PARTNER_NAV: PartnerNavGroup[] = [
  {
    title: "Operations",
    items: [
      { href: "/partner", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/partner/properties", label: "Properties", icon: Building2, permission: "property.view" },
      { href: "/partner/reservations", label: "Reservations", icon: CalendarDays, permission: "reservation.view" },
      { href: "/partner/availability", label: "Availability", icon: CalendarClock, permission: "availability.manage" },
      { href: "/partner/guests", label: "Guests", icon: Users, permission: "guest.view" },
      { href: "/partner/messages", label: "Messages", icon: MessageSquare, permission: "message.manage" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/partner/payments", label: "Payments", icon: Wallet, permission: "finance.view" },
      { href: "/partner/settlements", label: "Settlements", icon: Banknote, permission: "finance.view" },
      { href: "/partner/bank-accounts", label: "Bank accounts", icon: Banknote, permission: "settlement.manage" },
      { href: "/partner/reports", label: "Reports", icon: BarChart3, permission: "report.view" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/partner/staff", label: "Staff & permissions", icon: Users, permission: "staff.manage" },
      { href: "/partner/onboarding", label: "Getting started", icon: BedDouble },
      { href: "/partner/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
    ],
  },
];

export const PARTNER_NAV_ITEMS: PartnerNavItem[] = PARTNER_NAV.flatMap((group) => group.items);

export function isPartnerNavActive(pathname: string, item: PartnerNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function visibleNav(permissions: PartnerPermission[]): PartnerNavGroup[] {
  return PARTNER_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0);
}

export function findNavItem(pathname: string): PartnerNavItem | null {
  return PARTNER_NAV_ITEMS.find((item) => isPartnerNavActive(pathname, item)) ?? null;
}
