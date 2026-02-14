/**
 * Real-time Firestore listener for facility reservations.
 *
 * Uses onSnapshot to push live updates into the TanStack Query cache,
 * so the calendar reflects changes from other users within ~1 second.
 *
 * Writes still go through the API (validated, transactional).
 * This listener only reads — it supplements the cache with real-time deltas.
 */

import { useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
  Timestamp,
} from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryClient";
import type { FacilityReservation } from "@/types/facilityReservation";

interface UseReservationListenerOptions {
  /** Stable ID to listen for reservations */
  stableId: string;
  /** Whether the listener should be active */
  enabled?: boolean;
}

/**
 * Attaches a Firestore onSnapshot listener to facility reservations
 * for the given stable. Updates are pushed into the TanStack Query cache
 * so all components using the same query key re-render automatically.
 *
 * The listener is cleaned up on unmount or when stableId/enabled changes.
 */
export function useReservationListener({
  stableId,
  enabled = true,
}: UseReservationListenerOptions): void {
  const queryClient = useQueryClient();
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!enabled || !stableId) {
      return;
    }

    // Build the query — include stableId filter (required by security rules)
    // and a date range to avoid fetching unbounded historical data
    const pastCutoff = new Date();
    pastCutoff.setDate(pastCutoff.getDate() - 7);

    const q = query(
      collection(db, "facilityReservations"),
      where("stableId", "==", stableId),
      where("startTime", ">=", Timestamp.fromDate(pastCutoff)),
    );

    // Attach the snapshot listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Convert Firestore documents to our FacilityReservation type.
        // Firestore returns Timestamp objects, but the API returns ISO strings
        // (via serializeTimestamps). We must match the API format so components
        // don't crash on format()/isSameDay() calls.
        const reservations: FacilityReservation[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startTime: data.startTime?.toDate?.()
              ? data.startTime.toDate().toISOString()
              : data.startTime,
            endTime: data.endTime?.toDate?.()
              ? data.endTime.toDate().toISOString()
              : data.endTime,
            createdAt: data.createdAt?.toDate?.()
              ? data.createdAt.toDate().toISOString()
              : data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()
              ? data.updatedAt.toDate().toISOString()
              : data.updatedAt,
          } as FacilityReservation;
        });

        // Push into the TanStack Query cache using the same key
        // that FacilitiesReservationsPage uses
        const queryKey = queryKeys.facilityReservations.byStable(stableId);
        queryClient.setQueryData(queryKey, reservations);
      },
      (error) => {
        // Log but don't crash — the page still has API-fetched data
        console.warn(
          "Reservation listener error (falling back to API polling):",
          error.message,
        );
      },
    );

    unsubRef.current = unsubscribe;

    // Cleanup: unsubscribe when stableId changes or component unmounts
    return () => {
      unsubscribe();
      unsubRef.current = null;
    };
  }, [stableId, enabled, queryClient]);
}
