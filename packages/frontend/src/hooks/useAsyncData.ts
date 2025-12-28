import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

/**
 * Options for useAsyncData hook
 * @template T - Type of data being loaded
 */
interface UseAsyncDataOptions<T> {
  /** Async function that loads the data */
  loadFn: () => Promise<T>
  /** Custom error message to display on failure */
  errorMessage?: string
  /** Callback executed on successful load */
  onSuccess?: (data: T) => void
}

/**
 * Async data loading hook with error handling and toast notifications
 * Standardizes async data loading patterns across all components
 *
 * @template T - Type of data being loaded
 * @param options - Configuration options
 * @returns Data state and control functions
 *
 * @example
 * ```tsx
 * // Before: Duplicate try-catch-toast pattern
 * const loadStableHorses = async () => {
 *   if (!stableId) return
 *   try {
 *     const horsesData = await getStableHorses(stableId)
 *     setHorses(horsesData)
 *   } catch (error) {
 *     console.error('Error loading horses:', error)
 *     toast({ title: 'Error', description: 'Failed to load horses', variant: 'destructive' })
 *   }
 * }
 *
 * // After: Single hook call
 * const horses = useAsyncData({
 *   loadFn: () => getStableHorses(stableId!),
 *   errorMessage: 'Failed to load horses. Please try again.'
 * })
 *
 * // Usage:
 * useEffect(() => { horses.load() }, [stableId])
 * horses.data        // Access loaded data
 * horses.loading     // Check loading state
 * horses.error       // Access error if occurred
 * horses.reload()    // Reload data
 * horses.reset()     // Clear data and error
 * ```
 */
export function useAsyncData<T>(options: UseAsyncDataOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  /**
   * Load data using the provided loadFn
   * @returns Promise resolving to the loaded data
   */
  const load = async (): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const result = await options.loadFn()
      setData(result)
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      toast({
        title: 'Error',
        description: options.errorMessage || 'An error occurred',
        variant: 'destructive'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Reload data (alias for load)
   */
  const reload = () => load()

  /**
   * Reset data and error state
   */
  const reset = () => {
    setData(null)
    setError(null)
  }

  return {
    data,
    loading,
    error,
    load,
    reload,
    reset,
    setData
  }
}
