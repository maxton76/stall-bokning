import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useOrganization } from "@/contexts/OrganizationContext";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getLessonSettings,
  updateLessonSettings,
  type LessonSettingsResponse,
  type LessonSettings,
  type SkillLevel,
} from "@/services/lessonService";

export function LessonSettingsForm() {
  const { t } = useTranslation(["lessons", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LessonSettings>({
    skillLevels: [],
    defaultCancellationDeadlineHours: 24,
    defaultMaxCancellationsPerTerm: 3,
    autoPromoteFromWaitlist: true,
  });
  const [newLevelName, setNewLevelName] = useState("");

  const organizationId = currentOrganization;

  const settingsQuery = useApiQuery<LessonSettingsResponse>(
    queryKeys.lessonSettings.byOrganization(organizationId || ""),
    () => getLessonSettings(organizationId!),
    { enabled: !!organizationId, staleTime: 5 * 60 * 1000 },
  );

  useEffect(() => {
    if (settingsQuery.data?.settings) {
      setSettings(settingsQuery.data.settings);
    }
  }, [settingsQuery.data]);

  const handleSave = async () => {
    if (!organizationId) return;

    setSaving(true);
    try {
      await updateLessonSettings(organizationId, settings);
      await cacheInvalidation.lessonSettings.all();
      toast({ title: t("lessons:settings.saved") });
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkillLevel = () => {
    if (!newLevelName.trim()) return;

    const newLevel: SkillLevel = {
      id: crypto.randomUUID(),
      name: newLevelName.trim(),
      sortOrder: settings.skillLevels.length,
      isSystem: false,
      isEnabled: true,
    };

    setSettings({
      ...settings,
      skillLevels: [...settings.skillLevels, newLevel],
    });
    setNewLevelName("");
  };

  const handleToggleSkillLevel = (id: string, isEnabled: boolean) => {
    setSettings({
      ...settings,
      skillLevels: settings.skillLevels.map((l) =>
        l.id === id ? { ...l, isEnabled } : l,
      ),
    });
  };

  const handleRemoveSkillLevel = (id: string) => {
    setSettings({
      ...settings,
      skillLevels: settings.skillLevels.filter((l) => l.id !== id),
    });
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Skill Levels */}
      <Card>
        <CardHeader>
          <CardTitle>{t("lessons:settings.skillLevels.title")}</CardTitle>
          <CardDescription>
            {t("lessons:settings.skillLevels.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.skillLevels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("lessons:settings.skillLevels.empty")}
            </p>
          ) : (
            <div className="space-y-2">
              {settings.skillLevels
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((level) => (
                  <div
                    key={level.id}
                    className="flex items-center gap-3 rounded-md border p-2"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span
                      className={`flex-1 text-sm ${!level.isEnabled ? "text-muted-foreground line-through" : ""}`}
                    >
                      {level.name}
                    </span>
                    {level.isSystem && (
                      <Badge variant="outline" className="text-xs">
                        {t("lessons:settings.skillLevels.systemBadge")}
                      </Badge>
                    )}
                    <Switch
                      checked={level.isEnabled !== false}
                      onCheckedChange={(checked) =>
                        handleToggleSkillLevel(level.id, checked)
                      }
                    />
                    {!level.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSkillLevel(level.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("lessons:settings.skillLevels.name")}
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSkillLevel()}
            />
            <Button
              variant="outline"
              onClick={handleAddSkillLevel}
              disabled={!newLevelName.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("lessons:settings.skillLevels.add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle>{t("lessons:settings.cancellation.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                {t("lessons:settings.cancellation.defaultDeadlineHours")}
              </Label>
              <Input
                type="number"
                min={0}
                value={settings.defaultCancellationDeadlineHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultCancellationDeadlineHours:
                      parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>
                {t("lessons:settings.cancellation.maxCancellationsPerTerm")}
              </Label>
              <Input
                type="number"
                min={0}
                value={settings.defaultMaxCancellationsPerTerm}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultMaxCancellationsPerTerm:
                      parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("lessons:settings.cancellation.termStart")}</Label>
              <Input
                type="date"
                value={settings.termStartDate || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    termStartDate: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div>
              <Label>{t("lessons:settings.cancellation.termEnd")}</Label>
              <Input
                type="date"
                value={settings.termEndDate || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    termEndDate: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("lessons:settings.waitlist.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>{t("lessons:settings.waitlist.autoPromote")}</Label>
            <Switch
              checked={settings.autoPromoteFromWaitlist}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  autoPromoteFromWaitlist: checked,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("common:buttons.saving") : t("common:buttons.save")}
        </Button>
      </div>
    </div>
  );
}
