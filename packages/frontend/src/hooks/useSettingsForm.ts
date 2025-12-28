import { useState, useCallback, useMemo } from 'react'

interface UseSettingsFormOptions<T> {
  initialValues: T
  onSave?: (values: T) => Promise<void>
  validate?: (values: T) => Partial<Record<keyof T, string | undefined>>
  resetOnSave?: boolean
}

interface UseSettingsFormReturn<T> {
  values: T
  errors: Partial<Record<keyof T, string | undefined>>
  isLoading: boolean
  isDirty: boolean
  updateField: <K extends keyof T>(field: K, value: T[K]) => void
  updateValues: (updates: Partial<T>) => void
  handleSave: () => Promise<void>
  reset: () => void
  hasErrors: boolean
}

export function useSettingsForm<T extends Record<string, any>>({
  initialValues,
  onSave,
  validate,
  resetOnSave = false
}: UseSettingsFormOptions<T>): UseSettingsFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string | undefined>>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Track if form has been modified
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues)
  }, [values, initialValues])

  // Check if there are any validation errors
  const hasErrors = useMemo(() => {
    return Object.values(errors).some(error => error !== undefined && error !== '')
  }, [errors])

  // Update a single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }))

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  // Update multiple fields at once
  const updateValues = useCallback((updates: Partial<T>) => {
    setValues(prev => ({ ...prev, ...updates }))

    // Clear errors for updated fields
    const updatedFields = Object.keys(updates) as Array<keyof T>
    setErrors(prev => {
      const newErrors = { ...prev }
      updatedFields.forEach(field => {
        if (newErrors[field]) {
          newErrors[field] = undefined
        }
      })
      return newErrors
    })
  }, [])

  // Handle form save
  const handleSave = useCallback(async () => {
    // Validate if validation function provided
    if (validate) {
      const validationErrors = validate(values)
      setErrors(validationErrors)

      // Don't save if there are validation errors
      const hasValidationErrors = Object.values(validationErrors).some(
        error => error !== undefined && error !== ''
      )
      if (hasValidationErrors) {
        return
      }
    }

    if (!onSave) return

    try {
      setIsLoading(true)
      await onSave(values)

      if (resetOnSave) {
        setValues(initialValues)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [values, validate, onSave, resetOnSave, initialValues])

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
  }, [initialValues])

  return {
    values,
    errors,
    isLoading,
    isDirty,
    updateField,
    updateValues,
    handleSave,
    reset,
    hasErrors
  }
}
