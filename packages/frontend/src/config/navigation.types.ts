import { LucideIcon } from "lucide-react";

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
}

/**
 * Organization navigation configuration (dynamic based on org ID)
 */
export interface OrganizationNavigation {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  subItems: NavigationSubItem[];
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
