import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Filter, X } from 'lucide-react'
import type { HorseFilters } from '@/hooks/useHorseFilters'
import type { Stable } from '@/types/roles'

interface HorseTableToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filters: HorseFilters
  onFiltersChange: (filters: HorseFilters) => void
  activeFilterCount: number
  onClearFilters: () => void
  stables: Stable[]
}

export function HorseTableToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  activeFilterCount,
  onClearFilters,
  stables
}: HorseTableToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const updateFilter = <K extends keyof HorseFilters>(
    key: K,
    value: HorseFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleUsage = (usage: string) => {
    const currentUsage = filters.usage || []
    const newUsage = currentUsage.includes(usage)
      ? currentUsage.filter(u => u !== usage)
      : [...currentUsage, usage]
    updateFilter('usage', newUsage.length > 0 ? newUsage : undefined)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Row */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search horses by name, UELN, chip number, breed..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filter Button */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClearFilters()
                      setIsFilterOpen(false)
                    }}
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Stable Filter */}
              <div className="space-y-2">
                <Label>Stable</Label>
                <Select
                  value={filters.stableId || 'all'}
                  onValueChange={(value) => updateFilter('stableId', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stables</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {stables.map(stable => (
                      <SelectItem key={stable.id} value={stable.id}>
                        {stable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gender Filter */}
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={filters.gender || 'all'}
                  onValueChange={(value) =>
                    updateFilter('gender', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="stallion">Stallion</SelectItem>
                    <SelectItem value="mare">Mare</SelectItem>
                    <SelectItem value="gelding">Gelding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age Range Filter */}
              <div className="space-y-2">
                <Label>Age Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.ageMin ?? ''}
                    onChange={(e) =>
                      updateFilter(
                        'ageMin',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    min={0}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.ageMax ?? ''}
                    onChange={(e) =>
                      updateFilter(
                        'ageMax',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    min={0}
                  />
                </div>
              </div>

              {/* Usage Filter */}
              <div className="space-y-2">
                <Label>Usage</Label>
                <div className="space-y-2">
                  {['care', 'sport', 'breeding'].map(usage => (
                    <div key={usage} className="flex items-center space-x-2">
                      <Checkbox
                        id={`usage-${usage}`}
                        checked={filters.usage?.includes(usage) || false}
                        onCheckedChange={() => toggleUsage(usage)}
                      />
                      <label
                        htmlFor={`usage-${usage}`}
                        className="text-sm capitalize cursor-pointer"
                      >
                        {usage}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status || 'active'}
                  onValueChange={(value) =>
                    updateFilter('status', value as 'active' | 'inactive')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.stableId && filters.stableId !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Stable:{' '}
              {filters.stableId === 'unassigned'
                ? 'Unassigned'
                : stables.find(s => s.id === filters.stableId)?.name || 'Unknown'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('stableId', 'all')}
              />
            </Badge>
          )}
          {filters.gender && (
            <Badge variant="secondary" className="gap-1 capitalize">
              Gender: {filters.gender}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('gender', undefined)}
              />
            </Badge>
          )}
          {(filters.ageMin !== undefined || filters.ageMax !== undefined) && (
            <Badge variant="secondary" className="gap-1">
              Age: {filters.ageMin ?? '0'}-{filters.ageMax ?? '∞'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  updateFilter('ageMin', undefined)
                  updateFilter('ageMax', undefined)
                }}
              />
            </Badge>
          )}
          {filters.usage && filters.usage.length > 0 && (
            <Badge variant="secondary" className="gap-1 capitalize">
              Usage: {filters.usage.join(', ')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('usage', undefined)}
              />
            </Badge>
          )}
          {filters.status && filters.status !== 'active' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('status', 'active')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
