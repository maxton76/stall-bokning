import type { ReactNode } from 'react'
import type { UseFormReturn, FieldValues } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Props for BaseFormDialog component
 * @template T - Form data type (extends FieldValues)
 */
export interface BaseFormDialogProps<T extends FieldValues> {
  /** Dialog open state */
  open: boolean
  /** Dialog close handler */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Dialog description (optional) */
  description?: string
  /** Form children (form fields) */
  children: ReactNode
  /** React Hook Form instance */
  form: UseFormReturn<T>
  /** Form submit handler */
  onSubmit: (data: T) => Promise<void>
  /** Submit button label (default: "Save") */
  submitLabel?: string
  /** Cancel button label (default: "Cancel") */
  cancelLabel?: string
  /** Maximum content width class (default: "sm:max-w-[550px]") */
  maxWidth?: string
  /** Maximum content height class (default: "max-h-[90vh]") */
  maxHeight?: string
}

/**
 * Base form dialog component with standard structure and behavior
 *
 * Provides consistent dialog structure, loading states, and keyboard handling
 * for all form dialogs in the application.
 *
 * @template T - Form data type (extends FieldValues)
 *
 * @example
 * ```tsx
 * // Define schema and form
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
 *   onSuccess: () => onClose(),
 * })
 *
 * // Render
 * <BaseFormDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Create User"
 *   description="Add a new user to the system"
 *   form={form}
 *   onSubmit={handleSubmit}
 * >
 *   <div className="space-y-4">
 *     <div>
 *       <Label htmlFor="name">Name</Label>
 *       <Input id="name" {...form.register('name')} />
 *       {form.formState.errors.name && (
 *         <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
 *       )}
 *     </div>
 *     <div>
 *       <Label htmlFor="email">Email</Label>
 *       <Input id="email" {...form.register('email')} />
 *       {form.formState.errors.email && (
 *         <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
 *       )}
 *     </div>
 *   </div>
 * </BaseFormDialog>
 * ```
 */
export function BaseFormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  children,
  form,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  maxWidth = 'sm:max-w-[550px]',
  maxHeight = 'max-h-[90vh]',
}: BaseFormDialogProps<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxWidth} ${maxHeight} overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {children}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
