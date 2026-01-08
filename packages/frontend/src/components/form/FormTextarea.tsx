import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from './FormField'

/**
 * Form textarea component with integrated label and error display
 * Wraps shadcn/ui Textarea with react-hook-form integration
 *
 * @example
 * ```tsx
 * <FormTextarea
 *   name="notes"
 *   label="Notes"
 *   form={form}
 *   placeholder="Enter additional notes..."
 *   rows={4}
 * />
 * ```
 */
export interface FormTextareaProps<T extends FieldValues> {
  /** Field name (must match form schema) */
  name: Path<T>
  /** Field label */
  label: string
  /** React Hook Form instance */
  form: UseFormReturn<T>
  /** Placeholder text */
  placeholder?: string
  /** Number of rows */
  rows?: number
  /** Whether field is required */
  required?: boolean
  /** Whether field is disabled */
  disabled?: boolean
  /** Helper text */
  helperText?: string
  /** Custom class name */
  className?: string
}

export function FormTextarea<T extends FieldValues>({
  name,
  label,
  form,
  placeholder,
  rows = 4,
  required,
  disabled,
  helperText,
  className,
}: FormTextareaProps<T>) {
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
      <Textarea
        id={name}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        {...form.register(name)}
      />
    </FormField>
  )
}
