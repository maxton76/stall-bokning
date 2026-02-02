import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingSection } from "../sections/SettingSection";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export interface FacilitiesSettings {
  boxes: string[];
  paddocks: string[];
}

interface FacilitiesSettingsTabProps {
  stableId: string;
  settings: FacilitiesSettings;
  onChange: (settings: FacilitiesSettings) => void;
  disabled?: boolean;
}

interface FacilityListProps {
  items: string[];
  type: "boxes" | "paddocks";
  onSave: (items: string[]) => Promise<void>;
  disabled?: boolean;
}

function FacilityList({ items, type, onSave, disabled }: FacilityListProps) {
  const { t } = useTranslation(["stables", "common"]);
  const [newItem, setNewItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDuplicate = (name: string, excludeIndex?: number): boolean => {
    const lower = name.toLowerCase().trim();
    return items.some(
      (item, idx) =>
        idx !== excludeIndex && item.toLowerCase().trim() === lower,
    );
  };

  const handleAdd = async () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;

    if (isDuplicate(trimmed)) {
      setError(t(`stables:settings.facilities.${type}.duplicate`));
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const updated = [...items, trimmed].sort((a, b) =>
        a.localeCompare(b, "sv"),
      );
      await onSave(updated);
      setNewItem("");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(items[index]!);
    setError(null);
  };

  const handleEditSave = async () => {
    if (editingIndex === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;

    if (isDuplicate(trimmed, editingIndex)) {
      setError(t(`stables:settings.facilities.${type}.duplicate`));
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const updated = [...items];
      updated[editingIndex] = trimmed;
      updated.sort((a, b) => a.localeCompare(b, "sv"));
      await onSave(updated);
      setEditingIndex(null);
      setEditValue("");
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditValue("");
    setError(null);
  };

  const handleDelete = async (name: string) => {
    setSaving(true);
    try {
      const updated = items.filter((item) => item !== name);
      await onSave(updated);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
    if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const sorted = [...items].sort((a, b) => a.localeCompare(b, "sv"));

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">
        {t(`stables:settings.facilities.${type}.title`)}
      </h4>

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t(`stables:settings.facilities.${type}.empty`)}
        </p>
      )}

      <ul className="space-y-1">
        {sorted.map((item, displayIndex) => {
          const originalIndex = items.indexOf(item);
          const isEditing = editingIndex === originalIndex;

          return (
            <li
              key={item}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-muted/50 group"
            >
              {isEditing ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleEditSave)}
                    className="h-8 flex-1"
                    autoFocus
                    disabled={saving}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleEditSave}
                    disabled={saving || !editValue.trim()}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleEditCancel}
                    disabled={saving}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{item}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleEdit(originalIndex)}
                    disabled={disabled || saving}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    disabled={disabled || saving}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {/* Add new item */}
      <div className="flex items-center gap-2">
        <Input
          value={newItem}
          onChange={(e) => {
            setNewItem(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => handleKeyDown(e, handleAdd)}
          placeholder={t(`stables:settings.facilities.${type}.placeholder`)}
          className="h-9"
          disabled={disabled || saving}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || saving || !newItem.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t(`stables:settings.facilities.${type}.add`)}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common:buttons.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(`stables:settings.facilities.${type}.confirmDelete`, {
                name: deleteTarget,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common:buttons.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function FacilitiesSettingsTab({
  stableId,
  settings,
  onChange,
  disabled = false,
}: FacilitiesSettingsTabProps) {
  const { t } = useTranslation(["stables", "common"]);
  const { toast } = useToast();

  const handleSaveBoxes = async (boxes: string[]) => {
    try {
      await apiClient.put<{ boxes: string[] }>(`/stables/${stableId}/boxes`, {
        boxes,
      });
      onChange({ ...settings, boxes });
      toast({ title: t("stables:settings.facilities.messages.saveSuccess") });
    } catch {
      toast({
        title: t("stables:settings.facilities.messages.saveError"),
        variant: "destructive",
      });
    }
  };

  const handleSavePaddocks = async (paddocks: string[]) => {
    try {
      await apiClient.put<{ paddocks: string[] }>(
        `/stables/${stableId}/paddocks`,
        { paddocks },
      );
      onChange({ ...settings, paddocks });
      toast({ title: t("stables:settings.facilities.messages.saveSuccess") });
    } catch {
      toast({
        title: t("stables:settings.facilities.messages.saveError"),
        variant: "destructive",
      });
    }
  };

  return (
    <SettingSection
      title={t("stables:settings.facilities.title")}
      description={t("stables:settings.facilities.description")}
    >
      <FacilityList
        items={settings.boxes}
        type="boxes"
        onSave={handleSaveBoxes}
        disabled={disabled}
      />

      <div className="border-t pt-6">
        <FacilityList
          items={settings.paddocks}
          type="paddocks"
          onSave={handleSavePaddocks}
          disabled={disabled}
        />
      </div>
    </SettingSection>
  );
}
