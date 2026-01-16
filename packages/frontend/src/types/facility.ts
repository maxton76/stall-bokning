import { Timestamp } from 'firebase/firestore'

export type FacilityType =
  | 'transport'
  | 'water_treadmill'
  | 'indoor_arena'
  | 'outdoor_arena'
  | 'galloping_track'
  | 'lunging_ring'
  | 'paddock'
  | 'solarium'
  | 'jumping_yard'
  | 'treadmill'
  | 'vibration_plate'
  | 'pasture'
  | 'walker'
  | 'other'

export type TimeSlotDuration = 15 | 30 | 60 // minutes

export interface Facility {
  id: string
  stableId: string
  stableName?: string // Denormalized for display

  // Basic info
  name: string
  type: FacilityType
  description?: string
  status: 'active' | 'inactive' | 'maintenance'

  // Booking rules
  planningWindowOpens: number // days ahead
  planningWindowCloses: number // hours before
  maxHorsesPerReservation: number
  minTimeSlotDuration: TimeSlotDuration // minimum minutes per reservation
  maxHoursPerReservation: number

  // Availability
  availableFrom: string // HH:mm format (e.g., "08:00")
  availableTo: string // HH:mm format (e.g., "20:00")
  daysAvailable: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }

  // Timestamps (managed by API)
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  lastModifiedBy: string
}

export interface CreateFacilityData extends Omit<Facility,
  'id' | 'stableId' | 'stableName' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'
> {}

export interface UpdateFacilityData extends Partial<CreateFacilityData> {}
