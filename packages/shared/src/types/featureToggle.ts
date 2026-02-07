import { Timestamp } from 'firebase/firestore';

/**
 * Feature toggle for controlling feature availability across all organizations.
 * This provides a global on/off switch that can disable features regardless of subscription tier.
 */
export interface FeatureToggle {
  /** Unique feature key matching ModuleFlags or SubscriptionAddons */
  key: string;

  /** Global enable/disable flag - when false, feature is hidden from all orgs except beta testers */
  enabled: boolean;

  /** Display name for admin UI */
  name: string;

  /** Description explaining what this feature does */
  description: string;

  /** Feature category for organization in admin UI */
  category: 'primary' | 'secondary';

  /** Optional dependency on another feature (e.g., trainerCommission depends on lessons) */
  dependsOn?: string;

  /** Current rollout phase for tracking feature maturity */
  rolloutPhase?: 'internal' | 'beta' | 'general';

  /** Last update timestamp */
  updatedAt?: Timestamp;

  /** Admin user ID who last updated this toggle */
  updatedBy?: string;
}

/**
 * Map of feature keys to their toggle configurations.
 * Stored in Firestore at featureToggles/global document.
 */
export interface FeatureToggleMap {
  [key: string]: FeatureToggle;
}

/**
 * Request body for updating a feature toggle
 */
export interface UpdateFeatureToggleRequest {
  enabled: boolean;
  rolloutPhase?: 'internal' | 'beta' | 'general';
}

/**
 * Request body for checking multiple features at once
 */
export interface CheckFeaturesRequest {
  features: string[];
}

/**
 * Response for feature check endpoint
 */
export interface CheckFeaturesResponse {
  features: {
    [key: string]: {
      enabled: boolean;
      reason: 'global-enabled' | 'beta-access' | 'disabled' | 'no-toggle';
    };
  };
}
