import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { FormField } from './FormField'

/**
 * Form checkbox group component with integrated label and error display
 * Allows selecting multiple options from a list
 *
 * @example
 * ```tsx
 * <FormCheckboxGroup
 *   name="roles"
 *   label="Roles"
 *   form={form}
 *   options={[
 *     { value: 'owner', label: 'Owner' },
 *     { value: 'trainer', label: 'Trainer' },
 *     { value: 'rider', label: 'Rider' }
 *   ]}
 * />
 * ```
 */
export interface FormCheckboxGroupProps<T extends FieldValues> {
  /** Field name (must match form schema) */
  name: Path<T>
  /** Group label */
  label: string
  /** React Hook Form instance */
  form: UseFormReturn<T>
  /** Checkbox options */
  options: Array<{ value: string; label: string }>
  /** Whether field is required */
  required?: boolean
  /** Whether field is disabled */
  disabled?: boolean
  /** Helper text */
  helperText?: string
  /** Custom class name */
  className?: string
  /** Grid columns (default: 2) */
  columns?: 1 | 2 | 3 | 4
}

export function FormCheckboxGroup<T extends FieldValues>({
  name,
  label,
  form,
  options,
  required,
  disabled,
  helperText,
  className,
  columns = 2,
}: FormCheckboxGroupProps<T>) {
  const error = form.formState.errors[name]?.message as string | undefined

  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns]

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
          <div className={`grid ${gridClass} gap-3`} id={name}>
            {options.map((option) => {
              const isChecked = Array.isArray(field.value)
                ? field.value.includes(option.value)
                : false

              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${name}-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(field.value) ? field.value : []
                      const updatedValues = checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v: string) => v !== option.value)
                      field.onChange(updatedValues)
                    }}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`${name}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              )
            })}
          </div>
        )}
      />
    </FormField>
  )
}
