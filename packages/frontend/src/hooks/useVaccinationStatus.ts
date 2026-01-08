import { useState, useEffect } from 'react'
import { getVaccinationStatus } from '@/services/vaccinationService'
import type { VaccinationStatusResult } from '@shared/types/vaccination'
import type { Horse } from '@/types/roles'

/**
 * React hook for efficient vaccination status loading with caching
 *
 * @param horse - The horse to get vaccination status for
 * @returns Object containing status, loading state, and error
 *
 * @example
 * ```tsx
 * const MyComponent = ({ horse }) => {
 *   const { status, loading, error } = useVaccinationStatus(horse)
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Error message={error.message} />
 *
 *   return <VaccinationBadge status={status} />
 * }
 * ```
 */
export function useVaccinationStatus(horse: Horse) {
  const [status, setStatus] = useState<VaccinationStatusResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadStatus = async () => {
      try {
        setLoading(true)
        const result = await getVaccinationStatus(horse)
        if (!cancelled) {
          setStatus(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStatus()

    return () => {
      cancelled = true
    }
  }, [horse.id, horse.vaccinationRuleId, horse.lastVaccinationDate])

  return { status, loading, error }
}
