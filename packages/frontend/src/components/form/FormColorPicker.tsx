import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { FormField } from './FormField'
import { cn } from '@/lib/utils'

/**
 * Form color picker component with integrated label and error display
 * Displays a grid of color swatches for selection
 *
 * @example
 * ```tsx
 * <FormColorPicker
 *   name="color"
 *   label="Color"
 *   form={form}
 *   colors={['#ef4444', '#f97316', '#f59e0b']}
 * />
 * ```
 */
export interface FormColorPickerProps<T extends FieldValues> {
  /** Field name (must match form schema) */
  name: Path<T>
  /** Field label */
  label: string
  /** React Hook Form instance */
  form: UseFormReturn<T>
  /** Available colors (hex codes) */
  colors: string[]
  /** Whether field is required */
  required?: boolean
  /** Whether field is disabled */
  disabled?: boolean
  /** Helper text */
  helperText?: string
  /** Custom class name */
  className?: string
}

export function FormColorPicker<T extends FieldValues>({
  name,
  label,
  form,
  colors,
  required,
  disabled,
  helperText,
  className,
}: FormColorPickerProps<T>) {
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
      <Controller
        name={name}
        control={form.control}
        render={({ field }) => (
          <div className="flex flex-wrap gap-2" id={name}>
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-all',
                  field.value === color ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: color }}
                onClick={() => field.onChange(color)}
                disabled={disabled}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        )}
      />
    </FormField>
  )
}
