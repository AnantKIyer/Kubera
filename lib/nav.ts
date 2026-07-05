import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Tags,
  CreditCard,
  Repeat,
  TrendingUp,
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
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/analytics", label: "Analytics", icon: PieChart },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/categories", label: "Categories", icon: Tags },
];
