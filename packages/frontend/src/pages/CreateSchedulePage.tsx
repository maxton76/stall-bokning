import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Wand2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createSchedule, createShifts, generateShifts } from '@/services/scheduleService'
import type { ShiftType } from '@/types/schedule'

export default function CreateSchedulePage() {
  const { stableId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [stableName, setStableName] = useState('')
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])

  const [scheduleData, setScheduleData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    useAutoAssignment: true,
    selectedShiftTypes: [] as string[],
    notifyMembers: true
  })

  // Load stable data
  useEffect(() => {
    if (!stableId) return

    const loadStable = async () => {
      try {
        const stableRef = doc(db, 'stables', stableId)
        const stableSnap = await getDoc(stableRef)

        if (stableSnap.exists()) {
          const data = stableSnap.data()
          setStableName(data.name || '')
          const types = data.shiftTypes || []
          setShiftTypes(types)
          setScheduleData(prev => ({
            ...prev,
            selectedShiftTypes: types.map((st: ShiftType) => st.id)
          }))
        }
      } catch (error) {
        console.error('Error loading stable:', error)
      }
    }

    loadStable()
  }, [stableId])

  const handleShiftTypeToggle = (shiftTypeId: string) => {
    setScheduleData({
      ...scheduleData,
      selectedShiftTypes: scheduleData.selectedShiftTypes.includes(shiftTypeId)
        ? scheduleData.selectedShiftTypes.filter(id => id !== shiftTypeId)
        : [...scheduleData.selectedShiftTypes, shiftTypeId]
    })
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !stableId) return

    setIsLoading(true)

    try {
      // Create the schedule
      const scheduleId = await createSchedule(
        {
          name: scheduleData.name,
          stableId,
          stableName,
          startDate: new Date(scheduleData.startDate),
          endDate: new Date(scheduleData.endDate),
          selectedShiftTypes: scheduleData.selectedShiftTypes,
          useAutoAssignment: scheduleData.useAutoAssignment,
          notifyMembers: scheduleData.notifyMembers
        },
        user.uid
      )

      // Get selected shift types
      const selectedTypes = shiftTypes.filter(st =>
        scheduleData.selectedShiftTypes.includes(st.id)
      )

      // Generate shifts
      const shifts = generateShifts(
        scheduleId,
        stableId,
        stableName,
        new Date(scheduleData.startDate),
        new Date(scheduleData.endDate),
        selectedTypes
      )

      // Create shifts in Firestore
      await createShifts(scheduleId, shifts)

      // Navigate to schedule editor
      navigate(`/stables/${stableId}/schedules/${scheduleId}/edit`)
    } catch (error) {
      console.error('Error creating schedule:', error)
      alert('Failed to create schedule. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateEstimatedShifts = () => {
    if (!scheduleData.startDate || !scheduleData.endDate) return 0

    const start = new Date(scheduleData.startDate)
    const end = new Date(scheduleData.endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Simple calculation: count how many shifts would be created
    let totalShifts = 0
    scheduleData.selectedShiftTypes.forEach(stId => {
      const shiftType = shiftTypes.find(st => st.id === stId)
      if (shiftType) {
        // Count how many days match the shift's days of week
        totalShifts += Math.floor(days / 7) * shiftType.daysOfWeek.length
      }
    })

    return totalShifts
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
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Create New Schedule</h1>
          <p className='text-muted-foreground mt-1'>
            Set up a new schedule for your stable members
          </p>
        </div>
      </div>

      <form onSubmit={handleCreateSchedule} className='space-y-6'>
        {/* Schedule Basics */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <Calendar className='mr-2 h-5 w-5' />
              Schedule Details
            </CardTitle>
            <CardDescription>Define the timeframe and name for this schedule</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Schedule Name</Label>
              <Input
                id='name'
                value={scheduleData.name}
                onChange={(e) => setScheduleData({ ...scheduleData, name: e.target.value })}
                placeholder='e.g. Weekly Schedule Dec 25-31'
                required
              />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='startDate'>Start Date</Label>
                <Input
                  id='startDate'
                  type='date'
                  value={scheduleData.startDate}
                  onChange={(e) => setScheduleData({ ...scheduleData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='endDate'>End Date</Label>
                <Input
                  id='endDate'
                  type='date'
                  value={scheduleData.endDate}
                  onChange={(e) => setScheduleData({ ...scheduleData, endDate: e.target.value })}
                  min={scheduleData.startDate}
                  required
                />
              </div>
            </div>

            {scheduleData.startDate && scheduleData.endDate && (
              <div className='rounded-lg bg-muted p-4'>
                <p className='text-sm'>
                  <strong>Duration:</strong>{' '}
                  {Math.ceil(
                    (new Date(scheduleData.endDate).getTime() - new Date(scheduleData.startDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1}{' '}
                  days
                </p>
                <p className='text-sm'>
                  <strong>Estimated shifts:</strong> ~{calculateEstimatedShifts()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shift Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Shift Types</CardTitle>
            <CardDescription>Choose which shift types to include in this schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {shiftTypes.map((shiftType) => (
                <div key={shiftType.id} className='flex items-start space-x-3'>
                  <Checkbox
                    id={`shift-${shiftType.id}`}
                    checked={scheduleData.selectedShiftTypes.includes(shiftType.id)}
                    onCheckedChange={() => handleShiftTypeToggle(shiftType.id)}
                  />
                  <div className='flex-1'>
                    <Label
                      htmlFor={`shift-${shiftType.id}`}
                      className='text-base font-medium cursor-pointer'
                    >
                      {shiftType.name}
                    </Label>
                    <p className='text-sm text-muted-foreground'>
                      {shiftType.time} • {shiftType.points} points • {shiftType.daysOfWeek.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {scheduleData.selectedShiftTypes.length === 0 && (
              <div className='rounded-lg bg-destructive/10 p-4 mt-4'>
                <p className='text-sm text-destructive'>
                  ⚠️ Please select at least one shift type
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Options */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <Wand2 className='mr-2 h-5 w-5' />
              Assignment Method
            </CardTitle>
            <CardDescription>Choose how shifts will be assigned to members</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='flex items-center justify-between space-x-2'>
              <div className='space-y-0.5'>
                <Label htmlFor='autoAssignment' className='text-base'>
                  Use Automatic Assignment
                </Label>
                <p className='text-sm text-muted-foreground'>
                  Let the fairness algorithm distribute shifts automatically based on member history and
                  availability
                </p>
              </div>
              <Switch
                id='autoAssignment'
                checked={scheduleData.useAutoAssignment}
                onCheckedChange={(checked) =>
                  setScheduleData({ ...scheduleData, useAutoAssignment: checked })
                }
              />
            </div>

            {!scheduleData.useAutoAssignment && (
              <div className='rounded-lg bg-blue-50 dark:bg-blue-950 p-4'>
                <div className='flex items-start space-x-3'>
                  <Users className='h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5' />
                  <div>
                    <p className='text-sm font-medium text-blue-900 dark:text-blue-100'>
                      Manual Assignment Mode
                    </p>
                    <p className='text-sm text-blue-700 dark:text-blue-300 mt-1'>
                      You'll be redirected to the schedule editor where you can manually assign members to
                      each shift. The system will still show fairness suggestions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how members will be notified about this schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between space-x-2'>
              <div className='space-y-0.5'>
                <Label htmlFor='notifyMembers' className='text-base'>
                  Notify Members
                </Label>
                <p className='text-sm text-muted-foreground'>
                  Send email notifications to all members when the schedule is published
                </p>
              </div>
              <Switch
                id='notifyMembers'
                checked={scheduleData.notifyMembers}
                onCheckedChange={(checked) =>
                  setScheduleData({ ...scheduleData, notifyMembers: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className='flex items-center justify-between'>
          <Link to={`/stables/${stableId}`}>
            <Button type='button' variant='outline'>
              Cancel
            </Button>
          </Link>
          <Button
            type='submit'
            disabled={isLoading || scheduleData.selectedShiftTypes.length === 0}
          >
            {isLoading ? (
              'Creating...'
            ) : scheduleData.useAutoAssignment ? (
              <>
                <Wand2 className='mr-2 h-4 w-4' />
                Create & Auto-Assign
              </>
            ) : (
              <>
                <Calendar className='mr-2 h-4 w-4' />
                Create Schedule
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
