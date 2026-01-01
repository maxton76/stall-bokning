import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useCRUD } from '@/hooks/useCRUD'
import {
  createHorseGroup,
  getStableHorseGroups,
  updateHorseGroup,
  deleteHorseGroup
} from '@/services/horseGroupService'
import {
  createVaccinationRule,
  getStableVaccinationRules,
  updateVaccinationRule,
  deleteVaccinationRule
} from '@/services/vaccinationRuleService'
import { unassignHorsesFromGroup, unassignHorsesFromVaccinationRule } from '@/services/horseService'
import { HorseGroupFormDialog } from '@/components/HorseGroupFormDialog'
import { VaccinationRuleFormDialog } from '@/components/VaccinationRuleFormDialog'
import type { HorseGroup, VaccinationRule } from '@/types/roles'

export default function HorseSettingsPage() {
  const { stableId: stableIdFromParams } = useParams<{ stableId: string }>()
  const { user } = useAuth()

  // Load user's stables if no stableId in URL
  const { stables, loading: stablesLoading } = useUserStables(user?.uid)

  // State for selected stable (when no stableId in URL)
  const [selectedStableId, setSelectedStableId] = useState<string>('')

  // Use stableId from URL if available, otherwise use selected stable
  const stableId = stableIdFromParams || selectedStableId

  // Auto-select first stable if no stableId in URL
  useEffect(() => {
    if (!stableIdFromParams && stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id)
    }
  }, [stables, selectedStableId, stableIdFromParams])

  // Horse Groups state
  const groupDialog = useDialog<HorseGroup>()
  const groups = useAsyncData<HorseGroup[]>({
    loadFn: async () => {
      if (!stableId) return []
      return await getStableHorseGroups(stableId)
    }
  })

  // Vaccination Rules state
  const ruleDialog = useDialog<VaccinationRule>()
  const rules = useAsyncData<VaccinationRule[]>({
    loadFn: async () => {
      if (!stableId) return []
      return await getStableVaccinationRules(stableId)
    }
  })

  // Load data when stableId changes
  useEffect(() => {
    if (stableId) {
      groups.load()
      rules.load()
    }
  }, [stableId])

  // Horse Groups CRUD
  const { create: createGroup, update: updateGroup, remove: removeGroup } = useCRUD({
    createFn: async (groupData: Omit<HorseGroup, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      if (!stableId || !user) throw new Error('Missing stableId or user')
      await createHorseGroup(stableId, user.uid, groupData)
    },
    updateFn: async (groupId: string, updates: Partial<Omit<HorseGroup, 'id' | 'stableId' | 'createdAt' | 'createdBy'>>) => {
      if (!user) throw new Error('Missing user')
      await updateHorseGroup(groupId, user.uid, updates)
    },
    deleteFn: async (groupId: string) => {
      if (!user) throw new Error('Missing user')
      // Unassign horses from this group first
      await unassignHorsesFromGroup(groupId, user.uid)
      await deleteHorseGroup(groupId)
    },
    onSuccess: groups.reload,
    successMessages: {
      create: 'Horse group created successfully',
      update: 'Horse group updated successfully',
      delete: 'Horse group deleted successfully'
    }
  })

  // Vaccination Rules CRUD
  const { create: createRule, update: updateRule, remove: removeRule } = useCRUD({
    createFn: async (ruleData: Omit<VaccinationRule, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      if (!stableId || !user) throw new Error('Missing stableId or user')
      await createVaccinationRule(stableId, user.uid, ruleData)
    },
    updateFn: async (ruleId: string, updates: Partial<Omit<VaccinationRule, 'id' | 'stableId' | 'createdAt' | 'createdBy'>>) => {
      if (!user) throw new Error('Missing user')
      await updateVaccinationRule(ruleId, user.uid, updates)
    },
    deleteFn: async (ruleId: string) => {
      if (!user) throw new Error('Missing user')
      // Unassign horses from this rule first
      await unassignHorsesFromVaccinationRule(ruleId, user.uid)
      await deleteVaccinationRule(ruleId)
    },
    onSuccess: rules.reload,
    successMessages: {
      create: 'Vaccination rule created successfully',
      update: 'Vaccination rule updated successfully',
      delete: 'Vaccination rule deleted successfully'
    }
  })

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading stables...</p>
      </div>
    )
  }

  if (!stableIdFromParams && stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No stables found</h3>
            <p className="text-muted-foreground">
              You need to be a member of a stable to manage horse settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div>
        {stableIdFromParams && (
          <Link to={`/stables/${stableIdFromParams}`}>
            <Button variant='ghost' className='mb-4'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Stable
            </Button>
          </Link>
        )}
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Horse Settings</h1>
          <p className='text-muted-foreground mt-1'>Manage horse groups and vaccination rules</p>
        </div>
      </div>

      {/* Stable Selector - only show when no stableId in URL */}
      {!stableIdFromParams && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Select Stable:</label>
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
          </CardContent>
        </Card>
      )}

      <div className='grid gap-6 md:grid-cols-2'>
        {/* Horse Groups Section */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Horse Groups</CardTitle>
                <CardDescription>Organize your horses into groups</CardDescription>
              </div>
              <Button size='sm' onClick={() => groupDialog.openDialog()}>
                <Plus className='h-4 w-4 mr-2' />
                Add Group
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {groups.loading ? (
              <p className='text-sm text-muted-foreground'>Loading groups...</p>
            ) : !groups.data || groups.data.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No groups yet. Create one to get started.</p>
            ) : (
              <div className='space-y-2'>
                {groups.data.map(group => (
                  <div
                    key={group.id}
                    className='flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors'
                  >
                    <div className='flex items-center gap-3'>
                      {group.color && (
                        <div
                          className='w-4 h-4 rounded-full border border-gray-300'
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      <div>
                        <p className='font-medium'>{group.name}</p>
                        {group.description && (
                          <p className='text-sm text-muted-foreground'>{group.description}</p>
                        )}
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => groupDialog.openDialog(group)}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => removeGroup(group.id, 'Are you sure you want to delete this group? Horses will be unassigned from this group.')}
                      >
                        <Trash2 className='h-4 w-4 text-destructive' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vaccination Rules Section */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Vaccination Rules</CardTitle>
                <CardDescription>Manage vaccination requirements</CardDescription>
              </div>
              <Button size='sm' onClick={() => ruleDialog.openDialog()}>
                <Plus className='h-4 w-4 mr-2' />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rules.loading ? (
              <p className='text-sm text-muted-foreground'>Loading rules...</p>
            ) : !rules.data || rules.data.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No rules yet. Create one to get started.</p>
            ) : (
              <div className='space-y-2'>
                {rules.data.map(rule => (
                  <div
                    key={rule.id}
                    className='flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors'
                  >
                    <div>
                      <p className='font-medium'>{rule.name}</p>
                      {rule.description && (
                        <p className='text-sm text-muted-foreground mb-1'>{rule.description}</p>
                      )}
                      <div className='text-xs text-muted-foreground space-y-0.5'>
                        <p>
                          Period: {rule.periodMonths > 0 ? `${rule.periodMonths} month${rule.periodMonths !== 1 ? 's' : ''}` : ''}
                          {rule.periodMonths > 0 && rule.periodDays > 0 ? ' and ' : ''}
                          {rule.periodDays > 0 ? `${rule.periodDays} day${rule.periodDays !== 1 ? 's' : ''}` : ''}
                        </p>
                        <p>Days not competing: {rule.daysNotCompeting}</p>
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => ruleDialog.openDialog(rule)}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => removeRule(rule.id, 'Are you sure you want to delete this rule? Horses will be unassigned from this rule.')}
                      >
                        <Trash2 className='h-4 w-4 text-destructive' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <HorseGroupFormDialog
        open={groupDialog.open}
        onOpenChange={groupDialog.closeDialog}
        group={groupDialog.data}
        title={groupDialog.data ? 'Edit Horse Group' : 'Create Horse Group'}
        onSave={async (groupData) => {
          if (groupDialog.data) {
            await updateGroup(groupDialog.data.id, groupData)
          } else {
            await createGroup(groupData)
          }
          groupDialog.closeDialog()
        }}
      />

      <VaccinationRuleFormDialog
        open={ruleDialog.open}
        onOpenChange={ruleDialog.closeDialog}
        rule={ruleDialog.data}
        title={ruleDialog.data ? 'Edit Vaccination Rule' : 'Create Vaccination Rule'}
        onSave={async (ruleData) => {
          if (ruleDialog.data) {
            await updateRule(ruleDialog.data.id, ruleData)
          } else {
            await createRule(ruleData)
          }
          ruleDialog.closeDialog()
        }}
      />
    </div>
  )
}
