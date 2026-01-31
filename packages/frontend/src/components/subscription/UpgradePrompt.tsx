import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useTierDefinitions } from "@/hooks/useTierDefinitions";
import { getMinimumTierForModule } from "@/lib/tierUtils";
import type { ModuleFlags, SubscriptionLimits } from "@equiduty/shared";

interface UpgradePromptProps {
  /** Module that requires upgrade */
  module?: keyof ModuleFlags;
  /** Limit that has been reached */
  limit?: keyof SubscriptionLimits;
}

export function UpgradePrompt({ module, limit }: UpgradePromptProps) {
  const { t } = useTranslation(["organizations"]);
  const navigate = useNavigate();
  const { currentOrganizationId } = useOrganizationContext();
  const { tiers } = useTierDefinitions();

  const requiredTier = module
    ? getMinimumTierForModule(module, tiers)
    : "standard";

  const handleUpgrade = () => {
    if (currentOrganizationId) {
      navigate(`/organizations/${currentOrganizationId}/subscription`);
    }
  };

  return (
    <Alert>
      <ArrowUpCircle className="h-4 w-4" />
      <AlertTitle>
        {limit
          ? t("organizations:subscription.featureGate.limitReached")
          : t("organizations:subscription.featureGate.upgradeRequired")}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {limit
            ? t("organizations:subscription.featureGate.limitDescription", {
                resource: limit,
              })
            : t("organizations:subscription.featureGate.upgradeDescription", {
                tier: t(
                  `organizations:subscription.tiers.${requiredTier}.name`,
                ),
              })}
        </span>
        <Button size="sm" onClick={handleUpgrade} className="ml-4 shrink-0">
          {t("organizations:subscription.featureGate.upgradeButton")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
