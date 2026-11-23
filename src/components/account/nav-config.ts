import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  Gift,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  ShieldCheck,
  Star,
  User,
  type LucideIcon,
} from "lucide-react";

export type AccountNavItem = {
  href: string;
  label: string;
  /** Shorter label used in the mobile tab bar. */
  short?: string;
  icon: LucideIcon;
  /** Only `/account` matches exactly; every other entry owns its subtree. */
  exact?: boolean;
};

export type AccountNavGroup = { title: string; items: AccountNavItem[] };

export const ACCOUNT_NAV: AccountNavGroup[] = [
  {
    title: "Your stay",
    items: [
      { href: "/account", label: "Overview", short: "Home", icon: LayoutDashboard, exact: true },
      { href: "/account/reservations", label: "Reservations", short: "Trips", icon: CalendarDays },
      { href: "/account/favourites", label: "Favourites", short: "Saved", icon: Heart },
      { href: "/account/inspections", label: "Inspections", short: "Visits", icon: ClipboardCheck },
    ],
  },
  {
    title: "Communication",
    items: [
      { href: "/account/messages", label: "Messages", short: "Inbox", icon: MessageSquare },
      { href: "/account/reviews", label: "Reviews", short: "Reviews", icon: Star },
      { href: "/account/notifications", label: "Notifications", short: "Alerts", icon: Bell },
    ],
  },
  {
    title: "Your account",
    items: [
      { href: "/account/verification", label: "Verification", short: "Verify", icon: ShieldCheck },
      { href: "/account/referrals", label: "Referrals", short: "Refer", icon: Gift },
      { href: "/account/support", label: "Support", short: "Help", icon: LifeBuoy },
      { href: "/account/profile", label: "Profile & settings", short: "Profile", icon: User },
    ],
  },
];

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = ACCOUNT_NAV.flatMap((group) => group.items);

/** Items pinned to the mobile tab bar; everything else lives in the drawer. */
export const MOBILE_TAB_HREFS = [
  "/account",
  "/account/reservations",
  "/account/messages",
  "/account/favourites",
];

export function isNavItemActive(pathname: string, item: AccountNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findActiveNavItem(pathname: string): AccountNavItem | null {
  return ACCOUNT_NAV_ITEMS.find((item) => isNavItemActive(pathname, item)) ?? null;
}
