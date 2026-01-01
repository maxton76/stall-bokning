import { useEffect, useState, useMemo } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { DEFAULT_COLORS, type ActivityEntry, type ActivityTypeConfig } from '@/types/activity'

// Validation schema for activity (activityType will be validated as string since it's dynamic)
const activitySchema = z.object({
  type: z.literal('activity'),
  date: z.date({ message: 'Date is required' }),
  horseId: z.string().min(1, 'Horse is required'),
  activityType: z.string().min(1, 'Activity type is required'), // Changed to string for dynamic types
  activityTypeConfigId: z.string().optional(), // NEW: Reference to config
  activityTypeColor: z.string().optional(), // NEW: Denormalized color
  note: z.string().optional(),
  assignedTo: z.string().optional(),
})

const taskSchema = z.object({
  type: z.literal('task'),
  date: z.date({ message: 'Date is required' }),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color'),
  assignedTo: z.string().optional(),
})

const messageSchema = z.object({
  type: z.literal('message'),
  date: z.date({ message: 'Date is required' }),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

const formSchema = z.discriminatedUnion('type', [
  activitySchema,
  taskSchema,
  messageSchema,
])

type FormData = z.infer<typeof formSchema>

interface ActivityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: ActivityEntry
  initialDate?: Date  // For pre-filling date when creating
  initialHorseId?: string  // For pre-filling horse when creating
  initialActivityType?: string  // For pre-filling activity type when creating
  onSave: (data: Omit<FormData, 'type'> & { type: 'activity' | 'task' | 'message' }) => Promise<void>
  horses?: Array<{ id: string; name: string }>
  stableMembers?: Array<{ id: string; name: string }>
  activityTypes?: ActivityTypeConfig[]
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  entry,
  initialDate,
  initialHorseId,
  initialActivityType,
  onSave,
  horses = [],
  stableMembers = [],
  activityTypes = [],
}: ActivityFormDialogProps) {
  const isEditMode = !!entry
  const [selectedType, setSelectedType] = useState<'activity' | 'task' | 'message'>('activity')

  // Memoize defaultValues to prevent infinite loop
  const defaultValues = useMemo<FormData>(() => ({
    type: 'activity',
    date: new Date(),
    horseId: '',
    activityType: '', // Will be set from activityTypes
    activityTypeConfigId: '',
    activityTypeColor: '',
    note: '',
    assignedTo: '',
  } as any), [])

  const { form, handleSubmit, resetForm } = useFormDialog<FormData>({
    schema: formSchema,
    defaultValues,
    onSubmit: async (data) => {
      await onSave(data)
    },
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: isEditMode ? 'Entry updated successfully' : 'Entry created successfully',
    errorMessage: isEditMode ? 'Failed to update entry' : 'Failed to create entry',
  })

  const date = form.watch('date')
  const color = form.watch('color')

  // Reset form when dialog opens with entry data or defaults
  useEffect(() => {
    if (entry) {
      setSelectedType(entry.type)

      if (entry.type === 'activity') {
        resetForm({
          type: 'activity',
          date: entry.date.toDate(),
          horseId: entry.horseId,
          activityType: entry.activityType,
          activityTypeConfigId: entry.activityTypeConfigId,
          activityTypeColor: entry.activityTypeColor,
          note: entry.note || '',
          assignedTo: entry.assignedTo || '',
        } as any)
      } else if (entry.type === 'task') {
        resetForm({
          type: 'task',
          date: entry.date.toDate(),
          title: entry.title,
          description: entry.description,
          color: entry.color,
          assignedTo: entry.assignedTo || '',
        } as any)
      } else {
        resetForm({
          type: 'message',
          date: entry.date.toDate(),
          title: entry.title,
          message: entry.message,
          color: entry.color,
          priority: entry.priority || 'medium',
        } as any)
      }
    } else {
      setSelectedType('activity')
      // Use initialActivityType if provided, otherwise first activity type as default
      const selectedActivityType = initialActivityType
        ? activityTypes.find(t => t.id === initialActivityType)
        : activityTypes.length > 0 ? activityTypes[0] : null

      resetForm({
        type: 'activity',
        date: initialDate || new Date(),
        horseId: initialHorseId || '',
        activityType: selectedActivityType?.name || '',
        activityTypeConfigId: selectedActivityType?.id || '',
        activityTypeColor: selectedActivityType?.color || '',
        note: '',
        assignedTo: '',
      } as any)
    }
  }, [entry, initialDate, initialHorseId, initialActivityType, resetForm, open, activityTypes])

  // Update form type when radio selection changes
  const handleTypeChange = (newType: 'activity' | 'task' | 'message') => {
    setSelectedType(newType)
    form.setValue('type', newType as any)
  }

  // Helper to generate dynamic assignment label
  const getAssignmentLabel = () => {
    // Only for activity type
    if (selectedType !== 'activity') {
      return 'Assigned To'
    }

    // Get selected activity type config ID
    const selectedConfigId = form.watch('activityTypeConfigId')
    if (!selectedConfigId) {
      return 'Assigned To'
    }

    // Find the activity type config
    const selectedActivityType = activityTypes.find(t => t.id === selectedConfigId)
    if (!selectedActivityType || !selectedActivityType.roles || selectedActivityType.roles.length === 0) {
      return 'Assigned To'
    }

    // Capitalize and join roles
    const capitalizedRoles = selectedActivityType.roles.map(role =>
      role.charAt(0).toUpperCase() + role.slice(1).replace(/-/g, ' ')
    )

    return capitalizedRoles.join(' / ')
  }

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Edit Entry' : 'New Entry'}
      description={isEditMode ? 'Update entry details' : 'Create a new activity, task, or message'}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Update' : 'Create'}
      maxWidth="sm:max-w-[550px]"
      maxHeight="max-h-[90vh]"
    >
          {/* Type Selector */}
          <div className="space-y-3">
            <Label>Entry Type</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => handleTypeChange(value as 'activity' | 'task' | 'message')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="activity" id="type-activity" />
                <Label htmlFor="type-activity" className="font-normal cursor-pointer">
                  Activity
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="task" id="type-task" />
                <Label htmlFor="type-task" className="font-normal cursor-pointer">
                  Task
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="message" id="type-message" />
                <Label htmlFor="type-message" className="font-normal cursor-pointer">
                  Message
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>
              Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && form.setValue('date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && (
              <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>

          {/* Activity-specific fields */}
          {selectedType === 'activity' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="horseId">
                  Horse <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch('horseId')}
                  onValueChange={(value) => form.setValue('horseId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select horse" />
                  </SelectTrigger>
                  <SelectContent>
                    {horses.map((horse) => (
                      <SelectItem key={horse.id} value={horse.id}>
                        {horse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {'horseId' in form.formState.errors && form.formState.errors.horseId && (
                  <p className="text-sm text-destructive">{form.formState.errors.horseId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="activityType">
                  Activity <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch('activityTypeConfigId') || form.watch('activityType')}
                  onValueChange={(configId) => {
                    const selectedType = activityTypes.find(t => t.id === configId)
                    if (selectedType) {
                      form.setValue('activityType', selectedType.name)
                      form.setValue('activityTypeConfigId', selectedType.id)
                      form.setValue('activityTypeColor', selectedType.color)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.filter(t => t.isActive).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <span className="flex items-center gap-2">
                          {type.icon && <span>{type.icon}</span>}
                          <div
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: type.color }}
                          />
                          <span>{type.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {'activityType' in form.formState.errors && form.formState.errors.activityType && (
                  <p className="text-sm text-destructive">{form.formState.errors.activityType.message}</p>
                )}
              </div>
            </>
          )}

          {/* Task-specific fields */}
          {selectedType === 'task' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Task title"
                  {...form.register('title')}
                />
                {'title' in form.formState.errors && form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Task description..."
                  {...form.register('description')}
                  rows={3}
                />
                {'description' in form.formState.errors && form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Color <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((colorOption) => (
                    <button
                      key={colorOption}
                      type="button"
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        color === colorOption ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: colorOption }}
                      onClick={() => form.setValue('color', colorOption)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Message-specific fields */}
          {selectedType === 'message' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="message-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="message-title"
                  placeholder="Message title"
                  {...form.register('title')}
                />
                {'title' in form.formState.errors && form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-content">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message-content"
                  placeholder="Message content..."
                  {...form.register('message')}
                  rows={3}
                />
                {'message' in form.formState.errors && form.formState.errors.message && (
                  <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Color <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((colorOption) => (
                    <button
                      key={colorOption}
                      type="button"
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        color === colorOption ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: colorOption }}
                      onClick={() => form.setValue('color', colorOption)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={form.watch('priority')}
                  onValueChange={(value) => form.setValue('priority', value as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Assigned To (common field) */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">{getAssignmentLabel()}</Label>
            <Select
              value={form.watch('assignedTo')}
              onValueChange={(value) => form.setValue('assignedTo', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {stableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note field (activity-specific, at bottom) */}
          {selectedType === 'activity' && (
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Additional notes..."
                {...form.register('note')}
                rows={3}
              />
            </div>
          )}
    </BaseFormDialog>
  )
}
