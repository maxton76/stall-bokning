import { format, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface WeekDaysHeaderProps {
  weekDays: Date[]
  today: Date
}

export function WeekDaysHeader({ weekDays, today }: WeekDaysHeaderProps) {
  return (
    <div className="flex border-b bg-background">
      {/* Horse names column - fixed width */}
      <div className="w-32 md:w-48 flex-shrink-0 border-r" />

      {/* Day columns */}
      {weekDays.map((day) => {
        const isToday = isSameDay(day, today)
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "w-24 md:w-32 lg:flex-1 flex-shrink-0 p-2 md:p-4 text-center border-r",
              isToday && "bg-blue-50"
            )}
          >
            <div className="text-xs text-muted-foreground uppercase">
              {format(day, 'EEE')}
            </div>
            <div className={cn(
              "text-xl md:text-2xl font-semibold mt-1",
              isToday && "text-white bg-blue-600 rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center mx-auto"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
