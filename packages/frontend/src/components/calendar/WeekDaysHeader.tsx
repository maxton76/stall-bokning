import { format, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface WeekDaysHeaderProps {
  weekDays: Date[]
  today: Date
}

export function WeekDaysHeader({ weekDays, today }: WeekDaysHeaderProps) {
  return (
    <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
      {/* Empty cell for horse names column */}
      <div className="border-r" />

      {weekDays.map((day) => {
        const isToday = isSameDay(day, today)
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "p-4 text-center border-r",
              isToday && "bg-blue-50"
            )}
          >
            <div className="text-xs text-muted-foreground uppercase">
              {format(day, 'EEE')}
            </div>
            <div className={cn(
              "text-2xl font-semibold mt-1",
              isToday && "text-white bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center mx-auto"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
