import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Users, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { BetaAccessDialog } from "./BetaAccessDialog";
import type { FeatureToggle } from "@equiduty/shared";

interface FeatureToggleCardProps {
  toggle: FeatureToggle;
  onUpdate: () => void;
}

/**
 * Card component for individual feature toggle
 * Shows toggle state, rollout phase, dependencies, and beta access management
 */
export function FeatureToggleCard({
  toggle,
  onUpdate,
}: FeatureToggleCardProps) {
  const { t } = useTranslation(["admin", "common"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBetaDialog, setShowBetaDialog] = useState(false);

  // Update toggle mutation with proper pattern
  // NOTE: Optimistic updates not implemented due to useApiMutation hook limitations
  // Future enhancement: Extend useApiMutation to support mutation context or use useMutation directly
  const updateToggle = useApiMutation(
    async (data: { enabled: boolean; rolloutPhase: string }) => {
      return apiClient.put(
        `/admin/feature-toggles/${encodeURIComponent(toggle.key)}`,
        data,
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/admin/feature-toggles"] });
        onUpdate();
        toast({
          title: t("common:messages.success", "Success"),
          description: t(
            "admin:featureToggles.messages.toggleSuccess",
            "Feature toggle updated successfully",
          ),
        });
      },
      onError: (error) => {
        console.error("Failed to update toggle:", error);
        toast({
          title: t("common:messages.error", "Error"),
          description:
            error instanceof Error
              ? error.message
              : t(
                  "admin:featureToggles.messages.toggleError",
                  "Failed to update feature toggle. Please try again.",
                ),
          variant: "destructive",
        });
      },
    },
  );

  const handleToggle = (enabled: boolean) => {
    // Disabling an enabled feature - show confirmation
    if (!enabled && toggle.enabled) {
      const confirmMessage = toggle.dependsOn
        ? t(
            "admin:featureToggles.confirmDisableWithDeps",
            "Disable {{feature}}? Warning: This may affect dependent features.",
            { feature: toggle.name },
          )
        : t(
            "admin:featureToggles.confirmDisable",
            "Disable {{feature}}? This will affect all users immediately.",
            { feature: toggle.name },
          );

      if (!window.confirm(confirmMessage)) {
        return; // User cancelled
      }
    }

    updateToggle.mutate({
      enabled,
      rolloutPhase: toggle.rolloutPhase || "internal",
    });
  };

  // Get status badge variant
  const getStatusVariant = (): "default" | "secondary" | "destructive" => {
    if (toggle.enabled) return "default";
    return "secondary";
  };

  // Get rollout phase badge variant
  const getRolloutVariant = (): "default" | "secondary" | "outline" => {
    switch (toggle.rolloutPhase) {
      case "general":
        return "default";
      case "beta":
        return "secondary";
      case "internal":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <>
      <Card className={toggle.enabled ? "" : "opacity-75"}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <CardTitle className="text-lg">{toggle.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {toggle.description}
              </p>
            </div>
            <div className="relative flex items-center gap-2">
              <Switch
                checked={toggle.enabled}
                onCheckedChange={handleToggle}
                disabled={updateToggle.isPending}
                className={updateToggle.isPending ? "opacity-50" : ""}
                aria-label={t(
                  "admin:featureToggles.toggleAriaLabel",
                  "Toggle {{feature}} feature",
                  { feature: toggle.name },
                )}
              />
              {updateToggle.isPending && (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status and Phase Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusVariant()}>
              {toggle.enabled
                ? t("admin:featureToggles.statusEnabled", "Enabled")
                : t("admin:featureToggles.statusDisabled", "Disabled")}
            </Badge>
            {toggle.rolloutPhase && (
              <Badge variant={getRolloutVariant()}>
                {t(
                  `admin:featureToggles.rolloutPhase.${toggle.rolloutPhase}`,
                  toggle.rolloutPhase,
                )}
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {toggle.category}
            </Badge>
          </div>

          {/* Dependency Warning */}
          {toggle.dependsOn && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("admin:featureToggles.dependsOn", "Depends on:")}{" "}
                <strong>{toggle.dependsOn}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Beta Access Management */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBetaDialog(true)}
              className="w-full"
              aria-label={t(
                "admin:featureToggles.manageBetaAccessAriaLabel",
                "Manage beta access for {{feature}}",
                { feature: toggle.name },
              )}
            >
              <Users className="h-4 w-4 mr-2" aria-hidden="true" />
              {t("admin:featureToggles.manageBetaAccess", "Manage Beta Access")}
            </Button>
          </div>

          {/* Metadata */}
          {toggle.updatedAt && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {t("admin:featureToggles.lastUpdated", "Last updated:")}{" "}
              {new Date(
                typeof toggle.updatedAt === "object" &&
                  "seconds" in toggle.updatedAt
                  ? toggle.updatedAt.seconds * 1000
                  : toggle.updatedAt,
              ).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Beta Access Dialog */}
      <BetaAccessDialog
        open={showBetaDialog}
        onOpenChange={setShowBetaDialog}
        featureKey={toggle.key}
        featureName={toggle.name}
      />
    </>
  );
}
