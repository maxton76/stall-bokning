import { createCrudService } from './firestoreCrud'
import { collection, query, where, Timestamp, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  Activity,
  ActivityEntry,
  EntryType,
  ActivityType,
  CreateActivityData,
  CreateTaskData,
  CreateMessageData,
  UpdateActivityEntryData,
  PeriodType,
  DateTab // Keep for backward compatibility
} from '@/types/activity'
import { mapDocsToObjects } from '@/utils/firestoreHelpers'
import {
  startOfDay,
  endOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth
} from 'date-fns'

// CRUD service for activities (polymorphic - handles all 3 types)
const activityCrud = createCrudService<ActivityEntry>({
  collectionName: 'activities',
  timestampsEnabled: true,
  parentField: { field: 'stableId', required: true }
})

/**
 * Create activity (horse-related)
 */
export async function createActivity(
  userId: string,
  stableId: string,
  activityData: CreateActivityData,
  stableName: string
): Promise<string> {
  const data = {
    ...activityData,
    type: 'activity' as const,
    stableId,
    stableName,
    status: 'pending' as const
  }
  return activityCrud.create(userId, data, stableId)
}

/**
 * Create task (stable chore)
 */
export async function createTask(
  userId: string,
  stableId: string,
  taskData: CreateTaskData,
  stableName: string
): Promise<string> {
  const data = {
    ...taskData,
    type: 'task' as const,
    stableId,
    stableName,
    status: 'pending' as const
  }
  return activityCrud.create(userId, data, stableId)
}

/**
 * Create message (communication)
 */
export async function createMessage(
  userId: string,
  stableId: string,
  messageData: CreateMessageData,
  stableName: string
): Promise<string> {
  const data = {
    ...messageData,
    type: 'message' as const,
    stableId,
    stableName,
    status: 'pending' as const
  }
  return activityCrud.create(userId, data, stableId)
}

/**
 * Get all entries for a stable with optional date range filtering
 */
export async function getStableActivities(
  stableId: string,
  startDate?: Date,
  endDate?: Date,
  typeFilter?: EntryType[]
): Promise<ActivityEntry[]> {
  const whereConstraints = [where('stableId', '==', stableId)]

  if (startDate) {
    whereConstraints.push(where('date', '>=', Timestamp.fromDate(startOfDay(startDate))))
  }

  if (endDate) {
    whereConstraints.push(where('date', '<=', Timestamp.fromDate(endOfDay(endDate))))
  }

  const q = query(
    collection(db, 'activities'),
    ...whereConstraints,
    orderBy('date', 'asc')
  )
  const snapshot = await getDocs(q)
  let results = mapDocsToObjects<ActivityEntry>(snapshot)

  // Filter by type if specified
  if (typeFilter && typeFilter.length > 0) {
    results = results.filter(entry => typeFilter.includes(entry.type))
  }

  return results
}

/**
 * Get activities for specific date tab (today, tomorrow, day after tomorrow)
 * @deprecated Use getActivitiesByPeriod instead
 */
export async function getActivitiesByDateTab(
  stableId: string,
  dateTab: DateTab
): Promise<ActivityEntry[]> {
  const now = new Date()
  let targetDate: Date

  switch (dateTab) {
    case 'today':
      targetDate = now
      break
    case 'tomorrow':
      targetDate = addDays(now, 1)
      break
    case 'dayAfter':
      targetDate = addDays(now, 2)
      break
  }

  return getStableActivities(stableId, targetDate, targetDate)
}

/**
 * Get activities for a specific period (day, week, or month)
 * @param stableId - The stable ID to query
 * @param referenceDate - The date to calculate the period from
 * @param periodType - The type of period ('day' | 'week' | 'month')
 * @returns Promise with array of activity entries for the period
 */
export async function getActivitiesByPeriod(
  stableId: string,
  referenceDate: Date,
  periodType: PeriodType
): Promise<ActivityEntry[]> {
  let startDate: Date
  let endDate: Date

  switch (periodType) {
    case 'day':
      startDate = startOfDay(referenceDate)
      endDate = endOfDay(referenceDate)
      break

    case 'week':
      startDate = startOfWeek(referenceDate, { weekStartsOn: 1 }) // Monday
      endDate = endOfWeek(referenceDate, { weekStartsOn: 1 })     // Sunday
      break

    case 'month':
      startDate = startOfMonth(referenceDate)
      endDate = endOfMonth(referenceDate)
      break
  }

  return getStableActivities(stableId, startDate, endDate)
}

/**
 * Get care-focused activities (for Care page)
 * @param stableIds - Array of stable IDs or single stable ID. If empty array, returns empty results.
 */
export async function getCareActivities(stableIds: string | string[]): Promise<Activity[]> {
  const careTypes: ActivityType[] = [
    'dentist', 'farrier', 'vet', 'deworm', 'vaccination', 'chiropractic', 'massage'
  ]

  // Normalize to array
  const stableIdArray = Array.isArray(stableIds) ? stableIds : [stableIds]

  // Return empty if no stables provided
  if (stableIdArray.length === 0) return []

  // Load all activity type configs for these stables (to support new activityTypeConfigId field)
  const activityTypeConfigsMap = new Map<string, any>()
  for (const stableId of stableIdArray) {
    const configQuery = query(
      collection(db, 'activityTypes'),
      where('stableId', '==', stableId),
      where('category', '==', 'Care')
    )
    const configSnapshot = await getDocs(configQuery)
    configSnapshot.docs.forEach(doc => {
      activityTypeConfigsMap.set(doc.id, { id: doc.id, ...doc.data() })
    })
  }

  // For multiple stables, we need to query each stable separately and combine results
  // Firestore doesn't support OR queries with 'in' operator along with other where clauses efficiently
  const allActivities: Activity[] = []

  for (const stableId of stableIdArray) {
    const q = query(
      collection(db, 'activities'),
      where('stableId', '==', stableId),
      where('type', '==', 'activity'),
      orderBy('date', 'asc')
    )

    const snapshot = await getDocs(q)
    const activities = mapDocsToObjects<Activity>(snapshot)
    allActivities.push(...activities)
  }

  // Filter by care types (support both legacy activityType and new activityTypeConfigId)
  return allActivities
    .filter(activity => {
      // Check legacy field
      if (activity.activityType && careTypes.includes(activity.activityType)) {
        return true
      }
      // Check new field - if activityTypeConfigId points to a Care category config
      if (activity.activityTypeConfigId && activityTypeConfigsMap.has(activity.activityTypeConfigId)) {
        return true
      }
      return false
    })
    .sort((a, b) => a.date.toMillis() - b.date.toMillis())
}

/**
 * Get activities assigned to specific user
 */
export async function getMyActivities(
  stableId: string,
  userId: string
): Promise<ActivityEntry[]> {
  const q = query(
    collection(db, 'activities'),
    where('stableId', '==', stableId),
    where('assignedTo', '==', userId),
    orderBy('date', 'asc')
  )

  const snapshot = await getDocs(q)
  return mapDocsToObjects<ActivityEntry>(snapshot)
}

/**
 * Update any entry (polymorphic)
 */
export async function updateActivity(
  id: string,
  userId: string,
  updates: UpdateActivityEntryData
): Promise<void> {
  return activityCrud.update(id, userId, updates)
}

/**
 * Delete any entry
 */
export async function deleteActivity(id: string): Promise<void> {
  return activityCrud.delete(id)
}

/**
 * Mark entry as completed
 */
export async function completeActivity(id: string, userId: string): Promise<void> {
  return activityCrud.update(id, userId, { status: 'completed' })
}

/**
 * Get activities for a specific horse
 * @param horseId - The ID of the horse
 * @param limitCount - Maximum number of activities to return (default: 10)
 * @returns Array of activities sorted by date (most recent first)
 */
export async function getHorseActivities(
  horseId: string,
  limitCount: number = 10
): Promise<Activity[]> {
  const q = query(
    collection(db, 'activities'),
    where('type', '==', 'activity'),
    where('horseId', '==', horseId),
    orderBy('date', 'desc'),
    limit(limitCount)
  )

  const snapshot = await getDocs(q)
  return mapDocsToObjects<Activity>(snapshot)
}

/**
 * Get unfinished activities for a specific horse
 * These are activities that are past due but not completed
 * @param horseId - The ID of the horse
 * @returns Array of unfinished activities sorted by date
 */
export async function getUnfinishedActivities(horseId: string): Promise<Activity[]> {
  const now = Timestamp.now()

  const q = query(
    collection(db, 'activities'),
    where('type', '==', 'activity'),
    where('horseId', '==', horseId),
    where('status', '!=', 'completed'),
    where('date', '<', now),
    orderBy('status', 'asc'),
    orderBy('date', 'asc')
  )

  const snapshot = await getDocs(q)
  return mapDocsToObjects<Activity>(snapshot)
}
