import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useOnboardingDetection } from "@/hooks/useOnboardingDetection";
import { useIsMobile } from "@/hooks/use-mobile";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingSection } from "./OnboardingSection";
import { OnboardingProgressBar } from "./OnboardingProgressBar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function OnboardingPanel() {
  const {
    panelVisible,
    minimized,
    sections,
    progressPercent,
    completedCount,
    totalCount,
    allComplete,
    dismissGuide,
    toggleMinimize,
  } = useOnboarding();
  const { t } = useTranslation("onboarding");
  const isMobile = useIsMobile();

  // Run detection hook
  useOnboardingDetection();

  if (!panelVisible) return null;

  // Brief celebration when all complete (will auto-hide via context)
  if (allComplete) {
    return (
      <div className="fixed bottom-20 right-4 z-50 w-80 rounded-xl border bg-card p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
        <p className="text-sm font-medium text-center">
          {t("panel.allComplete")}
        </p>
      </div>
    );
  }

  const sectionsList = sections.map((section) => (
    <OnboardingSection
      key={section.id}
      titleKey={section.titleKey}
      steps={section.steps}
      completedCount={section.completedCount}
      totalCount={section.totalCount}
      defaultOpen={section.steps.some((s) => s.status === "current")}
    />
  ));

  // Mobile: use Sheet (bottom sheet)
  if (isMobile) {
    return (
      <Sheet
        open={panelVisible && !minimized}
        onOpenChange={() => toggleMinimize()}
      >
        <SheetContent side="bottom" className="max-h-[80vh]">
          <OnboardingHeader
            progressPercent={progressPercent}
            completedCount={completedCount}
            totalCount={totalCount}
            onMinimize={toggleMinimize}
            onDismiss={dismissGuide}
          />
          <div className="overflow-y-auto max-h-[60vh]">{sectionsList}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // Minimized state: thin progress bar
  if (minimized) {
    return (
      <div className="fixed bottom-20 right-4 z-50 w-80 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <OnboardingProgressBar
          progressPercent={progressPercent}
          completedCount={completedCount}
          totalCount={totalCount}
          onExpand={toggleMinimize}
        />
      </div>
    );
  }

  // Expanded state: full panel
  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50 w-96 max-h-[70vh]",
        "rounded-xl border bg-card shadow-lg",
        "flex flex-col",
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
      )}
    >
      <OnboardingHeader
        progressPercent={progressPercent}
        completedCount={completedCount}
        totalCount={totalCount}
        onMinimize={toggleMinimize}
        onDismiss={dismissGuide}
      />

      <div className="flex-1 overflow-y-auto">{sectionsList}</div>
    </div>
  );
}
