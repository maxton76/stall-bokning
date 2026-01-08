import { useState, useEffect } from 'react'
import { getHorseLocationHistory, getUserHorseLocationHistory } from '@/services/locationHistoryService'
import type { LocationHistory, LocationHistoryDisplay } from '@/types/roles'

/**
 * Custom hook for loading and managing location history
 * @param horseId - Horse ID to filter by, or 'all' for all horses
 * @returns Location history with loading and error states
 */
export function useLocationHistory(horseId?: string) {
  const [history, setHistory] = useState<LocationHistoryDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      let data: LocationHistory[]

      if (!horseId || horseId === 'all') {
        // Load all location history
        data = await getUserHorseLocationHistory('')
      } else {
        // Load history for specific horse
        data = await getHorseLocationHistory(horseId)
      }

      // Convert Timestamps to Dates for UI
      const displayData: LocationHistoryDisplay[] = data.map(entry => ({
        id: entry.id,
        horseId: entry.horseId,
        horseName: entry.horseName,
        locationType: entry.locationType ?? 'stable',
        stableId: entry.stableId,
        stableName: entry.stableName,
        externalContactId: entry.externalContactId,
        externalLocation: entry.externalLocation,
        externalMoveType: entry.externalMoveType,
        externalMoveReason: entry.externalMoveReason,
        arrivalDate: entry.arrivalDate.toDate(),
        departureDate: entry.departureDate ? entry.departureDate.toDate() : undefined,
        createdAt: entry.createdAt.toDate(),
        createdBy: entry.createdBy,
        lastModifiedBy: entry.lastModifiedBy,
        isCurrentLocation: !entry.departureDate
      }))

      setHistory(displayData)
    } catch (err) {
      console.error('Error loading location history:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [horseId])

  return {
    history,
    loading,
    error,
    reload: loadHistory
  }
}
