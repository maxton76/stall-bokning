import type { OnboardingSection, OnboardingStep } from "@/types/onboarding";

/**
 * Onboarding sections - groups of related steps
 */
export const onboardingSections: OnboardingSection[] = [
  // ── Shared section ──
  {
    id: "getting-started",
    titleKey: "onboarding:sections.gettingStarted",
    order: 1,
    variants: ["stable_owner", "guest"],
  },

  // ── stable_owner sections ──
  {
    id: "stable-team",
    titleKey: "onboarding:sections.stableTeam",
    order: 2,
    variants: ["stable_owner"],
  },
  {
    id: "horses-activities",
    titleKey: "onboarding:sections.horsesActivities",
    order: 3,
    variants: ["stable_owner"],
  },
  {
    id: "feeding",
    titleKey: "onboarding:sections.feeding",
    order: 4,
    variants: ["stable_owner"],
  },
  {
    id: "routines",
    titleKey: "onboarding:sections.routines",
    order: 5,
    variants: ["stable_owner"],
  },

  // ── Guest section ──
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
  // ══════════════════════════════════════════════════════════════════════════
  // Section 1: Kom igång / Getting Started (stable_owner + guest)
  // ══════════════════════════════════════════════════════════════════════════
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
    id: "org-settings",
    titleKey: "onboarding:steps.orgSettings.title",
    descriptionKey: "onboarding:steps.orgSettings.description",
    sectionId: "getting-started",
    actionRoute: "/organizations",
    actionLabelKey: "onboarding:steps.orgSettings.action",
    detectCompletion: (ctx) => {
      // Check if organization has been renamed from the default OR contactType is set
      if (ctx.organizationContactType) return true;
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

  // ══════════════════════════════════════════════════════════════════════════
  // Section 2: Stall & Team (stable_owner only)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "stable-choice",
    titleKey: "onboarding:steps.stableChoice.title",
    descriptionKey: "onboarding:steps.stableChoice.description",
    sectionId: "stable-team",
    actionRoute: "/stables",
    actionLabelKey: "onboarding:steps.stableChoice.action",
    detectCompletion: (ctx) =>
      ctx.stableCount > 0 || ctx.visitedRoutes.has("/stables"),
    variants: ["stable_owner"],
    order: 1,
  },
  {
    id: "invite-member",
    titleKey: "onboarding:steps.inviteMember.title",
    descriptionKey: "onboarding:steps.inviteMember.description",
    sectionId: "stable-team",
    actionRoute: "/organizations",
    actionLabelKey: "onboarding:steps.inviteMember.action",
    detectCompletion: (ctx) => ctx.memberCount > 1,
    variants: ["stable_owner"],
    order: 2,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Section 3: Hästar & Aktiviteter (stable_owner only)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "add-horse",
    titleKey: "onboarding:steps.addHorse.title",
    descriptionKey: "onboarding:steps.addHorse.description",
    sectionId: "horses-activities",
    actionRoute: "/horses",
    actionLabelKey: "onboarding:steps.addHorse.action",
    detectCompletion: (ctx) => ctx.horseCount > 0,
    variants: ["stable_owner"],
    order: 1,
  },
  {
    id: "health-activities",
    titleKey: "onboarding:steps.healthActivities.title",
    descriptionKey: "onboarding:steps.healthActivities.description",
    sectionId: "horses-activities",
    actionRoute: "/activities/care",
    actionLabelKey: "onboarding:steps.healthActivities.action",
    detectCompletion: (ctx) =>
      ctx.healthActivityCount > 0 || ctx.visitedRoutes.has("/activities/care"),
    variants: ["stable_owner"],
    order: 2,
  },
  {
    id: "planning-activities",
    titleKey: "onboarding:steps.planningActivities.title",
    descriptionKey: "onboarding:steps.planningActivities.description",
    sectionId: "horses-activities",
    actionRoute: "/activities/planning",
    actionLabelKey: "onboarding:steps.planningActivities.action",
    detectCompletion: (ctx) =>
      ctx.planningActivityCount > 0 ||
      ctx.visitedRoutes.has("/activities/planning"),
    variants: ["stable_owner"],
    order: 3,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Section 4: Utfodring / Feeding (stable_owner only)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "feeding-settings",
    titleKey: "onboarding:steps.feedingSettings.title",
    descriptionKey: "onboarding:steps.feedingSettings.description",
    sectionId: "feeding",
    actionRoute: "/feeding/settings",
    actionLabelKey: "onboarding:steps.feedingSettings.action",
    detectCompletion: (ctx) =>
      ctx.feedTypeCount > 0 || ctx.visitedRoutes.has("/feeding/settings"),
    variants: ["stable_owner"],
    order: 1,
  },
  {
    id: "feeding-schedule",
    titleKey: "onboarding:steps.feedingSchedule.title",
    descriptionKey: "onboarding:steps.feedingSchedule.description",
    sectionId: "feeding",
    actionRoute: "/feeding/schedule",
    actionLabelKey: "onboarding:steps.feedingSchedule.action",
    detectCompletion: (ctx) =>
      ctx.feedingScheduleCount > 0 ||
      ctx.visitedRoutes.has("/feeding/schedule"),
    variants: ["stable_owner"],
    order: 2,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Section 5: Rutiner / Routines (stable_owner only)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "routine-templates",
    titleKey: "onboarding:steps.routineTemplates.title",
    descriptionKey: "onboarding:steps.routineTemplates.description",
    sectionId: "routines",
    actionRoute: "/schedule/routinetemplates",
    actionLabelKey: "onboarding:steps.routineTemplates.action",
    detectCompletion: (ctx) =>
      ctx.routineTemplateCount > 0 ||
      ctx.visitedRoutes.has("/schedule/routinetemplates"),
    variants: ["stable_owner"],
    order: 1,
  },
  {
    id: "schedule-routines",
    titleKey: "onboarding:steps.scheduleRoutines.title",
    descriptionKey: "onboarding:steps.scheduleRoutines.description",
    sectionId: "routines",
    actionRoute: "/schedule/routines",
    actionLabelKey: "onboarding:steps.scheduleRoutines.action",
    detectCompletion: (ctx) =>
      ctx.routineScheduleCount > 0 ||
      ctx.visitedRoutes.has("/schedule/routines"),
    variants: ["stable_owner"],
    order: 2,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Guest: Explore section (unchanged)
  // ══════════════════════════════════════════════════════════════════════════
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
