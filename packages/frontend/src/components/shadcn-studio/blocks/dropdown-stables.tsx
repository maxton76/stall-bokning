import { useNavigate } from 'react-router-dom'
import { Crown, Shield, Users, Plus, Building2 } from 'lucide-react'
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
import { useStablesGrouped } from '@/hooks/useStablesGrouped'
import { useAuth } from '@/contexts/AuthContext'

export function StablesDropdown() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { myStables, managedStables, loading } = useStablesGrouped(user?.uid)

  const getRoleIcon = (icon: 'crown' | 'shield' | 'users') => {
    switch (icon) {
      case 'crown': return Crown
      case 'shield': return Shield
      case 'users': return Users
    }
  }

  const getRoleBadge = (role: 'owner' | 'manager' | 'member') => {
    const variants = {
      owner: { label: 'Owner', variant: 'default' as const },
      manager: { label: 'Manager', variant: 'secondary' as const },
      member: { label: 'Member', variant: 'outline' as const }
    }
    return variants[role]
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Building2 className="mr-2 h-4 w-4" />
          Stables
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="start" side="right">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel>My Stables</DropdownMenuLabel>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/stables/create')}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>

        <DropdownMenuSeparator />

        {loading ? (
          <DropdownLoadingState message="Loading stables..." />
        ) : (
          <>
            {/* My Stables Section (Members) */}
            {myStables.length > 0 && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Member At
                  </DropdownMenuLabel>
                  {myStables.map((stable) => {
                    const Icon = getRoleIcon(stable.icon)
                    const badge = getRoleBadge(stable.role)
                    return (
                      <DropdownMenuItem
                        key={stable.id}
                        onClick={() => navigate(`/stables/${stable.id}/schedule`)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span className="flex-1">{stable.name}</span>
                        <Badge variant={badge.variant} className="ml-2">
                          {badge.label}
                        </Badge>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Manage Stables Section (Owners/Managers) */}
            {managedStables.length > 0 && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Manage
                  </DropdownMenuLabel>
                  {managedStables.map((stable) => {
                    const Icon = getRoleIcon(stable.icon)
                    const badge = getRoleBadge(stable.role)
                    return (
                      <DropdownMenuItem
                        key={stable.id}
                        onClick={() => navigate(`/stables/${stable.id}`)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span className="flex-1">{stable.name}</span>
                        <Badge variant={badge.variant} className="ml-2">
                          {badge.label}
                        </Badge>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Empty State */}
            {myStables.length === 0 && managedStables.length === 0 && (
              <DropdownEmptyState
                icon={Building2}
                message="No stables yet"
                action={{
                  label: "Create Your First Stable",
                  icon: Plus,
                  onClick: () => navigate('/stables/create')
                }}
              />
            )}
          </>
        )}

        {/* Footer */}
        <DropdownMenuItem onClick={() => navigate('/stables')}>
          <Building2 className="mr-2 h-4 w-4" />
          View All Stables
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
