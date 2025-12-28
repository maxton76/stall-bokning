import { useCallback, useMemo } from 'react'

interface UseConditionalToggleOptions<T> {
  values: T
  masterField: keyof T
  dependentFields: Array<keyof T>
  onToggle?: (field: keyof T, value: boolean) => void
}

interface UseConditionalToggleReturn<T> {
  isEnabled: (field: keyof T) => boolean
  handleToggle: (field: keyof T, value: boolean) => void
  disableDependents: () => void
}

export function useConditionalToggle<T extends Record<string, any>>({
  values,
  masterField,
  dependentFields,
  onToggle
}: UseConditionalToggleOptions<T>): UseConditionalToggleReturn<T> {
  // Check if a field is enabled (master must be true for dependents)
  const isEnabled = useCallback((field: keyof T): boolean => {
    if (field === masterField) {
      return true
    }

    if (dependentFields.includes(field)) {
      return values[masterField] === true
    }

    return true
  }, [values, masterField, dependentFields])

  // Handle toggle with automatic dependent disabling
  const handleToggle = useCallback((field: keyof T, value: boolean) => {
    // If master is being disabled, disable all dependents
    if (field === masterField && !value) {
      dependentFields.forEach(depField => {
        if (onToggle) {
          onToggle(depField, false)
        }
      })
    }

    if (onToggle) {
      onToggle(field, value)
    }
  }, [masterField, dependentFields, onToggle])

  // Disable all dependent fields
  const disableDependents = useCallback(() => {
    dependentFields.forEach(field => {
      if (onToggle) {
        onToggle(field, false)
      }
    })
  }, [dependentFields, onToggle])

  return {
    isEnabled,
    handleToggle,
    disableDependents
  }
}
