import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  Building2,
  Plus,
  Users,
  Plug,
  Tractor,
  Shield,
  CreditCard,
  Settings2,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DropdownEmptyState, DropdownLoadingState } from '@/components/ui/dropdown-states'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganizationContext } from '@/contexts/OrganizationContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getUserOrganizations } from '@/services/organizationService'

export function OrganizationsDropdown() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentOrganizationId, setCurrentOrganizationId } = useOrganizationContext()

  const organizations = useAsyncData<any[]>({
    loadFn: async () => {
      if (!user) return []
      return await getUserOrganizations(user.uid)
    }
  })

  // Load organizations when user changes
  useEffect(() => {
    organizations.load()
  }, [user])

  // Auto-select organization if user only has one
  useEffect(() => {
    if (organizations.data && organizations.data.length === 1 && !currentOrganizationId) {
      setCurrentOrganizationId(organizations.data[0].id)
    }
  }, [organizations.data, currentOrganizationId, setCurrentOrganizationId])

  // Find current organization name for display
  const currentOrganization = organizations.data?.find((org: any) => org.id === currentOrganizationId)
  const displayName = currentOrganization?.name || 'Organizations'

  const handleOrganizationClick = (orgId: string) => {
    setCurrentOrganizationId(orgId)
    // Don't navigate - just set as active so the menu appears
  }

  // Don't show dropdown if user only has one organization
  if (organizations.data && organizations.data.length <= 1) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <div className="flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{displayName}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="start" side="right">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/organizations/create')}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>

        <DropdownMenuSeparator />

        {organizations.loading ? (
          <DropdownLoadingState message="Loading organizations..." />
        ) : (
          <>
            {/* Organizations List */}
            {organizations.data && organizations.data.length > 0 ? (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Select Organization
                  </DropdownMenuLabel>
                  {organizations.data.map((org: any) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => handleOrganizationClick(org.id)}
                      className={currentOrganizationId === org.id ? 'bg-accent' : ''}
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      <span className="flex-1">{org.name}</span>
                      {currentOrganizationId === org.id && (
                        <Badge variant="default" className="ml-2">
                          Active
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>

                {/* Organization Submenu - Only show if an organization is selected */}
                {currentOrganizationId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Organization Menu
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => navigate(`/organizations/${currentOrganizationId}/users`)}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Members
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/organizations/${currentOrganizationId}/integrations`)}
                      >
                        <Plug className="mr-2 h-4 w-4" />
                        Integrations
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/organizations/${currentOrganizationId}/manure`)}
                      >
                        <Tractor className="mr-2 h-4 w-4" />
                        Manure
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/organizations/${currentOrganizationId}/permissions`)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/organizations/${currentOrganizationId}/subscription`)}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Subscription
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/organizations/${currentOrganizationId}/settings`)}
                      >
                        <Settings2 className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}

                <DropdownMenuSeparator />
              </>
            ) : (
              <DropdownEmptyState
                icon={Building2}
                message="No organizations yet"
                action={{
                  label: "Create Your First Organization",
                  icon: Plus,
                  onClick: () => navigate('/organizations/create')
                }}
              />
            )}
          </>
        )}

        {/* Footer */}
        <DropdownMenuItem onClick={() => navigate('/organizations')}>
          <Building2 className="mr-2 h-4 w-4" />
          View All Organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
