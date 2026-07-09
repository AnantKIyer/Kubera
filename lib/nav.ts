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
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
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
export const MOBILE_MORE_NAV = [
  NAV_ITEMS[4], // subscriptions
  NAV_ITEMS[5], // investments
  ...NAV_ITEMS.slice(6),
];
