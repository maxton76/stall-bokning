import { useTranslation } from "react-i18next";
import { Plus, Search, MoreHorizontal, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  TrainerCommissionConfig,
  CommissionRateType,
} from "@equiduty/shared";

// ============================================================================
// Form State Types (exported for parent)
// ============================================================================

export interface RuleFormState {
  lessonType: string;
  rate: string;
  rateType: CommissionRateType;
  minAmount: string;
  maxAmount: string;
}

export interface ConfigFormState {
  trainerId: string;
  trainerName: string;
  defaultRate: string;
  defaultRateType: CommissionRateType;
  isActive: boolean;
  rules: RuleFormState[];
}

export const EMPTY_RULE: RuleFormState = {
  lessonType: "",
  rate: "",
  rateType: "percentage",
  minAmount: "",
  maxAmount: "",
};

export const EMPTY_CONFIG_FORM: ConfigFormState = {
  trainerId: "",
  trainerName: "",
  defaultRate: "",
  defaultRateType: "percentage",
  isActive: true,
  rules: [],
};

export function configToFormState(
  config: TrainerCommissionConfig,
): ConfigFormState {
  return {
    trainerId: config.trainerId,
    trainerName: config.trainerName,
    defaultRate: String(config.defaultRate),
    defaultRateType: config.defaultRateType,
    isActive: config.isActive,
    rules: config.rules.map((r) => ({
      lessonType: r.lessonType,
      rate: String(r.rate),
      rateType: r.rateType,
      minAmount: r.minAmount !== undefined ? String(r.minAmount) : "",
      maxAmount: r.maxAmount !== undefined ? String(r.maxAmount) : "",
    })),
  };
}

const RATE_TYPES: CommissionRateType[] = ["percentage", "fixed_amount"];

// ============================================================================
// Props
// ============================================================================

interface CommissionConfigPanelProps {
  configs: TrainerCommissionConfig[];
  filteredConfigs: TrainerCommissionConfig[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (config: TrainerCommissionConfig) => void;
  // Dialog props
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  editingConfig: TrainerCommissionConfig | null;
  configForm: ConfigFormState;
  onConfigFormChange: (form: ConfigFormState) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
  onUpdateRule: (
    index: number,
    field: keyof RuleFormState,
    value: string,
  ) => void;
  onSave: () => void;
  isSaving: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CommissionConfigPanel({
  filteredConfigs,
  isLoading,
  searchQuery,
  onSearchChange,
  onOpenCreate,
  onOpenEdit,
  dialogOpen,
  onDialogOpenChange,
  editingConfig,
  configForm,
  onConfigFormChange,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
  onSave,
  isSaving,
}: CommissionConfigPanelProps) {
  const { t } = useTranslation(["trainerCommission", "common"]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common:search.placeholder", "Search...")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={onOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("trainerCommission:config.create")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("trainerCommission:config.trainer")}</TableHead>
                <TableHead>
                  {t("trainerCommission:config.defaultRate")}
                </TableHead>
                <TableHead>{t("trainerCommission:config.rateType")}</TableHead>
                <TableHead className="text-center">
                  {t("trainerCommission:config.rules")}
                </TableHead>
                <TableHead className="text-center">
                  {t("trainerCommission:commission.status")}
                </TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <p className="text-muted-foreground">
                      {t("trainerCommission:config.noConfigs")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">
                      {config.trainerName}
                    </TableCell>
                    <TableCell>{config.defaultRate}</TableCell>
                    <TableCell>
                      {t(
                        `trainerCommission:config.${config.defaultRateType === "percentage" ? "percentage" : "fixedAmount"}`,
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {config.rules.length}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={config.isActive ? "default" : "secondary"}
                      >
                        {config.isActive
                          ? t("trainerCommission:config.active")
                          : t("trainerCommission:config.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenEdit(config)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("trainerCommission:config.editConfig")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Config Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig
                ? t("trainerCommission:dialog.editConfig")
                : t("trainerCommission:dialog.createConfig")}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? t("trainerCommission:dialog.editConfigDescription")
                : t("trainerCommission:dialog.createConfigDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Trainer ID (only on create) */}
            {!editingConfig && (
              <div className="grid gap-2">
                <Label>{t("trainerCommission:config.trainer")} ID *</Label>
                <Input
                  value={configForm.trainerId}
                  onChange={(e) =>
                    onConfigFormChange({
                      ...configForm,
                      trainerId: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {/* Trainer Name */}
            <div className="grid gap-2">
              <Label>{t("trainerCommission:config.trainer")} *</Label>
              <Input
                value={configForm.trainerName}
                onChange={(e) =>
                  onConfigFormChange({
                    ...configForm,
                    trainerName: e.target.value,
                  })
                }
              />
            </div>

            {/* Default Rate + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("trainerCommission:config.defaultRate")} *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={configForm.defaultRate}
                  onChange={(e) =>
                    onConfigFormChange({
                      ...configForm,
                      defaultRate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("trainerCommission:config.rateType")}</Label>
                <Select
                  value={configForm.defaultRateType}
                  onValueChange={(v) =>
                    onConfigFormChange({
                      ...configForm,
                      defaultRateType: v as CommissionRateType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATE_TYPES.map((rt) => (
                      <SelectItem key={rt} value={rt}>
                        {t(
                          `trainerCommission:config.${rt === "percentage" ? "percentage" : "fixedAmount"}`,
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={configForm.isActive}
                onChange={(e) =>
                  onConfigFormChange({
                    ...configForm,
                    isActive: e.target.checked,
                  })
                }
                className="h-4 w-4"
                id="config-active"
              />
              <Label htmlFor="config-active">
                {t("trainerCommission:config.active")}
              </Label>
            </div>

            {/* Rules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t("trainerCommission:config.rules")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddRule}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {t("trainerCommission:config.addRule")}
                </Button>
              </div>
              {configForm.rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_80px_120px_80px_80px_32px] items-end gap-2 rounded border p-3"
                >
                  <div className="grid gap-1">
                    <Label className="text-xs">
                      {t("trainerCommission:config.lessonType")}
                    </Label>
                    <Input
                      value={rule.lessonType}
                      onChange={(e) =>
                        onUpdateRule(idx, "lessonType", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">
                      {t("trainerCommission:config.rate")}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rule.rate}
                      onChange={(e) =>
                        onUpdateRule(idx, "rate", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">
                      {t("trainerCommission:config.rateType")}
                    </Label>
                    <Select
                      value={rule.rateType}
                      onValueChange={(v) => onUpdateRule(idx, "rateType", v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RATE_TYPES.map((rt) => (
                          <SelectItem key={rt} value={rt}>
                            {rt === "percentage" ? "%" : "SEK"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">
                      {t("trainerCommission:config.minAmount")}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={rule.minAmount}
                      onChange={(e) =>
                        onUpdateRule(idx, "minAmount", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">
                      {t("trainerCommission:config.maxAmount")}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={rule.maxAmount}
                      onChange={(e) =>
                        onUpdateRule(idx, "maxAmount", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveRule(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onDialogOpenChange(false)}
              disabled={isSaving}
            >
              {t("common:buttons.cancel", "Cancel")}
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving
                ? t("common:buttons.saving", "Saving...")
                : editingConfig
                  ? t("common:buttons.update", "Update")
                  : t("common:buttons.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
