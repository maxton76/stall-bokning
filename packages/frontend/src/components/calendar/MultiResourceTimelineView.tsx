/**
 * MultiResourceTimelineView Component
 * Custom MIT-licensed calendar replacing FullCalendar's resource-timegrid
 * Displays multiple facilities in horizontal timeline rows with drag-and-drop booking
 */

import { useState, useRef, useMemo, useCallback, useEffect, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMinutes,
  differenceInMinutes,
  isSameDay,
  startOfDay,
} from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import { BookingBlock } from "./BookingBlock";
import { SelectionOverlay } from "./SelectionOverlay";
import { TimelineHeader } from "./TimelineHeader";
import { ResourceRow } from "./ResourceRow";
import { CurrentTimeIndicator } from "./CurrentTimeIndicator";
import { CALENDAR_DEFAULTS } from "./constants";
import {
  getEffectiveTimeBlocks,
  createDefaultSchedule,
  isTimeRangeAvailable,
} from "@equiduty/shared";
import { toDate } from "@/utils/timestampUtils";
import { cn } from "@/lib/utils";
import { validateBookingMove } from "@/utils/bookingValidation";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarOrientation = "horizontal" | "vertical";

interface MultiResourceTimelineViewProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onReservationClick: (reservation: FacilityReservation) => void;
  onDateSelect: (facilityId: string, start: Date, end: Date) => void;
  onReservationDrop?: (
    reservationId: string,
    newFacilityId: string,
    newStart: Date,
    newEnd: Date,
  ) => void;
  editable?: boolean;
  slotDuration?: number; // minutes per slot (default: 30)
  slotMinTime?: string; // HH:mm format (default: "06:00")
  slotMaxTime?: string; // HH:mm format (default: "22:00")
  orientation?: CalendarOrientation; // Layout orientation (default: auto-detect)
  className?: string;
}

interface TimeSlot {
  time: Date;
  label: string;
  isHour: boolean;
}

export const MultiResourceTimelineView = memo(
  function MultiResourceTimelineView({
    facilities,
    reservations,
    selectedDate,
    onDateChange,
    onReservationClick,
    onDateSelect,
    onReservationDrop,
    editable = true,
    slotDuration = CALENDAR_DEFAULTS.SLOT_DURATION_MINUTES,
    slotMinTime = CALENDAR_DEFAULTS.SLOT_MIN_TIME,
    slotMaxTime = CALENDAR_DEFAULTS.SLOT_MAX_TIME,
    orientation: propOrientation,
    className,
  }: MultiResourceTimelineViewProps) {
    const { i18n } = useTranslation();
    const locale = i18n.language === "sv" ? sv : enUS;
    const { toast } = useToast();

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [selectionStart, setSelectionStart] = useState<{
      facilityId: string;
      time: Date;
    } | null>(null);
    const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
      facilities[0]?.id || "",
    );
    const [isMobile, setIsMobile] = useState(() => {
      if (typeof window === "undefined") return false;
      return window.innerWidth < 768;
    });
    const [focusedSlot, setFocusedSlot] = useState<{
      facilityIndex: number;
      slotIndex: number;
    } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Orientation state with localStorage persistence
    const [orientation, setOrientation] = useState<CalendarOrientation>(() => {
      if (typeof window === "undefined") return "vertical";
      const saved = localStorage.getItem("calendar-orientation");
      return saved === "horizontal" || saved === "vertical"
        ? saved
        : "vertical";
    });

    // Save preference when changed
    useEffect(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("calendar-orientation", orientation);
      }
    }, [orientation]);

    // Mobile detection
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Effective orientation: force horizontal on mobile
    const effectiveOrientation = useMemo(() => {
      if (isMobile) return "horizontal"; // Force horizontal on mobile
      return propOrientation ?? orientation;
    }, [isMobile, propOrientation, orientation]);

    // Filter facilities for mobile view (must be before virtualizer)
    const displayFacilities = useMemo(
      () =>
        isMobile
          ? facilities.filter((f) => f.id === selectedFacilityId)
          : facilities,
      [isMobile, facilities, selectedFacilityId],
    );

    // Virtualization for large facility lists (only on desktop)
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
      count: displayFacilities.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 80, // Each row is approximately 80px
      overscan: 2, // Render 2 extra rows outside viewport
      enabled: !isMobile && facilities.length > 10, // Only virtualize if >10 facilities on desktop
    });

    // Parse time range
    const minTimeParts = slotMinTime.split(":").map(Number);
    const maxTimeParts = slotMaxTime.split(":").map(Number);
    const minHour = minTimeParts[0] ?? 0;
    const minMinute = minTimeParts[1] ?? 0;
    const maxHour = maxTimeParts[0] ?? 0;
    const maxMinute = maxTimeParts[1] ?? 0;

    const startTime = new Date(selectedDate);
    startTime.setHours(minHour, minMinute, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(maxHour, maxMinute, 0, 0);

    // Generate time slots
    const timeSlots = useMemo((): TimeSlot[] => {
      const slots: TimeSlot[] = [];
      let currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const isHour = currentTime.getMinutes() === 0;
        slots.push({
          time: new Date(currentTime),
          label: format(currentTime, "HH:mm", { locale }),
          isHour,
        });
        currentTime = addMinutes(currentTime, slotDuration);
      }

      return slots;
    }, [startTime, endTime, slotDuration, locale]);

    // Group reservations by facility
    const reservationsByFacility = useMemo(() => {
      const grouped = new Map<string, FacilityReservation[]>();

      facilities.forEach((facility) => {
        grouped.set(facility.id, []);
      });

      reservations.forEach((reservation) => {
        const startDate = toDate(reservation.startTime);
        const endDate = toDate(reservation.endTime);

        // Only show reservations for selected date
        if (startDate && isSameDay(startDate, selectedDate)) {
          const facilityReservations =
            grouped.get(reservation.facilityId) || [];
          facilityReservations.push(reservation);
          grouped.set(reservation.facilityId, facilityReservations);
        }
      });

      return grouped;
    }, [facilities, reservations, selectedDate]);

    // DnD sensors
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8, // 8px movement required before drag starts
        },
      }),
      useSensor(KeyboardSensor),
    );

    // Handle drag start
    const handleDragStart = useCallback((event: any) => {
      setActiveDragId(event.active.id);
    }, []);

    // Handle drag end with comprehensive error handling
    const handleDragEnd = useCallback(
      async (event: any) => {
        const { active, over } = event;

        if (over && onReservationDrop) {
          try {
            const reservationId = active.id;
            const overData = over.data.current;

            if (overData?.facilityId && overData?.time) {
              const reservation = reservations.find(
                (r) => r.id === reservationId,
              );
              const targetFacility = facilities.find(
                (f) => f.id === overData.facilityId,
              );

              if (reservation && targetFacility) {
                const originalStart = toDate(reservation.startTime);
                const originalEnd = toDate(reservation.endTime);
                const duration =
                  originalStart && originalEnd
                    ? differenceInMinutes(originalEnd, originalStart)
                    : 60;

                const newStart = new Date(overData.time);
                const newEnd = addMinutes(newStart, duration);

                // Validate the move
                const validationResult = await validateBookingMove({
                  reservation,
                  targetFacility,
                  newStart,
                  newEnd,
                  existingReservations: reservations,
                  userId: reservation.userId,
                });

                if (validationResult.valid) {
                  // Show warnings if any
                  if (validationResult.warnings?.length) {
                    toast({
                      title: "Warning",
                      description: validationResult.warnings.join("\n"),
                      variant: "default",
                    });
                  }

                  // Perform the drop
                  onReservationDrop(
                    reservationId,
                    overData.facilityId,
                    newStart,
                    newEnd,
                  );
                } else {
                  // Show error
                  toast({
                    title: "Cannot move booking",
                    description: validationResult.error || "Invalid move",
                    variant: "destructive",
                  });
                }
              }
            }
          } catch (error) {
            console.error("Drag drop validation error:", error);
            toast({
              title: "Unexpected Error",
              description: "Failed to validate booking move. Please try again.",
              variant: "destructive",
            });
          }
        }

        setActiveDragId(null);
      },
      [reservations, facilities, onReservationDrop, toast],
    );

    // Handle selection overlay
    const handleSelectionStart = useCallback(
      (facilityId: string, time: Date) => {
        if (!editable) return;
        setSelectionStart({ facilityId, time });
      },
      [editable],
    );

    const handleSelectionEnd = useCallback(
      (facilityId: string, time: Date) => {
        if (!editable || !selectionStart) return;

        // Calculate start and end times
        const start = selectionStart.time < time ? selectionStart.time : time;
        const end = selectionStart.time < time ? time : selectionStart.time;

        // Round to slot duration
        const roundedEnd = addMinutes(end, slotDuration);

        // Validate business hours
        const facility = facilities.find((f) => f.id === facilityId);
        if (facility) {
          const schedule =
            facility.availabilitySchedule || createDefaultSchedule();
          const effectiveBlocks = getEffectiveTimeBlocks(schedule, start);

          const startTimeStr = format(start, "HH:mm");
          const endTimeStr = format(roundedEnd, "HH:mm");

          if (isTimeRangeAvailable(effectiveBlocks, startTimeStr, endTimeStr)) {
            onDateSelect(facilityId, start, roundedEnd);
          }
        }

        setSelectionStart(null);
      },
      [selectionStart, facilities, editable, slotDuration, onDateSelect],
    );

    const handleSelectionCancel = useCallback(() => {
      setSelectionStart(null);
    }, []);

    // Comprehensive keyboard navigation with bounds checking and orientation support
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!editable || !focusedSlot) return;

        const { facilityIndex, slotIndex } = focusedSlot;

        // Bounds validation before array access
        if (
          facilityIndex < 0 ||
          facilityIndex >= displayFacilities.length ||
          slotIndex < 0 ||
          slotIndex >= timeSlots.length
        ) {
          console.warn("Focus index out of bounds");
          return;
        }

        if (effectiveOrientation === "vertical") {
          // Vertical layout: arrows are reversed
          switch (e.key) {
            case "ArrowDown": // Navigate time slots downward
              e.preventDefault();
              if (slotIndex < timeSlots.length - 1) {
                setFocusedSlot({ facilityIndex, slotIndex: slotIndex + 1 });
              }
              break;

            case "ArrowUp": // Navigate time slots upward
              e.preventDefault();
              if (slotIndex > 0) {
                setFocusedSlot({ facilityIndex, slotIndex: slotIndex - 1 });
              }
              break;

            case "ArrowRight": // Navigate facilities rightward
              e.preventDefault();
              if (facilityIndex < displayFacilities.length - 1) {
                setFocusedSlot({ facilityIndex: facilityIndex + 1, slotIndex });
              }
              break;

            case "ArrowLeft": // Navigate facilities leftward
              e.preventDefault();
              if (facilityIndex > 0) {
                setFocusedSlot({ facilityIndex: facilityIndex - 1, slotIndex });
              }
              break;

            case "Home": // First time slot
              e.preventDefault();
              setFocusedSlot({ facilityIndex, slotIndex: 0 });
              break;

            case "End": // Last time slot
              e.preventDefault();
              setFocusedSlot({
                facilityIndex,
                slotIndex: timeSlots.length - 1,
              });
              break;

            case "PageUp": // Jump up 5 time slots
              e.preventDefault();
              setFocusedSlot({
                facilityIndex,
                slotIndex: Math.max(0, slotIndex - 5),
              });
              break;

            case "PageDown": // Jump down 5 time slots
              e.preventDefault();
              setFocusedSlot({
                facilityIndex,
                slotIndex: Math.min(timeSlots.length - 1, slotIndex + 5),
              });
              break;

            case "Tab":
              e.preventDefault();
              const nextSlot = e.shiftKey ? slotIndex - 1 : slotIndex + 1;
              if (nextSlot >= 0 && nextSlot < timeSlots.length) {
                setFocusedSlot({ facilityIndex, slotIndex: nextSlot });
              }
              break;

            case "Enter":
            case " ":
              e.preventDefault();
              const facility = displayFacilities[facilityIndex];
              const slot = timeSlots[slotIndex];
              if (facility && slot) {
                if (!selectionStart) {
                  handleSelectionStart(facility.id, slot.time);
                  setFocusedSlot({ facilityIndex, slotIndex });
                } else {
                  handleSelectionEnd(facility.id, slot.time);
                }
              }
              break;

            case "Escape":
              e.preventDefault();
              handleSelectionCancel();
              setFocusedSlot(null);
              break;
          }
        } else {
          // Original horizontal navigation
          switch (e.key) {
            case "ArrowRight":
              e.preventDefault();
              if (slotIndex < timeSlots.length - 1) {
                setFocusedSlot({ facilityIndex, slotIndex: slotIndex + 1 });
              }
              break;

            case "ArrowLeft":
              e.preventDefault();
              if (slotIndex > 0) {
                setFocusedSlot({ facilityIndex, slotIndex: slotIndex - 1 });
              }
              break;

            case "ArrowDown":
              e.preventDefault();
              if (facilityIndex < displayFacilities.length - 1) {
                setFocusedSlot({ facilityIndex: facilityIndex + 1, slotIndex });
              }
              break;

            case "ArrowUp":
              e.preventDefault();
              if (facilityIndex > 0) {
                setFocusedSlot({ facilityIndex: facilityIndex - 1, slotIndex });
              }
              break;

            case "Home":
              e.preventDefault();
              setFocusedSlot({ facilityIndex, slotIndex: 0 });
              break;

            case "End":
              e.preventDefault();
              setFocusedSlot({
                facilityIndex,
                slotIndex: timeSlots.length - 1,
              });
              break;

            case "PageUp":
              e.preventDefault();
              setFocusedSlot({
                facilityIndex: Math.max(0, facilityIndex - 5),
                slotIndex,
              });
              break;

            case "PageDown":
              e.preventDefault();
              setFocusedSlot({
                facilityIndex: Math.min(
                  displayFacilities.length - 1,
                  facilityIndex + 5,
                ),
                slotIndex,
              });
              break;

            case "Tab":
              e.preventDefault();
              const nextSlot = e.shiftKey ? slotIndex - 1 : slotIndex + 1;
              if (nextSlot >= 0 && nextSlot < timeSlots.length) {
                setFocusedSlot({ facilityIndex, slotIndex: nextSlot });
              }
              break;

            case "Enter":
            case " ":
              e.preventDefault();
              const facility = displayFacilities[facilityIndex];
              const slot = timeSlots[slotIndex];
              if (facility && slot) {
                if (!selectionStart) {
                  handleSelectionStart(facility.id, slot.time);
                  setFocusedSlot({ facilityIndex, slotIndex });
                } else {
                  handleSelectionEnd(facility.id, slot.time);
                }
              }
              break;

            case "Escape":
              e.preventDefault();
              handleSelectionCancel();
              setFocusedSlot(null);
              break;
          }
        }
      },
      [
        editable,
        focusedSlot,
        timeSlots,
        displayFacilities,
        effectiveOrientation,
        selectionStart,
        handleSelectionStart,
        handleSelectionEnd,
        handleSelectionCancel,
      ],
    );

    // Calculate grid configuration based on orientation
    const gridConfig = useMemo(() => {
      if (effectiveOrientation === "vertical") {
        return {
          gridTemplateRows: `60px repeat(${timeSlots.length}, minmax(80px, 1fr))`,
          gridTemplateColumns: `80px repeat(${displayFacilities.length}, minmax(200px, 1fr))`,
        };
      }
      return {
        gridTemplateColumns: `200px repeat(${timeSlots.length}, minmax(60px, 1fr))`,
      };
    }, [effectiveOrientation, timeSlots.length, displayFacilities.length]);

    // Get dragging reservation for overlay
    const draggingReservation = activeDragId
      ? reservations.find((r) => r.id === activeDragId)
      : null;

    return (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={containerRef}
          className={cn(
            "bg-card rounded-lg border shadow-sm overflow-hidden",
            className,
          )}
        >
          {/* Date Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 border-b gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <button
                onClick={() => onDateChange(addDays(selectedDate, -7))}
                className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
              >
                {isMobile ? "←" : "← Previous Week"}
              </button>

              <h2
                className={cn(
                  "font-semibold",
                  isMobile ? "text-sm" : "text-lg",
                )}
              >
                {format(
                  selectedDate,
                  isMobile ? "MMM d, yyyy" : "EEEE, MMMM d, yyyy",
                  { locale },
                )}
              </h2>

              <button
                onClick={() => onDateChange(addDays(selectedDate, 7))}
                className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
              >
                {isMobile ? "→" : "Next Week →"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Layout Toggle (desktop only) */}
              {!isMobile && !propOrientation && (
                <div className="flex items-center gap-2 border-l pl-4">
                  <span className="text-sm text-muted-foreground">View:</span>
                  <button
                    onClick={() => setOrientation("horizontal")}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      orientation === "horizontal"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    ⟷ Timeline
                  </button>
                  <button
                    onClick={() => setOrientation("vertical")}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      orientation === "vertical"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    ⇅ Calendar
                  </button>
                </div>
              )}

              {/* Mobile Facility Selector */}
              {isMobile && facilities.length > 1 && (
                <Select
                  value={selectedFacilityId}
                  onValueChange={setSelectedFacilityId}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Timeline Grid */}
          <div
            className={cn(
              effectiveOrientation === "vertical"
                ? "overflow-y-auto max-h-[calc(100vh-200px)]"
                : "overflow-x-auto",
            )}
          >
            <div
              className="min-w-full relative"
              style={{
                display: "grid",
                ...gridConfig,
              }}
              role="grid"
              aria-label="Facility booking timeline"
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              {/* Header */}
              <TimelineHeader
                timeSlots={timeSlots}
                orientation={effectiveOrientation}
              />

              {/* Resource Rows */}
              {displayFacilities.map((facility, index) => (
                <ResourceRow
                  key={facility.id}
                  facility={facility}
                  facilityIndex={index}
                  timeSlots={timeSlots}
                  reservations={reservationsByFacility.get(facility.id) || []}
                  onReservationClick={onReservationClick}
                  onSelectionStart={handleSelectionStart}
                  onSelectionEnd={handleSelectionEnd}
                  onSelectionCancel={handleSelectionCancel}
                  selectionStart={
                    selectionStart?.facilityId === facility.id
                      ? selectionStart.time
                      : null
                  }
                  editable={editable}
                  slotDuration={slotDuration}
                  slotMinTime={slotMinTime}
                  orientation={effectiveOrientation}
                />
              ))}

              {/* Current Time Indicator */}
              <CurrentTimeIndicator
                timeSlots={timeSlots}
                slotMinTime={slotMinTime}
                selectedDate={selectedDate}
                orientation={effectiveOrientation}
              />
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggingReservation && (
            <BookingBlock
              reservation={draggingReservation}
              isDragging={true}
              onReservationClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>
    );
  },
);
