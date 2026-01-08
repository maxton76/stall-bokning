import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from './FormField'

/**
 * Form select component with integrated label and error display
 * Wraps shadcn/ui Select with react-hook-form integration
 *
 * @example
 * ```tsx
 * <FormSelect
 *   name="gender"
 *   label="Gender"
 *   form={form}
 *   placeholder="Select gender"
 *   options={[
 *     { value: 'mare', label: 'Mare' },
 *     { value: 'stallion', label: 'Stallion' },
 *     { value: 'gelding', label: 'Gelding' }
 *   ]}
 * />
 * ```
 */
export interface FormSelectProps<T extends FieldValues> {
  /** Field name (must match form schema) */
  name: Path<T>
  /** Field label */
  label: string
  /** React Hook Form instance */
  form: UseFormReturn<T>
  /** Select options */
  options: Array<{ value: string; label: string }>
  /** Placeholder text */
  placeholder?: string
  /** Whether field is required */
  required?: boolean
  /** Whether field is disabled */
  disabled?: boolean
  /** Helper text */
  helperText?: string
  /** Custom class name */
  className?: string
}

export function FormSelect<T extends FieldValues>({
  name,
  label,
  form,
  options,
  placeholder = 'Select an option',
  required,
  disabled,
  helperText,
  className,
}: FormSelectProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined
  const value = form.watch(name) as string

  return (
    <FormField
      label={label}
      htmlFor={name}
      error={error}
      required={required}
      helperText={helperText}
      className={className}
    >
      <Select
        value={value ?? ''}
        onValueChange={(newValue) => form.setValue(name, newValue as any)}
        disabled={disabled}
      >
        <SelectTrigger id={name}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}
