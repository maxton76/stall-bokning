import { useEffect } from 'react'
import { Plus, Loader2Icon, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { HorseFormDialog } from '@/components/HorseFormDialog'
import { HorseAssignmentDialog } from '@/components/HorseAssignmentDialog'
import { HorseTable } from '@/components/horses/HorseTable'
import { HorseFilterPopover, HorseFilterBadges } from '@/components/HorseFilterPopover'
import { HorseExportButton } from '@/components/horses/HorseExportButton'
import { createHorseTableColumns } from '@/components/horses/HorseTableColumns'
import type { Horse } from '@/types/roles'
import type { FilterConfig } from '@shared/types/filters'
import {
  getUserHorses,
  createHorse,
  updateHorse,
  deleteHorse,
  assignHorseToStable,
  unassignHorseFromStable
} from '@/services/horseService'
import { getStableHorseGroups } from '@/services/horseGroupService'
import { getStableVaccinationRules } from '@/services/vaccinationRuleService'
import { useDialog } from '@/hooks/useDialog'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCRUD } from '@/hooks/useCRUD'
import { useHorseFilters } from '@/hooks/useHorseFilters'
import { useUserStables } from '@/hooks/useUserStables'

export default function MyHorsesPage() {
  const { user } = useAuth()

  // Data loading with custom hooks
  const horses = useAsyncData<Horse[]>({
    loadFn: () => getUserHorses(user!.uid),
    errorMessage: 'Failed to load horses. Please try again.'
  })
  const { stables } = useUserStables(user?.uid)

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
    initialFilters: { status: 'active' }
  })

  // Filter configuration for MyHorsesPage
  const filterConfig: FilterConfig = {
    showSearch: false,  // Search is external, not in popover
    showStable: true,
    showGender: true,
    showAge: true,
    showUsage: true,
    showGroups: false,
    showStatus: true
  }

  // Dialog state management
  const formDialog = useDialog<Horse>()
  const assignmentDialog = useDialog<Horse>()

  // CRUD operations
  const horseCRUD = useCRUD<Horse>({
    createFn: (data) => createHorse(user!.uid, data as Omit<Horse, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'lastModifiedBy'>),
    updateFn: (id, data) => updateHorse(id, user!.uid, data as Omit<Horse, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'lastModifiedBy'>),
    deleteFn: (id) => deleteHorse(id),
    onSuccess: async () => {
      await horses.reload()
    },
    successMessages: {
      create: 'Horse added successfully',
      update: 'Horse updated successfully',
      delete: 'Horse deleted successfully'
    }
  })

  // Load data on mount
  useEffect(() => {
    if (user) {
      horses.load()
    }
  }, [user])

  // CRUD Handlers
  const handleCreateHorse = () => {
    formDialog.openDialog()
  }

  const handleEditHorse = (horse: Horse) => {
    formDialog.openDialog(horse)
  }

  const handleSaveHorse = async (horseData: Omit<Horse, 'id' | 'ownerId' | 'ownerName' | 'ownerEmail' | 'createdAt' | 'updatedAt' | 'lastModifiedBy'>) => {
    if (formDialog.data) {
      await horseCRUD.update(formDialog.data.id, horseData)
    } else {
      await horseCRUD.create(horseData)
    }
    formDialog.closeDialog()
  }

  const handleDeleteHorse = async (horse: Horse) => {
    await horseCRUD.remove(
      horse.id,
      `Are you sure you want to delete ${horse.name}? This action cannot be undone.`
    )
  }

  // Assignment Handlers
  const handleAssignClick = (horse: Horse) => {
    assignmentDialog.openDialog(horse)
  }

  const handleAssign = async (horseId: string, stableId: string, stableName: string) => {
    if (!user) return

    try {
      await assignHorseToStable(horseId, stableId, stableName, user.uid)
      horses.reload()
      assignmentDialog.closeDialog()
    } catch (error) {
      console.error('Error assigning horse:', error)
      throw error
    }
  }

  const handleUnassign = async (horse: Horse) => {
    if (!user) return

    const confirmed = window.confirm(
      `Unassign ${horse.name} from ${horse.currentStableName}?`
    )
    if (!confirmed) return

    try {
      await unassignHorseFromStable(horse.id, user.uid)
      horses.reload()
    } catch (error) {
      console.error('Error unassigning horse:', error)
    }
  }

  // Table column configuration with action handlers
  const columns = createHorseTableColumns({
    onEdit: handleEditHorse,
    onAssign: handleAssignClick,
    onUnassign: handleUnassign,
    onDelete: handleDeleteHorse
  })

  if (horses.loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2Icon className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>My Horses</h1>
          <p className='text-muted-foreground mt-1'>
            Manage your horses and their stable assignments
          </p>
        </div>
        <div className='flex gap-2'>
          <HorseExportButton horses={filteredHorses} />
          <Button onClick={handleCreateHorse}>
            <Plus className='mr-2 h-4 w-4' />
            Add Horse
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {/* Filter Popover */}
          <HorseFilterPopover
            filters={filters}
            onFiltersChange={setFilters}
            config={filterConfig}
            stables={stables}
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

        {hasActiveFilters && (
          <HorseFilterBadges
            badges={getActiveFilterBadges()}
            onClearAll={clearAllFilters}
          />
        )}
      </div>

      {/* Horse Table */}
      <HorseTable data={filteredHorses} columns={columns} />

      {/* Dialogs */}
      <HorseFormDialog
        open={formDialog.open}
        onOpenChange={(open) => !open && formDialog.closeDialog()}
        horse={formDialog.data}
        onSave={handleSaveHorse}
        allowStableAssignment={stables.length > 0}
        availableStables={stables}
      />

      <HorseAssignmentDialog
        open={assignmentDialog.open}
        onOpenChange={(open) => !open && assignmentDialog.closeDialog()}
        horse={assignmentDialog.data}
        availableStables={stables}
        onAssign={handleAssign}
      />
    </div>
  )
}
