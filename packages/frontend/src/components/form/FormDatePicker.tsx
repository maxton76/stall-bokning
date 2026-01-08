import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField } from './FormField'

/**
 * Form date picker component with integrated label and error display
 * Uses native HTML5 date input for simplicity
 *
 * @example
 * ```tsx
 * <FormDatePicker
 *   name="dateOfBirth"
 *   label="Date of Birth"
 *   form={form}
 * />
 * ```
 */
export interface FormDatePickerProps<T extends FieldValues> {
  /** Field name (must match form schema) */
  name: Path<T>
  /** Field label */
  label: string
  /** React Hook Form instance */
  form: UseFormReturn<T>
  /** Minimum date (YYYY-MM-DD format) */
  min?: string
  /** Maximum date (YYYY-MM-DD format) */
  max?: string
  /** Whether field is required */
  required?: boolean
  /** Whether field is disabled */
  disabled?: boolean
  /** Helper text */
  helperText?: string
  /** Custom class name */
  className?: string
}

export function FormDatePicker<T extends FieldValues>({
  name,
  label,
  form,
  min,
  max,
  required,
  disabled,
  helperText,
  className,
}: FormDatePickerProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined

  return (
    <FormField
      label={label}
      htmlFor={name}
      error={error}
      required={required}
      helperText={helperText}
      className={className}
    >
      <Input
        id={name}
        type="date"
        min={min}
        max={max}
        disabled={disabled}
        {...form.register(name)}
      />
    </FormField>
  )
}
