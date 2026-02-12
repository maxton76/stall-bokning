import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
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
import { FeedingHistoryFilters } from "@/components/feeding/FeedingHistoryFilters";
import { FeedingHistoryTimeline } from "@/components/feeding/FeedingHistoryTimeline";
import {
  getFeedingHistoryByStable,
  type FeedingHistoryFilters as FilterState,
} from "@/services/feedingHistoryService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useDefaultStableId } from "@/hooks/useUserPreferences";
import type { AuditLog } from "@shared/types/auditLog";

export default function FeedingHistoryPage() {
  const { t } = useTranslation(["feeding", "common"]);
  const { user } = useAuth();
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);
  const defaultStableId = useDefaultStableId();

  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    limit: 100,
    action: "all",
    horseId: "all",
  });

  // Set default stable: default stable (if accessible) > first stable
  useEffect(() => {
    if (!selectedStableId && stables.length > 0) {
      const preferred =
        defaultStableId && stables.some((s) => s.id === defaultStableId)
          ? defaultStableId
          : stables[0]?.id;
      if (preferred) setSelectedStableId(preferred);
    }
  }, [stables, selectedStableId, defaultStableId]);

  // Load history when stable or filters change
  useEffect(() => {
    if (!selectedStableId) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await getFeedingHistoryByStable(selectedStableId, filters);
        setLogs(data);
      } catch (error) {
        console.error("Failed to load feeding history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [selectedStableId, filters]);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <History className="h-6 w-6" />
            <div className="flex-1">
              <CardTitle>
                {t("feeding:history.title", "Feeding History")}
              </CardTitle>
              <CardDescription>
                {t(
                  "feeding:history.description",
                  "View all changes to feeding schedules",
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stable Selector */}
          {stables.length > 1 && (
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-2 block">
                {t("common:stable", "Stable")}
              </label>
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
                disabled={stablesLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filters */}
          {selectedStableId && (
            <FeedingHistoryFilters
              stableId={selectedStableId}
              filters={filters}
              onFiltersChange={setFilters}
            />
          )}

          {/* Timeline */}
          {selectedStableId && (
            <FeedingHistoryTimeline logs={logs} loading={loading} />
          )}

          {/* No stable selected message */}
          {!selectedStableId && !stablesLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {t(
                  "common:selectStableToView",
                  "Select a stable to view history",
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
