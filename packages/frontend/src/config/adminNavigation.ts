import {
  LayoutDashboard,
  Building2,
  Layers,
  Users,
  CreditCard,
  Activity,
  HeadsetIcon,
  Lightbulb,
  Package,
} from "lucide-react";

export interface AdminNavigationItem {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

export const adminNavigation: AdminNavigationItem[] = [
  {
    id: "admin-dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    id: "admin-organizations",
    label: "Organizations",
    href: "/admin/organizations",
    icon: Building2,
  },
  {
    id: "admin-tiers",
    label: "Tier Management",
    href: "/admin/tiers",
    icon: Layers,
  },
  {
    id: "admin-users",
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    id: "admin-stripe-products",
    label: "Stripe Products",
    href: "/admin/stripe-products",
    icon: Package,
  },
  {
    id: "admin-payments",
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    id: "admin-system",
    label: "System Health",
    href: "/admin/system",
    icon: Activity,
  },
  {
    id: "admin-support",
    label: "Support",
    href: "/admin/support",
    icon: HeadsetIcon,
  },
  {
    id: "admin-feature-requests",
    label: "Feature Requests",
    href: "/admin/feature-requests",
    icon: Lightbulb,
  },
];
