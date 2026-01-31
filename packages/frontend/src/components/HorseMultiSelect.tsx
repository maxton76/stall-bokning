import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getStableHorses } from "@/services/horseService";
import type { Horse } from "@/types/roles";

interface HorseMultiSelectProps {
  /** ID of the stable to load horses from */
  stableId: string;

  /** Currently selected horse IDs */
  selectedHorseIds: string[];

  /** Callback when selection changes */
  onChange: (horseIds: string[]) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Whether the component is disabled */
  disabled?: boolean;

  /** Optional CSS class */
  className?: string;
}

export function HorseMultiSelect({
  stableId,
  selectedHorseIds,
  onChange,
  placeholder = "Select horses...",
  disabled = false,
  className,
}: HorseMultiSelectProps) {
  const { t } = useTranslation(["horses", "common"]);
  const [open, setOpen] = useState(false);

  // Load horses from stable using TanStack Query (receives cache updates)
  const { data: horses = [], isLoading: loading } = useApiQuery<Horse[]>(
    queryKeys.horses.byStable(stableId),
    () => getStableHorses(stableId),
    { enabled: !!stableId },
  );

  // Get selected horses for display
  const selectedHorses = horses.filter((horse) =>
    selectedHorseIds.includes(horse.id),
  );

  // Toggle horse selection
  const toggleHorse = (horseId: string) => {
    const newSelection = selectedHorseIds.includes(horseId)
      ? selectedHorseIds.filter((id) => id !== horseId)
      : [...selectedHorseIds, horseId];
    onChange(newSelection);
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
  };

  // Get display text for trigger button
  const getDisplayText = () => {
    if (selectedHorses.length === 0) {
      return placeholder;
    }
    if (selectedHorses.length === 1) {
      return selectedHorses[0]!.name;
    }
    if (selectedHorses.length === horses.length) {
      return t("horses:selection.allHorses", { count: horses.length });
    }
    return t("horses:selection.horsesSelected", {
      count: selectedHorses.length,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {loading ? t("common:loading.default") : getDisplayText()}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {selectedHorses.length > 0 && (
              <Badge variant="secondary" className="px-1.5">
                {selectedHorses.length}
              </Badge>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={t("horses:selection.searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("horses:selection.noHorsesFound")}</CommandEmpty>
            <CommandGroup>
              {/* Header with clear all button */}
              {selectedHorseIds.length > 0 && (
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="text-muted-foreground">
                    {t("horses:selection.selected", {
                      count: selectedHorseIds.length,
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-auto p-1 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t("common:buttons.clearAll")}
                  </Button>
                </div>
              )}

              {/* Horse list */}
              {horses.map((horse) => {
                const isSelected = selectedHorseIds.includes(horse.id);
                return (
                  <CommandItem
                    key={horse.id}
                    value={horse.name}
                    onSelect={() => toggleHorse(horse.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={cn(
                          "h-4 w-4 border rounded flex items-center justify-center",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-input",
                        )}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span>{horse.name}</span>
                      {horse.breed && (
                        <span className="text-xs text-muted-foreground">
                          ({horse.breed})
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
