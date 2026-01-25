import { useState, useEffect } from "react";
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
import { getOrganizationHorseGroups } from "@/services/horseGroupService";
import type { HorseGroup } from "@/types/roles";

interface HorseGroupMultiSelectProps {
  /** ID of the organization to load horse groups from */
  organizationId: string;

  /** Currently selected group IDs */
  selectedGroupIds: string[];

  /** Callback when selection changes */
  onChange: (groupIds: string[]) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Whether the component is disabled */
  disabled?: boolean;

  /** Optional CSS class */
  className?: string;
}

export function HorseGroupMultiSelect({
  organizationId,
  selectedGroupIds,
  onChange,
  placeholder = "Select horse groups...",
  disabled = false,
  className,
}: HorseGroupMultiSelectProps) {
  const { t } = useTranslation(["horses", "common"]);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<HorseGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Load horse groups from organization
  useEffect(() => {
    const loadGroups = async () => {
      if (!organizationId) return;

      setLoading(true);
      try {
        const groupList = await getOrganizationHorseGroups(organizationId);
        setGroups(groupList);
      } catch (error) {
        console.error("Error loading horse groups:", error);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, [organizationId]);

  // Get selected groups for display
  const selectedGroups = groups.filter((group) =>
    selectedGroupIds.includes(group.id),
  );

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    const newSelection = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter((id) => id !== groupId)
      : [...selectedGroupIds, groupId];
    onChange(newSelection);
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
  };

  // Get display text for trigger button
  const getDisplayText = () => {
    if (selectedGroups.length === 0) {
      return placeholder;
    }
    if (selectedGroups.length === 1) {
      return selectedGroups[0]!.name;
    }
    if (selectedGroups.length === groups.length) {
      return t("horses:groupSelection.allGroups", { count: groups.length });
    }
    return t("horses:groupSelection.groupsSelected", {
      count: selectedGroups.length,
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
            {selectedGroups.length > 0 && (
              <Badge variant="secondary" className="px-1.5">
                {selectedGroups.length}
              </Badge>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t("horses:groupSelection.searchPlaceholder")}
          />
          <CommandList>
            <CommandEmpty>
              {t("horses:groupSelection.noGroupsFound")}
            </CommandEmpty>
            <CommandGroup>
              {/* Header with clear all button */}
              {selectedGroupIds.length > 0 && (
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="text-muted-foreground">
                    {t("horses:groupSelection.selected", {
                      count: selectedGroupIds.length,
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

              {/* Group list */}
              {groups.map((group) => {
                const isSelected = selectedGroupIds.includes(group.id);
                return (
                  <CommandItem
                    key={group.id}
                    value={group.name}
                    onSelect={() => toggleGroup(group.id)}
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
                      <div className="flex items-center gap-2 flex-1">
                        <span>{group.name}</span>
                        {group.color && (
                          <div
                            className="h-3 w-3 rounded-full border"
                            style={{ backgroundColor: group.color }}
                          />
                        )}
                      </div>
                      {group.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {group.description}
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
