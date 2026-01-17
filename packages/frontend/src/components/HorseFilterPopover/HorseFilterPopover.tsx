import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, Search } from "lucide-react";
import type { HorseFilters, FilterConfig } from "@shared/types/filters";
import type { HorseUsage } from "@stall-bokning/shared/types/domain";
import type { Stable, HorseGroup } from "@/types/roles";

interface HorseFilterPopoverProps {
  /** Current filter state */
  filters: HorseFilters;

  /** Callback when filters change */
  onFiltersChange: (filters: HorseFilters) => void;

  /** Configuration for which filters to show */
  config: FilterConfig;

  /** Stables for dropdown (optional) */
  stables?: Stable[];

  /** Horse groups for checkboxes (optional) */
  groups?: HorseGroup[];

  /** Number of active filters */
  activeFilterCount?: number;

  /** Callback to clear all filters */
  onClearAll?: () => void;

  /** Custom trigger button (optional) */
  children?: React.ReactNode;
}

export function HorseFilterPopover({
  filters,
  onFiltersChange,
  config,
  stables = [],
  groups = [],
  activeFilterCount = 0,
  onClearAll,
  children,
}: HorseFilterPopoverProps) {
  const { t } = useTranslation(["horses"]);
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof HorseFilters>(
    key: K,
    value: HorseFilters[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleGender = (gender: "gelding" | "stallion" | "mare") => {
    const newGenders = filters.genders.includes(gender)
      ? filters.genders.filter(
          (g: "gelding" | "stallion" | "mare") => g !== gender,
        )
      : [...filters.genders, gender];
    updateFilter("genders", newGenders);
  };

  const toggleUsage = (usage: HorseUsage) => {
    const newUsage = filters.usage.includes(usage)
      ? filters.usage.filter((u: HorseUsage) => u !== usage)
      : [...filters.usage, usage];
    updateFilter("usage", newUsage as HorseUsage[]);
  };

  const toggleGroup = (groupId: string) => {
    const newGroups = filters.groups.includes(groupId)
      ? filters.groups.filter((g: string) => g !== groupId)
      : [...filters.groups, groupId];
    updateFilter("groups", newGroups);
  };

  const handleClearAll = () => {
    onClearAll?.();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            {t("horses:filters.title")}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{t("horses:filters.title")}</h4>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                {t("horses:filters.clearAll")}
              </Button>
            )}
          </div>

          {/* Search Filter */}
          {config.showSearch && (
            <div className="space-y-2">
              <Label>{t("horses:filters.search")}</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("horses:filters.searchPlaceholder")}
                  value={filters.searchQuery}
                  onChange={(e) => updateFilter("searchQuery", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          )}

          {/* Stable Filter */}
          {config.showStable && !config.useStableContext && (
            <div className="space-y-2">
              <Label>{t("horses:filters.stable")}</Label>
              <Select
                value={filters.stableId || "all"}
                onValueChange={(value) =>
                  updateFilter("stableId", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("horses:filters.allStables")}
                  </SelectItem>
                  <SelectItem value="unassigned">
                    {t("horses:filters.unassigned")}
                  </SelectItem>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Gender Filter (Multi-Select) */}
          {config.showGender && (
            <div className="space-y-2">
              <Label>{t("horses:filters.gender")}</Label>
              <div className="space-y-2">
                {(["gelding", "stallion", "mare"] as const).map((gender) => (
                  <div key={gender} className="flex items-center space-x-2">
                    <Checkbox
                      id={`gender-${gender}`}
                      checked={filters.genders.includes(gender)}
                      onCheckedChange={() => toggleGender(gender)}
                    />
                    <label
                      htmlFor={`gender-${gender}`}
                      className="text-sm cursor-pointer"
                    >
                      {t(`horses:genders.${gender}`)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Age Range Filter */}
          {config.showAge && (
            <div className="space-y-2">
              <Label>{t("horses:filters.ageRange")}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={t("horses:filters.min")}
                  value={filters.ageMin ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "ageMin",
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                  min={0}
                />
                <Input
                  type="number"
                  placeholder={t("horses:filters.max")}
                  value={filters.ageMax ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "ageMax",
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                  min={0}
                />
              </div>
            </div>
          )}

          {/* Usage Filter */}
          {config.showUsage && (
            <div className="space-y-2">
              <Label>{t("horses:filters.usage")}</Label>
              <div className="space-y-2">
                {(["care", "sport", "breeding"] as const).map((usage) => (
                  <div key={usage} className="flex items-center space-x-2">
                    <Checkbox
                      id={`usage-${usage}`}
                      checked={filters.usage.includes(usage)}
                      onCheckedChange={() => toggleUsage(usage as HorseUsage)}
                    />
                    <label
                      htmlFor={`usage-${usage}`}
                      className="text-sm cursor-pointer"
                    >
                      {t(`horses:usageTypes.${usage}`)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups Filter */}
          {config.showGroups && groups.length > 0 && (
            <div className="space-y-2">
              <Label>{t("horses:filters.groups")}</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={filters.groups.includes(group.id)}
                      onCheckedChange={() => toggleGroup(group.id)}
                    />
                    <label
                      htmlFor={`group-${group.id}`}
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      {group.color && (
                        <div
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      {group.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter */}
          {config.showStatus && (
            <div className="space-y-2">
              <Label>{t("horses:filters.status")}</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  updateFilter(
                    "status",
                    value === "all"
                      ? undefined
                      : (value as "active" | "inactive"),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("horses:filters.all")}</SelectItem>
                  <SelectItem value="active">
                    {t("horses:filters.active")}
                  </SelectItem>
                  <SelectItem value="inactive">
                    {t("horses:filters.inactive")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
