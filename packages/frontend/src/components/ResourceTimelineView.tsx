import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DateSelectArg, EventDropArg, EventResizeDoneArg } from '@fullcalendar/core'
import type { Facility } from '@/types/facility'
import type { FacilityReservation } from '@/types/facilityReservation'

// Default status colors using Tailwind palette
const DEFAULT_STATUS_COLORS = {
  pending: 'hsl(var(--warning))',
  confirmed: 'hsl(var(--success))',
  cancelled: 'hsl(var(--muted))',
  completed: 'hsl(var(--primary))',
  no_show: 'hsl(var(--destructive))'
} as const

// Configuration interface for timeline customization
export interface TimelineConfig {
  slotMinTime?: string
  slotMaxTime?: string
  slotDuration?: string
  slotLabelInterval?: string
  scrollTime?: string
  weekends?: boolean
  nowIndicator?: boolean
}

export interface ResourceConfig {
  headerContent?: string
  areaWidth?: string
  showMaxCapacity?: boolean
}

export interface ViewOptions {
  showDay?: boolean
  showWeek?: boolean
  showMonth?: boolean
  initialView?: 'resourceTimelineDay' | 'resourceTimelineWeek' | 'resourceTimelineMonth'
}

interface ResourceTimelineViewProps {
  facilities: Facility[]
  reservations: FacilityReservation[]
  onEventClick: (reservation: FacilityReservation) => void
  onDateSelect: (facilityId: string, start: Date, end: Date) => void
  onEventDrop?: (reservationId: string, newStart: Date, newEnd: Date, newFacilityId?: string) => void
  onEventResize?: (reservationId: string, newStart: Date, newEnd: Date) => void

  // Optional configuration for modularity
  statusColors?: Record<string, string>
  timelineConfig?: TimelineConfig
  resourceConfig?: ResourceConfig
  viewOptions?: ViewOptions
  editable?: boolean
  className?: string
}

export function ResourceTimelineView({
  facilities,
  reservations,
  onEventClick,
  onDateSelect,
  onEventDrop,
  onEventResize,
  statusColors = DEFAULT_STATUS_COLORS,
  timelineConfig = {},
  resourceConfig = {},
  viewOptions = {},
  editable = true,
  className = ''
}: ResourceTimelineViewProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // Merge with defaults
  const config: Required<TimelineConfig> = {
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    scrollTime: '08:00:00',
    weekends: true,
    nowIndicator: true,
    ...timelineConfig
  }

  const resourceConf: Required<ResourceConfig> = {
    headerContent: 'Facilities',
    areaWidth: '200px',
    showMaxCapacity: true,
    ...resourceConfig
  }

  const viewOpts: Required<ViewOptions> = {
    showDay: true,
    showWeek: true,
    showMonth: true,
    initialView: 'resourceTimelineWeek',
    ...viewOptions
  }

  // Build header toolbar based on view options
  const buildHeaderToolbar = () => {
    const views: string[] = []
    if (viewOpts.showDay) views.push('resourceTimelineDay')
    if (viewOpts.showWeek) views.push('resourceTimelineWeek')
    if (viewOpts.showMonth) views.push('resourceTimelineMonth')

    return {
      left: 'today prev,next',
      center: 'title',
      right: views.join(',')
    }
  }

  // Transform facilities to FullCalendar resources format
  const resources = facilities.map(facility => ({
    id: facility.id,
    title: resourceConf.showMaxCapacity && facility.maxHorsesPerReservation > 1
      ? `${facility.name} (max ${facility.maxHorsesPerReservation})`
      : facility.name
  }))

  // Transform reservations to FullCalendar events format
  const events = reservations.map(reservation => {
    const color = statusColors[reservation.status] || statusColors.pending
    return {
      id: reservation.id,
      resourceId: reservation.facilityId,
      title: reservation.userFullName || reservation.userEmail,
      start: reservation.startTime.toDate(),
      end: reservation.endTime.toDate(),
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        reservation: reservation,
        status: reservation.status
      }
    }
  })

  const handleEventClick = (info: EventClickArg) => {
    const reservation = info.event.extendedProps.reservation as FacilityReservation
    onEventClick(reservation)
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const facilityId = selectInfo.resource?.id
    if (facilityId) {
      onDateSelect(facilityId, selectInfo.start, selectInfo.end)
    }
    // Clear selection
    const calendarApi = selectInfo.view.calendar
    calendarApi.unselect()
  }

  const handleEventDrop = (info: EventDropArg) => {
    if (onEventDrop) {
      const reservation = info.event.extendedProps.reservation as FacilityReservation
      const newFacilityId = info.event.getResources()[0]?.id
      onEventDrop(
        reservation.id,
        info.event.start!,
        info.event.end!,
        newFacilityId
      )
    }
  }

  const handleEventResize = (info: EventResizeDoneArg) => {
    if (onEventResize) {
      const reservation = info.event.extendedProps.reservation as FacilityReservation
      onEventResize(
        reservation.id,
        info.event.start!,
        info.event.end!
      )
    }
  }

  return (
    <div className={`bg-card rounded-lg border shadow-sm p-4 ${className}`}>
      <style>{`
        /* Custom Tailwind-based styling for FullCalendar */
        .fc {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
          --fc-button-active-border-color: hsl(var(--primary) / 0.8);
          --fc-today-bg-color: hsl(var(--accent));
          --fc-neutral-bg-color: hsl(var(--muted));
          --fc-page-bg-color: hsl(var(--background));
          font-family: inherit;
        }

        .fc .fc-button {
          text-transform: capitalize;
          font-weight: 500;
          border-radius: calc(var(--radius) - 2px);
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .fc .fc-button:focus {
          box-shadow: 0 0 0 2px hsl(var(--ring));
          outline: none;
        }

        .fc .fc-button-primary:disabled {
          background-color: hsl(var(--muted));
          border-color: hsl(var(--muted));
          opacity: 0.5;
        }

        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: hsl(var(--border));
        }

        .fc-theme-standard .fc-scrollgrid {
          border-color: hsl(var(--border));
        }

        .fc .fc-col-header-cell {
          background-color: hsl(var(--muted) / 0.3);
          font-weight: 600;
          color: hsl(var(--foreground));
          padding: 0.75rem 0.5rem;
        }

        .fc .fc-datagrid-cell {
          background-color: hsl(var(--muted) / 0.1);
          padding: 0.75rem 0.5rem;
        }

        .fc .fc-timegrid-slot {
          height: 3rem;
        }

        .fc .fc-event {
          border-radius: calc(var(--radius) - 4px);
          border-width: 1px;
          font-size: 0.75rem;
          padding: 0.125rem 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .fc .fc-event:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .fc .fc-event-title {
          font-weight: 500;
          color: white;
        }

        .fc .fc-timegrid-now-indicator-line {
          border-color: hsl(var(--destructive));
          border-width: 2px;
        }

        .fc .fc-timegrid-now-indicator-arrow {
          border-color: hsl(var(--destructive));
        }

        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .fc .fc-highlight {
          background-color: hsl(var(--primary) / 0.1);
        }

        /* Resource area customization */
        .fc-resource-timeline .fc-datagrid-cell-main {
          font-weight: 500;
          color: hsl(var(--foreground));
        }
      `}</style>

      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView={viewOpts.initialView}
        headerToolbar={buildHeaderToolbar()}
        resources={resources}
        events={events}
        editable={editable}
        eventResourceEditable={editable}
        selectable={editable}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={config.weekends}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        slotMinTime={config.slotMinTime}
        slotMaxTime={config.slotMaxTime}
        height='auto'
        resourceAreaHeaderContent={resourceConf.headerContent}
        resourceAreaWidth={resourceConf.areaWidth}
        slotDuration={config.slotDuration}
        slotLabelInterval={config.slotLabelInterval}
        scrollTime={config.scrollTime}
        nowIndicator={config.nowIndicator}
        eventContent={(arg) => {
          const status = arg.event.extendedProps.status as string
          return (
            <div className='px-1 text-xs truncate'>
              <div className='font-medium text-white'>{arg.event.title}</div>
              <div className='text-white/80 text-[0.65rem]'>
                {arg.timeText}
              </div>
              {status && (
                <div className='text-white/60 text-[0.6rem] uppercase tracking-wide'>
                  {status}
                </div>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
