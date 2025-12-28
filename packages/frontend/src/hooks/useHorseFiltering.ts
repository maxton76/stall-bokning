import { useState, useMemo } from 'react'
import type { Horse } from '@/types/roles'

/**
 * Horse filtering and grouping hook
 * Encapsulates horse filtering logic and stable grouping for MyHorsesPage
 *
 * @param horses - Array of all horses to filter and group
 * @returns Filtered horses, grouped data, and tab control
 *
 * @example
 * ```tsx
 * // Before: Multiple state and logic scattered
 * const [activeTab, setActiveTab] = useState('all')
 * const filteredHorses = horses.filter(h => ...)  // 25 lines of logic
 *
 * // After: Single hook call
 * const {
 *   activeTab,
 *   setActiveTab,
 *   filteredHorses,
 *   stableGroups,
 *   unassignedHorses
 * } = useHorseFiltering(horses)
 * ```
 */
export function useHorseFiltering(horses: Horse[]) {
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'unassigned'>('all')

  /**
   * Filter horses based on active tab
   */
  const filteredHorses = useMemo(() => {
    if (activeTab === 'assigned') return horses.filter(h => h.currentStableId)
    if (activeTab === 'unassigned') return horses.filter(h => !h.currentStableId)
    return horses
  }, [horses, activeTab])

  /**
   * Group assigned horses by stable
   */
  const groupedByStable = useMemo(() => {
    return filteredHorses
      .filter(h => h.currentStableId)
      .reduce((acc, horse) => {
        const stableId = horse.currentStableId!
        if (!acc[stableId]) {
          acc[stableId] = {
            stableId,
            stableName: horse.currentStableName || 'Unknown Stable',
            horses: []
          }
        }
        acc[stableId].horses.push(horse)
        return acc
      }, {} as Record<string, { stableId: string; stableName: string; horses: Horse[] }>)
  }, [filteredHorses])

  /**
   * Convert grouped object to array
   */
  const stableGroups = Object.values(groupedByStable)

  /**
   * Get unassigned horses from filtered set
   */
  const unassignedHorses = filteredHorses.filter(h => !h.currentStableId)

  return {
    activeTab,
    setActiveTab,
    filteredHorses,
    stableGroups,
    unassignedHorses
  }
}
