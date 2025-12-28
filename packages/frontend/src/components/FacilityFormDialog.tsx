import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Checkbox } from '@/components/ui/checkbox'
import type { Facility, FacilityType, TimeSlotDuration } from '@/types/facility'

const FACILITY_TYPES: { value: FacilityType; label: string }[] = [
  { value: 'transport', label: 'Transport' },
  { value: 'water_treadmill', label: 'Water treadmill' },
  { value: 'indoor_arena', label: 'Indoor arena' },
  { value: 'outdoor_arena', label: 'Outdoor arena' },
  { value: 'galloping_track', label: 'Galloping track' },
  { value: 'lunging_ring', label: 'Lunging ring' },
  { value: 'paddock', label: 'Paddock' },
  { value: 'solarium', label: 'Solarium' },
  { value: 'jumping_yard', label: 'Jumping yard' },
  { value: 'treadmill', label: 'Treadmill' },
  { value: 'vibration_plate', label: 'Vibration plate' },
  { value: 'pasture', label: 'Pasture' },
  { value: 'walker', label: 'Walker' },
  { value: 'other', label: 'Other' },
]

const TIME_SLOT_DURATIONS: { value: TimeSlotDuration; label: string }[] = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
]

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
] as const

const facilitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum([
    'transport',
    'water_treadmill',
    'indoor_arena',
    'outdoor_arena',
    'galloping_track',
    'lunging_ring',
    'paddock',
    'solarium',
    'jumping_yard',
    'treadmill',
    'vibration_plate',
    'pasture',
    'walker',
    'other',
  ]),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']),
  planningWindowOpens: z.number().min(0).max(365),
  planningWindowCloses: z.number().min(0).max(168),
  maxHorsesPerReservation: z.number().min(1).max(50),
  minTimeSlotDuration: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  maxHoursPerReservation: z.number().min(1).max(24),
  availableFrom: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  availableTo: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  daysAvailable: z.object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean(),
  }),
})

type FacilityFormData = z.infer<typeof facilitySchema>

interface FacilityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facility?: Facility
  onSave: (data: FacilityFormData) => Promise<void>
}

export function FacilityFormDialog({
  open,
  onOpenChange,
  facility,
  onSave,
}: FacilityFormDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FacilityFormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      type: 'indoor_arena',
      description: '',
      status: 'active',
      planningWindowOpens: 14,
      planningWindowCloses: 1,
      maxHorsesPerReservation: 1,
      minTimeSlotDuration: 30,
      maxHoursPerReservation: 2,
      availableFrom: '08:00',
      availableTo: '20:00',
      daysAvailable: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false,
      },
    },
  })

  // Reset form when dialog opens with facility data
  useEffect(() => {
    if (facility) {
      reset({
        name: facility.name,
        type: facility.type,
        description: facility.description || '',
        status: facility.status,
        planningWindowOpens: facility.planningWindowOpens,
        planningWindowCloses: facility.planningWindowCloses,
        maxHorsesPerReservation: facility.maxHorsesPerReservation,
        minTimeSlotDuration: facility.minTimeSlotDuration,
        maxHoursPerReservation: facility.maxHoursPerReservation,
        availableFrom: facility.availableFrom,
        availableTo: facility.availableTo,
        daysAvailable: facility.daysAvailable,
      })
    } else {
      reset()
    }
  }, [facility, reset])

  const onSubmit = async (data: FacilityFormData) => {
    try {
      await onSave(data)
      onOpenChange(false)
      reset()
    } catch (error) {
      console.error('Failed to save facility:', error)
    }
  }

  const selectedType = watch('type')
  const daysAvailable = watch('daysAvailable')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[700px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{facility ? 'Edit Facility' : 'Add Facility'}</DialogTitle>
          <DialogDescription>
            {facility
              ? 'Update facility configuration and booking rules'
              : 'Create a new facility with booking rules and availability'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          {/* Section 1: Basic Information */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-lg'>Basic Information</h3>

            <div className='space-y-2'>
              <Label htmlFor='type'>
                Facility Type <span className='text-destructive'>*</span>
              </Label>
              <Select value={selectedType} onValueChange={(value) => setValue('type', value as FacilityType)}>
                <SelectTrigger>
                  <SelectValue placeholder='Select facility type' />
                </SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className='text-sm text-destructive'>{errors.type.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='name'>
                Facility Name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='name'
                placeholder='e.g., Main Indoor Arena'
                {...register('name')}
              />
              {errors.name && (
                <p className='text-sm text-destructive'>{errors.name.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                placeholder='Brief description of the facility'
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className='text-sm text-destructive'>{errors.description.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='status'>Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive' | 'maintenance')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                  <SelectItem value='maintenance'>Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Booking Rules */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-lg'>Booking Rules</h3>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='planningWindowOpens'>
                  Planning window opens (days ahead)
                </Label>
                <Input
                  id='planningWindowOpens'
                  type='number'
                  min='0'
                  max='365'
                  {...register('planningWindowOpens', { valueAsNumber: true })}
                />
                {errors.planningWindowOpens && (
                  <p className='text-sm text-destructive'>{errors.planningWindowOpens.message}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='planningWindowCloses'>
                  Planning window closes (hours before)
                </Label>
                <Input
                  id='planningWindowCloses'
                  type='number'
                  min='0'
                  max='168'
                  {...register('planningWindowCloses', { valueAsNumber: true })}
                />
                {errors.planningWindowCloses && (
                  <p className='text-sm text-destructive'>{errors.planningWindowCloses.message}</p>
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='maxHorsesPerReservation'>
                Maximum horses per reservation
              </Label>
              <Input
                id='maxHorsesPerReservation'
                type='number'
                min='1'
                max='50'
                {...register('maxHorsesPerReservation', { valueAsNumber: true })}
              />
              {errors.maxHorsesPerReservation && (
                <p className='text-sm text-destructive'>{errors.maxHorsesPerReservation.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='minTimeSlotDuration'>Minimum time slot duration</Label>
              <Select
                value={watch('minTimeSlotDuration')?.toString()}
                onValueChange={(value) => setValue('minTimeSlotDuration', parseInt(value) as TimeSlotDuration)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOT_DURATIONS.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value.toString()}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='maxHoursPerReservation'>
                Maximum hours per reservation
              </Label>
              <Input
                id='maxHoursPerReservation'
                type='number'
                min='1'
                max='24'
                {...register('maxHoursPerReservation', { valueAsNumber: true })}
              />
              {errors.maxHoursPerReservation && (
                <p className='text-sm text-destructive'>{errors.maxHoursPerReservation.message}</p>
              )}
            </div>
          </div>

          {/* Section 3: Availability */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-lg'>Availability</h3>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='availableFrom'>Available from</Label>
                <Input
                  id='availableFrom'
                  type='time'
                  {...register('availableFrom')}
                />
                {errors.availableFrom && (
                  <p className='text-sm text-destructive'>{errors.availableFrom.message}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='availableTo'>Available to</Label>
                <Input
                  id='availableTo'
                  type='time'
                  {...register('availableTo')}
                />
                {errors.availableTo && (
                  <p className='text-sm text-destructive'>{errors.availableTo.message}</p>
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Days available</Label>
              <div className='flex gap-2 flex-wrap'>
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key} className='flex items-center space-x-2'>
                    <Checkbox
                      id={day.key}
                      checked={daysAvailable[day.key]}
                      onCheckedChange={(checked) =>
                        setValue(`daysAvailable.${day.key}`, checked === true)
                      }
                    />
                    <Label htmlFor={day.key} className='font-normal cursor-pointer'>
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : facility ? 'Save Changes' : 'Create Facility'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
