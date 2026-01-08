import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStables } from '@/hooks/useUserStables'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDialog } from '@/hooks/useDialog'
import { useCRUD } from '@/hooks/useCRUD'
import {
  createHorseGroup,
  getOrganizationHorseGroups,
  updateHorseGroup,
  deleteHorseGroup
} from '@/services/horseGroupService'
import { getUserOrganizations } from '@/services/organizationService'
import {
  createVaccinationRule,
  getAllAvailableVaccinationRules,
  updateVaccinationRule,
  deleteVaccinationRule,
  isSystemRule,
  isOrganizationRule,
  isUserRule
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

  // Load user's organization
  const organizations = useAsyncData({
    loadFn: async () => {
      if (!user?.uid) return []
      return await getUserOrganizations(user.uid)
    }
  })

  // Get first organization's ID (user should only have one organization)
  const organizationId = organizations.data?.[0]?.id

  // Use stableId from URL (vaccination rules are stable-specific)
  const stableId = stableIdFromParams

  // Load organizations when user changes
  useEffect(() => {
    if (user?.uid) {
      organizations.load()
    }
  }, [user?.uid])

  // Horse Groups state - now organization-wide
  const groupDialog = useDialog<HorseGroup>()
  const groups = useAsyncData<HorseGroup[]>({
    loadFn: async () => {
      if (!organizationId) return []
      return await getOrganizationHorseGroups(organizationId)
    }
  })

  // Vaccination Rules state (includes system + organization + user rules)
  const ruleDialog = useDialog<VaccinationRule>()
  const rules = useAsyncData<VaccinationRule[]>({
    loadFn: async () => {
      return await getAllAvailableVaccinationRules(user?.uid, organizationId)
    }
  })

  // Group rules by scope
  const systemRules = rules.data?.filter(isSystemRule) || []
  const orgRules = rules.data?.filter(isOrganizationRule) || []
  const userRules = rules.data?.filter(isUserRule) || []

  // Load data when organizationId or stableId changes
  useEffect(() => {
    if (organizationId) {
      groups.load()
    }
  }, [organizationId])

  useEffect(() => {
    // Load rules when user or organizationId changes
    if (user?.uid || organizationId) {
      rules.load()
    }
  }, [user?.uid, organizationId])

  // Horse Groups CRUD
  const { create: createGroup, update: updateGroup, remove: removeGroup } = useCRUD<HorseGroup>({
    createFn: async (groupData) => {
      if (!organizationId || !user) throw new Error('Missing organizationId or user')
      const { id, organizationId: _, createdAt, updatedAt, createdBy, ...data } = groupData as HorseGroup
      await createHorseGroup(organizationId, user.uid, data as any)
    },
    updateFn: async (groupId: string, updates) => {
      if (!user) throw new Error('Missing user')
      await updateHorseGroup(groupId, user.uid, updates as any)
    },
    deleteFn: async (groupId: string) => {
      if (!user) throw new Error('Missing user')
      // Unassign horses from this group first
      await unassignHorsesFromGroup(groupId, user.uid)
      await deleteHorseGroup(groupId)
    },
    onSuccess: async () => { await groups.reload() },
    successMessages: {
      create: 'Horse group created successfully',
      update: 'Horse group updated successfully',
      delete: 'Horse group deleted successfully'
    }
  })

  // Vaccination Rules CRUD (only for organization and user rules, not system rules)
  const { create: createRule, update: updateRule, remove: removeRule } = useCRUD<VaccinationRule>({
    createFn: async (ruleData) => {
      if (!user) throw new Error('Missing user')
      const rule = ruleData as any

      // Determine scope and scopeId
      let scope: 'organization' | 'user'
      let scopeId: string

      if (rule.scope === 'organization') {
        if (!organizationId) throw new Error('Missing organizationId')
        scope = 'organization'
        scopeId = organizationId
      } else if (rule.scope === 'user') {
        scope = 'user'
        scopeId = user.uid
      } else {
        throw new Error('Invalid scope - must be organization or user')
      }

      await createVaccinationRule(scope, user.uid, rule, scopeId)
    },
    updateFn: async (ruleId: string, updates) => {
      if (!user) throw new Error('Missing user')
      await updateVaccinationRule(ruleId, user.uid, updates as any)
    },
    deleteFn: async (ruleId: string) => {
      if (!user) throw new Error('Missing user')
      // Unassign horses from this rule first
      await unassignHorsesFromVaccinationRule(ruleId, user.uid)
      await deleteVaccinationRule(ruleId)
    },
    onSuccess: async () => { await rules.reload() },
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
          <p className='text-muted-foreground mt-1'>Manage organization-wide horse groups and vaccination rules (system, organization, and personal)</p>
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        {/* Horse Groups Section */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Horse Groups</CardTitle>
                <CardDescription>Organize your horses into groups (available across all stables)</CardDescription>
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
                <CardDescription>Standard rules and custom vaccination requirements</CardDescription>
              </div>
              <Button
                size='sm'
                onClick={() => ruleDialog.openDialog()}
                title='Add custom rule'
              >
                <Plus className='h-4 w-4 mr-2' />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rules.loading ? (
              <p className='text-sm text-muted-foreground'>Loading rules...</p>
            ) : !rules.data || rules.data.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No rules available.</p>
            ) : (
              <div className='space-y-2'>
                {rules.data.map(rule => {
                  const isStandard = isSystemRule(rule)
                  return (
                    <div
                      key={rule.id}
                      className='flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors'
                    >
                      <div>
                        <div className='flex items-center gap-2'>
                          <p className='font-medium'>{rule.name}</p>
                          {isStandard && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800'>
                              Standard
                            </span>
                          )}
                        </div>
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
                      {!isStandard && (
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => ruleDialog.openDialog(rule as VaccinationRule)}
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
                      )}
                    </div>
                  )
                })}
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
            await updateRule(ruleDialog.data.id, ruleData as any)
          } else {
            await createRule(ruleData as any)
          }
          ruleDialog.closeDialog()
        }}
      />
    </div>
  )
}
