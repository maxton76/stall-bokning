import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Syringe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getAllAvailableVaccinationRules } from "@/services/vaccinationRuleService";
import { assignVaccinationRule } from "@/services/vaccinationService";
import { queryKeys } from "@/lib/queryClient";
import type { Horse, VaccinationRule } from "@/types/roles";

interface VaccinationRuleAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horse: Horse;
  organizationId: string;
  assignedRuleIds: string[];
  onSuccess?: () => void;
}

/**
 * Format period for display (e.g., "6 months, 21 days" or "12 months")
 */
function formatPeriodFull(rule: VaccinationRule): string {
  const parts: string[] = [];
  if (rule.periodMonths > 0) {
    parts.push(
      `${rule.periodMonths} ${rule.periodMonths === 1 ? "month" : "months"}`,
    );
  }
  if (rule.periodDays > 0) {
    parts.push(`${rule.periodDays} ${rule.periodDays === 1 ? "day" : "days"}`);
  }
  return parts.join(", ") || "Not specified";
}

export function VaccinationRuleAssignmentDialog({
  open,
  onOpenChange,
  horse,
  organizationId,
  assignedRuleIds,
  onSuccess,
}: VaccinationRuleAssignmentDialogProps) {
  const { t } = useTranslation(["horses", "common"]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");

  // Fetch available vaccination rules
  const {
    data: allRules = [],
    isLoading: loadingRules,
    error: rulesError,
  } = useQuery({
    queryKey: queryKeys.vaccinationRules.list(organizationId || null),
    queryFn: () =>
      getAllAvailableVaccinationRules(horse.ownerId, organizationId),
    enabled: open && !!horse.ownerId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter out already assigned rules
  const availableRules = allRules.filter(
    (rule) => !assignedRuleIds.includes(rule.id),
  );

  // Assign rule mutation
  const assignMutation = useMutation({
    mutationFn: () => assignVaccinationRule(horse.id, selectedRuleId),
    onSuccess: () => {
      toast({
        title: t(
          "horses:detail.vaccination.assignSuccess",
          "Vaccination rule assigned",
        ),
      });
      setSelectedRuleId("");
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Failed to assign vaccination rule:", error);
      toast({
        title: t(
          "horses:detail.vaccination.assignError",
          "Failed to assign vaccination rule",
        ),
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (!selectedRuleId) return;
    assignMutation.mutate();
  };

  const handleClose = () => {
    setSelectedRuleId("");
    onOpenChange(false);
  };

  const selectedRule = availableRules.find((r) => r.id === selectedRuleId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            {t(
              "horses:detail.vaccination.assignRuleTitle",
              "Assign Vaccination Rule",
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              "horses:detail.vaccination.assignRuleDescription",
              "Select a vaccination rule to assign to {{horseName}}. The rule determines when vaccinations are due.",
              { horseName: horse.name },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loadingRules ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rulesError ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>{t("common:errors.loadFailed", "Failed to load rules")}</p>
            </div>
          ) : availableRules.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>
                {t(
                  "horses:detail.vaccination.noAvailableRules",
                  "No additional rules available to assign",
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="rule-select">
                  {t(
                    "horses:detail.vaccination.selectRule",
                    "Vaccination Rule",
                  )}
                </Label>
                <Select
                  value={selectedRuleId}
                  onValueChange={setSelectedRuleId}
                >
                  <SelectTrigger id="rule-select">
                    <SelectValue
                      placeholder={t(
                        "horses:detail.vaccination.selectRulePlaceholder",
                        "Select a rule...",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRules.map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRule && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <h4 className="text-sm font-medium mb-2">
                    {t("horses:detail.vaccination.ruleDetails", "Rule Details")}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">
                        {t("horses:detail.vaccination.period", "Period")}:
                      </span>{" "}
                      {formatPeriodFull(selectedRule)}
                    </p>
                    {selectedRule.description && (
                      <p>
                        <span className="text-muted-foreground">
                          {t(
                            "horses:detail.vaccination.description",
                            "Description",
                          )}
                          :
                        </span>{" "}
                        {selectedRule.description}
                      </p>
                    )}
                    <p>
                      <span className="text-muted-foreground">
                        {t("horses:detail.vaccination.scope", "Scope")}:
                      </span>{" "}
                      {selectedRule.scope === "system"
                        ? t("horses:detail.vaccination.scopeSystem", "System")
                        : selectedRule.scope === "organization"
                          ? t(
                              "horses:detail.vaccination.scopeOrganization",
                              "Organization",
                            )
                          : t(
                              "horses:detail.vaccination.scopePersonal",
                              "Personal",
                            )}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common:buttons.cancel")}
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !selectedRuleId ||
              assignMutation.isPending ||
              loadingRules ||
              availableRules.length === 0
            }
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("common:buttons.assigning", "Assigning...")}
              </>
            ) : (
              t("common:buttons.assign", "Assign")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
