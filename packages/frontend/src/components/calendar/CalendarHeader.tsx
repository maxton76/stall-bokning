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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 border-b gap-2">
      {/* Left: Navigation */}
      <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
        <Button variant="outline" size="sm" onClick={() => onNavigate('today')}>
          Today
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onNavigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onNavigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-2 sm:ml-4 flex items-center gap-2">
          <h2 className="text-base sm:text-xl font-semibold">
            {format(currentWeekStart, 'MMMM yyyy')}
          </h2>
          <Badge variant="outline" className="text-xs">Week {getWeekNumber(currentWeekStart)}</Badge>
        </div>
      </div>

      {/* Right: View controls */}
      <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
        <Button variant="outline" size="sm" onClick={onFilterClick} className="flex-1 sm:flex-none">
          <Filter className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Filter</span>
        </Button>
        <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as 'day' | 'week')} className="hidden sm:block">
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={onAddActivity} className="flex-1 sm:flex-none">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="sm:inline">Add</span>
        </Button>
      </div>
    </div>
  )
}
