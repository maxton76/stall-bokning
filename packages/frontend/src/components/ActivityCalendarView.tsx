import { useMemo, useCallback } from 'react'
import { GenericCalendarView, type CalendarEvent, type CalendarConfig } from './FacilityCalendarView'
import { getActivityTypeColor } from '@/utils/activityTypeMigration'
import type { ActivityEntry, ActivityTypeConfig } from '@/types/activity'

interface ActivityCalendarViewProps {
  activities: ActivityEntry[]
  activityTypes: ActivityTypeConfig[]
  viewMode: 'horses' | 'staff' | 'stable'
  selectedHorseId?: string | 'all'
  selectedStaffId?: string | 'all'
  onEventClick: (entry: ActivityEntry) => void
  onDateSelect?: (date: Date) => void
  calendarConfig?: CalendarConfig
  editable?: boolean
  className?: string
}

export function ActivityCalendarView({
  activities,
  activityTypes,
  viewMode,
  selectedHorseId = 'all',
  selectedStaffId = 'all',
  onEventClick,
  onDateSelect,
  calendarConfig,
  editable = false,
  className
}: ActivityCalendarViewProps) {

  // Filter based on view mode
  const filteredActivities = useMemo(() => {
    if (viewMode === 'horses') {
      let filtered = activities.filter(a => a.type === 'activity')
      if (selectedHorseId !== 'all') {
        filtered = filtered.filter(a => a.type === 'activity' && a.horseId === selectedHorseId)
      }
      return filtered
    } else if (viewMode === 'staff') {
      let filtered = activities.filter(a => {
        if (a.type === 'activity' || a.type === 'task') {
          return a.assignedTo !== undefined && a.assignedTo !== ''
        }
        return false
      })
      if (selectedStaffId !== 'all') {
        filtered = filtered.filter(a => {
          if (a.type === 'activity' || a.type === 'task') {
            return a.assignedTo === selectedStaffId
          }
          return false
        })
      }
      return filtered
    }
    return activities // stable view: show all
  }, [activities, viewMode, selectedHorseId, selectedStaffId])

  // Transform activity entry → calendar event
  const transformActivity = useCallback((entry: ActivityEntry): CalendarEvent => {
    const baseEvent = {
      id: entry.id,
      start: entry.date.toDate(),
      allDay: true,
      extendedProps: { item: entry }
    }

    if (entry.type === 'activity') {
      const typeConfig = activityTypes.find(t => t.id === entry.activityTypeConfigId)
      const typeColor = entry.activityTypeColor || getActivityTypeColor(entry)
      return {
        ...baseEvent,
        title: `${entry.horseName} - ${typeConfig?.name || entry.activityType}`,
        backgroundColor: typeColor,
        borderColor: typeColor,
        textColor: '#ffffff',
        extendedProps: {
          ...baseEvent.extendedProps,
          opacity: entry.status === 'completed' ? 0.6 : 1
        }
      }
    } else if (entry.type === 'task') {
      return {
        ...baseEvent,
        title: entry.assignedToName ? `${entry.assignedToName}: ${entry.title}` : entry.title,
        backgroundColor: entry.color,
        borderColor: entry.color,
        textColor: '#ffffff',
        extendedProps: {
          ...baseEvent.extendedProps,
          opacity: entry.status === 'completed' ? 0.6 : 1
        }
      }
    } else { // message
      const priorityBorderColors = {
        low: '#94a3b8',
        medium: '#f59e0b',
        high: '#ef4444'
      }
      return {
        ...baseEvent,
        title: entry.title,
        backgroundColor: entry.color,
        borderColor: priorityBorderColors[entry.priority || 'medium'],
        borderWidth: '3px',
        textColor: '#ffffff'
      }
    }
  }, [activityTypes])

  return (
    <GenericCalendarView
      items={filteredActivities}
      transformEvent={transformActivity}
      onEventClick={onEventClick}
      onDateSelect={onDateSelect ? (start: Date) => onDateSelect(start) : undefined}
      calendarConfig={{
        ...calendarConfig
      }}
      viewOptions={{
        showDayGrid: true,
        showTimeGridWeek: true,
        showTimeGridDay: false, // Hide day view for activities
        showList: true,
        initialView: 'dayGridMonth'
      }}
      editable={editable}
      className={className}
    />
  )
}
