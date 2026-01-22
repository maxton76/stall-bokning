import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { Horse } from "@/types/roles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeedingHistoryFilters as FilterState } from "@/services/feedingHistoryService";
import { authFetchJSON } from "@/utils/authFetch";

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/horses`;

interface Props {
  stableId: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FeedingHistoryFilters({
  stableId,
  filters,
  onFiltersChange,
}: Props) {
  const { t } = useTranslation(["feeding", "common"]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  // Load horses for the stable via API
  useEffect(() => {
    if (!stableId) return;

    const loadHorses = async () => {
      try {
        setLoading(true);
        const response = await authFetchJSON<{ horses: Horse[] }>(
          `${API_BASE}?stableId=${stableId}`,
        );
        setHorses(response.horses.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Failed to load horses:", error);
        setHorses([]);
      } finally {
        setLoading(false);
      }
    };

    loadHorses();
  }, [stableId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Horse Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          {t("common:horse")}
        </label>
        <Select
          value={filters.horseId || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, horseId: value })
          }
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("common:filters.allHorses", "All Horses")}
            </SelectItem>
            {horses.map((horse) => (
              <SelectItem key={horse.id} value={horse.id}>
                {horse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          {t("feeding:history.action", "Action")}
        </label>
        <Select
          value={filters.action || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              action: value as FilterState["action"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("common:filters.allActions", "All Actions")}
            </SelectItem>
            <SelectItem value="create">
              {t("feeding:history.actions.create", "Created")}
            </SelectItem>
            <SelectItem value="update">
              {t("feeding:history.actions.update", "Updated")}
            </SelectItem>
            <SelectItem value="delete">
              {t("feeding:history.actions.delete", "Deleted")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Limit Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          {t("common:filters.limit", "Limit")}
        </label>
        <Select
          value={String(filters.limit || 100)}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, limit: Number(value) })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
