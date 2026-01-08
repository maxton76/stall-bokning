import { useEffect } from 'react'
import { z } from 'zod'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { FormInput, FormCheckboxGroup } from '@/components/form'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ShiftType } from '@/types/schedule'

interface ShiftTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (shiftType: Omit<ShiftType, 'id' | 'stableId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  shiftType?: ShiftType | null
  title?: string
}

const DAYS_OF_WEEK = [
  { value: 'Mon', label: 'Monday' },
  { value: 'Tue', label: 'Tuesday' },
  { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' },
  { value: 'Fri', label: 'Friday' },
  { value: 'Sat', label: 'Saturday' },
  { value: 'Sun', label: 'Sunday' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

// Helper functions for time range parsing and formatting
function parseTimeRange(timeRange: string): { startHour: string; startMinute: string; endHour: string; endMinute: string } {
  const [start, end] = timeRange.split('-')
  const [startHour = '07', startMinute = '00'] = (start || '').split(':')
  const [endHour = '09', endMinute = '00'] = (end || '').split(':')
  return { startHour, startMinute, endHour, endMinute }
}

function formatTimeRange(startHour: string, startMinute: string, endHour: string, endMinute: string): string {
  return `${startHour}:${startMinute}-${endHour}:${endMinute}`
}

const shiftTypeSchema = z.object({
  name: z.string().min(1, 'Shift name is required').max(100, 'Name must be 100 characters or less'),
  points: z.number().min(1, 'Points must be at least 1').max(100, 'Points must be 100 or less').int(),
  daysOfWeek: z.array(z.string()).min(1, 'Select at least one day'),
  startHour: z.string(),
  startMinute: z.string(),
  endHour: z.string(),
  endMinute: z.string(),
}).refine(
  (data) => {
    const startTime = parseInt(data.startHour) * 60 + parseInt(data.startMinute)
    const endTime = parseInt(data.endHour) * 60 + parseInt(data.endMinute)
    return endTime > startTime
  },
  {
    message: 'End time must be after start time',
    path: ['endHour'],
  }
)

type ShiftTypeFormData = z.infer<typeof shiftTypeSchema>

export function ShiftTypeDialog({
  open,
  onOpenChange,
  onSave,
  shiftType,
  title
}: ShiftTypeDialogProps) {
  const isEditMode = !!shiftType

  const { form, handleSubmit, resetForm } = useFormDialog<ShiftTypeFormData>({
    schema: shiftTypeSchema,
    defaultValues: {
      name: '',
      points: 1,
      daysOfWeek: [],
      startHour: '07',
      startMinute: '00',
      endHour: '09',
      endMinute: '00',
    },
    onSubmit: async (data) => {
      const time = formatTimeRange(
        data.startHour,
        data.startMinute,
        data.endHour,
        data.endMinute
      )

      await onSave({
        name: data.name.trim(),
        points: data.points,
        time,
        daysOfWeek: data.daysOfWeek,
      })
    },
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: isEditMode ? 'Shift type updated successfully' : 'Shift type created successfully',
    errorMessage: isEditMode ? 'Failed to update shift type' : 'Failed to create shift type',
  })

  // Reset form when dialog opens with shift type data
  useEffect(() => {
    if (shiftType) {
      const { startHour, startMinute, endHour, endMinute } = parseTimeRange(shiftType.time)
      resetForm({
        name: shiftType.name,
        points: shiftType.points,
        daysOfWeek: shiftType.daysOfWeek,
        startHour,
        startMinute,
        endHour,
        endMinute,
      })
    } else {
      resetForm()
    }
  }, [shiftType, open])

  const dialogTitle = title || (isEditMode ? 'Edit Shift Type' : 'Create Shift Type')
  const dialogDescription = isEditMode
    ? 'Update the shift type details below.'
    : 'Add a new shift type to your stable.'

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
        label="Shift Name"
        form={form}
        placeholder="e.g., Morning Cleaning"
        required
      />

      {/* Time Range Picker - Custom layout for better UX */}
      <div className="space-y-2">
        <Label>Time Range <span className="text-destructive ml-1">*</span></Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Start Time</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch('startHour')}
                onValueChange={(value) => form.setValue('startHour', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={form.watch('startMinute')}
                onValueChange={(value) => form.setValue('startMinute', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">End Time</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch('endHour')}
                onValueChange={(value) => form.setValue('endHour', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={form.watch('endMinute')}
                onValueChange={(value) => form.setValue('endMinute', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {formatTimeRange(
            form.watch('startHour'),
            form.watch('startMinute'),
            form.watch('endHour'),
            form.watch('endMinute')
          )}
        </p>
        {form.formState.errors.endHour && (
          <p className="text-sm text-destructive">{form.formState.errors.endHour.message}</p>
        )}
      </div>

      <FormInput
        name="points"
        label="Points"
        form={form}
        type="number"
        placeholder="e.g., 10"
        helperText="Weight value for fairness algorithm"
        required
      />

      <FormCheckboxGroup
        name="daysOfWeek"
        label="Days of Week"
        form={form}
        options={DAYS_OF_WEEK}
        columns={2}
        required
      />
    </BaseFormDialog>
  )
}
