import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth, subDays, addDays } from 'date-fns'
import { CalendarDays, Users, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStables } from '@/hooks/useUserStables'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDialog } from '@/hooks/useDialog'
import { useActivityTypes } from '@/hooks/useActivityTypes'
import { ActivityCalendarView } from '@/components/ActivityCalendarView'
import { ActivityFormDialog } from '@/components/ActivityFormDialog'
import { getStableActivities } from '@/services/activityService'
import { getUserHorsesAtStable } from '@/services/horseService'
import type { ActivityEntry } from '@/types/activity'

export default function ActivitiesPlanningPage() {
  const { user } = useAuth()
  const [selectedStableId, setSelectedStableId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'horses' | 'staff' | 'stable'>('horses')
  const [selectedHorseId, setSelectedHorseId] = useState<string>('all')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [dialogInitialDate, setDialogInitialDate] = useState<Date | undefined>()

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid)

  // Auto-select first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id)
    }
  }, [stables, selectedStableId])

  // Load activities for current month ± 1 week
  const activities = useAsyncData<ActivityEntry[]>({
    loadFn: async () => {
      if (!selectedStableId) return []
      const startDate = startOfMonth(subDays(new Date(), 7))
      const endDate = endOfMonth(addDays(new Date(), 7))
      return await getStableActivities(selectedStableId, startDate, endDate)
    },
  })

  // Load activity types
  const activityTypes = useActivityTypes(selectedStableId, true)

  // Load horses for horses view
  const horses = useAsyncData<Array<{ id: string; name: string }>>({
    loadFn: async () => {
      if (!selectedStableId || viewMode !== 'horses' || !user) return []
      return await getUserHorsesAtStable(user.uid, selectedStableId)
    },
  })

  // Load staff members (from stable members)
  // TODO: Implement getStableMembers service
  const staffMembers = useAsyncData<Array<{ id: string; name: string }>>({
    loadFn: async () => {
      // Placeholder until getStableMembers is implemented
      return []
    },
  })

  // Dialog for event click
  const formDialog = useDialog<ActivityEntry>()

  // Reload activities when stable changes
  useEffect(() => {
    if (selectedStableId) {
      activities.load()
    }
  }, [selectedStableId])

  // Reload horses/staff when view mode changes
  useEffect(() => {
    if (selectedStableId && viewMode === 'horses') {
      horses.load()
    } else if (selectedStableId && viewMode === 'staff') {
      staffMembers.load()
    }
  }, [selectedStableId, viewMode])

  // Event handlers
  const handleEventClick = (entry: ActivityEntry) => {
    formDialog.openDialog(entry)
  }

  const handleDateSelect = (date: Date) => {
    setDialogInitialDate(date)
    formDialog.openDialog()
  }

  const handleSave = async (data: any) => {
    // TODO: Implement save logic
    console.log('Save activity:', data)
    formDialog.closeDialog()
    setDialogInitialDate(undefined)
    activities.reload()
  }

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading stables...</p>
      </div>
    )
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No stables found</h3>
            <p className="text-muted-foreground">
              You need to be a member of a stable to view planning.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with View Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Planning</h1>
          <p className="text-muted-foreground mt-1">
            Calendar view of all activities, tasks, and messages
          </p>
        </div>
        {/* View Switcher */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'horses' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('horses')}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Horses
          </Button>
          <Button
            variant={viewMode === 'staff' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('staff')}
          >
            <Users className="mr-2 h-4 w-4" />
            Staff
          </Button>
          <Button
            variant={viewMode === 'stable' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('stable')}
          >
            <Building className="mr-2 h-4 w-4" />
            Stable
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>
              {viewMode === 'horses' && 'Horses Activity Calendar'}
              {viewMode === 'staff' && 'Staff Assignment Calendar'}
              {viewMode === 'stable' && 'Complete Stable Calendar'}
            </CardTitle>

            {/* Stable Selector & Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Stable Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Stable:</label>
                <Select value={selectedStableId} onValueChange={setSelectedStableId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select a stable" />
                  </SelectTrigger>
                  <SelectContent>
                    {stables.map((stable) => (
                      <SelectItem key={stable.id} value={stable.id}>
                        {stable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Horse Filter (Horses View) */}
              {viewMode === 'horses' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Horse:</label>
                  <Select value={selectedHorseId} onValueChange={setSelectedHorseId}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select horse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Horses</SelectItem>
                      {horses.data?.map((horse) => (
                        <SelectItem key={horse.id} value={horse.id}>
                          {horse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Staff Filter (Staff View) */}
              {viewMode === 'staff' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Staff:</label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {staffMembers.data?.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activities.loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading activities...</p>
            </div>
          ) : (
            <ActivityCalendarView
              activities={activities.data || []}
              activityTypes={activityTypes.data || []}
              viewMode={viewMode}
              selectedHorseId={selectedHorseId}
              selectedStaffId={selectedStaffId}
              onEventClick={handleEventClick}
              onDateSelect={handleDateSelect}
              editable={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Activity Form Dialog */}
      <ActivityFormDialog
        open={formDialog.open}
        onOpenChange={formDialog.closeDialog}
        entry={formDialog.data || undefined}
        initialDate={dialogInitialDate}
        onSave={handleSave}
        horses={horses.data || []}
        stableMembers={staffMembers.data || []}
        activityTypes={activityTypes.data || []}
      />
    </div>
  )
}
