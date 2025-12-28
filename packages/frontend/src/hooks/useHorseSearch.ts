import { useState, useEffect, useMemo } from 'react'
import type { Horse } from '@/types/roles'

/**
 * Custom hook for debounced horse search
 * Searches across name, ueln, chipNumber, and breed fields
 * @param horses - Array of horses to search
 * @param initialQuery - Initial search query
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with searchQuery, setSearchQuery, and filteredHorses
 */
export function useHorseSearch(
  horses: Horse[],
  initialQuery: string = '',
  debounceMs: number = 300
) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchQuery, debounceMs])

  // Filter horses based on debounced query
  const filteredHorses = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return horses
    }

    const query = debouncedQuery.toLowerCase()

    return horses.filter(horse => {
      // Search across multiple fields (OR logic)
      const nameMatch = horse.name?.toLowerCase().includes(query)
      const uelnMatch = horse.ueln?.toLowerCase().includes(query)
      const chipMatch = horse.chipNumber?.toLowerCase().includes(query)
      const breedMatch = horse.breed?.toLowerCase().includes(query)

      return nameMatch || uelnMatch || chipMatch || breedMatch
    })
  }, [horses, debouncedQuery])

  return {
    searchQuery,
    setSearchQuery,
    filteredHorses,
    isSearching: searchQuery !== debouncedQuery
  }
}
