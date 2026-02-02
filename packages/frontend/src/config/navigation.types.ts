import { LucideIcon } from "lucide-react";
import type { ModuleFlags, SubscriptionAddons } from "@equiduty/shared";

/**
 * Navigation sub-item configuration
 */
export interface NavigationSubItem {
  id: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  badge?: "new" | "beta";
}

/**
 * Navigation item configuration
 */
export interface NavigationItem {
  id: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  subItems?: NavigationSubItem[];
  roles?: string[];
  badge?: "new" | "beta";
  /** If set, item is only visible when this module is enabled */
  moduleFlag?: keyof ModuleFlags;
  /** If set, item is only visible when this addon is enabled */
  addonFlag?: keyof SubscriptionAddons;
}

/**
 * Organization navigation configuration (dynamic based on org ID)
 */
export interface OrganizationNavigation {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  subItems: NavigationSubItem[];
  /** If set, item is only visible when this addon is enabled */
  addonFlag?: keyof SubscriptionAddons;
  /** If set, item is only visible for these roles */
  roles?: string[];
}

/**
 * Navigation section configuration
 */
export interface NavigationSection {
  id: string;
  labelKey: string;
  items: NavigationItem[];
}

/**
 * Complete navigation configuration
 */
export interface NavigationConfig {
  main: NavigationItem[];
  organization?: OrganizationNavigation;
}
