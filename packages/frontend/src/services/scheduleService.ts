import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Schedule, Shift, CreateScheduleData, ShiftType } from '@/types/schedule'
import { parseShiftStartTime, createDateThreshold } from '@/utils/dateHelpers'
import { mapDocsToObjects, extractDocIds, removeUndefined, updateTimestamps } from '@/utils/firestoreHelpers'
import { isSwedishHoliday, applyHolidayMultiplier } from '@/utils/holidayHelpers'
import {
  createTrackingContext,
  updateMemberTracking,
  type MemberTrackingState
} from '@/utils/shiftTracking'

// ============= Schedules =============

export async function createSchedule(data: CreateScheduleData, userId: string): Promise<string> {
  const scheduleData = {
    name: data.name,
    stableId: data.stableId,
    stableName: data.stableName,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
    useAutoAssignment: data.useAutoAssignment,
    notifyMembers: data.notifyMembers,
    status: 'draft' as const,
    createdAt: Timestamp.now(),
    createdBy: userId
  }

  const scheduleRef = await addDoc(collection(db, 'schedules'), scheduleData)
  return scheduleRef.id
}

export async function publishSchedule(scheduleId: string, userId: string): Promise<void> {
  const dataToUpdate = removeUndefined({
    status: 'published',
    publishedAt: Timestamp.now(),
    publishedBy: userId,
    ...updateTimestamps(userId)
  })

  const scheduleRef = doc(db, 'schedules', scheduleId)
  await updateDoc(scheduleRef, dataToUpdate)
}

// ============= Auto-Assignment =============

interface MemberWithPoints extends MemberTrackingState {
  userId: string
  displayName: string
  email: string
  historicalPoints: number
  availability?: {
    neverAvailable?: {
      dayOfWeek: number
      timeSlots: { start: string; end: string }[]
    }[]
    preferredTimes?: {
      dayOfWeek: number
      timeSlots: { start: string; end: string }[]
    }[]
  }
  limits?: {
    maxShiftsPerWeek?: number
    minShiftsPerWeek?: number
    maxShiftsPerMonth?: number
    minShiftsPerMonth?: number
  }
}

// Helper: Check if member is available for a shift
function isMemberAvailable(member: MemberWithPoints, shift: Shift): boolean {
  if (!member.availability?.neverAvailable) return true

  const shiftDate = shift.date.toDate()
  const shiftDay = shiftDate.getDay()
  const shiftTime = parseShiftStartTime(shift.time)

  for (const restriction of member.availability.neverAvailable) {
    if (restriction.dayOfWeek === shiftDay) {
      // Check if shift time overlaps with restricted time slots
      for (const slot of restriction.timeSlots) {
        if (shiftTime >= slot.start && shiftTime < slot.end) {
          return false // Member is not available
        }
      }
    }
  }

  return true
}

// Helper: Check if member has reached their limits
function hasReachedLimits(member: MemberWithPoints): boolean {
  if (!member.limits) return false

  if (member.limits.maxShiftsPerWeek && member.shiftsThisWeek >= member.limits.maxShiftsPerWeek) {
    return true
  }

  if (member.limits.maxShiftsPerMonth && member.shiftsThisMonth >= member.limits.maxShiftsPerMonth) {
    return true
  }

  return false
}

// Helper: Calculate historical points for all members from past schedules
export async function calculateHistoricalPoints(
  stableId: string,
  memberIds: string[],
  memoryHorizonDays: number = 90
): Promise<Map<string, number>> {
  const historicalPoints = new Map<string, number>()
  memberIds.forEach(id => historicalPoints.set(id, 0))

  const threshold = createDateThreshold(memoryHorizonDays)

  // Get all published schedules for this stable within the memory horizon
  const schedulesQuery = query(
    collection(db, 'schedules'),
    where('stableId', '==', stableId),
    where('status', '==', 'published'),
    where('endDate', '>=', Timestamp.fromDate(threshold))
  )
  const schedulesSnapshot = await getDocs(schedulesQuery)
  const scheduleIds = extractDocIds(schedulesSnapshot)

  if (scheduleIds.length === 0) {
    return historicalPoints
  }

  // Get all completed shifts from those schedules
  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('scheduleId', 'in', scheduleIds),
    where('status', '==', 'assigned'),
    where('date', '>=', Timestamp.fromDate(threshold))
  )
  const shiftsSnapshot = await getDocs(shiftsQuery)

  // Sum up points per member
  shiftsSnapshot.docs.forEach(doc => {
    const shift = doc.data() as Shift
    if (shift.assignedTo && historicalPoints.has(shift.assignedTo)) {
      const current = historicalPoints.get(shift.assignedTo)!
      historicalPoints.set(shift.assignedTo, current + shift.points)
    }
  })

  return historicalPoints
}

export async function autoAssignShifts(
  scheduleId: string,
  _stableId: string, // Reserved for future use (e.g., stable-wide constraints)
  members: {
    id: string
    displayName: string
    email: string
    availability?: any
    limits?: any
  }[],
  historicalPoints?: Map<string, number>
): Promise<number> {
  // Load all shifts for this schedule
  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('scheduleId', '==', scheduleId),
    orderBy('date', 'asc')
  )
  const shiftsSnapshot = await getDocs(shiftsQuery)
  const allShifts = mapDocsToObjects<Shift>(shiftsSnapshot)

  // Calculate current points for each member (from assigned shifts in this schedule)
  const memberPoints = new Map<string, MemberWithPoints>()
  members.forEach(member => {
    memberPoints.set(member.id, {
      userId: member.id,
      displayName: member.displayName,
      email: member.email,
      currentPoints: 0,
      historicalPoints: historicalPoints?.get(member.id) || 0,
      assignedShifts: 0,
      shiftsThisWeek: 0,
      shiftsThisMonth: 0,
      availability: member.availability,
      limits: member.limits
    })
  })

  // Count already assigned shifts and track weekly/monthly counts
  const trackingContext = createTrackingContext()

  allShifts.forEach(shift => {
    if (shift.assignedTo && memberPoints.has(shift.assignedTo)) {
      const member = memberPoints.get(shift.assignedTo)!
      updateMemberTracking(member, shift.date, shift.points, trackingContext)
    }
  })

  // Get unassigned shifts
  const unassignedShifts = allShifts.filter(s => s.status === 'unassigned')

  if (unassignedShifts.length === 0) {
    return 0
  }

  // Enhanced fairness algorithm with constraints
  const batch = writeBatch(db)
  let assignmentCount = 0

  for (const shift of unassignedShifts) {
    // Find best member for this shift
    let bestMemberId: string | null = null
    let lowestTotalPoints = Infinity

    memberPoints.forEach((member, memberId) => {
      // Check constraints
      if (!isMemberAvailable(member, shift)) return
      if (hasReachedLimits(member)) return

      // Calculate total points (current + historical for fairness across schedules)
      const totalPoints = member.currentPoints + member.historicalPoints

      // Prefer members with lowest total points
      if (totalPoints < lowestTotalPoints) {
        lowestTotalPoints = totalPoints
        bestMemberId = memberId
      }
    })

    if (bestMemberId !== null) {
      const bestMember = memberPoints.get(bestMemberId)!
      const shiftDate = shift.date.toDate()

      // Apply holiday weighting if applicable
      const isHoliday = isSwedishHoliday(shiftDate)
      const effectivePoints = applyHolidayMultiplier(shift.points, isHoliday)

      // Assign shift to this member
      const shiftRef = doc(db, 'shifts', shift.id)
      batch.update(shiftRef, {
        status: 'assigned',
        assignedTo: bestMember.userId,
        assignedToName: bestMember.displayName,
        assignedToEmail: bestMember.email
      })

      // Update member's counts for next iteration using tracking helper
      updateMemberTracking(bestMember, shift.date, effectivePoints, trackingContext)

      assignmentCount++
    }
  }

  // Commit all assignments
  await batch.commit()
  return assignmentCount
}

export async function getSchedule(scheduleId: string): Promise<Schedule | null> {
  const scheduleRef = doc(db, 'schedules', scheduleId)
  const scheduleSnap = await getDoc(scheduleRef)

  if (!scheduleSnap.exists()) return null

  return {
    id: scheduleSnap.id,
    ...scheduleSnap.data()
  } as Schedule
}

export async function getSchedulesByStable(stableId: string): Promise<Schedule[]> {
  const q = query(
    collection(db, 'schedules'),
    where('stableId', '==', stableId),
    orderBy('startDate', 'desc')
  )

  const querySnapshot = await getDocs(q)
  return mapDocsToObjects<Schedule>(querySnapshot)
}

export async function getAllSchedulesForUser(userId: string): Promise<Schedule[]> {
  // Get all stables the user is a member of
  const stablesQuery = query(
    collection(db, 'stables'),
    where('members', 'array-contains', userId)
  )
  const stablesSnapshot = await getDocs(stablesQuery)
  const stableIds = extractDocIds(stablesSnapshot)

  if (stableIds.length === 0) return []

  // Get all schedules for those stables
  const schedulesQuery = query(
    collection(db, 'schedules'),
    where('stableId', 'in', stableIds),
    orderBy('startDate', 'desc')
  )

  const schedulesSnapshot = await getDocs(schedulesQuery)
  return mapDocsToObjects<Schedule>(schedulesSnapshot)
}

// ============= Shifts =============

export async function createShifts(
  _scheduleId: string, // Included for API consistency, shifts contain scheduleId
  shifts: Omit<Shift, 'id'>[]
): Promise<void> {
  const batch = writeBatch(db)

  shifts.forEach(shift => {
    const shiftRef = doc(collection(db, 'shifts'))
    batch.set(shiftRef, shift)
  })

  await batch.commit()
}

export async function getShiftsBySchedule(scheduleId: string): Promise<Shift[]> {
  const q = query(
    collection(db, 'shifts'),
    where('scheduleId', '==', scheduleId),
    orderBy('date', 'asc')
  )

  const querySnapshot = await getDocs(q)
  return mapDocsToObjects<Shift>(querySnapshot)
}

export async function getShiftsByDateRange(
  stableId: string,
  startDate: Date,
  endDate: Date
): Promise<Shift[]> {
  const q = query(
    collection(db, 'shifts'),
    where('stableId', '==', stableId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'asc')
  )

  const querySnapshot = await getDocs(q)
  return mapDocsToObjects<Shift>(querySnapshot)
}

export async function getUnassignedShifts(stableId?: string): Promise<Shift[]> {
  let q = query(
    collection(db, 'shifts'),
    where('status', '==', 'unassigned'),
    orderBy('date', 'asc')
  )

  if (stableId) {
    q = query(
      collection(db, 'shifts'),
      where('stableId', '==', stableId),
      where('status', '==', 'unassigned'),
      orderBy('date', 'asc')
    )
  }

  const querySnapshot = await getDocs(q)
  return mapDocsToObjects<Shift>(querySnapshot)
}

export async function assignShift(
  shiftId: string,
  userId: string,
  userName: string,
  userEmail: string
): Promise<void> {
  const shiftRef = doc(db, 'shifts', shiftId)
  await updateDoc(shiftRef, {
    status: 'assigned',
    assignedTo: userId,
    assignedToName: userName,
    assignedToEmail: userEmail
  })
}

export async function unassignShift(shiftId: string): Promise<void> {
  const shiftRef = doc(db, 'shifts', shiftId)
  await updateDoc(shiftRef, {
    status: 'unassigned',
    assignedTo: null,
    assignedToName: null,
    assignedToEmail: null
  })
}

export async function deleteShift(shiftId: string): Promise<void> {
  await deleteDoc(doc(db, 'shifts', shiftId))
}

export async function deleteScheduleAndShifts(scheduleId: string): Promise<void> {
  // Delete all shifts for this schedule
  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('scheduleId', '==', scheduleId)
  )
  const shiftsSnapshot = await getDocs(shiftsQuery)

  const batch = writeBatch(db)
  shiftsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref)
  })

  // Delete the schedule
  batch.delete(doc(db, 'schedules', scheduleId))

  await batch.commit()
}

// ============= Helper Functions =============

export function generateShifts(
  scheduleId: string,
  stableId: string,
  stableName: string,
  startDate: Date,
  endDate: Date,
  shiftTypes: ShiftType[]
): Omit<Shift, 'id'>[] {
  const shifts: Omit<Shift, 'id'>[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' })

    shiftTypes.forEach(shiftType => {
      if (shiftType.daysOfWeek.includes(dayName)) {
        shifts.push({
          scheduleId,
          stableId,
          stableName,
          date: Timestamp.fromDate(new Date(currentDate)),
          shiftTypeId: shiftType.id,
          shiftTypeName: shiftType.name,
          time: shiftType.time,
          points: shiftType.points,
          status: 'unassigned',
          assignedTo: null,
          assignedToName: null,
          assignedToEmail: null
        })
      }
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return shifts
}
