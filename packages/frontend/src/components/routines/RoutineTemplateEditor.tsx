import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { HorseMultiSelect } from "@/components/HorseMultiSelect";
import { HorseGroupMultiSelect } from "@/components/HorseGroupMultiSelect";
import type {
  RoutineTemplate,
  RoutineStep,
  RoutineType,
  RoutineCategory,
  RoutineStepHorseContext,
  FeedingTime,
} from "@shared/types";
import { getFeedingTimesByStable } from "@/services/feedingTimeService";

import { cn } from "@/lib/utils";

// Simplified Stable interface for the editor
interface SimpleStable {
  id: string;
  name: string;
}

interface RoutineTemplateEditorProps {
  template?: RoutineTemplate | null;
  stables: SimpleStable[];
  organizationId: string;
  onSave: (data: Partial<RoutineTemplate>) => void;
  onCancel: () => void;
}

const ROUTINE_TYPES: RoutineType[] = ["morning", "midday", "evening", "custom"];

const ROUTINE_CATEGORIES: RoutineCategory[] = [
  "preparation",
  "feeding",
  "medication",
  "blanket",
  "turnout",
  "bring_in",
  "mucking",
  "water",
  "health_check",
  "safety",
  "cleaning",
  "other",
];

const HORSE_CONTEXTS: RoutineStepHorseContext[] = [
  "all",
  "specific",
  "groups",
  "none",
];

const DEFAULT_STEP: Omit<RoutineStep, "id"> = {
  order: 0,
  name: "",
  description: "",
  category: "other",
  horseContext: "all",
  showFeeding: false,
  showMedication: false,
  showSpecialInstructions: true,
  showBlanketStatus: false,
  requiresConfirmation: true,
  allowPartialCompletion: true,
  allowPhotoEvidence: false,
  estimatedMinutes: 5,
};

export function RoutineTemplateEditor({
  template,
  stables,
  organizationId,
  onSave,
  onCancel,
}: RoutineTemplateEditorProps) {
  const { t } = useTranslation(["routines", "common"]);

  // Form state
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [type, setType] = useState<RoutineType>(template?.type ?? "custom");
  const [stableId, setStableId] = useState<string>(
    template?.stableId ?? "__all__",
  );
  const [defaultStartTime, setDefaultStartTime] = useState(
    template?.defaultStartTime ?? "07:00",
  );
  const [estimatedDuration, setEstimatedDuration] = useState(
    template?.estimatedDuration ?? 60,
  );
  const [requiresNotesRead, setRequiresNotesRead] = useState(
    template?.requiresNotesRead ?? true,
  );
  const [allowSkipSteps, setAllowSkipSteps] = useState(
    template?.allowSkipSteps ?? true,
  );
  const [pointsValue, setPointsValue] = useState(template?.pointsValue ?? 10);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [steps, setSteps] = useState<RoutineStep[]>(template?.steps ?? []);

  // Step editor state
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  // Feeding times for feeding step linkage
  const [feedingTimes, setFeedingTimes] = useState<FeedingTime[]>([]);

  // Fetch feeding times when stableId changes
  const loadFeedingTimes = useCallback(async () => {
    if (!stableId || stableId === "__all__") {
      setFeedingTimes([]);
      return;
    }

    try {
      const times = await getFeedingTimesByStable(stableId, true);
      setFeedingTimes(times);
    } catch (err) {
      console.error("Error loading feeding times:", err);
      setFeedingTimes([]);
    }
  }, [stableId]);

  useEffect(() => {
    loadFeedingTimes();
  }, [loadFeedingTimes]);

  // Generate unique ID for new steps
  const generateStepId = () =>
    `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add a new step
  const addStep = () => {
    const newStep: RoutineStep = {
      ...DEFAULT_STEP,
      id: generateStepId(),
      order: steps.length,
    };
    setSteps([...steps, newStep]);
    setExpandedStepId(newStep.id);
  };

  // Remove a step
  const removeStep = (stepId: string) => {
    setSteps(
      steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i })),
    );
  };

  // Update a step
  const updateStep = (stepId: string, updates: Partial<RoutineStep>) => {
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)));
  };

  // Move step up
  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    const current = newSteps[index];
    const previous = newSteps[index - 1];
    if (current && previous) {
      newSteps[index - 1] = current;
      newSteps[index] = previous;
      setSteps(newSteps.map((s, i) => ({ ...s, order: i })));
    }
  };

  // Move step down
  const moveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    const current = newSteps[index];
    const next = newSteps[index + 1];
    if (current && next) {
      newSteps[index] = next;
      newSteps[index + 1] = current;
      setSteps(newSteps.map((s, i) => ({ ...s, order: i })));
    }
  };

  // Calculate total estimated duration
  useEffect(() => {
    const total = steps.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0);
    if (total > 0) {
      setEstimatedDuration(total);
    }
  }, [steps]);

  // Handle save
  const handleSave = () => {
    const data: Partial<RoutineTemplate> = {
      name,
      description,
      type,
      stableId: stableId === "__all__" ? undefined : stableId,
      defaultStartTime,
      estimatedDuration,
      requiresNotesRead,
      allowSkipSteps,
      pointsValue,
      isActive,
      steps,
    };
    onSave(data);
  };

  const isValid =
    name.trim() !== "" &&
    steps.length > 0 &&
    !pointsError &&
    pointsValue >= 1 &&
    pointsValue <= 100;

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">{t("routines:template.name")} *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("routines:template.name")}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">
            {t("routines:template.description")}
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("routines:template.description")}
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="type">{t("routines:template.type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as RoutineType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUTINE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`routines:types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="stable">{t("common:labels.stable")}</Label>
          <Select value={stableId} onValueChange={setStableId}>
            <SelectTrigger>
              <SelectValue placeholder={t("common:labels.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("common:labels.all")}</SelectItem>
              {stables.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="startTime">{t("routines:template.startTime")}</Label>
          <Input
            id="startTime"
            type="time"
            value={defaultStartTime}
            onChange={(e) => setDefaultStartTime(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="duration">
            {t("routines:template.duration")} ({t("routines:flow.minutes")})
          </Label>
          <Input
            id="duration"
            type="number"
            value={estimatedDuration}
            onChange={(e) =>
              setEstimatedDuration(parseInt(e.target.value) || 0)
            }
            min={1}
          />
        </div>

        <div>
          <Label htmlFor="points">{t("routines:template.pointsValue")}</Label>
          <Input
            id="points"
            type="number"
            value={pointsValue}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              setPointsValue(value);
              if (value > 100) {
                setPointsError(t("routines:template.pointsValueMaxError"));
              } else if (value < 1) {
                setPointsError(t("routines:template.pointsValueMinError"));
              } else {
                setPointsError(null);
              }
            }}
            min={1}
            max={100}
          />
          {pointsError && (
            <p className="text-sm text-destructive mt-1">{pointsError}</p>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>{t("routines:template.requiresNotesRead")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("routines:flow.readNotesFirst")}
            </p>
          </div>
          <Switch
            checked={requiresNotesRead}
            onCheckedChange={setRequiresNotesRead}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>{t("routines:template.allowSkipSteps")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("routines:stepConfig.allowPartialCompletion")}
            </p>
          </div>
          <Switch
            checked={allowSkipSteps}
            onCheckedChange={setAllowSkipSteps}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>{t("routines:template.isActive")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("common:status.active")}
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>

      <Separator />

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">{t("routines:template.steps")}</h3>
            <p className="text-sm text-muted-foreground">
              {steps.length} {t("routines:template.steps")}
            </p>
          </div>
          <Button onClick={addStep} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("routines:template.addStep")}
          </Button>
        </div>

        {steps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Settings2 className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {t("routines:empty.noTemplatesDescription")}
              </p>
              <Button onClick={addStep} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-1" />
                {t("routines:template.addStep")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                isExpanded={expandedStepId === step.id}
                onToggle={() =>
                  setExpandedStepId(expandedStepId === step.id ? null : step.id)
                }
                onUpdate={(updates) => updateStep(step.id, updates)}
                onRemove={() => removeStep(step.id)}
                onMoveUp={() => moveStepUp(index)}
                onMoveDown={() => moveStepDown(index)}
                canMoveUp={index > 0}
                canMoveDown={index < steps.length - 1}
                stableId={stableId}
                organizationId={organizationId}
                feedingTimes={feedingTimes}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t("common:buttons.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={!isValid}>
          {t("common:buttons.save")}
        </Button>
      </div>
    </div>
  );
}

interface StepEditorProps {
  step: RoutineStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<RoutineStep>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  stableId: string;
  organizationId: string;
  feedingTimes: FeedingTime[];
  t: (key: string) => string;
}

function StepEditor({
  step,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  stableId,
  organizationId,
  feedingTimes,
  t,
}: StepEditorProps) {
  return (
    <Card className={cn(isExpanded && "ring-2 ring-primary/20")}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={!canMoveUp}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={!canMoveDown}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <GripVertical className="h-5 w-5 text-muted-foreground" />

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{index + 1}</Badge>
                <span className="font-medium">
                  {step.name || t("routines:stepConfig.name")}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {t(`routines:categories.${step.category}`)}
                </Badge>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("routines:stepConfig.name")} *</Label>
                <Input
                  value={step.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder={t("routines:stepConfig.name")}
                />
              </div>

              <div>
                <Label>{t("routines:stepConfig.category")}</Label>
                <Select
                  value={step.category}
                  onValueChange={(v) =>
                    onUpdate({ category: v as RoutineCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTINE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`routines:categories.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>{t("routines:stepConfig.description")}</Label>
                <Textarea
                  value={step.description ?? ""}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder={t("routines:stepConfig.description")}
                  rows={2}
                />
              </div>

              {/* FeedingTime selector - only shown for feeding category */}
              {step.category === "feeding" && feedingTimes.length > 0 && (
                <div className="col-span-2">
                  <Label>{t("routines:stepConfig.feedingTime")}</Label>
                  <Select
                    value={step.feedingTimeId ?? "__none__"}
                    onValueChange={(v) =>
                      onUpdate({
                        feedingTimeId: v === "__none__" ? undefined : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "routines:stepConfig.feedingTimePlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("routines:stepConfig.noFeedingTimeLinked")}
                      </SelectItem>
                      {feedingTimes.map((ft) => (
                        <SelectItem key={ft.id} value={ft.id}>
                          {ft.name} ({ft.time})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("routines:stepConfig.feedingTimeHint")}
                  </p>
                </div>
              )}

              <div>
                <Label>{t("routines:stepConfig.horseContext")}</Label>
                <Select
                  value={step.horseContext}
                  onValueChange={(v) =>
                    onUpdate({
                      horseContext: v as RoutineStepHorseContext,
                      // Reset horseFilter when context changes
                      horseFilter: undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HORSE_CONTEXTS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`routines:stepConfig.horseContextOptions.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional horse/group selection based on horseContext */}
              {step.horseContext === "specific" &&
                stableId &&
                stableId !== "__all__" && (
                  <div>
                    <Label>{t("routines:stepConfig.selectHorses")}</Label>
                    <HorseMultiSelect
                      stableId={stableId}
                      selectedHorseIds={step.horseFilter?.horseIds || []}
                      onChange={(horseIds) =>
                        onUpdate({
                          horseFilter: { ...step.horseFilter, horseIds },
                        })
                      }
                      placeholder={t(
                        "routines:stepConfig.selectHorsesPlaceholder",
                      )}
                    />
                  </div>
                )}

              {step.horseContext === "groups" && (
                <div>
                  <Label>{t("routines:stepConfig.selectGroups")}</Label>
                  <HorseGroupMultiSelect
                    organizationId={organizationId}
                    selectedGroupIds={step.horseFilter?.groupIds || []}
                    onChange={(groupIds) =>
                      onUpdate({
                        horseFilter: { ...step.horseFilter, groupIds },
                      })
                    }
                    placeholder={t(
                      "routines:stepConfig.selectGroupsPlaceholder",
                    )}
                  />
                </div>
              )}

              {/* Optional exclude horses for "all" or "groups" context */}
              {(step.horseContext === "all" ||
                step.horseContext === "groups") &&
                stableId &&
                stableId !== "__all__" && (
                  <div>
                    <Label>{t("routines:stepConfig.excludeHorses")}</Label>
                    <HorseMultiSelect
                      stableId={stableId}
                      selectedHorseIds={step.horseFilter?.excludeHorseIds || []}
                      onChange={(excludeHorseIds) =>
                        onUpdate({
                          horseFilter: { ...step.horseFilter, excludeHorseIds },
                        })
                      }
                      placeholder={t(
                        "routines:stepConfig.excludeHorsesPlaceholder",
                      )}
                    />
                  </div>
                )}

              <div>
                <Label>{t("routines:stepConfig.estimatedMinutes")}</Label>
                <Input
                  type="number"
                  value={step.estimatedMinutes ?? 5}
                  onChange={(e) =>
                    onUpdate({
                      estimatedMinutes: parseInt(e.target.value) || 5,
                    })
                  }
                  min={1}
                />
              </div>
            </div>

            {/* Display options */}
            {step.horseContext !== "none" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>{t("routines:stepConfig.showFeeding")}</Label>
                  <Switch
                    checked={step.showFeeding}
                    onCheckedChange={(v) => onUpdate({ showFeeding: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t("routines:stepConfig.showMedication")}</Label>
                  <Switch
                    checked={step.showMedication}
                    onCheckedChange={(v) => onUpdate({ showMedication: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t("routines:stepConfig.showBlanketStatus")}</Label>
                  <Switch
                    checked={step.showBlanketStatus}
                    onCheckedChange={(v) => onUpdate({ showBlanketStatus: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>
                    {t("routines:stepConfig.showSpecialInstructions")}
                  </Label>
                  <Switch
                    checked={step.showSpecialInstructions}
                    onCheckedChange={(v) =>
                      onUpdate({ showSpecialInstructions: v })
                    }
                  />
                </div>
              </div>
            )}

            {/* Completion options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>{t("routines:stepConfig.requiresConfirmation")}</Label>
                <Switch
                  checked={step.requiresConfirmation}
                  onCheckedChange={(v) => onUpdate({ requiresConfirmation: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{t("routines:stepConfig.allowPartialCompletion")}</Label>
                <Switch
                  checked={step.allowPartialCompletion}
                  onCheckedChange={(v) =>
                    onUpdate({ allowPartialCompletion: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{t("routines:stepConfig.allowPhotoEvidence")}</Label>
                <Switch
                  checked={step.allowPhotoEvidence}
                  onCheckedChange={(v) => onUpdate({ allowPhotoEvidence: v })}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
