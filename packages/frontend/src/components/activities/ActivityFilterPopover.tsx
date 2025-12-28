import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import type { ActivityFilters, EntryType } from '@/types/activity'

interface ActivityFilterPopoverProps {
  filters: ActivityFilters
  onFiltersChange: (filters: ActivityFilters) => void
}

export function ActivityFilterPopover({
  filters,
  onFiltersChange,
}: ActivityFilterPopoverProps) {
  // Calculate active filter count (non-default values)
  const activeFilterCount = (() => {
    let count = 0
    if (filters.groupBy !== 'none') count++
    if (filters.forMe) count++
    if (filters.showFinished) count++
    if (filters.entryTypes.length !== 3) count++
    return count
  })()

  // Handle entry type checkbox toggle
  const handleEntryTypeToggle = (type: EntryType) => {
    const newTypes = filters.entryTypes.includes(type)
      ? filters.entryTypes.filter(t => t !== type)
      : [...filters.entryTypes, type]

    // Ensure at least one type is selected
    if (newTypes.length > 0) {
      onFiltersChange({ ...filters, entryTypes: newTypes })
    }
  }

  // Clear all filters to default values
  const handleClearFilters = () => {
    onFiltersChange({
      groupBy: 'none',
      forMe: false,
      showFinished: false,
      entryTypes: ['activity', 'task', 'message']
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filter Activities</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-auto p-1 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>

          {/* Group By */}
          <div className="space-y-2">
            <Label htmlFor="groupBy" className="text-sm font-medium">
              Group by
            </Label>
            <Select
              value={filters.groupBy}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  groupBy: value as ActivityFilters['groupBy']
                })
              }
            >
              <SelectTrigger id="groupBy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="horse">Horse</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* For Me Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="forMe" className="text-sm font-medium">
              For me
            </Label>
            <Switch
              id="forMe"
              checked={filters.forMe}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, forMe: checked })
              }
            />
          </div>

          {/* Show Finished Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="showFinished" className="text-sm font-medium">
              Show finished
            </Label>
            <Switch
              id="showFinished"
              checked={filters.showFinished}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, showFinished: checked })
              }
            />
          </div>

          {/* Entry Types */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Entry types</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-activity"
                  checked={filters.entryTypes.includes('activity')}
                  onCheckedChange={() => handleEntryTypeToggle('activity')}
                />
                <Label
                  htmlFor="type-activity"
                  className="text-sm font-normal cursor-pointer"
                >
                  Activity
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-task"
                  checked={filters.entryTypes.includes('task')}
                  onCheckedChange={() => handleEntryTypeToggle('task')}
                />
                <Label
                  htmlFor="type-task"
                  className="text-sm font-normal cursor-pointer"
                >
                  Task
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-message"
                  checked={filters.entryTypes.includes('message')}
                  onCheckedChange={() => handleEntryTypeToggle('message')}
                />
                <Label
                  htmlFor="type-message"
                  className="text-sm font-normal cursor-pointer"
                >
                  Message
                </Label>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
