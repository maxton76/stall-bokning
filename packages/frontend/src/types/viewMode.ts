/**
 * View Mode Types for Facility Reservations
 * Supports persona-specific interfaces for different user roles
 */

import type { StableMemberRole } from "@equiduty/shared";

/**
 * Available view modes for facility reservations page
 * Each mode is optimized for a specific user persona
 */
export type ViewMode = "customer" | "manager" | "operations" | "admin";

/**
 * Configuration for a view mode option
 */
export interface ViewModeOption {
  /** Unique identifier for the view mode */
  mode: ViewMode;
  /** Display label for the view mode */
  label: string;
  /** Icon component for the view mode */
  icon: React.ComponentType<{ className?: string }>;
  /** Description of what the view mode provides */
  description: string;
  /** Required roles to access this view mode */
  requiredRoles?: StableMemberRole[];
  /** Whether this view is the default for certain roles */
  isDefaultFor?: StableMemberRole[];
}

/**
 * View mode metadata
 */
export interface ViewModeMetadata {
  /** Unique view mode identifier */
  mode: ViewMode;
  /** Human-readable name */
  displayName: string;
  /** Short description */
  description: string;
  /** Target user persona */
  persona:
    | "Horse Owner"
    | "Stable Owner"
    | "Schedule Manager"
    | "Administrator";
  /** Key features of this view */
  features: string[];
}

/**
 * View mode preferences stored in localStorage
 */
export interface ViewModePreferences {
  /** Last selected view mode */
  lastViewMode: ViewMode;
  /** Favorite facilities for quick booking */
  favoriteFacilities?: string[];
  /** Last used facility ID */
  lastUsedFacilityId?: string;
  /** Preferred time slot for bookings */
  preferredTimeSlot?: {
    startTime: string;
    duration: number; // minutes
  };
  /** Whether to show holiday backgrounds */
  showHolidays?: boolean;
  /** Analytics dashboard preferences */
  analytics?: {
    defaultGroupBy?: "day" | "week" | "month";
    defaultDateRange?: number; // days
  };
}
