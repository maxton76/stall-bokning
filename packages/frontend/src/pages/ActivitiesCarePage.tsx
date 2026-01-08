import { useState, useEffect } from 'react'
import { Heart, Grid3x3, Table2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStables } from '@/hooks/useUserStables'
import { useActivityPageState } from '@/hooks/useActivityPageState'
import { useHorseFilters } from '@/hooks/useHorseFilters'
import { ActivityPageLayout } from '@/components/layouts/ActivityPageLayout'
import { HorseFilterPopover, HorseFilterBadges } from '@/components/HorseFilterPopover'
import { getCareActivities, createActivity } from '@/services/activityService'
import { CareMatrixView } from '@/components/CareMatrixView'
import { CareTableView } from '@/components/CareTableView'
import { QuickAddDialog } from '@/components/QuickAddDialog'
import { ActivityFormDialog } from '@/components/ActivityFormDialog'
import type { Activity } from '@/types/activity'
import type { FilterConfig } from '@shared/types/filters'
import { Timestamp } from 'firebase/firestore'

export default function ActivitiesCarePage() {
  const { user } = useAuth()

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

  // Use shared activity page state hook
  const {
    selectedStableId,
    setSelectedStableId,
    activities,
    activityTypes,
    horses,
    horseGroups,
  } = useActivityPageState({
    user,
    stables,
    activityLoader: getCareActivities,
    includeGroups: true,
  })

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

  return (
    <ActivityPageLayout
      icon={Heart}
      title="Care Activities"
      description="Veterinary, farrier, dentist, and other care-related activities"
      selectedStableId={selectedStableId}
      onStableChange={setSelectedStableId}
      stables={stables}
      stablesLoading={stablesLoading}
    >
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
    </ActivityPageLayout>
  )
}
