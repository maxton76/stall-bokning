import { useState, useEffect } from 'react'
import { Heart, Grid3x3, Table2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
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
import { useHorseFilters } from '@/hooks/useHorseFilters'
import { HorseFilterPopover, HorseFilterBadges } from '@/components/HorseFilterPopover'
import { getCareActivities, createActivity } from '@/services/activityService'
import { getUserHorsesAtStable, getUserHorsesAtStables } from '@/services/horseService'
import { getActivityTypesByStable } from '@/services/activityTypeService'
import { getStableHorseGroups } from '@/services/horseGroupService'
import { CareMatrixView } from '@/components/CareMatrixView'
import { CareTableView } from '@/components/CareTableView'
import { QuickAddDialog } from '@/components/QuickAddDialog'
import { ActivityFormDialog } from '@/components/ActivityFormDialog'
import type { Activity, ActivityTypeConfig } from '@/types/activity'
import type { Horse, HorseGroup } from '@/types/roles'
import type { FilterConfig } from '@shared/types/filters'
import { Timestamp } from 'firebase/firestore'

export default function ActivitiesCarePage() {
  const { user } = useAuth()
  const [selectedStableId, setSelectedStableId] = useState<string>('all')

  // State for view mode
  type CareViewMode = 'matrix' | 'table'
  const [viewMode, setViewMode] = useState<CareViewMode>('matrix')

  // State for quick add dialog
  const [quickAddDialog, setQuickAddDialog] = useState<{
    open: boolean
    horseId?: string
    activityTypeId?: string
  }>({ open: false })

  // State for full activity dialog
  const [activityDialog, setActivityDialog] = useState<{
    open: boolean
    initialHorseId?: string
    initialActivityTypeId?: string
    initialDate?: Date
  }>({ open: false })

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid)

  // No auto-select needed - defaults to "all"

  // Persist view preference in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('care-view-mode')
    if (saved === 'matrix' || saved === 'table') {
      setViewMode(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('care-view-mode', viewMode)
  }, [viewMode])

  // Load care activities for selected stable(s)
  const activities = useAsyncData<Activity[]>({
    loadFn: async () => {
      if (!selectedStableId) return []

      // If "all" is selected, get activities from all stables
      if (selectedStableId === 'all') {
        const stableIds = stables.map(s => s.id)
        return await getCareActivities(stableIds)
      }

      // Otherwise get activities for specific stable
      return await getCareActivities(selectedStableId)
    },
  })

  // Load activity types for selected stable (auto-reloads on stable change)
  // When "all" is selected, load activity types from all stables
  const activityTypes = useAsyncData<ActivityTypeConfig[]>({
    loadFn: async () => {
      if (!selectedStableId) return []

      // If "all" is selected, get activity types from all stables and merge them
      if (selectedStableId === 'all') {
        const allTypes: ActivityTypeConfig[] = []
        const seenIds = new Set<string>()

        for (const stable of stables) {
          const types = await getActivityTypesByStable(stable.id, true)
          // Add unique types (by ID to avoid duplicates)
          types.forEach(type => {
            if (!seenIds.has(type.id)) {
              seenIds.add(type.id)
              allTypes.push(type)
            }
          })
        }

        return allTypes
      }

      // Otherwise get activity types for specific stable
      return await getActivityTypesByStable(selectedStableId, true)
    },
  })

  // Load horses for selected stable(s) - now returns full Horse objects
  const horses = useAsyncData<Horse[]>({
    loadFn: async () => {
      if (!selectedStableId || !user) return []

      // If "all" is selected, get horses from all stables
      if (selectedStableId === 'all') {
        const stableIds = stables.map(s => s.id)
        return await getUserHorsesAtStables(user.uid, stableIds)
      }

      // Otherwise get horses for specific stable
      return await getUserHorsesAtStable(user.uid, selectedStableId)
    },
  })

  // Load horse groups for filtering
  const horseGroups = useAsyncData<HorseGroup[]>({
    loadFn: async () => {
      if (!selectedStableId || selectedStableId === 'all') return []
      return await getStableHorseGroups(selectedStableId)
    },
  })

  // Reload activities, horses, and activity types when stable changes or stables list loads
  useEffect(() => {
    if (selectedStableId && stables.length > 0) {
      activities.load()
      horses.load()
      activityTypes.load()
      horseGroups.load()
    }
  }, [selectedStableId, stables])

  // Filtering with unified hook
  const {
    filters,
    setFilters,
    filteredHorses,
    activeFilterCount,
    hasActiveFilters,
    clearAllFilters,
    getActiveFilterBadges
  } = useHorseFilters({
    horses: horses.data || [],
    initialFilters: {},
    stableContext: selectedStableId === 'all' ? undefined : selectedStableId
  })

  // Filter configuration for ActivitiesCarePage
  const filterConfig: FilterConfig = {
    showSearch: false,      // Search is external, not in popover
    showStable: false,      // Using stable selector above, not in filter
    showGender: true,
    showAge: true,
    showUsage: true,
    showGroups: true,       // Care page needs groups
    showStatus: false,
    useStableContext: true
  }

  // Helper function to find last activity for horse + activity type
  const findLastActivity = (horseId?: string, activityTypeId?: string): Activity | undefined => {
    if (!horseId || !activityTypeId) return undefined
    return (activities.data || [])
      .filter(a => a.horseId === horseId && a.activityTypeConfigId === activityTypeId)
      .sort((a, b) => b.date.toMillis() - a.date.toMillis())[0]
  }

  // Handlers for matrix interactions
  const handleCellClick = (horseId: string, activityTypeId: string) => {
    setQuickAddDialog({ open: true, horseId, activityTypeId })
  }

  const handleQuickAdd = () => {
    setQuickAddDialog({ open: false })
    setActivityDialog({
      open: true,
      initialHorseId: quickAddDialog.horseId,
      initialActivityTypeId: quickAddDialog.activityTypeId,
      initialDate: new Date(),
    })
  }

  const handleSave = async (data: any) => {
    try {
      if (!user || !selectedStableId) {
        throw new Error('User or stable not found')
      }

      // When "all" is selected, we need to determine which stable to save to
      // Use the horse's currentStableId from the data
      let stableIdToUse = selectedStableId === 'all' ? data.horseStableId : selectedStableId

      if (!stableIdToUse) {
        // Find the stable from the horse data
        const horse = horses.data?.find(h => h.id === data.horseId)
        if (horse && 'currentStableId' in horse) {
          stableIdToUse = (horse as any).currentStableId
        }
      }

      const stable = stables.find(s => s.id === stableIdToUse)
      if (!stable) throw new Error('Stable not found')

      const horse = horses.data?.find(h => h.id === data.horseId)

      // Get activity type name for legacy field
      const activityType = activityTypes.data?.find(t => t.id === data.activityTypeConfigId)
      const legacyActivityType = activityType?.name.toLowerCase() as any || 'other'

      await createActivity(
        user.uid,
        stableIdToUse,
        {
          date: Timestamp.fromDate(data.date),
          horseId: data.horseId,
          horseName: horse?.name || 'Unknown',
          activityType: legacyActivityType, // Legacy field for backward compatibility
          activityTypeConfigId: data.activityTypeConfigId,
          activityTypeColor: data.activityTypeColor,
          note: data.note,
          assignedTo: data.assignedTo,
          assignedToName: data.assignedToName,
          status: 'pending' as const,
        },
        stable.name
      )

      setActivityDialog({ open: false })
      await activities.reload()
    } catch (error) {
      console.error('Failed to save activity:', error)
      throw error // Let dialog handle error display
    }
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
              You need to be a member of a stable to view care activities.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Heart className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Care Activities</h1>
          <p className="text-muted-foreground mt-1">
            Veterinary, farrier, dentist, and other care-related activities
          </p>
        </div>
      </div>

      {/* Care Activities Matrix/Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle>Care Activities ({filteredHorses.length} horses)</CardTitle>

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as CareViewMode)}>
                <TabsList>
                  <TabsTrigger value="matrix">
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Matrix
                  </TabsTrigger>
                  <TabsTrigger value="table">
                    <Table2 className="h-4 w-4 mr-2" />
                    Table
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Filters Row */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Popover */}
                <HorseFilterPopover
                  filters={filters}
                  onFiltersChange={setFilters}
                  config={filterConfig}
                  groups={horseGroups.data || []}
                  activeFilterCount={activeFilterCount}
                  onClearAll={clearAllFilters}
                />

                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Name, UELN, etc..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="pl-9"
                  />
                </div>

                {/* Stable Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Stable:</label>
                  <Select value={selectedStableId} onValueChange={setSelectedStableId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select a stable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stables</SelectItem>
                      {stables.map((stable) => (
                        <SelectItem key={stable.id} value={stable.id}>
                          {stable.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter Badges */}
              {hasActiveFilters && (
                <HorseFilterBadges
                  badges={getActiveFilterBadges()}
                  onClearAll={clearAllFilters}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activities.loading || horses.loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading care activities...</p>
            </div>
          ) : viewMode === 'matrix' ? (
            <CareMatrixView
              horses={filteredHorses.map(h => ({ id: h.id, name: h.name }))}
              activityTypes={activityTypes.data || []}
              activities={activities.data || []}
              onCellClick={handleCellClick}
            />
          ) : (
            <CareTableView
              horses={filteredHorses.map(h => ({ id: h.id, name: h.name }))}
              activityTypes={activityTypes.data || []}
              activities={activities.data || []}
              onCellClick={handleCellClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={quickAddDialog.open}
        onOpenChange={(open) => setQuickAddDialog({ ...quickAddDialog, open })}
        horse={filteredHorses.find(h => h.id === quickAddDialog.horseId)}
        activityType={activityTypes.data?.find(t => t.id === quickAddDialog.activityTypeId)}
        lastActivity={findLastActivity(quickAddDialog.horseId, quickAddDialog.activityTypeId)}
        onAdd={handleQuickAdd}
      />

      {/* Activity Form Dialog */}
      <ActivityFormDialog
        open={activityDialog.open}
        onOpenChange={(open) => setActivityDialog({ ...activityDialog, open })}
        initialDate={activityDialog.initialDate}
        initialHorseId={activityDialog.initialHorseId}
        initialActivityType={activityDialog.initialActivityTypeId}
        horses={filteredHorses.map(h => ({ id: h.id, name: h.name }))}
        activityTypes={activityTypes.data || []}
        onSave={handleSave}
      />
    </div>
  )
}
