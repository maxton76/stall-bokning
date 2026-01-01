import { createCrudService } from './firestoreCrud'
import { collection, query, where, Timestamp, orderBy, getDocs } from 'firebase/firestore'
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
  DateTab
} from '@/types/activity'
import { mapDocsToObjects } from '@/utils/firestoreHelpers'
import { startOfDay, endOfDay, addDays } from 'date-fns'

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

  // Filter by care types and sort by date
  return allActivities
    .filter(activity => activity.activityType && careTypes.includes(activity.activityType))
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
