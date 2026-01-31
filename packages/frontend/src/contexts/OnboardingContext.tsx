import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { OnboardingState } from "@equiduty/shared";
import type { StepStatus, DetectionContext } from "@/types/onboarding";
import {
  getSectionsForVariant,
  getStepsForVariant,
  getStepsForSection,
} from "@/config/onboardingSteps";
import {
  getOnboardingState,
  completeOnboardingStep,
  dismissOnboarding as dismissOnboardingApi,
  reopenOnboarding as reopenOnboardingApi,
  toggleOnboardingMinimize,
} from "@/services/onboardingService";

export interface StepWithStatus {
  id: string;
  titleKey: string;
  descriptionKey: string;
  sectionId: string;
  actionRoute?: string;
  actionLabelKey?: string;
  status: StepStatus;
  order: number;
}

export interface SectionWithProgress {
  id: string;
  titleKey: string;
  order: number;
  steps: StepWithStatus[];
  completedCount: number;
  totalCount: number;
}

interface OnboardingContextType {
  /** Raw onboarding state from API */
  state: OnboardingState | null;
  /** Whether the context is still loading */
  loading: boolean;
  /** Whether the panel should be visible */
  panelVisible: boolean;
  /** Whether the guide is minimized */
  minimized: boolean;
  /** Sections with steps and completion status */
  sections: SectionWithProgress[];
  /** Total progress percentage (0-100) */
  progressPercent: number;
  /** Completed step count */
  completedCount: number;
  /** Total step count */
  totalCount: number;
  /** Whether all steps are complete */
  allComplete: boolean;
  /** Whether guide has been dismissed */
  dismissed: boolean;
  /** Complete a step */
  completeStep: (stepId: string, resourceId?: string) => Promise<void>;
  /** Dismiss the guide */
  dismissGuide: () => Promise<void>;
  /** Reopen the guide after dismissal */
  reopenGuide: () => Promise<void>;
  /** Toggle minimized state */
  toggleMinimize: () => Promise<void>;
  /** Show the panel (e.g., from trigger button) */
  showPanel: () => void;
  /** Hide the panel */
  hidePanel: () => void;
  /** Update detection context (called by detection hook) */
  updateDetectionContext: (ctx: Partial<DetectionContext>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
}

/** Routes where the onboarding panel should not appear */
const EXCLUDED_ROUTE_PREFIXES = ["/complete-profile", "/admin", "/portal"];

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth();
  const location = useLocation();

  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [manuallyHidden, setManuallyHidden] = useState(false);
  const [detectionCtx, setDetectionCtx] = useState<DetectionContext>({
    user: { firstName: null, lastName: null, systemRole: null },
    stableCount: 0,
    horseCount: 0,
    memberCount: 0,
    healthActivityCount: 0,
    planningActivityCount: 0,
    feedTypeCount: 0,
    feedingScheduleCount: 0,
    routineTemplateCount: 0,
    routineScheduleCount: 0,
    hasStableMembership: false,
    visitedRoutes: new Set(),
  });

  // Track visited routes for guest auto-detection
  useEffect(() => {
    setDetectionCtx((prev) => {
      const newVisited = new Set(prev.visitedRoutes);
      newVisited.add(location.pathname);
      return { ...prev, visitedRoutes: newVisited };
    });
  }, [location.pathname]);

  // Update user info in detection context when auth changes
  useEffect(() => {
    if (user) {
      setDetectionCtx((prev) => ({
        ...prev,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          systemRole: user.systemRole,
        },
      }));
    }
  }, [user?.firstName, user?.lastName, user?.systemRole]);

  // Fetch onboarding state on auth
  useEffect(() => {
    if (!user) {
      setState(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchState() {
      try {
        const data = await getOnboardingState();
        if (!cancelled) {
          setState(data);
        }
      } catch (error) {
        console.error("Failed to fetch onboarding state:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchState();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Auto-detect step completions
  useEffect(() => {
    if (!state || state.dismissed) return;

    const variant = state.guideVariant;
    const steps = getStepsForVariant(variant);
    const completedSteps = state.completedSteps || {};

    for (const step of steps) {
      // Skip already completed steps
      if (completedSteps[step.id]) continue;

      // Check if detection function marks it as complete
      if (step.detectCompletion?.(detectionCtx)) {
        // Auto-complete this step
        completeOnboardingStep(step.id)
          .then((updated) => {
            setState(updated);
          })
          .catch((err) => {
            console.error(`Failed to auto-complete step ${step.id}:`, err);
          });
        // Only auto-complete one step at a time to avoid race conditions
        break;
      }
    }
  }, [state, detectionCtx]);

  // Compute sections with status
  const { sections, completedCount, totalCount, progressPercent, allComplete } =
    useMemo(() => {
      if (!state) {
        return {
          sections: [] as SectionWithProgress[],
          completedCount: 0,
          totalCount: 0,
          progressPercent: 0,
          allComplete: false,
        };
      }

      const variant = state.guideVariant;
      const completedSteps = state.completedSteps || {};
      const variantSections = getSectionsForVariant(variant);

      let totalCompleted = 0;
      let totalSteps = 0;

      const sectionsWithProgress = variantSections.map((section) => {
        const sectionSteps = getStepsForSection(section.id, variant);
        const stepsWithStatus: StepWithStatus[] = [];
        let sectionCompleted = 0;
        let foundCurrent = false;

        for (const step of sectionSteps) {
          const isCompleted = Boolean(completedSteps[step.id]);

          let status: StepStatus = "pending";
          if (isCompleted) {
            status = "completed";
            sectionCompleted++;
          } else if (!foundCurrent) {
            status = "current";
            foundCurrent = true;
          }

          const resolvedRoute =
            typeof step.actionRoute === "function"
              ? step.actionRoute(detectionCtx)
              : step.actionRoute;

          stepsWithStatus.push({
            id: step.id,
            titleKey: step.titleKey,
            descriptionKey: step.descriptionKey,
            sectionId: step.sectionId,
            actionRoute: resolvedRoute,
            actionLabelKey: step.actionLabelKey,
            status,
            order: step.order,
          });
        }

        totalCompleted += sectionCompleted;
        totalSteps += sectionSteps.length;

        return {
          ...section,
          steps: stepsWithStatus,
          completedCount: sectionCompleted,
          totalCount: sectionSteps.length,
        };
      });

      return {
        sections: sectionsWithProgress,
        completedCount: totalCompleted,
        totalCount: totalSteps,
        progressPercent:
          totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0,
        allComplete: totalSteps > 0 && totalCompleted === totalSteps,
      };
    }, [state, detectionCtx]);

  // Determine panel visibility
  const isExcludedRoute = EXCLUDED_ROUTE_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  );
  const panelVisible =
    !!user &&
    !loading &&
    !!state &&
    !state.dismissed &&
    !allComplete &&
    !isExcludedRoute &&
    !manuallyHidden;

  const completeStep = useCallback(
    async (stepId: string, resourceId?: string) => {
      try {
        const updated = await completeOnboardingStep(stepId, resourceId);
        setState(updated);
      } catch (error) {
        console.error("Failed to complete step:", error);
      }
    },
    [],
  );

  const dismissGuide = useCallback(async () => {
    try {
      const updated = await dismissOnboardingApi();
      setState(updated);
    } catch (error) {
      console.error("Failed to dismiss guide:", error);
    }
  }, []);

  const reopenGuide = useCallback(async () => {
    try {
      const updated = await reopenOnboardingApi();
      setState(updated);
      setManuallyHidden(false);
    } catch (error) {
      console.error("Failed to reopen guide:", error);
    }
  }, []);

  const toggleMinimize = useCallback(async () => {
    if (!state) return;
    try {
      const updated = await toggleOnboardingMinimize(!state.minimized);
      setState(updated);
    } catch (error) {
      console.error("Failed to toggle minimize:", error);
    }
  }, [state?.minimized]);

  const showPanel = useCallback(() => {
    setManuallyHidden(false);
  }, []);

  const hidePanel = useCallback(() => {
    setManuallyHidden(true);
  }, []);

  const updateDetectionContext = useCallback(
    (ctx: Partial<DetectionContext>) => {
      setDetectionCtx((prev) => ({ ...prev, ...ctx }));
    },
    [],
  );

  const value = useMemo(
    () => ({
      state,
      loading,
      panelVisible,
      minimized: state?.minimized ?? false,
      sections,
      progressPercent,
      completedCount,
      totalCount,
      allComplete,
      dismissed: state?.dismissed ?? false,
      completeStep,
      dismissGuide,
      reopenGuide,
      toggleMinimize,
      showPanel,
      hidePanel,
      updateDetectionContext,
    }),
    [
      state,
      loading,
      panelVisible,
      sections,
      progressPercent,
      completedCount,
      totalCount,
      allComplete,
      completeStep,
      dismissGuide,
      reopenGuide,
      toggleMinimize,
      showPanel,
      hidePanel,
      updateDetectionContext,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
