import type {
  TierDefinition,
  SubscriptionLimits,
  ModuleFlags,
  SubscriptionAddons,
} from "../types/admin.js";
import type { BillingInterval } from "../types/subscription.js";

/**
 * Default limits for each tier
 * -1 = unlimited
 * @deprecated Use `DEFAULT_TIER_DEFINITIONS[tier].limits` or fetch from Firestore via `getTierDefaults()`.
 */
export const TIER_LIMITS: Record<string, SubscriptionLimits> = {
  free: {
    members: 3,
    stables: 1,
    horses: 5,
    routineTemplates: 2,
    routineSchedules: 1,
    feedingPlans: 5,
    facilities: 1,
    contacts: 5,
    supportContacts: 0,
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
    supportContacts: 0,
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
    supportContacts: 2,
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
    supportContacts: -1,
  },
};

/**
 * Default module flags for each tier
 * @deprecated Use `DEFAULT_TIER_DEFINITIONS[tier].modules` or fetch from Firestore via `getTierDefaults()`.
 */
export const TIER_MODULES: Record<string, ModuleFlags> = {
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
    supportAccess: false,
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
    supportAccess: false,
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
    supportAccess: true,
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
    supportAccess: true,
  },
};

/**
 * Default add-on flags for each tier
 * Enterprise gets everything included
 * @deprecated Use `DEFAULT_TIER_DEFINITIONS[tier].addons` or fetch from Firestore via `getTierDefaults()`.
 */
export const TIER_ADDONS: Record<string, SubscriptionAddons> = {
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
 * Default tier definitions with pricing.
 * Keyed by `string` to support dynamic tiers; built-in keys are "free", "standard", "pro", "enterprise".
 */
export const DEFAULT_TIER_DEFINITIONS: Record<string, TierDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Touch & feel — full core product with tight quantity caps",
    price: 0,
    limits: TIER_LIMITS.free,
    modules: TIER_MODULES.free,
    addons: TIER_ADDONS.free,
    enabled: true,
    isBillable: false,
    isDefault: true,
    sortOrder: 0,
    visibility: "public",
    features: [
      "subscription.features.members_3",
      "subscription.features.stables_1",
      "subscription.features.horses_5",
      "subscription.features.basicScheduling",
    ],
    popular: false,
  },
  standard: {
    tier: "standard",
    name: "Standard",
    description: "Work together — scale up and get visibility",
    price: 299,
    limits: TIER_LIMITS.standard,
    modules: TIER_MODULES.standard,
    addons: TIER_ADDONS.standard,
    enabled: true,
    isBillable: true,
    sortOrder: 1,
    visibility: "public",
    features: [
      "subscription.features.members_15",
      "subscription.features.stables_3",
      "subscription.features.horses_25",
      "subscription.features.analytics",
      "subscription.features.selectionProcess",
      "subscription.features.locationHistory",
      "subscription.features.photoEvidence",
    ],
    popular: true,
  },
  pro: {
    tier: "pro",
    name: "Pro",
    description: "Full operations — complete operational toolkit",
    price: 799,
    limits: TIER_LIMITS.pro,
    modules: TIER_MODULES.pro,
    addons: TIER_ADDONS.pro,
    enabled: true,
    isBillable: true,
    sortOrder: 2,
    visibility: "public",
    features: [
      "subscription.features.members_50",
      "subscription.features.stables_10",
      "subscription.features.horses_75",
      "subscription.features.allStandardFeatures",
      "subscription.features.leaveManagement",
      "subscription.features.inventory",
      "subscription.features.lessons",
      "subscription.features.staffMatrix",
      "subscription.features.integrations",
      "subscription.features.aiAssistant",
    ],
    popular: false,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "Run a business — everything included with custom deals",
    price: 0,
    limits: TIER_LIMITS.enterprise,
    modules: TIER_MODULES.enterprise,
    addons: TIER_ADDONS.enterprise,
    enabled: true,
    isBillable: false,
    sortOrder: 3,
    visibility: "public",
    features: [
      "subscription.features.unlimitedEverything",
      "subscription.features.allProFeatures",
      "subscription.features.portal",
      "subscription.features.invoicing",
      "subscription.features.dedicatedSupport",
      "subscription.features.customIntegrations",
    ],
    popular: false,
  },
};

/**
 * Tier pricing in ore (smallest currency unit for SEK).
 * 29900 = 299 SEK, 79900 = 799 SEK.
 * @deprecated Pricing should be fetched from Stripe product mappings in Firestore.
 */
export const TIER_PRICING: Record<string, Record<BillingInterval, number>> = {
  standard: {
    month: 29900, // 299 SEK/month
    year: 298800, // 2988 SEK/year (~249 SEK/month, ~17% discount)
  },
  pro: {
    month: 79900, // 799 SEK/month
    year: 796800, // 7968 SEK/year (~664 SEK/month, ~17% discount)
  },
};

/** Annual discount percentage (approximately 2 months free) */
export const ANNUAL_DISCOUNT_PERCENT = 17;

/** Trial duration in days for first-time subscribers */
export const TRIAL_DAYS = 14;

/**
 * Built-in subscription tiers in display order.
 * Custom tiers created via admin are not included here — fetch from API/Firestore.
 */
export const SUBSCRIPTION_TIERS: string[] = [
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
  supportAccess: "Support Ticket Access",
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
  supportContacts: "Support Contacts",
};

/**
 * Add-on labels (for admin UI display)
 */
export const ADDON_LABELS: Record<keyof SubscriptionAddons, string> = {
  portal: "Client Portal",
  invoicing: "Invoicing & Payments",
};

/**
 * Returns the built-in default tier definition (the one with isDefault: true).
 * Used as the fallback when no tier data is available.
 */
export function getDefaultTierDefinition(): TierDefinition {
  const def = Object.values(DEFAULT_TIER_DEFINITIONS).find((t) => t.isDefault);
  return (
    def ?? (DEFAULT_TIER_DEFINITIONS[SUBSCRIPTION_TIERS[0]] as TierDefinition)
  );
}
