import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Timestamp } from 'firebase/firestore'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { checkReservationConflicts } from '@/services/facilityReservationService'
import type { FacilityReservation } from '@/types/facilityReservation'
import type { Facility } from '@/types/facility'

const reservationSchema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  date: z.date({ message: 'Date is required' }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  horseId: z.string().min(1, 'Horse is required'),
  contactInfo: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    const startParts = data.startTime.split(':')
    const endParts = data.endTime.split(':')
    if (startParts.length !== 2 || endParts.length !== 2) return false

    const startHour = parseInt(startParts[0] || '0', 10)
    const startMin = parseInt(startParts[1] || '0', 10)
    const endHour = parseInt(endParts[0] || '0', 10)
    const endMin = parseInt(endParts[1] || '0', 10)

    return (endHour * 60 + endMin) > (startHour * 60 + startMin)
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
)

type ReservationFormData = z.infer<typeof reservationSchema>

interface FacilityReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation?: FacilityReservation
  facilities: Facility[]
  horses?: Array<{ id: string; name: string }>
  onSave: (data: ReservationFormData) => Promise<void>
  initialValues?: {
    facilityId?: string
    date?: Date
    startTime?: string
    endTime?: string
  }
}

export function FacilityReservationDialog({
  open,
  onOpenChange,
  reservation,
  facilities,
  horses = [],
  onSave,
  initialValues,
}: FacilityReservationDialogProps) {
  const [conflicts, setConflicts] = useState<FacilityReservation[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      facilityId: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      horseId: '',
      contactInfo: '',
      notes: '',
    },
  })

  // Reset form when dialog opens with reservation data or initial values
  useEffect(() => {
    if (reservation) {
      const startDate = reservation.startTime.toDate()
      reset({
        facilityId: reservation.facilityId,
        date: startDate,
        startTime: format(startDate, 'HH:mm'),
        endTime: format(reservation.endTime.toDate(), 'HH:mm'),
        horseId: reservation.horseId || '',
        contactInfo: reservation.contactInfo || '',
        notes: reservation.notes || '',
      })
    } else if (initialValues) {
      reset({
        facilityId: initialValues.facilityId || '',
        date: initialValues.date || new Date(),
        startTime: initialValues.startTime || '09:00',
        endTime: initialValues.endTime || '10:00',
        horseId: '',
        contactInfo: '',
        notes: '',
      })
    } else {
      reset()
    }
  }, [reservation, initialValues, reset])

  // Watch fields for conflict checking
  const facilityId = watch('facilityId')
  const date = watch('date')
  const startTime = watch('startTime')
  const endTime = watch('endTime')

  // Check for conflicts when relevant fields change
  useEffect(() => {
    const checkConflicts = async () => {
      if (!facilityId || !date || !startTime || !endTime) {
        setConflicts([])
        return
      }

      setCheckingConflicts(true)
      try {
        const startParts = startTime.split(':')
        const endParts = endTime.split(':')

        if (startParts.length !== 2 || endParts.length !== 2) {
          setConflicts([])
          return
        }

        const startHour = parseInt(startParts[0] || '0', 10)
        const startMin = parseInt(startParts[1] || '0', 10)
        const endHour = parseInt(endParts[0] || '0', 10)
        const endMin = parseInt(endParts[1] || '0', 10)

        const startDateTime = new Date(date)
        startDateTime.setHours(startHour, startMin, 0, 0)

        const endDateTime = new Date(date)
        endDateTime.setHours(endHour, endMin, 0, 0)

        const foundConflicts = await checkReservationConflicts(
          facilityId,
          Timestamp.fromDate(startDateTime),
          Timestamp.fromDate(endDateTime),
          reservation?.id
        )

        setConflicts(foundConflicts)
      } catch (error) {
        console.error('Error checking conflicts:', error)
        setConflicts([])
      } finally {
        setCheckingConflicts(false)
      }
    }

    // Debounce conflict checking
    const timeoutId = setTimeout(checkConflicts, 500)
    return () => clearTimeout(timeoutId)
  }, [facilityId, date, startTime, endTime, reservation?.id])

  const onSubmit = async (data: ReservationFormData) => {
    try {
      await onSave(data)
      onOpenChange(false)
      reset()
      setConflicts([])
    } catch (error) {
      console.error('Failed to save reservation:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            {reservation ? 'Edit Reservation' : 'New Reservation'}
          </DialogTitle>
          <DialogDescription>
            {reservation
              ? 'Update reservation details'
              : 'Create a new facility reservation'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          {/* Facility Select */}
          <div className='space-y-2'>
            <Label htmlFor='facilityId'>
              Facility <span className='text-destructive'>*</span>
            </Label>
            <Select value={facilityId} onValueChange={(value) => setValue('facilityId', value)}>
              <SelectTrigger>
                <SelectValue placeholder='Select facility' />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.facilityId && (
              <p className='text-sm text-destructive'>{errors.facilityId.message}</p>
            )}
          </div>

          {/* Date Picker */}
          <div className='space-y-2'>
            <Label>
              Date <span className='text-destructive'>*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0'>
                <Calendar
                  mode='single'
                  selected={date}
                  onSelect={(date) => date && setValue('date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className='text-sm text-destructive'>{errors.date.message}</p>
            )}
          </div>

          {/* Time Range */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='startTime'>
                Start time <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='startTime'
                type='time'
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className='text-sm text-destructive'>{errors.startTime.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='endTime'>
                End time <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='endTime'
                type='time'
                {...register('endTime')}
              />
              {errors.endTime && (
                <p className='text-sm text-destructive'>{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Scheduling Conflict</AlertTitle>
              <AlertDescription>
                This time slot overlaps with {conflicts.length} existing reservation(s).
                {conflicts.map((conflict, idx) => (
                  <div key={idx} className='mt-2 text-sm'>
                    • {conflict.userFullName || conflict.userEmail} ({format(conflict.startTime.toDate(), 'HH:mm')} - {format(conflict.endTime.toDate(), 'HH:mm')})
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Contact Info */}
          <div className='space-y-2'>
            <Label htmlFor='contactInfo'>Contact information</Label>
            <Input
              id='contactInfo'
              placeholder='Phone or email for contact'
              {...register('contactInfo')}
            />
          </div>

          {/* Horse Select */}
          <div className='space-y-2'>
            <Label htmlFor='horseId'>
              Horse <span className='text-destructive'>*</span>
            </Label>
            <Select value={watch('horseId')} onValueChange={(value) => setValue('horseId', value)}>
              <SelectTrigger>
                <SelectValue placeholder='Select horse' />
              </SelectTrigger>
              <SelectContent>
                {horses.map((horse) => (
                  <SelectItem key={horse.id} value={horse.id}>
                    {horse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.horseId && (
              <p className='text-sm text-destructive'>{errors.horseId.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className='space-y-2'>
            <Label htmlFor='notes'>Notes</Label>
            <Textarea
              id='notes'
              placeholder='Additional notes or special requirements...'
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting || conflicts.length > 0 || checkingConflicts}
            >
              {isSubmitting
                ? 'Saving...'
                : reservation
                ? 'Update'
                : 'Create'} Reservation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
