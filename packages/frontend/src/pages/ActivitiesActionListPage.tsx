import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useDialog } from '@/hooks/useDialog'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCRUD } from '@/hooks/useCRUD'
import { useUserStables } from '@/hooks/useUserStables'
import { useActivityFilters } from '@/hooks/useActivityFilters'
import { useActivityTypes } from '@/hooks/useActivityTypes'
import { useActivityTypeConfig } from '@/hooks/useActivityTypeConfig'
import { ActivityFormDialog } from '@/components/ActivityFormDialog'
import { ActivityFilterPopover } from '@/components/activities/ActivityFilterPopover'
import {
  getActivitiesByDateTab,
  createActivity,
  createTask,
  createMessage,
  updateActivity,
  deleteActivity,
  completeActivity,
} from '@/services/activityService'
import { getUserHorses } from '@/services/horseService'
import type {
  ActivityEntry,
  ActivityFilters,
  DateTab,
} from '@/types/activity'
import type { Horse } from '@/types/roles'
import { ACTIVITY_TYPES as ACTIVITY_TYPE_CONFIG } from '@/types/activity'
import { useToast } from '@/hooks/use-toast'

const DATE_TABS: Array<{ value: DateTab; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'dayAfter', label: 'Day After' },
]

export default function ActivitiesActionListPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedTab, setSelectedTab] = useState<DateTab>('today')
  const [selectedStableId, setSelectedStableId] = useState<string>('')
  const [filters, setFilters] = useState<ActivityFilters>({
    groupBy: 'none',
    forMe: false,
    showFinished: false,
    entryTypes: ['activity', 'task', 'message'],
  })

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid)

  // Auto-select first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id)
    }
  }, [stables, selectedStableId])

  // Load activities for selected stable and date tab
  const activities = useAsyncData<ActivityEntry[]>({
    loadFn: async () => {
      if (!selectedStableId) return []
      return await getActivitiesByDateTab(selectedStableId, selectedTab)
    },
  })

  // Load horses for activity form
  const horses = useAsyncData<Horse[]>({
    loadFn: async () => {
      if (!user) return []
      return await getUserHorses(user.uid)
    },
  })

  // Load activity types for selected stable (auto-reloads on stable change)
  const activityTypes = useActivityTypes(selectedStableId, true)

  // Reload activities when stable or tab changes
  useEffect(() => {
    if (selectedStableId) {
      activities.load()
    }
  }, [selectedStableId, selectedTab])

  // Load horses on mount
  useEffect(() => {
    if (user) {
      horses.load()
    }
  }, [user])

  // Filter and group activities
  const { filteredActivities, groupedActivities } = useActivityFilters(
    activities.data || [],
    filters,
    user?.uid
  )

  // Dialog state
  const formDialog = useDialog<ActivityEntry>()

  // CRUD operations
  const { create, update, remove } = useCRUD<ActivityEntry>({
    createFn: async (data: any) => {
      if (!selectedStableId || !user) throw new Error('Missing required data')
      const stable = stables.find((s) => s.id === selectedStableId)
      if (!stable) throw new Error('Stable not found')

      if (data.type === 'activity') {
        return await createActivity(user.uid, selectedStableId, data, stable.name)
      } else if (data.type === 'task') {
        return await createTask(user.uid, selectedStableId, data, stable.name)
      } else {
        return await createMessage(user.uid, selectedStableId, data, stable.name)
      }
    },
    updateFn: async (id, data) => {
      if (!user) throw new Error('User not authenticated')
      await updateActivity(id, user.uid, data)
    },
    deleteFn: async (id) => {
      await deleteActivity(id)
    },
    onSuccess: async () => {
      await activities.reload()
    },
    successMessages: {
      create: 'Entry created successfully',
      update: 'Entry updated successfully',
      delete: 'Entry deleted successfully',
    },
  })

  // Handlers
  const handleAddEntry = () => {
    formDialog.openDialog()
  }

  const handleEditEntry = (entry: ActivityEntry) => {
    formDialog.openDialog(entry)
  }

  const handleDeleteEntry = async (entry: ActivityEntry) => {
    const entryTitle =
      entry.type === 'activity'
        ? `${entry.horseName} - ${ACTIVITY_TYPE_CONFIG.find((t) => t.value === entry.activityType)?.label}`
        : entry.title

    if (confirm(`Are you sure you want to delete "${entryTitle}"?`)) {
      await remove(entry.id)
    }
  }

  const handleCompleteEntry = async (entry: ActivityEntry) => {
    if (!user) return
    try {
      await completeActivity(entry.id, user.uid)
      await activities.reload()
      toast({
        title: 'Success',
        description: 'Entry marked as completed',
      })
    } catch (error) {
      console.error('Failed to complete entry:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark entry as completed',
        variant: 'destructive',
      })
    }
  }

  const handleSaveEntry = async (data: any) => {
    try {
      if (formDialog.data) {
        // Update existing entry
        await update(formDialog.data.id, data)
      } else {
        // Create new entry
        await create(data)
      }
      formDialog.closeDialog()
    } catch (error) {
      console.error('Failed to save entry:', error)
      toast({
        title: 'Error',
        description: 'Failed to save entry. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Get stable members for assignment dropdown
  const stableMembers = useMemo(() => {
    // This would typically come from a stable members service
    // For now, return empty array
    return []
  }, [selectedStableId])

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
              You need to be a member of a stable to manage activities.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground mt-1">
            Manage activities, tasks, and messages
          </p>
        </div>
        <Button onClick={handleAddEntry} disabled={!selectedStableId}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Stable Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedStableId} onValueChange={setSelectedStableId}>
                <SelectTrigger>
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
            <ActivityFilterPopover filters={filters} onFiltersChange={setFilters} />
          </div>
        </CardContent>
      </Card>

      {/* Date Tabs */}
      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as DateTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {DATE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle>Entries ({filteredActivities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No activities for this date. Click "Add Entry" to create one.
              </p>
            </div>
          ) : filters.groupBy === 'none' ? (
            <div className="space-y-2">
              {filteredActivities.map((entry) => (
                <ActivityCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => handleEditEntry(entry)}
                  onDelete={() => handleDeleteEntry(entry)}
                  onComplete={() => handleCompleteEntry(entry)}
                  activityTypes={activityTypes.data || []}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([groupKey, entries]) => (
                <div key={groupKey}>
                  <h3 className="text-lg font-semibold mb-3">{groupKey}</h3>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <ActivityCard
                        key={entry.id}
                        entry={entry}
                        onEdit={() => handleEditEntry(entry)}
                        onDelete={() => handleDeleteEntry(entry)}
                        onComplete={() => handleCompleteEntry(entry)}
                        activityTypes={activityTypes.data || []}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ActivityFormDialog
        open={formDialog.open}
        onOpenChange={formDialog.closeDialog}
        entry={formDialog.data || undefined}
        onSave={handleSaveEntry}
        horses={horses.data?.map((h) => ({ id: h.id, name: h.name })) || []}
        stableMembers={stableMembers}
        activityTypes={activityTypes.data || []}
      />
    </div>
  )
}

// Activity Card Component
interface ActivityCardProps {
  entry: ActivityEntry
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  activityTypes: Array<any> // Activity type configs
}

function ActivityCard({ entry, onEdit, onDelete, onComplete, activityTypes }: ActivityCardProps) {
  // Use hook for activity type resolution (only for activity entries)
  const activityTypeDisplay = entry.type === 'activity'
    ? useActivityTypeConfig(entry, activityTypes)
    : null

  // Icon: activity type icon or entry type default
  const typeIcon =
    entry.type === 'activity'
      ? activityTypeDisplay!.icon
      : entry.type === 'task'
      ? '📋'
      : '💬'

  // Badge color by entry type
  const typeColor =
    entry.type === 'activity'
      ? 'bg-blue-100 text-blue-800'
      : entry.type === 'task'
      ? 'bg-green-100 text-green-800'
      : 'bg-purple-100 text-purple-800'

  // Title: compose from activity type label or use entry title
  const title =
    entry.type === 'activity'
      ? `${entry.horseName} - ${activityTypeDisplay!.label}`
      : entry.title

  // Description varies by entry type
  const description =
    entry.type === 'activity'
      ? entry.note
      : entry.type === 'task'
      ? entry.description
      : entry.message

  // Left border color: activity type color or entry color
  const leftBorderColor =
    entry.type === 'activity'
      ? activityTypeDisplay!.color
      : entry.color

  return (
    <div
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
      style={{ borderLeftWidth: '4px', borderLeftColor: leftBorderColor }}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="text-2xl">{typeIcon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium">{title}</p>
            <Badge className={typeColor}>{entry.type}</Badge>
            {entry.status === 'completed' && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Completed
              </Badge>
            )}
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {(entry.type === 'activity' || entry.type === 'task') && entry.assignedToName && (
            <p className="text-sm text-muted-foreground mt-1">
              Assigned to: {entry.assignedToName}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {entry.status !== 'completed' && (
          <Button size="sm" variant="ghost" onClick={onComplete}>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
