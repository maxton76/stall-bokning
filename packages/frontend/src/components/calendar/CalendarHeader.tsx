import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getWeekNumber } from '@/utils/dateHelpers'

interface CalendarHeaderProps {
  currentWeekStart: Date
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
  viewMode: 'day' | 'week'
  onViewModeChange: (mode: 'day' | 'week') => void
  onAddActivity: () => void
  onFilterClick: () => void
}

export function CalendarHeader({
  currentWeekStart,
  onNavigate,
  viewMode,
  onViewModeChange,
  onAddActivity,
  onFilterClick
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate('today')}>
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={() => onNavigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => onNavigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-4 flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {format(currentWeekStart, 'MMMM yyyy')}
          </h2>
          <Badge variant="outline">Week {getWeekNumber(currentWeekStart)}</Badge>
        </div>
      </div>

      {/* Right: View controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onFilterClick}>
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as 'day' | 'week')}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={onAddActivity}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
    </div>
  )
}
