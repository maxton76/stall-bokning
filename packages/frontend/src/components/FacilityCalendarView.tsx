import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
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

// Facility colors for visual distinction (using Tailwind color palette)
const FACILITY_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
]

// Configuration interface for calendar customization
export interface CalendarConfig {
  slotMinTime?: string
  slotMaxTime?: string
  slotDuration?: string
  slotLabelInterval?: string
  scrollTime?: string
  weekends?: boolean
  nowIndicator?: boolean
  firstDay?: number // 0=Sunday, 1=Monday
}

export interface ViewOptions {
  showDayGrid?: boolean
  showTimeGridWeek?: boolean
  showTimeGridDay?: boolean
  showList?: boolean
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'
}

interface FacilityCalendarViewProps {
  facilities: Facility[]
  reservations: FacilityReservation[]
  selectedFacilityId?: string | 'all' // Filter by facility
  onEventClick: (reservation: FacilityReservation) => void
  onDateSelect: (facilityId: string | undefined, start: Date, end: Date) => void
  onEventDrop?: (reservationId: string, newStart: Date, newEnd: Date) => void
  onEventResize?: (reservationId: string, newStart: Date, newEnd: Date) => void

  // Optional configuration for modularity
  statusColors?: Record<string, string>
  facilityColors?: string[]
  calendarConfig?: CalendarConfig
  viewOptions?: ViewOptions
  editable?: boolean
  className?: string
}

export function FacilityCalendarView({
  facilities,
  reservations,
  selectedFacilityId = 'all',
  onEventClick,
  onDateSelect,
  onEventDrop,
  onEventResize,
  statusColors = DEFAULT_STATUS_COLORS,
  facilityColors = FACILITY_COLORS,
  calendarConfig = {},
  viewOptions = {},
  editable = true,
  className = ''
}: FacilityCalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // Merge with defaults
  const config: Required<CalendarConfig> = {
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    scrollTime: '08:00:00',
    weekends: true,
    nowIndicator: true,
    firstDay: 1, // Monday
    ...calendarConfig
  }

  const viewOpts: Required<ViewOptions> = {
    showDayGrid: true,
    showTimeGridWeek: true,
    showTimeGridDay: true,
    showList: true,
    initialView: 'timeGridWeek',
    ...viewOptions
  }

  // Create facility color map
  const facilityColorMap = new Map<string, string>()
  facilities.forEach((facility, index) => {
    facilityColorMap.set(
      facility.id,
      facilityColors[index % facilityColors.length] || facilityColors[0] || '#3b82f6'
    )
  })

  // Build header toolbar based on view options
  const buildHeaderToolbar = () => {
    const views: string[] = []
    if (viewOpts.showDayGrid) views.push('dayGridMonth')
    if (viewOpts.showTimeGridWeek) views.push('timeGridWeek')
    if (viewOpts.showTimeGridDay) views.push('timeGridDay')
    if (viewOpts.showList) views.push('listWeek')

    return {
      left: 'prev,next today',
      center: 'title',
      right: views.join(',')
    }
  }

  // Filter reservations based on selected facility
  const filteredReservations = selectedFacilityId === 'all'
    ? reservations
    : reservations.filter(r => r.facilityId === selectedFacilityId)

  // Transform reservations to FullCalendar events format
  const events = filteredReservations.map(reservation => {
    const facility = facilities.find(f => f.id === reservation.facilityId)
    const facilityColor = facilityColorMap.get(reservation.facilityId) || '#3b82f6'
    const statusColor = statusColors[reservation.status] || statusColors.pending

    // Use status color as background, facility color as border for visual distinction
    return {
      id: reservation.id,
      title: selectedFacilityId === 'all'
        ? `${facility?.name || 'Unknown'} - ${reservation.userFullName || reservation.userEmail}`
        : reservation.userFullName || reservation.userEmail,
      start: reservation.startTime.toDate(),
      end: reservation.endTime.toDate(),
      backgroundColor: statusColor,
      borderColor: facilityColor,
      textColor: '#ffffff',
      extendedProps: {
        reservation: reservation,
        status: reservation.status,
        facilityId: reservation.facilityId,
        facilityName: facility?.name || 'Unknown'
      }
    }
  })

  const handleEventClick = (info: EventClickArg) => {
    const reservation = info.event.extendedProps.reservation as FacilityReservation
    onEventClick(reservation)
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // When a facility is selected, use that; otherwise let parent decide
    const facilityId = selectedFacilityId !== 'all' ? selectedFacilityId : undefined
    onDateSelect(facilityId, selectInfo.start, selectInfo.end)

    // Clear selection
    const calendarApi = selectInfo.view.calendar
    calendarApi.unselect()
  }

  const handleEventDrop = (info: EventDropArg) => {
    if (onEventDrop) {
      const reservation = info.event.extendedProps.reservation as FacilityReservation
      onEventDrop(
        reservation.id,
        info.event.start!,
        info.event.end!
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
          --fc-list-event-hover-bg-color: hsl(var(--muted) / 0.5);
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

        .fc .fc-timegrid-slot {
          height: 3rem;
        }

        .fc .fc-event {
          border-radius: calc(var(--radius) - 4px);
          border-width: 2px;
          font-size: 0.875rem;
          padding: 0.25rem 0.5rem;
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

        /* List view customization */
        .fc-list-event {
          cursor: pointer;
        }

        .fc-list-event:hover td {
          background-color: hsl(var(--muted) / 0.5);
        }

        .fc-list-day-cushion {
          background-color: hsl(var(--muted) / 0.3);
        }

        /* Day grid customization */
        .fc-daygrid-event {
          white-space: normal;
          align-items: flex-start;
        }

        .fc-daygrid-event .fc-event-title {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Improve event visibility */
        .fc-event-main {
          padding: 2px 4px;
        }
      `}</style>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={viewOpts.initialView}
        headerToolbar={buildHeaderToolbar()}
        events={events}
        editable={editable}
        selectable={editable}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={config.weekends}
        firstDay={config.firstDay}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        slotMinTime={config.slotMinTime}
        slotMaxTime={config.slotMaxTime}
        height='auto'
        slotDuration={config.slotDuration}
        slotLabelInterval={config.slotLabelInterval}
        scrollTime={config.scrollTime}
        nowIndicator={config.nowIndicator}
        eventContent={(arg) => {
          const facilityName = arg.event.extendedProps.facilityName as string

          return (
            <div className='fc-event-main-frame'>
              <div className='fc-event-title-container'>
                <div className='fc-event-title fc-sticky'>
                  {arg.event.title}
                </div>
                {selectedFacilityId === 'all' && (
                  <div className='text-xs opacity-80'>
                    {facilityName}
                  </div>
                )}
                <div className='text-xs opacity-70'>
                  {arg.timeText}
                </div>
              </div>
            </div>
          )
        }}
      />
    </div>
  )
}
