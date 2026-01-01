import { useEffect } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { ActivityTypeConfig, ActivityTypeCategory } from '@/types/activity'
import { DEFAULT_COLORS } from '@/types/activity'
import { cn } from '@/lib/utils'

const ACTIVITY_CATEGORIES: { value: ActivityTypeCategory; label: string }[] = [
  { value: 'Sport', label: 'Sport' },
  { value: 'Care', label: 'Care' },
  { value: 'Breeding', label: 'Breeding' },
]

const AVAILABLE_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'rider', label: 'Rider' },
  { value: 'groom', label: 'Groom' },
  { value: 'veterinarian', label: 'Veterinarian' },
  { value: 'farrier', label: 'Farrier' },
  { value: 'dentist', label: 'Dentist' },
] as const

const activityTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #ef4444)'),
  category: z.enum(['Sport', 'Care', 'Breeding']),
  roles: z.array(z.string()).min(1, 'Select at least one role'),
})

type ActivityTypeFormData = z.infer<typeof activityTypeSchema>

interface ActivityTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activityType?: ActivityTypeConfig
  onSave: (data: {
    name: string
    color: string
    category: ActivityTypeCategory
    roles: string[]
    icon?: string
  }) => Promise<void>
}

export function ActivityTypeFormDialog({
  open,
  onOpenChange,
  activityType,
  onSave,
}: ActivityTypeFormDialogProps) {
  const isEditMode = !!activityType
  const isStandardType = activityType?.isStandard ?? false

  const { form, handleSubmit, resetForm } = useFormDialog<ActivityTypeFormData>({
    schema: activityTypeSchema,
    defaultValues: {
      name: '',
      color: '#6366f1', // Default indigo
      category: 'Sport',
      roles: [],
    },
    onSubmit: async (data) => {
      await onSave({
        name: data.name,
        color: data.color,
        category: data.category,
        roles: data.roles, // Already an array
      })
    },
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: isEditMode ? 'Activity type updated successfully' : 'Activity type created successfully',
    errorMessage: isEditMode ? 'Failed to update activity type' : 'Failed to create activity type',
  })

  // Watch color field for live preview
  const selectedColor = form.watch('color')

  // Reset form when dialog opens with activity type data
  useEffect(() => {
    if (activityType) {
      resetForm({
        name: activityType.name,
        color: activityType.color,
        category: activityType.category,
        roles: activityType.roles, // Already an array
      })
    } else {
      resetForm()
    }
  }, [activityType, open])

  const dialogTitle = (
    <div className="flex items-center gap-2">
      <span>{isEditMode ? 'Edit Activity Type' : 'Add Activity Type'}</span>
      {isStandardType && (
        <Badge variant="outline" className="text-xs">
          Standard
        </Badge>
      )}
    </div>
  )

  const dialogDescription = isStandardType
    ? 'Standard types: Only color, icon, and status can be modified.'
    : isEditMode
    ? 'Modify the activity type configuration.'
    : 'Create a custom activity type for your stable.'

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle as any}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Update' : 'Create'}
      maxWidth="sm:max-w-[500px]"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...form.register('name')}
          placeholder="e.g., Dentist, Riding, Foaling"
          disabled={isStandardType} // Standard types cannot change name
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>
          Color <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COLORS.map((colorOption) => (
            <button
              key={colorOption}
              type="button"
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all',
                selectedColor === colorOption ? 'border-foreground scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: colorOption }}
              onClick={() => form.setValue('color', colorOption)}
            />
          ))}
        </div>
        {form.formState.errors.color && (
          <p className="text-sm text-red-500">{form.formState.errors.color.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">
          Category <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="category"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isStandardType} // Standard types cannot change category
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.category && (
          <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
        )}
      </div>

      {/* Roles */}
      <div className="space-y-2">
        <Label>
          Roles <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="roles"
          control={form.control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`role-${role.value}`}
                    checked={field.value.includes(role.value)}
                    onChange={(e) => {
                      const updatedRoles = e.target.checked
                        ? [...field.value, role.value]
                        : field.value.filter((r: string) => r !== role.value)
                      field.onChange(updatedRoles)
                    }}
                    disabled={isStandardType}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label
                    htmlFor={`role-${role.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Select one or more roles that can perform this activity type.
        </p>
        {form.formState.errors.roles && (
          <p className="text-sm text-red-500">{form.formState.errors.roles.message}</p>
        )}
      </div>
    </BaseFormDialog>
  )
}
