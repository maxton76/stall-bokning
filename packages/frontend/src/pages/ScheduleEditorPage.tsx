import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, AlertCircle, CalendarCheck, Users, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getSchedule, assignShift, unassignShift, publishSchedule, autoAssignShifts, calculateHistoricalPoints } from '@/services/scheduleService'
import type { Schedule, Shift } from '@/types/schedule'
import { formatFullName, formatDisplayName } from '@/lib/nameUtils'

interface StableMember {
  id: string
  displayName: string
  email: string
  currentPoints: number
}

export default function ScheduleEditorPage() {
  const { stableId, scheduleId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [members, setMembers] = useState<StableMember[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)

  // Load schedule, shifts, and members
  useEffect(() => {
    if (!scheduleId || !stableId) return
    loadData()
  }, [scheduleId, stableId])

  const loadData = async () => {
    if (!scheduleId || !stableId) return

    try {
      setLoading(true)

      // Load schedule
      const scheduleData = await getSchedule(scheduleId)
      setSchedule(scheduleData)

      // Load shifts
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('scheduleId', '==', scheduleId),
        orderBy('date', 'asc')
      )
      const shiftsSnapshot = await getDocs(shiftsQuery)
      const shiftsData = shiftsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Shift))
      setShifts(shiftsData)

      // Load stable members from stableMembers collection (modern pattern)
      const membersQuery = query(
        collection(db, 'stableMembers'),
        where('stableId', '==', stableId),
        where('status', '==', 'active')
      )
      const membersSnapshot = await getDocs(membersQuery)
      console.log('✅ Members query returned:', membersSnapshot.size, 'documents')
      console.log('📊 Member data:', membersSnapshot.docs.map(d => ({ id: d.id, ...d.data() })))

      // Load user details for each member
      const memberPromises = membersSnapshot.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data()
        console.log('🔍 Looking up user:', memberData.userId)
        const userRef = doc(db, 'users', memberData.userId)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data()
          console.log('✅ Found user:', userData)
          return {
            id: memberData.userId,
            displayName: formatFullName({
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email
            }),
            email: userData.email,
            currentPoints: 0 // TODO: Calculate from shifts
          }
        }
        console.warn('❌ User not found in users collection:', memberData.userId)
        console.log('💡 Using cached data from stableMember instead')

        // Use cached firstName/lastName from stableMember with email parsing fallback
        const displayName = formatDisplayName({
          firstName: memberData.firstName,
          lastName: memberData.lastName,
          email: memberData.userEmail
        }, {
          parseEmail: true,
          fallback: 'Unknown User'
        })

        return {
          id: memberData.userId,
          displayName,
          email: memberData.userEmail || '',
          currentPoints: 0
        }
      })

      const membersList = (await Promise.all(memberPromises)).filter(Boolean) as StableMember[]
      console.log('📊 Final members list:', membersList)
      setMembers(membersList)
    } catch (error) {
      console.error('❌ Error loading data:', error)
      // Show error to user if member loading fails
      if (error instanceof Error && error.message.includes('index')) {
        console.error('🔍 Firestore Index Required:', error.message)
        alert('Database configuration needed. Please check console for details.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAssignShift = async (shiftId: string, memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    try {
      await assignShift(shiftId, memberId, member.displayName, member.email)
      await loadData()
    } catch (error) {
      console.error('Error assigning shift:', error)
      alert('Failed to assign shift. Please try again.')
    }
  }

  const handleUnassignShift = async (shiftId: string) => {
    try {
      await unassignShift(shiftId)
      await loadData()
    } catch (error) {
      console.error('Error unassigning shift:', error)
      alert('Failed to unassign shift. Please try again.')
    }
  }

  const handleAutoAssign = async () => {
    if (!scheduleId || !stableId) return

    const unassignedCount = shifts.filter(s => s.status === 'unassigned').length

    if (unassignedCount === 0) {
      alert('All shifts are already assigned!')
      return
    }

    const confirmed = window.confirm(
      `Auto-assign will distribute ${unassignedCount} unassigned shifts fairly based on point balance, availability constraints, individual limits, and historical performance. Continue?`
    )
    if (!confirmed) return

    try {
      setAutoAssigning(true)

      // Calculate historical points for fairness across schedules (90-day memory horizon)
      const memberIds = members.map(m => m.id)
      const historicalPoints = await calculateHistoricalPoints(stableId, memberIds, 90)

      // Auto-assign with all enhancement features:
      // - Availability constraints (never available times)
      // - Individual limits (max/min shifts per week/month)
      // - Historical points from past schedules
      // - Holiday weighting (1.5x multiplier for Swedish holidays)
      const assignedCount = await autoAssignShifts(
        scheduleId,
        stableId,
        members,
        historicalPoints
      )

      await loadData()
      alert(`Successfully auto-assigned ${assignedCount} shifts using the enhanced fairness algorithm!`)
    } catch (error) {
      console.error('Error auto-assigning shifts:', error)
      alert('Failed to auto-assign shifts. Please try again.')
    } finally {
      setAutoAssigning(false)
    }
  }

  const handlePublish = async () => {
    if (!user || !scheduleId) return

    const unassignedCount = shifts.filter(s => s.status === 'unassigned').length

    if (unassignedCount > 0) {
      const confirmed = window.confirm(
        `There are ${unassignedCount} unassigned shifts. Do you want to publish anyway? Boarders will be able to book these shifts.`
      )
      if (!confirmed) return
    }

    try {
      setPublishing(true)
      await publishSchedule(scheduleId, user.uid)
      alert('Schedule published successfully! Boarders have been notified.')
      navigate(`/stables/${stableId}`)
    } catch (error) {
      console.error('Error publishing schedule:', error)
      alert('Failed to publish schedule. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const total = shifts.length
    const assigned = shifts.filter(s => s.status === 'assigned').length
    const unassigned = total - assigned
    const coverage = total > 0 ? Math.round((assigned / total) * 100) : 0

    // Calculate points per member
    const pointsByMember = new Map<string, number>()
    shifts.forEach(shift => {
      if (shift.assignedTo) {
        const current = pointsByMember.get(shift.assignedTo) || 0
        pointsByMember.set(shift.assignedTo, current + shift.points)
      }
    })

    const totalPoints = Array.from(pointsByMember.values()).reduce((sum, p) => sum + p, 0)
    const avgPoints = pointsByMember.size > 0 ? totalPoints / pointsByMember.size : 0

    // Calculate fairness (lower standard deviation = more fair)
    const pointsArray = Array.from(pointsByMember.values())
    const variance = pointsArray.reduce((acc, p) => acc + Math.pow(p - avgPoints, 2), 0) / (pointsArray.length || 1)
    const stdDev = Math.sqrt(variance)
    const fairnessIndex = Math.max(0, 100 - (stdDev / (avgPoints || 1)) * 100)

    return { total, assigned, unassigned, coverage, fairnessIndex: Math.round(fairnessIndex) }
  }, [shifts])

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped = new Map<string, Shift[]>()
    shifts.forEach(shift => {
      const dateStr = shift.date.toDate().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
      const existing = grouped.get(dateStr) || []
      grouped.set(dateStr, [...existing, shift])
    })
    return grouped
  }, [shifts])

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-muted-foreground'>Loading schedule...</div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className='container mx-auto p-6'>
        <div className='text-center'>
          <p className='text-muted-foreground'>Schedule not found</p>
          <Link to={`/stables/${stableId}`}>
            <Button variant='outline' className='mt-4'>Back to Stable</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div>
        <Link to={`/stables/${stableId}`}>
          <Button variant='ghost' className='mb-4'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Stable
          </Button>
        </Link>
        <div className='flex items-center justify-between'>
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-3xl font-bold tracking-tight'>{schedule.name}</h1>
              <Badge variant={schedule.status === 'published' ? 'default' : 'secondary'}>
                {schedule.status}
              </Badge>
            </div>
            <p className='text-muted-foreground mt-1'>
              Assign shifts to boarders before publishing
            </p>
          </div>
          {schedule.status === 'draft' && (
            <div className='flex gap-2'>
              <Button
                onClick={handleAutoAssign}
                disabled={autoAssigning || stats.unassigned === 0}
                variant='outline'
              >
                <Wand2 className='mr-2 h-4 w-4' />
                {autoAssigning ? 'Auto-Assigning...' : 'Auto-Assign Shifts'}
              </Button>
              <Button onClick={handlePublish} disabled={publishing}>
                <CalendarCheck className='mr-2 h-4 w-4' />
                {publishing ? 'Publishing...' : 'Publish Schedule'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Assignment Info */}
      {schedule.status === 'draft' && stats.unassigned > 0 && (
        <Card className='bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-blue-900 dark:text-blue-100'>
              <Wand2 className='h-5 w-5' />
              Fairness-Based Auto-Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-blue-700 dark:text-blue-300'>
            <p>
              The auto-assignment algorithm distributes unassigned shifts fairly by:
            </p>
            <ul className='list-disc list-inside mt-2 space-y-1'>
              <li>Calculating each member's current point total from assigned shifts</li>
              <li>Assigning each unassigned shift to the member with the lowest points</li>
              <li>Creating a balanced distribution that keeps everyone within ±10% of average</li>
            </ul>
            <p className='mt-2'>
              <strong>Fairness Index:</strong> {stats.fairnessIndex}% - Higher scores indicate more balanced distribution
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Assigned</CardTitle>
            <CheckCircle className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>{stats.assigned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Unassigned</CardTitle>
            <AlertCircle className='h-4 w-4 text-destructive' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-destructive'>{stats.unassigned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Fairness Index</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.fairnessIndex}%</div>
            <p className='text-xs text-muted-foreground'>Higher is more fair</p>
          </CardContent>
        </Card>
      </div>

      {/* Shift Assignment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Assignments</CardTitle>
          <CardDescription>
            Assign boarders to shifts. You can publish when ready, even with unassigned shifts.
            {members.length > 0 && (
              <span className='ml-2 text-sm text-muted-foreground'>
                ({members.length} member{members.length !== 1 ? 's' : ''} available)
              </span>
            )}
            {members.length === 0 && (
              <span className='ml-2 text-sm text-destructive'>
                (No members found - check console for errors)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            {Array.from(shiftsByDate.entries()).map(([date, dateShifts]) => (
              <div key={date} className='space-y-2'>
                <h3 className='font-semibold text-sm text-muted-foreground'>{date}</h3>
                <div className='space-y-2'>
                  {dateShifts.map(shift => (
                    <div
                      key={shift.id}
                      className='flex items-center justify-between p-4 border rounded-lg'
                    >
                      <div className='flex-1'>
                        <div className='font-medium'>{shift.shiftTypeName}</div>
                        <div className='text-sm text-muted-foreground'>
                          {shift.time} • {shift.points} points
                        </div>
                      </div>
                      <div className='flex items-center gap-4'>
                        {shift.status === 'assigned' && (
                          <Badge variant='outline' className='bg-green-50 text-green-700 border-green-200'>
                            {shift.assignedToName}
                          </Badge>
                        )}
                        <Select
                          value={shift.assignedTo || 'unassigned'}
                          onValueChange={(value) => {
                            if (value === 'unassigned') {
                              handleUnassignShift(shift.id)
                            } else {
                              handleAssignShift(shift.id, value)
                            }
                          }}
                        >
                          <SelectTrigger className='w-[200px]'>
                            <SelectValue placeholder='Assign to...' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='unassigned'>Unassigned</SelectItem>
                            {members.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
