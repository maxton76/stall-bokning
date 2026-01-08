import { useEffect } from 'react'
import { z } from 'zod'
import { BaseFormDialog } from '@/components/BaseFormDialog'
import { useFormDialog } from '@/hooks/useFormDialog'
import { FormInput, FormSelect, FormTextarea } from '@/components/form'
import { Label } from '@/components/ui/label'
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

const TIME_SLOT_DURATIONS: { value: string; label: string }[] = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
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
  const isEditMode = !!facility

  const { form, handleSubmit, resetForm } = useFormDialog<FacilityFormData>({
    schema: facilitySchema,
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
    onSubmit: async (data) => {
      await onSave(data)
    },
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: isEditMode ? 'Facility updated successfully' : 'Facility created successfully',
    errorMessage: isEditMode ? 'Failed to update facility' : 'Failed to create facility',
  })

  // Reset form when dialog opens with facility data
  useEffect(() => {
    if (facility) {
      resetForm({
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
      resetForm()
    }
  }, [facility, open])

  const daysAvailable = form.watch('daysAvailable')

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Edit Facility' : 'Add Facility'}
      description={
        isEditMode
          ? 'Update facility configuration and booking rules'
          : 'Create a new facility with booking rules and availability'
      }
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Save Changes' : 'Create Facility'}
      maxWidth="sm:max-w-[700px]"
    >
      {/* Section 1: Basic Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Basic Information</h3>

        <FormSelect
          name="type"
          label="Facility Type"
          form={form}
          options={FACILITY_TYPES}
          placeholder="Select facility type"
          required
        />

        <FormInput
          name="name"
          label="Facility Name"
          form={form}
          placeholder="e.g., Main Indoor Arena"
          required
        />

        <FormTextarea
          name="description"
          label="Description"
          form={form}
          placeholder="Brief description of the facility"
          rows={3}
        />

        <FormSelect
          name="status"
          label="Status"
          form={form}
          options={STATUS_OPTIONS}
        />
      </div>

      {/* Section 2: Booking Rules */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Booking Rules</h3>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="planningWindowOpens"
            label="Planning window opens (days ahead)"
            form={form}
            type="number"
            placeholder="14"
          />

          <FormInput
            name="planningWindowCloses"
            label="Planning window closes (hours before)"
            form={form}
            type="number"
            placeholder="1"
          />
        </div>

        <FormInput
          name="maxHorsesPerReservation"
          label="Maximum horses per reservation"
          form={form}
          type="number"
          placeholder="1"
        />

        <FormSelect
          name="minTimeSlotDuration"
          label="Minimum time slot duration"
          form={form}
          options={TIME_SLOT_DURATIONS}
        />

        <FormInput
          name="maxHoursPerReservation"
          label="Maximum hours per reservation"
          form={form}
          type="number"
          placeholder="2"
        />
      </div>

      {/* Section 3: Availability */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Availability</h3>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="availableFrom"
            label="Available from"
            form={form}
            type="time"
          />

          <FormInput
            name="availableTo"
            label="Available to"
            form={form}
            type="time"
          />
        </div>

        <div className="space-y-2">
          <Label>Days available</Label>
          <div className="flex gap-2 flex-wrap">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.key} className="flex items-center space-x-2">
                <Checkbox
                  id={day.key}
                  checked={daysAvailable[day.key]}
                  onCheckedChange={(checked) =>
                    form.setValue(`daysAvailable.${day.key}`, checked === true)
                  }
                />
                <Label htmlFor={day.key} className="font-normal cursor-pointer">
                  {day.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseFormDialog>
  )
}
