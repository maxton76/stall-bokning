import { useState, useMemo } from 'react'
import type { Horse } from '@/types/roles'

export interface HorseFilters {
  stableId?: string // 'all', 'unassigned', or specific stable ID
  gender?: string // 'stallion', 'mare', 'gelding'
  ageMin?: number
  ageMax?: number
  usage?: string[] // ['care', 'sport', 'breeding']
  status?: 'active' | 'inactive'
}

const INITIAL_FILTERS: HorseFilters = {
  stableId: 'all',
  status: 'active'
}

/**
 * Custom hook for advanced horse filtering
 * @param horses - Array of horses to filter
 * @returns Object with filters, setFilters, filteredHorses, and utility functions
 */
export function useHorseFilters(horses: Horse[]) {
  const [filters, setFilters] = useState<HorseFilters>(INITIAL_FILTERS)

  // Apply all filters (AND logic)
  const filteredHorses = useMemo(() => {
    return horses.filter(horse => {
      // Stable filter
      if (filters.stableId && filters.stableId !== 'all') {
        if (filters.stableId === 'unassigned') {
          if (horse.currentStableId) return false
        } else {
          if (horse.currentStableId !== filters.stableId) return false
        }
      }

      // Gender filter
      if (filters.gender && horse.gender !== filters.gender) {
        return false
      }

      // Age range filter
      if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
        let age: number | undefined

        // Try to use age field first
        if (horse.age !== undefined) {
          age = horse.age
        } else if (horse.dateOfBirth) {
          // Calculate age from dateOfBirth
          const birthDate = horse.dateOfBirth.toDate()
          const today = new Date()
          age = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }
        }

        if (age === undefined) return false

        if (filters.ageMin !== undefined && age < filters.ageMin) return false
        if (filters.ageMax !== undefined && age > filters.ageMax) return false
      }

      // Usage filter (multi-select with AND logic)
      if (filters.usage && filters.usage.length > 0) {
        if (!horse.usage || horse.usage.length === 0) return false

        // Check if horse has ALL selected usage types
        const hasAllUsages = filters.usage.every(usage =>
          horse.usage?.includes(usage as 'care' | 'sport' | 'breeding')
        )
        if (!hasAllUsages) return false
      }

      // Status filter
      if (filters.status && horse.status !== filters.status) {
        return false
      }

      return true
    })
  }, [horses, filters])

  // Check if any filters are active (excluding defaults)
  const hasActiveFilters = useMemo(() => {
    return (
      (filters.stableId && filters.stableId !== 'all') ||
      !!filters.gender ||
      filters.ageMin !== undefined ||
      filters.ageMax !== undefined ||
      (filters.usage && filters.usage.length > 0) ||
      (filters.status && filters.status !== 'active')
    )
  }, [filters])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.stableId && filters.stableId !== 'all') count++
    if (filters.gender) count++
    if (filters.ageMin !== undefined || filters.ageMax !== undefined) count++
    if (filters.usage && filters.usage.length > 0) count++
    if (filters.status && filters.status !== 'active') count++
    return count
  }, [filters])

  // Clear all filters
  const clearFilters = () => {
    setFilters(INITIAL_FILTERS)
  }

  // Update a single filter
  const updateFilter = <K extends keyof HorseFilters>(
    key: K,
    value: HorseFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return {
    filters,
    setFilters,
    updateFilter,
    filteredHorses,
    hasActiveFilters,
    activeFilterCount,
    clearFilters
  }
}
