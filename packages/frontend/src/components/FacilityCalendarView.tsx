import { useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import svLocale from "@fullcalendar/core/locales/sv";
import type {
  EventClickArg,
  DateSelectArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import type { Holiday } from "@equiduty/shared";
import { toDate } from "@/utils/timestampUtils";
import {
  getEffectiveTimeBlocks,
  createDefaultSchedule,
} from "@equiduty/shared";

// Default status colors using Tailwind palette
const DEFAULT_STATUS_COLORS = {
  pending: "hsl(var(--warning))",
  confirmed: "hsl(var(--success))",
  cancelled: "hsl(var(--muted))",
  completed: "hsl(var(--primary))",
  no_show: "hsl(var(--destructive))",
} as const;

// Facility colors for visual distinction (using Tailwind color palette)
const FACILITY_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#84cc16", // lime-500
];

// Configuration interface for calendar customization
export interface CalendarConfig {
  slotMinTime?: string;
  slotMaxTime?: string;
  slotDuration?: string;
  slotLabelInterval?: string;
  scrollTime?: string;
  weekends?: boolean;
  nowIndicator?: boolean;
  firstDay?: number; // 0=Sunday, 1=Monday
}

export interface ViewOptions {
  showDayGrid?: boolean;
  showTimeGridWeek?: boolean;
  showTimeGridDay?: boolean;
  showList?: boolean;
  initialView?:
    | "dayGridMonth"
    | "timeGridWeek"
    | "timeGridDay"
    | "listWeek"
    | "resourceTimeGridWeek";
}

// Generic calendar event interface
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor?: string;
  borderWidth?: string;
  resourceId?: string; // For resource timeline views
  extendedProps?: Record<string, any>;
}

// Holiday display options
export interface HolidayDisplayOptions {
  /** Array of holidays to display */
  holidays?: Holiday[];
  /** Whether to show holiday background events (default: false) */
  showHolidays?: boolean;
  /** Background color for public holidays */
  publicHolidayColor?: string;
  /** Background color for half-days */
  halfDayColor?: string;
  /** Background color for other holidays */
  holidayColor?: string;
}

// Generic calendar view props
interface GenericCalendarViewProps<T> {
  items: T[];
  transformEvent: (item: T) => CalendarEvent;
  onEventClick: (item: T) => void;
  onDateSelect?: (start: Date, end: Date) => void;
  onEventDrop?: (item: T, newStart: Date, newEnd: Date) => void;
  onEventResize?: (item: T, newStart: Date, newEnd: Date) => void;

  // Optional configuration
  calendarConfig?: CalendarConfig;
  viewOptions?: ViewOptions;
  editable?: boolean;
  className?: string;

  // Holiday display options
  holidayOptions?: HolidayDisplayOptions;

  // Resource support (for resourceTimeGridWeek view)
  resources?: Array<{ id: string; title: string; eventColor?: string }>;
  businessHours?: any[]; // FullCalendar business hours format
}

interface FacilityCalendarViewProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
  selectedFacilityId?: string | "all"; // Filter by facility
  onEventClick: (reservation: FacilityReservation) => void;
  onDateSelect: (
    facilityId: string | undefined,
    start: Date,
    end: Date,
  ) => void;
  onEventDrop?: (reservationId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (reservationId: string, newStart: Date, newEnd: Date) => void;

  // Optional configuration for modularity
  statusColors?: Record<string, string>;
  facilityColors?: string[];
  calendarConfig?: CalendarConfig;
  viewOptions?: ViewOptions;
  editable?: boolean;
  className?: string;

  // Holiday display options
  holidayOptions?: HolidayDisplayOptions;
}

// Generic calendar view component
export function GenericCalendarView<T>({
  items,
  transformEvent,
  onEventClick,
  onDateSelect,
  onEventDrop,
  onEventResize,
  calendarConfig = {},
  viewOptions = {},
  editable = true,
  className = "",
  holidayOptions = {},
  resources,
  businessHours,
}: GenericCalendarViewProps<T>) {
  const calendarRef = useRef<FullCalendar>(null);
  const { i18n } = useTranslation();
  const isSwedish = i18n.language === "sv";

  // Holiday configuration with defaults
  const {
    holidays = [],
    showHolidays = false,
    publicHolidayColor = "rgba(239, 68, 68, 0.15)", // red-500 with opacity
    halfDayColor = "rgba(249, 115, 22, 0.12)", // orange-500 with opacity
    holidayColor = "rgba(239, 68, 68, 0.08)", // red-500 with lighter opacity
  } = holidayOptions;

  // Transform holidays to background events
  const holidayEvents = useMemo((): EventInput[] => {
    if (!showHolidays || !holidays.length) return [];

    return holidays.map((holiday) => {
      const holidayName = isSwedish ? holiday.name : holiday.nameEn;
      let backgroundColor = holidayColor;

      if (holiday.isPublicHoliday) {
        backgroundColor = publicHolidayColor;
      } else if (holiday.isHalfDay) {
        backgroundColor = halfDayColor;
      }

      return {
        id: `holiday-${holiday.date}`,
        title: holidayName,
        start: holiday.date,
        allDay: true,
        display: "background",
        backgroundColor,
        classNames: [
          "holiday-background",
          holiday.isPublicHoliday ? "public-holiday" : "",
          holiday.isHalfDay ? "half-day" : "",
        ].filter(Boolean),
        extendedProps: {
          isHoliday: true,
          holidayName,
          isPublicHoliday: holiday.isPublicHoliday,
          isHalfDay: holiday.isHalfDay,
        },
      };
    });
  }, [
    holidays,
    showHolidays,
    isSwedish,
    publicHolidayColor,
    halfDayColor,
    holidayColor,
  ]);

  // Merge with defaults
  const config: Required<CalendarConfig> = {
    slotMinTime: "06:00:00",
    slotMaxTime: "22:00:00",
    slotDuration: "00:30:00",
    slotLabelInterval: "01:00:00",
    scrollTime: "08:00:00",
    weekends: true,
    nowIndicator: true,
    firstDay: 1, // Monday
    ...calendarConfig,
  };

  const viewOpts: Required<ViewOptions> = {
    showDayGrid: true,
    showTimeGridWeek: true,
    showTimeGridDay: true,
    showList: true,
    initialView: "timeGridWeek",
    ...viewOptions,
  };

  // Build header toolbar based on view options
  const buildHeaderToolbar = () => {
    const views: string[] = [];
    if (viewOpts.showDayGrid) views.push("dayGridMonth");
    if (viewOpts.showTimeGridWeek) views.push("timeGridWeek");
    if (viewOpts.showTimeGridDay) views.push("timeGridDay");
    if (viewOpts.showList) views.push("listWeek");

    return {
      left: "prev,next today",
      center: "title",
      right: views.join(","),
    };
  };

  // Transform items to FullCalendar events using the provided function
  const itemEvents = items.map((item) => transformEvent(item));

  // Combine item events with holiday background events
  const events = useMemo(() => {
    return [...itemEvents, ...holidayEvents];
  }, [itemEvents, holidayEvents]);

  const handleEventClick = (info: EventClickArg) => {
    // Ignore clicks on holiday background events
    if (info.event.extendedProps.isHoliday) return;

    const item = info.event.extendedProps.item as T;
    if (item) {
      onEventClick(item);
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (!onDateSelect) return;

    // Type-safe resource extraction for resource timeline views
    const resourceId =
      "resource" in selectInfo &&
      selectInfo.resource &&
      typeof selectInfo.resource === "object" &&
      "id" in selectInfo.resource
        ? String(selectInfo.resource.id)
        : undefined;

    if (resourceId) {
      // For resource views, call with resourceId as first parameter
      // Cast to specific signature that accepts resourceId
      const resourceCallback = onDateSelect as unknown as (
        resourceId: string,
        start: Date,
        end: Date,
      ) => void;
      resourceCallback(resourceId, selectInfo.start, selectInfo.end);
    } else {
      onDateSelect(selectInfo.start, selectInfo.end);
    }

    // Clear selection
    selectInfo.view.calendar.unselect();
  };

  const handleEventDrop = (info: EventDropArg) => {
    if (onEventDrop) {
      const item = info.event.extendedProps.item as T;
      if (item) {
        onEventDrop(item, info.event.start!, info.event.end!);
      }
    }
  };

  const handleEventResize = (info: EventResizeDoneArg) => {
    if (onEventResize) {
      const item = info.event.extendedProps.item as T;
      if (item) {
        onEventResize(item, info.event.start!, info.event.end!);
      }
    }
  };

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
          background-color: hsl(var(--primary) / 0.2);
          border: 2px dashed hsl(var(--primary));
          border-radius: 4px;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        @media (hover: none) and (pointer: coarse) {
          .fc .fc-timegrid-slot {
            height: 4rem; /* Larger touch targets on mobile */
          }
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

        /* Holiday background events */
        .fc .fc-bg-event.holiday-background {
          opacity: 1;
        }

        .fc .fc-bg-event.public-holiday {
          border-left: 3px solid rgba(239, 68, 68, 0.5);
        }

        .fc .fc-bg-event.half-day {
          border-left: 3px solid rgba(249, 115, 22, 0.4);
        }

        /* Holiday day number styling in day grid */
        .fc .fc-daygrid-day.fc-day-holiday .fc-daygrid-day-number {
          color: hsl(var(--destructive));
          font-weight: 600;
        }
      `}</style>

      <FullCalendar
        ref={calendarRef}
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          resourceTimeGridPlugin,
          interactionPlugin,
          listPlugin,
        ]}
        initialView={viewOpts.initialView}
        headerToolbar={buildHeaderToolbar()}
        events={events}
        resources={resources}
        businessHours={businessHours}
        selectConstraint={businessHours ? "businessHours" : undefined}
        selectOverlap={false}
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
        height="auto"
        expandRows={true}
        slotDuration={config.slotDuration}
        slotLabelInterval={config.slotLabelInterval}
        scrollTime={config.scrollTime}
        nowIndicator={config.nowIndicator}
        locale={isSwedish ? svLocale : undefined}
      />
    </div>
  );
}

// Backward-compatible FacilityCalendarView wrapper
export function FacilityCalendarView({
  facilities,
  reservations,
  selectedFacilityId = "all",
  onEventClick,
  onDateSelect,
  onEventDrop,
  onEventResize,
  statusColors = DEFAULT_STATUS_COLORS,
  facilityColors = FACILITY_COLORS,
  calendarConfig,
  viewOptions,
  editable,
  className,
  holidayOptions,
}: FacilityCalendarViewProps) {
  const { t } = useTranslation(["facilities", "common"]);
  // Create facility color map
  const facilityColorMap = new Map<string, string>();
  facilities.forEach((facility, index) => {
    facilityColorMap.set(
      facility.id,
      facilityColors[index % facilityColors.length] ||
        facilityColors[0] ||
        "#3b82f6",
    );
  });

  // Map facilities to FullCalendar resources (for resourceTimeGridWeek view)
  const facilityResources = useMemo(() => {
    return facilities.map((facility, index) => ({
      id: facility.id,
      title: facility.name,
      eventColor: facilityColors[index % facilityColors.length] || "#3b82f6",
    }));
  }, [facilities, facilityColors]);

  // Create business hours configuration from facility schedules
  const businessHoursConfig = useMemo(() => {
    // Use normalized date to prevent unnecessary recalculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allBusinessHours: any[] = [];

    // Map day names to FullCalendar day numbers
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    facilities.forEach((facility) => {
      const schedule = facility.availabilitySchedule || createDefaultSchedule();
      const effectiveBlocks = getEffectiveTimeBlocks(schedule, today);

      // Get facility's available days
      const availableDays = facility.daysAvailable
        ? Object.entries(facility.daysAvailable)
            .filter(([_, isAvailable]) => isAvailable)
            .map(([day]) => dayMap[day])
            .filter((dayNum): dayNum is number => dayNum !== undefined)
        : [0, 1, 2, 3, 4, 5, 6]; // Default to all days if not specified

      // Map each time block to business hours format
      effectiveBlocks.forEach((block) => {
        allBusinessHours.push({
          resourceId: facility.id,
          daysOfWeek: availableDays,
          startTime: block.from,
          endTime: block.to,
        });
      });
    });

    return allBusinessHours;
  }, [facilities]);

  // Filter reservations based on selected facility
  const filteredReservations =
    selectedFacilityId === "all"
      ? reservations
      : reservations.filter((r) => r.facilityId === selectedFacilityId);

  // Transform reservation to calendar event
  const transformReservation = (
    reservation: FacilityReservation,
  ): CalendarEvent => {
    const facility = facilities.find((f) => f.id === reservation.facilityId);
    const facilityColor =
      facilityColorMap.get(reservation.facilityId) || "#3b82f6";
    const statusColor =
      statusColors[reservation.status] || statusColors.pending || "#6366f1";

    return {
      id: reservation.id,
      resourceId: reservation.facilityId, // Top-level for FullCalendar resource views
      title:
        selectedFacilityId === "all"
          ? `${facility?.name || t("common:labels.unknown")} - ${reservation.userFullName || reservation.userEmail}`
          : reservation.userFullName || reservation.userEmail,
      start: toDate(reservation.startTime) || new Date(),
      end: toDate(reservation.endTime) || new Date(),
      backgroundColor: statusColor,
      borderColor: facilityColor,
      textColor: "#ffffff",
      extendedProps: {
        item: reservation,
        status: reservation.status,
        facilityId: reservation.facilityId,
        facilityName: facility?.name || t("common:labels.unknown"),
      },
    };
  };

  return (
    <GenericCalendarView
      items={filteredReservations}
      transformEvent={transformReservation}
      onEventClick={onEventClick}
      onDateSelect={
        onDateSelect
          ? (start, end) => {
              const facilityId =
                selectedFacilityId !== "all" ? selectedFacilityId : undefined;
              onDateSelect(facilityId, start, end);
            }
          : undefined
      }
      onEventDrop={
        onEventDrop
          ? (item, newStart, newEnd) => {
              onEventDrop(item.id, newStart, newEnd);
            }
          : undefined
      }
      onEventResize={
        onEventResize
          ? (item, newStart, newEnd) => {
              onEventResize(item.id, newStart, newEnd);
            }
          : undefined
      }
      calendarConfig={calendarConfig}
      viewOptions={viewOptions}
      editable={editable}
      className={className}
      holidayOptions={holidayOptions}
      resources={
        viewOptions?.initialView === "resourceTimeGridWeek"
          ? facilityResources
          : undefined
      }
      businessHours={
        viewOptions?.initialView === "resourceTimeGridWeek"
          ? businessHoursConfig
          : undefined
      }
    />
  );
}
