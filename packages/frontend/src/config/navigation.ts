import {
  CalendarIcon,
  SettingsIcon,
  UsersIcon,
  House as HorseIcon,
  History,
  Settings as Settings2Icon,
  Building2,
  Plug,
  Tractor,
  Shield,
  CreditCard,
  Warehouse,
  ClipboardList,
  Heart,
  Wheat,
  UserCircle,
  BarChart3,
  ListChecks,
  Play,
  CheckSquare,
  LayoutDashboard,
  Calendar,
  Bell,
  User,
} from "lucide-react";
import type {
  NavigationItem,
  OrganizationNavigation,
} from "./navigation.types";

/**
 * Main navigation configuration
 * Organized by user workflow rather than system architecture
 *
 * Structure:
 * - Översikt (Overview) - Today dashboard
 * - Hästar (Horses) - Horse management
 * - Aktiviteter (Activities) - Scheduled events (vet, training, competitions)
 * - Anläggningar (Facilities) - Daily use (stalls, paddocks, arenas)
 * - Uppgifter (Tasks) - Daily chores/shifts execution
 * - Utfodring (Feeding) - Feeding management
 * - Schema (Schedule) - Planning & booking views
 * - Min sida (My Page) - Personal aggregation
 * - Inställningar (Settings) - Unified settings
 */
export const mainNavigation: NavigationItem[] = [
  {
    id: "overview",
    labelKey: "common:navigation.overview",
    href: "/overview",
    icon: LayoutDashboard,
  },
  {
    id: "horses",
    labelKey: "common:navigation.horses",
    href: "/horses",
    icon: HorseIcon,
    subItems: [
      {
        id: "horseList",
        labelKey: "common:navigation.horses",
        href: "/horses",
        icon: HorseIcon,
      },
      {
        id: "locationHistory",
        labelKey: "common:navigation.locationHistory",
        href: "/location-history",
        icon: History,
      },
    ],
  },
  {
    id: "activities",
    labelKey: "common:navigation.activities",
    href: "/activities",
    icon: ClipboardList,
    subItems: [
      {
        id: "today",
        labelKey: "common:navigation.todaysWork",
        href: "/activities",
        icon: Play,
      },
      {
        id: "planning",
        labelKey: "common:navigation.planning",
        href: "/activities/planning",
        icon: CalendarIcon,
      },
      {
        id: "care",
        labelKey: "common:navigation.care",
        href: "/activities/care",
        icon: Heart,
      },
      {
        id: "analytics",
        labelKey: "common:navigation.analytics",
        href: "/activities/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "facilities",
    labelKey: "common:navigation.facilities",
    href: "/facilities",
    icon: Warehouse,
    subItems: [
      {
        id: "stables",
        labelKey: "common:navigation.stables",
        href: "/stables",
        icon: Building2,
      },
      {
        id: "reservations",
        labelKey: "common:navigation.myReservations",
        href: "/facilities/reservations",
        icon: CalendarIcon,
      },
      {
        id: "manage",
        labelKey: "common:navigation.settings",
        href: "/facilities/manage",
        icon: SettingsIcon,
      },
    ],
  },
  {
    id: "tasks",
    labelKey: "common:navigation.tasks",
    href: "/tasks",
    icon: CheckSquare,
    badge: "new",
    subItems: [
      {
        id: "today",
        labelKey: "common:navigation.tasksToday",
        href: "/tasks/today",
        icon: Play,
      },
      {
        id: "upcoming",
        labelKey: "common:navigation.tasksUpcoming",
        href: "/tasks/upcoming",
        icon: Calendar,
      },
      {
        id: "completed",
        labelKey: "common:navigation.tasksCompleted",
        href: "/tasks/completed",
        icon: CheckSquare,
      },
    ],
  },
  {
    id: "feeding",
    labelKey: "common:navigation.feeding",
    href: "/feeding",
    icon: Wheat,
    subItems: [
      {
        id: "today",
        labelKey: "common:navigation.feedingToday",
        href: "/feeding/today",
        icon: Play,
      },
      {
        id: "schedule",
        labelKey: "common:navigation.schedule",
        href: "/feeding/schedule",
        icon: CalendarIcon,
      },
      {
        id: "history",
        labelKey: "common:navigation.feedingHistory",
        href: "/feeding/history",
        icon: History,
      },
      {
        id: "settings",
        labelKey: "common:navigation.settings",
        href: "/feeding/settings",
        icon: Settings2Icon,
        roles: ["admin", "owner"],
      },
    ],
  },
  {
    id: "schedule",
    labelKey: "common:navigation.schedule",
    href: "/schedule",
    icon: CalendarIcon,
    subItems: [
      {
        id: "week",
        labelKey: "common:navigation.scheduleWeek",
        href: "/schedule/week",
        icon: Calendar,
      },
      {
        id: "month",
        labelKey: "common:navigation.scheduleMonth",
        href: "/schedule/month",
        icon: CalendarIcon,
      },
      {
        id: "distribution",
        labelKey: "common:navigation.scheduleDistribution",
        href: "/schedule/distribution",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "myPage",
    labelKey: "common:navigation.myPage",
    href: "/my-page",
    icon: UserCircle,
    subItems: [
      {
        id: "myTasks",
        labelKey: "common:navigation.myTasks",
        href: "/my-page/tasks",
        icon: CheckSquare,
      },
      {
        id: "availability",
        labelKey: "common:navigation.myAvailability",
        href: "/my-page/availability",
        icon: CalendarIcon,
      },
      {
        id: "statistics",
        labelKey: "common:navigation.myStatistics",
        href: "/my-page/statistics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "settings",
    labelKey: "common:navigation.settings",
    href: "/settings",
    icon: SettingsIcon,
    subItems: [
      {
        id: "account",
        labelKey: "common:navigation.myAccount",
        href: "/settings/account",
        icon: User,
      },
      {
        id: "notifications",
        labelKey: "common:navigation.notifications",
        href: "/settings/notifications",
        icon: Bell,
      },
      {
        id: "routines",
        labelKey: "common:navigation.routineTemplates",
        href: "/settings/routines",
        icon: ListChecks,
      },
      {
        id: "activities",
        labelKey: "common:navigation.activitySettings",
        href: "/settings/activities",
        icon: ClipboardList,
      },
    ],
  },
];

/**
 * Create organization navigation based on organization ID
 */
export function createOrganizationNavigation(
  organizationId: string | null,
): OrganizationNavigation | null {
  if (!organizationId) return null;

  return {
    id: "organizationAdmin",
    labelKey: "organizations:menu.settings",
    icon: Building2,
    subItems: [
      {
        id: "members",
        labelKey: "organizations:menu.members",
        href: `/organizations/${organizationId}/users`,
        icon: UsersIcon,
      },
      {
        id: "leaveManagement",
        labelKey: "organizations:menu.leaveManagement",
        href: `/organizations/${organizationId}/leave-management`,
        icon: CalendarIcon,
      },
      {
        id: "scheduleManagement",
        labelKey: "organizations:menu.scheduleManagement",
        href: `/organizations/${organizationId}/schedule-management`,
        icon: ClipboardList,
      },
      {
        id: "integrations",
        labelKey: "organizations:menu.integrations",
        href: `/organizations/${organizationId}/integrations`,
        icon: Plug,
      },
      {
        id: "manure",
        labelKey: "organizations:menu.manure",
        href: `/organizations/${organizationId}/manure`,
        icon: Tractor,
      },
      {
        id: "permissions",
        labelKey: "organizations:menu.permissions",
        href: `/organizations/${organizationId}/permissions`,
        icon: Shield,
      },
      {
        id: "subscription",
        labelKey: "organizations:menu.subscription",
        href: `/organizations/${organizationId}/subscription`,
        icon: CreditCard,
      },
      {
        id: "settings",
        labelKey: "organizations:menu.settings",
        href: `/organizations/${organizationId}/settings`,
        icon: Settings2Icon,
      },
    ],
  };
}

/**
 * Find which navigation item should be expanded based on current path
 */
export function findActiveNavigationItem(
  pathname: string,
  navigation: NavigationItem[],
): string | null {
  for (const item of navigation) {
    if (item.subItems?.some((subItem) => pathname === subItem.href)) {
      return item.id;
    }
    // Also check if path starts with item href (for nested routes)
    if (
      item.subItems?.some((subItem) => pathname.startsWith(subItem.href + "/"))
    ) {
      return item.id;
    }
  }
  return null;
}

/**
 * Check if a navigation item or sub-item is active
 */
export function isItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
