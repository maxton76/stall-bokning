import { Timestamp } from 'firebase/firestore'

// Activity types for horse-related activities
export type ActivityType =
  | 'dentist'
  | 'farrier'
  | 'vet'
  | 'deworm'
  | 'vaccination'
  | 'chiropractic'
  | 'massage'
  | 'training'
  | 'competition'
  | 'other'

// Entry type discriminator
export type EntryType = 'activity' | 'task' | 'message'

// Status for all entry types
export type EntryStatus = 'pending' | 'completed' | 'cancelled'

// Activity type category
export type ActivityTypeCategory = 'Sport' | 'Care' | 'Breeding'

// Activity Type Configuration (configurable per stable)
export interface ActivityTypeConfig {
  id: string
  stableId: string
  name: string
  color: string // Hex color (e.g., "#ef4444")
  category: ActivityTypeCategory
  roles: string[] // Display only (e.g., ["dentist"], ["rider"])
  icon?: string // Emoji (optional)
  isStandard: boolean // System-provided (read-only core fields)
  isActive: boolean // Soft delete flag
  sortOrder: number // Display ordering

  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  lastModifiedBy: string
}

// Create/Update data types for ActivityTypeConfig
export type CreateActivityTypeData = Omit<ActivityTypeConfig, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>
export type UpdateActivityTypeData = Partial<Omit<ActivityTypeConfig, 'id' | 'stableId' | 'createdAt' | 'createdBy' | 'isStandard'>>

// Base interface for all entry types
interface BaseEntry {
  id: string
  type: EntryType
  date: Timestamp
  stableId: string
  stableName: string // Denormalized
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  lastModifiedBy: string
  status: EntryStatus
}

// Activity (horse-related)
export interface Activity extends BaseEntry {
  type: 'activity'
  horseId: string
  horseName: string // Denormalized
  activityType: ActivityType // DEPRECATED: Legacy field for backward compatibility
  activityTypeConfigId?: string // NEW: Reference to ActivityTypeConfig
  activityTypeColor?: string // Denormalized for performance
  note?: string
  assignedTo?: string // User ID who is responsible
  assignedToName?: string // Denormalized
}

// Task (stable tasks)
export interface Task extends BaseEntry {
  type: 'task'
  title: string
  description: string
  color: string // Hex color
  assignedTo?: string
  assignedToName?: string
}

// Message (communication)
export interface Message extends BaseEntry {
  type: 'message'
  title: string
  message: string
  color: string // Hex color
  priority?: 'low' | 'medium' | 'high'
}

// Union type for all entries
export type ActivityEntry = Activity | Task | Message

// Filter options
export interface ActivityFilters {
  groupBy: 'none' | 'horse' | 'staff' | 'type'
  forMe: boolean
  showFinished: boolean
  entryTypes: EntryType[]
}

// Period type for flexible date range filtering
export type PeriodType = 'day' | 'week' | 'month'

// Create data types (omitting auto-generated fields)
export type CreateActivityData = Omit<Activity, 'id' | 'type' | 'stableId' | 'stableName' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>
export type CreateTaskData = Omit<Task, 'id' | 'type' | 'stableId' | 'stableName' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>
export type CreateMessageData = Omit<Message, 'id' | 'type' | 'stableId' | 'stableName' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>

// Update data type
export type UpdateActivityEntryData = Partial<Omit<ActivityEntry, 'id' | 'type' | 'stableId' | 'createdAt' | 'createdBy'>>

// Activity type configuration
export const ACTIVITY_TYPES = [
  { value: 'dentist' as const, label: 'Dentist', icon: '🦷', isCare: true },
  { value: 'farrier' as const, label: 'Farrier', icon: '🔨', isCare: true },
  { value: 'vet' as const, label: 'Veterinarian', icon: '🏥', isCare: true },
  { value: 'deworm' as const, label: 'Deworming', icon: '💊', isCare: true },
  { value: 'vaccination' as const, label: 'Vaccination', icon: '💉', isCare: true },
  { value: 'chiropractic' as const, label: 'Chiropractic', icon: '🦴', isCare: true },
  { value: 'massage' as const, label: 'Massage', icon: '👐', isCare: true },
  { value: 'training' as const, label: 'Training', icon: '🏇', isCare: false },
  { value: 'competition' as const, label: 'Competition', icon: '🏆', isCare: false },
  { value: 'other' as const, label: 'Other', icon: '📝', isCare: false }
] as const

// Default color palette for tasks/messages
export const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e'  // rose
] as const
