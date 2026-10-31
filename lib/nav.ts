import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Tags,
  CreditCard,
  Repeat,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Single-word label for the phone tab bar, where five tabs share ~58px each. */
  shortLabel?: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", shortLabel: "Activity", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/analytics", label: "Analytics", icon: PieChart },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/categories", label: "Categories", icon: Tags },
];

/** Primary tabs shown in the mobile bottom bar. */
export const MOBILE_PRIMARY_NAV = NAV_ITEMS.slice(0, 4);

/** Secondary routes opened from the mobile “More” menu. */
export const MOBILE_MORE_NAV = NAV_ITEMS.slice(4);

export function isNavActive(pathname: string, href: string) {
  if (href === "/accounts") {
    return pathname.startsWith("/accounts") || pathname.startsWith("/emis");
  }
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
