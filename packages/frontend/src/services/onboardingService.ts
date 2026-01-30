/**
 * Onboarding Service
 *
 * API service for managing onboarding guide state.
 */

import { apiClient } from "@/lib/apiClient";
import type {
  OnboardingState,
  UpdateOnboardingInput,
  OnboardingStateResponse,
} from "@equiduty/shared";

/**
 * Get onboarding state (auto-initializes if not exists)
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const response = await apiClient.get<OnboardingStateResponse>(
    "/settings/onboarding",
  );
  return response.onboarding;
}

/**
 * Update onboarding state
 */
export async function updateOnboardingState(
  updates: UpdateOnboardingInput,
): Promise<OnboardingState> {
  const response = await apiClient.patch<OnboardingStateResponse>(
    "/settings/onboarding",
    updates,
  );
  return response.onboarding;
}

/**
 * Complete an onboarding step
 */
export async function completeOnboardingStep(
  stepId: string,
  resourceId?: string,
): Promise<OnboardingState> {
  return updateOnboardingState({
    completeStep: { stepId, resourceId },
  });
}

/**
 * Dismiss the onboarding guide
 */
export async function dismissOnboarding(): Promise<OnboardingState> {
  return updateOnboardingState({ dismissed: true });
}

/**
 * Reopen the onboarding guide after dismissal
 */
export async function reopenOnboarding(): Promise<OnboardingState> {
  return updateOnboardingState({ dismissed: false });
}

/**
 * Toggle minimize state
 */
export async function toggleOnboardingMinimize(
  minimized: boolean,
): Promise<OnboardingState> {
  return updateOnboardingState({ minimized });
}
