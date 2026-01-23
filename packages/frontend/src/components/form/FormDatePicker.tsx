import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";

/**
 * Form date picker component with integrated label and error display
 * Uses native HTML5 date input for simplicity
 * Handles conversion between Date objects and YYYY-MM-DD strings
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
  name: Path<T>;
  /** Field label */
  label: string;
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Minimum date (YYYY-MM-DD format) */
  min?: string;
  /** Maximum date (YYYY-MM-DD format) */
  max?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Helper text */
  helperText?: string;
  /** Custom class name */
  className?: string;
}

/**
 * Converts a value to YYYY-MM-DD string format for HTML5 date input
 * Handles Date objects, ISO strings, and null/undefined values
 */
function toDateInputValue(value: unknown): string {
  if (!value) return "";

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    // Format as YYYY-MM-DD in local timezone
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string") {
    // Already in correct format or ISO string
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // Try parsing as ISO string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return "";
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
  const error = form.formState.errors[name]?.message as string | undefined;

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
          <Input
            id={name}
            type="date"
            min={min}
            max={max}
            disabled={disabled}
            value={toDateInputValue(field.value)}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) {
                field.onChange("");
              } else {
                // Keep the string format for better compatibility with z.coerce.date()
                field.onChange(value);
              }
            }}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
    </FormField>
  );
}
