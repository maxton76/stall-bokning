import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubscriptionLimitsEditor } from "@/components/subscription/SubscriptionLimitsEditor";
import { SubscriptionModulesEditor } from "@/components/subscription/SubscriptionModulesEditor";
import { SubscriptionAddonsEditor } from "@/components/subscription/SubscriptionAddonsEditor";
import type {
  SubscriptionLimits,
  ModuleFlags,
  SubscriptionAddons,
  TierDefinition,
} from "@equiduty/shared";
import { DEFAULT_TIER_DEFINITIONS } from "@equiduty/shared";

interface CreateTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (definition: TierDefinition) => void;
  existingTierKeys: string[];
  isPending?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

const freeTier = DEFAULT_TIER_DEFINITIONS.free!;
const DEFAULT_LIMITS: SubscriptionLimits = {
  ...freeTier.limits,
};
const DEFAULT_MODULES: ModuleFlags = {
  ...freeTier.modules,
};
const DEFAULT_ADDONS: SubscriptionAddons = {
  ...freeTier.addons,
};

export function CreateTierDialog({
  open,
  onOpenChange,
  onSubmit,
  existingTierKeys,
  isPending,
}: CreateTierDialogProps) {
  const { t } = useTranslation(["admin", "common"]);

  const [name, setName] = useState("");
  const [tierKey, setTierKey] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [isBillable, setIsBillable] = useState(false);
  const [sortOrder, setSortOrder] = useState(10);
  const [visibility, setVisibility] = useState<"public" | "hidden">("public");
  const [limits, setLimits] = useState<SubscriptionLimits>({
    ...DEFAULT_LIMITS,
  });
  const [modules, setModules] = useState<ModuleFlags>({ ...DEFAULT_MODULES });
  const [addons, setAddons] = useState<SubscriptionAddons>({
    ...DEFAULT_ADDONS,
  });

  const keyConflict = existingTierKeys.includes(tierKey);
  const keyValid =
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tierKey) && tierKey.length <= 32;
  const canSubmit =
    name.trim() && tierKey && keyValid && !keyConflict && !isPending;

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name if user hasn't manually edited key
    setTierKey(slugify(value));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      tier: tierKey,
      name: name.trim(),
      description: description.trim(),
      price,
      limits,
      modules,
      addons,
      enabled,
      isBillable,
      sortOrder,
      visibility,
    });
  };

  const handleLimitChange = (key: keyof SubscriptionLimits, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    setLimits((prev) => ({ ...prev, [key]: numValue }));
  };

  const handleModuleToggle = (key: keyof ModuleFlags) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddonToggle = (key: keyof SubscriptionAddons) => {
    setAddons((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin:tiers.dialogs.createTitle")}</DialogTitle>
          <DialogDescription>
            {t("admin:tiers.dialogs.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t("admin:tiers.labels.name")}</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Basic"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("admin:tiers.labels.tierKey")}</Label>
              <Input
                value={tierKey}
                onChange={(e) => setTierKey(slugify(e.target.value))}
                placeholder="e.g. basic"
                disabled={isPending}
              />
              {tierKey && !keyValid && (
                <p className="text-xs text-destructive">
                  Must be lowercase alphanumeric with hyphens, max 32 chars
                </p>
              )}
              {keyConflict && (
                <p className="text-xs text-destructive">
                  A tier with this key already exists
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("admin:tiers.labels.description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>{t("admin:tiers.labels.price")}</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) =>
                  setPrice(
                    e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                  )
                }
                disabled={isPending}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("admin:tiers.labels.sortOrder")}</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(
                    e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                  )
                }
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="cursor-pointer">
                {t("admin:tiers.labels.enabled")}
              </Label>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="cursor-pointer">
                {t("admin:tiers.labels.billable")}
              </Label>
              <Switch
                checked={isBillable}
                onCheckedChange={setIsBillable}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("admin:tiers.labels.visibility")}</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as "public" | "hidden")}
              disabled={isPending}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  {t("admin:tiers.labels.visibilityPublic")}
                </SelectItem>
                <SelectItem value="hidden">
                  {t("admin:tiers.labels.visibilityHidden")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase text-muted-foreground">
              {t("admin:tiers.sections.numericLimits")}
            </h4>
            <SubscriptionLimitsEditor
              limits={limits}
              onChange={handleLimitChange}
              disabled={isPending}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase text-muted-foreground">
              {t("admin:tiers.sections.moduleFlags")}
            </h4>
            <SubscriptionModulesEditor
              modules={modules}
              onToggle={handleModuleToggle}
              disabled={isPending}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase text-muted-foreground">
              {t("admin:tiers.sections.addons")}
            </h4>
            <SubscriptionAddonsEditor
              addons={addons}
              onToggle={handleAddonToggle}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("common:buttons.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {t("admin:tiers.actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
