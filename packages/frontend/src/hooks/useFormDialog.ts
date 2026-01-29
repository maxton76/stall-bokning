import {
  useForm,
  type UseFormReturn,
  type FieldValues,
  type DefaultValues,
} from "react-hook-form";
import { useCallback, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodSchema } from "zod";
import { useToast } from "@/hooks/use-toast";

/**
 * Options for useFormDialog hook
 * @template T - Form data type (extends FieldValues)
 */
export interface UseFormDialogOptions<T extends FieldValues> {
  /** Zod validation schema */
  schema: ZodSchema<T>;
  /** Default form values */
  defaultValues: DefaultValues<T>;
  /** Submit handler - receives validated data */
  onSubmit: (data: T) => Promise<void>;
  /** Success callback - called after successful submit */
  onSuccess?: () => void;
  /** Error callback - called on submit error */
  onError?: (error: Error) => void;
  /** Success toast message (optional, default: "Success") */
  successMessage?: string;
  /** Error toast message (optional, default: generic error message) */
  errorMessage?: string;
}

/**
 * Return type for useFormDialog hook
 * @template T - Form data type
 */
export interface UseFormDialogReturn<T extends FieldValues> {
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Submit handler with error handling and toast notifications */
  handleSubmit: (data: T) => Promise<void>;
  /** Reset form with optional new values */
  resetForm: (values?: Partial<T>) => void;
}

/**
 * Hook for managing form dialog state with react-hook-form and Zod validation
 *
 * Centralizes form state management, validation, submission, and error handling
 * patterns used across all form dialogs.
 *
 * @template T - Form data type (extends FieldValues)
 * @param options - Configuration options
 * @returns Form instance and control functions
 *
 * @example
 * ```tsx
 * // Define schema
 * const schema = z.object({
 *   name: z.string().min(1, 'Name is required'),
 *   email: z.string().email('Invalid email'),
 * })
 *
 * type FormData = z.infer<typeof schema>
 *
 * // In component
 * const { form, handleSubmit, resetForm } = useFormDialog<FormData>({
 *   schema,
 *   defaultValues: { name: '', email: '' },
 *   onSubmit: async (data) => {
 *     await createUser(data)
 *   },
 *   onSuccess: () => {
 *     onDialogClose()
 *   },
 *   successMessage: 'User created successfully',
 *   errorMessage: 'Failed to create user',
 * })
 *
 * // Reset form when dialog opens with entry data
 * useEffect(() => {
 *   if (entry) {
 *     resetForm(entry)
 *   } else {
 *     resetForm()
 *   }
 * }, [entry, open])
 *
 * // In JSX
 * <form onSubmit={form.handleSubmit(handleSubmit)}>
 *   <Input {...form.register('name')} />
 *   <Input {...form.register('email')} />
 *   <Button type="submit" disabled={form.formState.isSubmitting}>
 *     {form.formState.isSubmitting ? 'Saving...' : 'Save'}
 *   </Button>
 * </form>
 * ```
 */
export function useFormDialog<T extends FieldValues>(
  options: UseFormDialogOptions<T>,
): UseFormDialogReturn<T> {
  const { toast } = useToast();

  // Use ref to avoid infinite loops when defaultValues is an inline object
  // This prevents resetForm from being recreated on every render
  const defaultValuesRef = useRef(options.defaultValues);
  defaultValuesRef.current = options.defaultValues;

  // Initialize form with react-hook-form
  const form = useForm<T>({
    resolver: zodResolver(options.schema as any) as any,
    defaultValues: options.defaultValues,
  });

  /**
   * Submit handler with error handling and toast notifications
   */
  const handleSubmit = async (data: T): Promise<void> => {
    try {
      await options.onSubmit(data);

      // Show success toast
      toast({
        title: "Success",
        description:
          options.successMessage || "Operation completed successfully",
      });

      // Call success callback
      options.onSuccess?.();
    } catch (error) {
      const err = error as Error;
      console.error("Form submission error:", err);

      // Show error toast
      toast({
        title: "Error",
        description:
          options.errorMessage ||
          err.message ||
          "An error occurred. Please try again.",
        variant: "destructive",
      });

      // Call error callback
      options.onError?.(err);

      // Re-throw to allow component-level error handling if needed
      throw err;
    }
  };

  /**
   * Reset form with optional new values
   * @param values - New values to populate form (optional)
   */
  const resetForm = useCallback(
    (values?: Partial<T>) => {
      if (values) {
        form.reset(values as DefaultValues<T>);
      } else {
        // Use ref to get current defaultValues without causing dependency changes
        form.reset(defaultValuesRef.current);
      }
    },
    [form],
  );

  return {
    form,
    handleSubmit,
    resetForm,
  };
}
