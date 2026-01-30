import type { OnboardingGuideVariant } from "@equiduty/shared";

/** Status of an individual onboarding step */
export type StepStatus = "completed" | "current" | "pending";

/** Data available for auto-detecting step completion */
export interface DetectionContext {
  user: {
    firstName: string | null;
    lastName: string | null;
    systemRole: string | null;
  };
  stableCount: number;
  horseCount: number;
  memberCount: number;
  organizationName?: string;
  hasStableMembership: boolean;
  visitedRoutes: Set<string>;
}

/** Definition of an onboarding section (group of steps) */
export interface OnboardingSection {
  id: string;
  titleKey: string;
  order: number;
  /** Which guide variants this section appears in */
  variants: OnboardingGuideVariant[];
}

/** Definition of an individual onboarding step */
export interface OnboardingStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  sectionId: string;
  /** Route to navigate to when user clicks the action button */
  actionRoute?: string;
  /** i18n key for the action button label */
  actionLabelKey?: string;
  /** Function to auto-detect if step is complete */
  detectCompletion?: (ctx: DetectionContext) => boolean;
  /** Which guide variants this step appears in */
  variants: OnboardingGuideVariant[];
  /** Display order within section */
  order: number;
}
