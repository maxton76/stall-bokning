import type {
  TierDefinition,
  SubscriptionTier,
  SubscriptionLimits,
  ModuleFlags,
  SubscriptionAddons,
} from "../types/admin.js";

/**
 * Default limits for each tier
 * -1 = unlimited
 */
export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    members: 3,
    stables: 1,
    horses: 5,
    routineTemplates: 2,
    routineSchedules: 1,
    feedingPlans: 5,
    facilities: 1,
    contacts: 5,
  },
  standard: {
    members: 15,
    stables: 3,
    horses: 25,
    routineTemplates: 10,
    routineSchedules: 5,
    feedingPlans: 30,
    facilities: 5,
    contacts: 30,
  },
  pro: {
    members: 50,
    stables: 10,
    horses: 75,
    routineTemplates: 50,
    routineSchedules: 25,
    feedingPlans: 100,
    facilities: 20,
    contacts: 100,
  },
  enterprise: {
    members: -1,
    stables: -1,
    horses: -1,
    routineTemplates: -1,
    routineSchedules: -1,
    feedingPlans: -1,
    facilities: -1,
    contacts: -1,
  },
};

/**
 * Default module flags for each tier
 */
export const TIER_MODULES: Record<SubscriptionTier, ModuleFlags> = {
  free: {
    analytics: false,
    selectionProcess: false,
    locationHistory: false,
    photoEvidence: false,
    leaveManagement: false,
    inventory: false,
    lessons: false,
    staffMatrix: false,
    advancedPermissions: false,
    integrations: false,
    manure: false,
    aiAssistant: false,
  },
  standard: {
    analytics: true,
    selectionProcess: true,
    locationHistory: true,
    photoEvidence: true,
    leaveManagement: false,
    inventory: false,
    lessons: false,
    staffMatrix: false,
    advancedPermissions: false,
    integrations: false,
    manure: false,
    aiAssistant: false,
  },
  pro: {
    analytics: true,
    selectionProcess: true,
    locationHistory: true,
    photoEvidence: true,
    leaveManagement: true,
    inventory: true,
    lessons: true,
    staffMatrix: true,
    advancedPermissions: true,
    integrations: true,
    manure: true,
    aiAssistant: true,
  },
  enterprise: {
    analytics: true,
    selectionProcess: true,
    locationHistory: true,
    photoEvidence: true,
    leaveManagement: true,
    inventory: true,
    lessons: true,
    staffMatrix: true,
    advancedPermissions: true,
    integrations: true,
    manure: true,
    aiAssistant: true,
  },
};

/**
 * Default add-on flags for each tier
 * Enterprise gets everything included
 */
export const TIER_ADDONS: Record<SubscriptionTier, SubscriptionAddons> = {
  free: {
    portal: false,
    invoicing: false,
  },
  standard: {
    portal: false,
    invoicing: false,
  },
  pro: {
    portal: false,
    invoicing: false,
  },
  enterprise: {
    portal: true,
    invoicing: true,
  },
};

/**
 * Default tier definitions with pricing
 */
export const DEFAULT_TIER_DEFINITIONS: Record<
  SubscriptionTier,
  TierDefinition
> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Touch & feel — full core product with tight quantity caps",
    price: 0,
    limits: TIER_LIMITS.free,
    modules: TIER_MODULES.free,
    addons: TIER_ADDONS.free,
  },
  standard: {
    tier: "standard",
    name: "Standard",
    description: "Work together — scale up and get visibility",
    price: 299,
    limits: TIER_LIMITS.standard,
    modules: TIER_MODULES.standard,
    addons: TIER_ADDONS.standard,
  },
  pro: {
    tier: "pro",
    name: "Pro",
    description: "Full operations — complete operational toolkit",
    price: 799,
    limits: TIER_LIMITS.pro,
    modules: TIER_MODULES.pro,
    addons: TIER_ADDONS.pro,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "Run a business — everything included with custom deals",
    price: 0,
    limits: TIER_LIMITS.enterprise,
    modules: TIER_MODULES.enterprise,
    addons: TIER_ADDONS.enterprise,
  },
};

/**
 * All subscription tiers in order
 */
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  "free",
  "standard",
  "pro",
  "enterprise",
];

/**
 * Module flag labels (for admin UI display)
 */
export const MODULE_LABELS: Record<keyof ModuleFlags, string> = {
  analytics: "Analytics & Statistics",
  selectionProcess: "Routine Selection Process",
  locationHistory: "Horse Location History",
  photoEvidence: "Photo Evidence in Routines",
  leaveManagement: "Leave Management",
  inventory: "Inventory Management",
  lessons: "Lesson Scheduling",
  staffMatrix: "Staff Matrix",
  advancedPermissions: "Advanced Permissions",
  integrations: "External Integrations",
  manure: "Manure Management",
  aiAssistant: "AI Assistant",
};

/**
 * Limit labels (for admin UI display)
 */
export const LIMIT_LABELS: Record<keyof SubscriptionLimits, string> = {
  members: "Members",
  stables: "Stables",
  horses: "Horses",
  routineTemplates: "Routine Templates",
  routineSchedules: "Routine Schedules",
  feedingPlans: "Feeding Plans",
  facilities: "Facilities",
  contacts: "Contacts",
};

/**
 * Add-on labels (for admin UI display)
 */
export const ADDON_LABELS: Record<keyof SubscriptionAddons, string> = {
  portal: "Client Portal",
  invoicing: "Invoicing & Payments",
};
