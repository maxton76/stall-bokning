import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";

/**
 * Form input component with integrated label and error display
 * Wraps shadcn/ui Input with react-hook-form integration
 *
 * @example
 * ```tsx
 * <FormInput
 *   name="email"
 *   label="Email Address"
 *   form={form}
 *   type="email"
 *   placeholder="you@example.com"
 * />
 * ```
 */
export interface FormInputProps<T extends FieldValues> {
  /** Field name (must match form schema) */
  name: Path<T>;
  /** Field label */
  label: string;
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Input type */
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "time";
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Helper text */
  helperText?: string;
  /** Custom class name */
  className?: string;
}

export function FormInput<T extends FieldValues>({
  name,
  label,
  form,
  type = "text",
  placeholder,
  required,
  disabled,
  helperText,
  className,
}: FormInputProps<T>) {
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
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...form.register(name)}
      />
    </FormField>
  );
}
