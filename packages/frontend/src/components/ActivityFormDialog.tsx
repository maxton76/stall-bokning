import { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { ACTIVITY_TYPES, DEFAULT_COLORS, type ActivityEntry, type ActivityType } from '@/types/activity'

// Validation schemas for each entry type
const activitySchema = z.object({
  type: z.literal('activity'),
  date: z.date({ message: 'Date is required' }),
  horseId: z.string().min(1, 'Horse is required'),
  activityType: z.enum([
    'dentist', 'farrier', 'vet', 'deworm', 'vaccination',
    'chiropractic', 'massage', 'training', 'competition', 'other'
  ] as const),
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
  onSave: (data: Omit<FormData, 'type'> & { type: 'activity' | 'task' | 'message' }) => Promise<void>
  horses?: Array<{ id: string; name: string }>
  stableMembers?: Array<{ id: string; name: string }>
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  entry,
  onSave,
  horses = [],
  stableMembers = [],
}: ActivityFormDialogProps) {
  const [selectedType, setSelectedType] = useState<'activity' | 'task' | 'message'>('activity')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'activity',
      date: new Date(),
      horseId: '',
      activityType: 'training' as ActivityType,
      note: '',
      assignedTo: '',
    },
  })

  const date = watch('date')
  const color = watch('color')

  // Reset form when dialog opens with entry data or defaults
  useEffect(() => {
    if (entry) {
      setSelectedType(entry.type)

      if (entry.type === 'activity') {
        reset({
          type: 'activity',
          date: entry.date.toDate(),
          horseId: entry.horseId,
          activityType: entry.activityType,
          note: entry.note || '',
          assignedTo: entry.assignedTo || '',
        })
      } else if (entry.type === 'task') {
        reset({
          type: 'task',
          date: entry.date.toDate(),
          title: entry.title,
          description: entry.description,
          color: entry.color,
          assignedTo: entry.assignedTo || '',
        })
      } else {
        reset({
          type: 'message',
          date: entry.date.toDate(),
          title: entry.title,
          message: entry.message,
          color: entry.color,
          priority: entry.priority || 'medium',
        })
      }
    } else {
      setSelectedType('activity')
      reset({
        type: 'activity',
        date: new Date(),
        horseId: '',
        activityType: 'training',
        note: '',
        assignedTo: '',
      } as any)
    }
  }, [entry, reset, open])

  // Update form type when radio selection changes
  const handleTypeChange = (newType: 'activity' | 'task' | 'message') => {
    setSelectedType(newType)
    setValue('type', newType as any)
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await onSave(data)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save entry:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entry ? 'Edit Entry' : 'New Entry'}
          </DialogTitle>
          <DialogDescription>
            {entry ? 'Update entry details' : 'Create a new activity, task, or message'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  onSelect={(date) => date && setValue('date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
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
                  value={watch('horseId')}
                  onValueChange={(value) => setValue('horseId', value)}
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
                {'horseId' in errors && errors.horseId && (
                  <p className="text-sm text-destructive">{errors.horseId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="activityType">
                  Activity Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch('activityType')}
                  onValueChange={(value) => setValue('activityType', value as ActivityType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {'activityType' in errors && errors.activityType && (
                  <p className="text-sm text-destructive">{errors.activityType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  placeholder="Additional notes..."
                  {...register('note')}
                  rows={3}
                />
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
                  {...register('title')}
                />
                {'title' in errors && errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Task description..."
                  {...register('description')}
                  rows={3}
                />
                {'description' in errors && errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
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
                      onClick={() => setValue('color', colorOption)}
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
                  {...register('title')}
                />
                {'title' in errors && errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-content">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message-content"
                  placeholder="Message content..."
                  {...register('message')}
                  rows={3}
                />
                {'message' in errors && errors.message && (
                  <p className="text-sm text-destructive">{errors.message.message}</p>
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
                      onClick={() => setValue('color', colorOption)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(value) => setValue('priority', value as 'low' | 'medium' | 'high')}
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
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Select
              value={watch('assignedTo')}
              onValueChange={(value) => setValue('assignedTo', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {stableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : entry ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
