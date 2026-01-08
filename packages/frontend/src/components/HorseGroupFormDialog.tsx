import { useEffect } from 'react'
import { z } from 'zod'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { FormInput, FormTextarea } from '@/components/form'
import { Label } from '@/components/ui/label'
import type { HorseGroup } from '@/types/roles'

interface HorseGroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (group: Omit<HorseGroup, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>
  group?: HorseGroup | null
  title?: string
}

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'green', label: 'Green', color: '#10b981' },
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
  { value: 'pink', label: 'Pink', color: '#ec4899' },
]

const horseGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(50, 'Name must be 50 characters or less'),
  description: z.string().optional(),
  color: z.string().min(1, 'Please select a color'),
})

type HorseGroupFormData = z.infer<typeof horseGroupSchema>

export function HorseGroupFormDialog({
  open,
  onOpenChange,
  onSave,
  group,
  title
}: HorseGroupFormDialogProps) {
  const isEditMode = !!group

  const { form, handleSubmit, resetForm } = useFormDialog<HorseGroupFormData>({
    schema: horseGroupSchema,
    defaultValues: {
      name: '',
      description: '',
      color: COLOR_OPTIONS[0]?.value || '#3b82f6',
    },
    onSubmit: async (data) => {
      await onSave({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        color: data.color,
      })
    },
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: isEditMode ? 'Horse group updated successfully' : 'Horse group created successfully',
    errorMessage: isEditMode ? 'Failed to update horse group' : 'Failed to create horse group',
  })

  // Watch color field for selection display
  const selectedColor = form.watch('color')

  // Reset form when dialog opens with group data
  useEffect(() => {
    if (group) {
      resetForm({
        name: group.name,
        description: group.description || '',
        color: group.color || COLOR_OPTIONS[0]?.value || '#3b82f6',
      })
    } else {
      resetForm()
    }
  }, [group, open])

  const dialogTitle = title || (isEditMode ? 'Edit Horse Group' : 'Create Horse Group')
  const dialogDescription = isEditMode
    ? 'Update the horse group details below.'
    : 'Create a new group to organize your horses.'

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Update' : 'Create'}
      maxWidth="sm:max-w-[500px]"
    >
      <FormInput
        name="name"
        label="Group Name"
        form={form}
        placeholder="e.g., Competition Horses"
        required
      />

      <FormTextarea
        name="description"
        label="Description"
        form={form}
        placeholder="Optional description for this group"
        rows={3}
      />

      {/* Color Picker - Custom implementation for better UX */}
      <div className="space-y-2">
        <Label>Color <span className="text-destructive ml-1">*</span></Label>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => form.setValue('color', option.value)}
              className={`flex items-center gap-2 p-3 rounded-md border-2 transition-colors ${
                selectedColor === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: option.color }}
              />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
        {form.formState.errors.color && (
          <p className="text-sm text-destructive">{form.formState.errors.color.message}</p>
        )}
      </div>
    </BaseFormDialog>
  )
}
