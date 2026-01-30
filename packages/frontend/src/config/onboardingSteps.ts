import type { OnboardingSection, OnboardingStep } from "@/types/onboarding";

/**
 * Onboarding sections - groups of related steps
 */
export const onboardingSections: OnboardingSection[] = [
  {
    id: "getting-started",
    titleKey: "onboarding:sections.gettingStarted",
    order: 1,
    variants: ["stable_owner", "guest"],
  },
  {
    id: "setup-stable",
    titleKey: "onboarding:sections.setupStable",
    order: 2,
    variants: ["stable_owner"],
  },
  {
    id: "build-team",
    titleKey: "onboarding:sections.buildTeam",
    order: 3,
    variants: ["stable_owner"],
  },
  {
    id: "explore",
    titleKey: "onboarding:sections.explore",
    order: 2,
    variants: ["guest"],
  },
];

/**
 * Onboarding steps - individual tasks within sections
 */
export const onboardingSteps: OnboardingStep[] = [
  // ── Getting Started (both variants) ──
  {
    id: "complete-profile",
    titleKey: "onboarding:steps.completeProfile.title",
    descriptionKey: "onboarding:steps.completeProfile.description",
    sectionId: "getting-started",
    actionRoute: "/account",
    actionLabelKey: "onboarding:steps.completeProfile.action",
    detectCompletion: (ctx) => Boolean(ctx.user.firstName && ctx.user.lastName),
    variants: ["stable_owner", "guest"],
    order: 1,
  },
  {
    id: "name-organization",
    titleKey: "onboarding:steps.nameOrganization.title",
    descriptionKey: "onboarding:steps.nameOrganization.description",
    sectionId: "getting-started",
    actionRoute: "/organizations",
    actionLabelKey: "onboarding:steps.nameOrganization.action",
    detectCompletion: (ctx) => {
      // Check if organization has been renamed from the default
      if (!ctx.organizationName) return false;
      const defaultPatterns = [
        "Min organisation",
        "My organization",
        "My Organisation",
      ];
      return !defaultPatterns.some(
        (p) => ctx.organizationName?.toLowerCase() === p.toLowerCase(),
      );
    },
    variants: ["stable_owner"],
    order: 2,
  },

  // ── Setup Stable (stable_owner only) ──
  {
    id: "create-stable",
    titleKey: "onboarding:steps.createStable.title",
    descriptionKey: "onboarding:steps.createStable.description",
    sectionId: "setup-stable",
    actionRoute: "/stables",
    actionLabelKey: "onboarding:steps.createStable.action",
    detectCompletion: (ctx) => ctx.stableCount > 0,
    variants: ["stable_owner"],
    order: 1,
  },
  {
    id: "add-horse",
    titleKey: "onboarding:steps.addHorse.title",
    descriptionKey: "onboarding:steps.addHorse.description",
    sectionId: "setup-stable",
    actionRoute: "/horses",
    actionLabelKey: "onboarding:steps.addHorse.action",
    detectCompletion: (ctx) => ctx.horseCount > 0,
    variants: ["stable_owner"],
    order: 2,
  },

  // ── Build Team (stable_owner only) ──
  {
    id: "invite-member",
    titleKey: "onboarding:steps.inviteMember.title",
    descriptionKey: "onboarding:steps.inviteMember.description",
    sectionId: "build-team",
    actionRoute: "/organizations",
    actionLabelKey: "onboarding:steps.inviteMember.action",
    detectCompletion: (ctx) => ctx.memberCount > 1,
    variants: ["stable_owner"],
    order: 1,
  },

  // ── Explore (guest only) ──
  {
    id: "join-stable",
    titleKey: "onboarding:steps.joinStable.title",
    descriptionKey: "onboarding:steps.joinStable.description",
    sectionId: "explore",
    detectCompletion: (ctx) => ctx.hasStableMembership,
    variants: ["guest"],
    order: 1,
  },
  {
    id: "view-horses",
    titleKey: "onboarding:steps.viewHorses.title",
    descriptionKey: "onboarding:steps.viewHorses.description",
    sectionId: "explore",
    actionRoute: "/horses",
    actionLabelKey: "onboarding:steps.viewHorses.action",
    detectCompletion: (ctx) => ctx.visitedRoutes.has("/horses"),
    variants: ["guest"],
    order: 2,
  },
  {
    id: "view-schedule",
    titleKey: "onboarding:steps.viewSchedule.title",
    descriptionKey: "onboarding:steps.viewSchedule.description",
    sectionId: "explore",
    actionRoute: "/schedules",
    actionLabelKey: "onboarding:steps.viewSchedule.action",
    detectCompletion: (ctx) => ctx.visitedRoutes.has("/schedules"),
    variants: ["guest"],
    order: 3,
  },
];

/**
 * Get sections filtered by guide variant
 */
export function getSectionsForVariant(variant: string): OnboardingSection[] {
  return onboardingSections
    .filter((s) => s.variants.includes(variant as any))
    .sort((a, b) => a.order - b.order);
}

/**
 * Get steps filtered by guide variant
 */
export function getStepsForVariant(variant: string): OnboardingStep[] {
  return onboardingSteps
    .filter((s) => s.variants.includes(variant as any))
    .sort((a, b) => a.order - b.order);
}

/**
 * Get steps for a specific section and variant
 */
export function getStepsForSection(
  sectionId: string,
  variant: string,
): OnboardingStep[] {
  return onboardingSteps
    .filter(
      (s) => s.sectionId === sectionId && s.variants.includes(variant as any),
    )
    .sort((a, b) => a.order - b.order);
}
