import { useState, useEffect } from "react";
import {
  getHorseLocationHistory,
  getUserHorseLocationHistory,
} from "@/services/locationHistoryService";
import { useAuth } from "@/contexts/AuthContext";
import type { LocationHistory, LocationHistoryDisplay } from "@/types/roles";
import { toDate } from "@/utils/timestampUtils";

/**
 * Custom hook for loading and managing location history
 * @param horseId - Horse ID to filter by, or 'all' for all user's horses
 * @returns Location history with loading and error states
 */
export function useLocationHistory(horseId?: string) {
  const { user } = useAuth();
  const [history, setHistory] = useState<LocationHistoryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadHistory = async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let data: LocationHistory[];

      if (!horseId || horseId === "all") {
        // Load all location history for user's horses
        data = await getUserHorseLocationHistory(user.uid);
      } else {
        // Load history for specific horse
        data = await getHorseLocationHistory(horseId);
      }

      // Convert Timestamps to Dates for UI
      const displayData: LocationHistoryDisplay[] = data.map((entry) => ({
        id: entry.id,
        horseId: entry.horseId,
        horseName: entry.horseName,
        locationType: entry.locationType ?? "stable",
        stableId: entry.stableId,
        stableName: entry.stableName,
        externalContactId: entry.externalContactId,
        externalLocation: entry.externalLocation,
        externalMoveType: entry.externalMoveType,
        externalMoveReason: entry.externalMoveReason,
        arrivalDate: toDate(entry.arrivalDate) || new Date(),
        departureDate: entry.departureDate
          ? toDate(entry.departureDate) || undefined
          : undefined,
        createdAt: toDate(entry.createdAt) || new Date(),
        createdBy: entry.createdBy,
        lastModifiedBy: entry.lastModifiedBy,
        isCurrentLocation: !entry.departureDate,
      }));

      setHistory(displayData);
    } catch (err) {
      console.error("Error loading location history:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [horseId, user?.uid]);

  return {
    history,
    loading,
    error,
    reload: loadHistory,
  };
}
