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
  ListOrdered,
  Play,
  LayoutDashboard,
  Calendar,
  CalendarClock,
  Bell,
  User,
  Lightbulb,
  GraduationCap,
  BookOpen,
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
 * - Aktiviteter (Activities) - Scheduled events, tasks, routines (unified daily work)
 * - Anläggningar (Facilities) - Daily use (stalls, paddocks, arenas)
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
        id: "horses-list",
        labelKey: "common:navigation.horses",
        href: "/horses",
        icon: HorseIcon,
      },
      {
        id: "horses-locationHistory",
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
        id: "activities-today",
        labelKey: "common:navigation.todaysWork",
        href: "/activities",
        icon: Play,
      },
      {
        id: "activities-planning",
        labelKey: "common:navigation.planning",
        href: "/activities/planning",
        icon: CalendarIcon,
      },
      {
        id: "activities-care",
        labelKey: "common:navigation.care",
        href: "/activities/care",
        icon: Heart,
      },
      {
        id: "activities-analytics",
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
        id: "facilities-stables",
        labelKey: "common:navigation.stables",
        href: "/stables",
        icon: Building2,
      },
      {
        id: "facilities-reservations",
        labelKey: "common:navigation.myReservations",
        href: "/facilities/reservations",
        icon: CalendarIcon,
      },
      {
        id: "facilities-manage",
        labelKey: "common:navigation.settings",
        href: "/facilities/manage",
        icon: SettingsIcon,
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
        id: "feeding-today",
        labelKey: "common:navigation.feedingToday",
        href: "/feeding/today",
        icon: Play,
      },
      {
        id: "feeding-schedule",
        labelKey: "common:navigation.schedule",
        href: "/feeding/schedule",
        icon: CalendarIcon,
      },
      {
        id: "feeding-history",
        labelKey: "common:navigation.feedingHistory",
        href: "/feeding/history",
        icon: History,
      },
      {
        id: "feeding-settings",
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
        id: "schedule-week",
        labelKey: "common:navigation.scheduleWeek",
        href: "/schedule/week",
        icon: Calendar,
      },
      {
        id: "schedule-month",
        labelKey: "common:navigation.scheduleMonth",
        href: "/schedule/month",
        icon: CalendarIcon,
      },
      {
        id: "schedule-distribution",
        labelKey: "common:navigation.scheduleDistribution",
        href: "/schedule/distribution",
        icon: BarChart3,
      },
      {
        id: "schedule-routines",
        labelKey: "common:navigation.routineSchedules",
        href: "/schedule/routines",
        icon: CalendarClock,
        roles: ["admin", "owner"],
      },
      {
        id: "schedule-routinetemplates",
        labelKey: "common:navigation.routineTemplates",
        href: "/schedule/routinetemplates",
        icon: ListChecks,
        roles: ["admin", "owner"],
      },
      {
        id: "schedule-selection",
        labelKey: "common:navigation.routineSelection",
        href: "/schedule/selection",
        icon: ListOrdered,
      },
    ],
  },
  {
    id: "lessons",
    labelKey: "common:navigation.lessons",
    href: "/lessons",
    icon: GraduationCap,
    moduleFlag: "lessons",
    subItems: [
      {
        id: "lessons-calendar",
        labelKey: "common:navigation.lessonsCalendar",
        href: "/lessons/calendar",
        icon: CalendarIcon,
      },
      {
        id: "lessons-my-bookings",
        labelKey: "common:navigation.lessonsMyBookings",
        href: "/lessons/my-bookings",
        icon: BookOpen,
      },
      {
        id: "lessons-manage",
        labelKey: "common:navigation.lessonsManage",
        href: "/lessons/manage",
        icon: Settings2Icon,
        roles: ["trainer", "administrator"],
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
        id: "myPage-availability",
        labelKey: "common:navigation.myAvailability",
        href: "/my-page/availability",
        icon: CalendarIcon,
      },
      {
        id: "myPage-statistics",
        labelKey: "common:navigation.myStatistics",
        href: "/my-page/statistics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "featureRequests",
    labelKey: "common:navigation.featureRequests",
    href: "/feature-requests",
    icon: Lightbulb,
  },
  {
    id: "settings",
    labelKey: "common:navigation.settings",
    href: "/settings",
    icon: SettingsIcon,
    subItems: [
      {
        id: "settings-account",
        labelKey: "common:navigation.myAccount",
        href: "/settings/account",
        icon: User,
      },
      {
        id: "settings-notifications",
        labelKey: "common:navigation.notifications",
        href: "/settings/notifications",
        icon: Bell,
      },
      {
        id: "settings-activities",
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
        id: "org-members",
        labelKey: "organizations:menu.members",
        href: `/organizations/${organizationId}/users`,
        icon: UsersIcon,
      },
      {
        id: "org-leaveManagement",
        labelKey: "organizations:menu.leaveManagement",
        href: `/organizations/${organizationId}/leave-management`,
        icon: CalendarIcon,
      },
      {
        id: "org-scheduleManagement",
        labelKey: "organizations:menu.scheduleManagement",
        href: `/organizations/${organizationId}/schedule-management`,
        icon: ClipboardList,
      },
      {
        id: "org-integrations",
        labelKey: "organizations:menu.integrations",
        href: `/organizations/${organizationId}/integrations`,
        icon: Plug,
      },
      {
        id: "org-manure",
        labelKey: "organizations:menu.manure",
        href: `/organizations/${organizationId}/manure`,
        icon: Tractor,
      },
      {
        id: "org-permissions",
        labelKey: "organizations:menu.permissions",
        href: `/organizations/${organizationId}/permissions`,
        icon: Shield,
      },
      {
        id: "org-subscription",
        labelKey: "organizations:menu.subscription",
        href: `/organizations/${organizationId}/subscription`,
        icon: CreditCard,
      },
      {
        id: "org-settings",
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
