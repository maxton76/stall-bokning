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
  /** If set, item is only visible when this feature toggle key is enabled (e.g., "rideLessons", "leaveManagement") */
  moduleFlag?: string;
  /** If set, item is only visible when this feature toggle key is enabled (e.g., "invoicing") */
  addonFlag?: string;
  /** If set, item is only visible for this organization type (default: "any") */
  visibleForOrgType?: OrgTypeVisibility;
}

/** Organization type for navigation visibility */
export type OrgTypeVisibility = "personal" | "business" | "any";

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
  /** If set, item is only visible when this feature toggle key is enabled */
  moduleFlag?: string;
  /** If set, item is only visible when this feature toggle key is enabled */
  addonFlag?: string;
  /** If set, item is only visible for this organization type (default: "any") */
  visibleForOrgType?: OrgTypeVisibility;
}

/**
 * Organization navigation configuration (dynamic based on org ID)
 */
export interface OrganizationNavigation {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  subItems: NavigationSubItem[];
  /** If set, item is only visible when this feature toggle key is enabled */
  moduleFlag?: string;
  /** If set, item is only visible when this feature toggle key is enabled */
  addonFlag?: string;
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
