/**
 * Onboarding State - Stored in users/{userId}/settings/onboarding
 *
 * Tracks user's progress through the setup guide.
 * Guide variant determined by systemRole at initialization.
 *
 * @path users/{userId}/settings/onboarding
 */

/** Guide variant determines which steps are shown */
export type OnboardingGuideVariant = "stable_owner" | "guest";

/** Record of a completed step */
export interface OnboardingStepCompletion {
  completedAt: Date | string;
  /** Optional reference to the resource created (e.g., stableId, horseId) */
  resourceId?: string;
}

/** Persisted onboarding state in Firestore */
export interface OnboardingState {
  /** Which guide variant this user sees */
  guideVariant: OnboardingGuideVariant;

  /** Map of stepId -> completion info */
  completedSteps: Record<string, OnboardingStepCompletion>;

  /** User explicitly dismissed the guide */
  dismissed: boolean;

  /** Guide panel is minimized (not dismissed, just collapsed) */
  minimized: boolean;

  /** When the onboarding was first initialized */
  startedAt: Date | string;

  /** Last update timestamp */
  updatedAt: Date | string;
}

/** Input type for updating onboarding state */
export interface UpdateOnboardingInput {
  /** Mark a step as completed */
  completeStep?: {
    stepId: string;
    resourceId?: string;
  };

  /** Dismiss the guide entirely */
  dismissed?: boolean;

  /** Toggle minimize state */
  minimized?: boolean;
}

/** API response for onboarding state */
export interface OnboardingStateResponse {
  onboarding: OnboardingState;
}
