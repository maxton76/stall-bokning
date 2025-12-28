import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { RoleBadge, StatusBadge } from '@/utils/badgeHelpers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDialog } from '@/hooks/useDialog'
import { useCRUD } from '@/hooks/useCRUD'
import { InviteUserDialog } from '@/components/InviteUserDialog'
import { getOrganization } from '@/services/organizationService'
import {
  getOrganizationMembers,
  removeOrganizationMember,
  inviteOrganizationMember
} from '@/services/organizationMemberService'
import type { Organization, OrganizationMember } from '../../../shared/src/types/organization'

export default function OrganizationUsersPage() {
  const { organizationId } = useParams<{ organizationId: string }>()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const inviteDialog = useDialog()

  // Organization data
  const organization = useAsyncData<Organization | null>({
    loadFn: async () => {
      if (!organizationId) return null
      return await getOrganization(organizationId)
    }
  })

  // Members data
  const members = useAsyncData<OrganizationMember[]>({
    loadFn: async () => {
      if (!organizationId) return []
      return await getOrganizationMembers(organizationId)
    }
  })

  // Load data when organizationId changes
  useEffect(() => {
    organization.load()
    members.load()
  }, [organizationId])

  // CRUD operations
  const { remove: handleRemoveMember } = useCRUD({
    deleteFn: async (userId: string) => {
      if (!organizationId || !user) throw new Error('Missing organizationId or user')
      await removeOrganizationMember(userId, organizationId)
    },
    onSuccess: () => members.load(),
    entityName: 'Member'
  })

  // Handle invite user
  const handleInviteUser = async (data: any) => {
    if (!organizationId || !user) throw new Error('Missing organizationId or user')

    // Generate a temporary alphanumeric userId for pending invitations
    // Format: "pending" + base64 encoded email (alphanumeric only)
    const tempUserId = 'pending' + btoa(data.email)
      .replace(/[^a-zA-Z0-9]/g, '')  // Remove non-alphanumeric characters
      .substring(0, 20)  // Limit length

    await inviteOrganizationMember(
      organizationId,
      user.uid,  // inviterId
      {
        userId: tempUserId,  // Temporary alphanumeric userId
        email: data.email,
        roles: data.roles,
        primaryRole: data.primaryRole,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        contactType: data.contactType,
        showInPlanning: data.showInPlanning
      }
    )

    inviteDialog.closeDialog()
    members.reload()
  }

  // Filter members based on search query
  const filteredMembers = members.data?.filter((member: OrganizationMember) => {
    const query = searchQuery.toLowerCase()
    return (
      member.firstName?.toLowerCase().includes(query) ||
      member.lastName?.toLowerCase().includes(query) ||
      member.userEmail.toLowerCase().includes(query) ||
      member.roles.some(role => role.toLowerCase().includes(query))
    )
  }) || []

  if (organization.loading || !organization.data) {
    return (
      <div className='container mx-auto p-6'>
        <p className='text-muted-foreground'>Loading...</p>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <PageHeader
        title={`${organization.data.name} - Users`}
        description="Manage organization members and their roles"
        backLink={organizationId ? {
          href: `/organizations/${organizationId}`,
          label: 'Back to Organization'
        } : undefined}
        action={{
          label: 'Invite User',
          icon: <Plus className='h-4 w-4 mr-2' />,
          onClick: () => inviteDialog.openDialog()
        }}
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className='flex items-center gap-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search by name, email, or role...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Members ({filteredMembers.length})</CardTitle>
          <CardDescription>
            View and manage all members of your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.loading ? (
            <p className='text-sm text-muted-foreground'>Loading members...</p>
          ) : filteredMembers.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-muted-foreground mb-4'>
                {searchQuery ? 'No members match your search' : 'No members yet. Invite users to get started.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => inviteDialog.openDialog()}>
                  <Plus className='h-4 w-4 mr-2' />
                  Invite First User
                </Button>
              )}
            </div>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stables</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className='font-medium'>
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.userEmail.split('@')[0]}
                      </TableCell>
                      <TableCell>{member.userEmail}</TableCell>
                      <TableCell>{member.phoneNumber || '-'}</TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {member.roles.map((role) => (
                            <RoleBadge
                              key={role}
                              role={role}
                              className='text-xs'
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.status} />
                      </TableCell>
                      <TableCell>
                        {member.stableAccess === 'all' ? (
                          <span className='text-sm text-muted-foreground'>All Stables</span>
                        ) : (
                          <span className='text-sm text-muted-foreground'>
                            {member.assignedStableIds?.length || 0} Assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex gap-2 justify-end'>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => {/* TODO: Open edit dialog */}}
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${member.userEmail} from this organization?`)) {
                                handleRemoveMember(member.userId)
                              }
                            }}
                          >
                            <Trash2 className='h-4 w-4 text-destructive' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialog.open}
        onOpenChange={(open) => open ? inviteDialog.openDialog() : inviteDialog.closeDialog()}
        onSave={handleInviteUser}
      />
    </div>
  )
}
