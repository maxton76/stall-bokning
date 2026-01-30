# Resource Timeline View - Integration Guide

**Component**: `ResourceTimelineView`
**Location**: `packages/frontend/src/components/ResourceTimelineView.tsx`
**Purpose**: Modular, reusable resource scheduling timeline with FullCalendar integration

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation & Dependencies](#installation--dependencies)
3. [Basic Usage](#basic-usage)
4. [Props Reference](#props-reference)
5. [Configuration Options](#configuration-options)
6. [Event Handlers](#event-handlers)
7. [Customization Examples](#customization-examples)
8. [Integration Patterns](#integration-patterns)
9. [Styling & Theming](#styling--theming)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

```tsx
import { ResourceTimelineView } from '@/components/ResourceTimelineView'

function MySchedulePage() {
  const facilities = [
    { id: '1', name: 'Arena 1', maxHorsesPerReservation: 1 },
    { id: '2', name: 'Arena 2', maxHorsesPerReservation: 2 }
  ]

  const reservations = [
    {
      id: 'res-1',
      facilityId: '1',
      userFullName: 'John Doe',
      startTime: Timestamp.fromDate(new Date('2024-01-15T10:00:00')),
      endTime: Timestamp.fromDate(new Date('2024-01-15T11:00:00')),
      status: 'confirmed'
    }
  ]

  return (
    <ResourceTimelineView
      facilities={facilities}
      reservations={reservations}
      onEventClick={(reservation) => console.log('Clicked:', reservation)}
      onDateSelect={(facilityId, start, end) => console.log('Selected:', facilityId, start, end)}
    />
  )
}
```

---

## Installation & Dependencies

### Required Dependencies

The component requires FullCalendar packages. If not already installed:

```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/resource-timeline @fullcalendar/interaction
```

### CSS Import

Ensure FullCalendar CSS is imported in your `src/index.css`:

```css
/* FullCalendar styles */
@import '@fullcalendar/core/main.css';
@import '@fullcalendar/resource-timeline/main.css';
```

### CSS Variables

Add these variables to your Tailwind config (`src/index.css`) if not present:

```css
:root {
  --warning: 38 92% 50%;
  --warning-foreground: 48 96% 89%;
  --success: 142 76% 36%;
  --success-foreground: 210 40% 98%;
}

.dark {
  --warning: 48 96% 53%;
  --warning-foreground: 26 83% 14%;
  --success: 142 70% 45%;
  --success-foreground: 144 61% 20%;
}
```

---

## Basic Usage

### Minimum Required Props

```tsx
<ResourceTimelineView
  facilities={facilities}           // Array of resource objects
  reservations={reservations}       // Array of reservation/event objects
  onEventClick={handleEventClick}   // Handle event clicks
  onDateSelect={handleDateSelect}   // Handle empty slot clicks
/>
```

### With Drag & Drop

```tsx
<ResourceTimelineView
  facilities={facilities}
  reservations={reservations}
  onEventClick={handleEventClick}
  onDateSelect={handleDateSelect}
  onEventDrop={handleEventDrop}     // Handle drag & drop
  onEventResize={handleEventResize} // Handle event resizing
/>
```

---

## Props Reference

### Core Props (Required)

| Prop | Type | Description |
|------|------|-------------|
| `facilities` | `Facility[]` | Array of resource/facility objects with `id`, `name`, and `maxHorsesPerReservation` |
| `reservations` | `FacilityReservation[]` | Array of reservation objects with `id`, `facilityId`, `startTime`, `endTime`, `status` |
| `onEventClick` | `(reservation: FacilityReservation) => void` | Callback when an event is clicked |
| `onDateSelect` | `(facilityId: string, start: Date, end: Date) => void` | Callback when empty time slot is clicked |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onEventDrop` | `(id: string, start: Date, end: Date, facilityId?: string) => void` | `undefined` | Callback when event is dragged |
| `onEventResize` | `(id: string, start: Date, end: Date) => void` | `undefined` | Callback when event is resized |
| `statusColors` | `Record<string, string>` | See below | Custom colors for reservation statuses |
| `timelineConfig` | `TimelineConfig` | See below | Timeline behavior configuration |
| `resourceConfig` | `ResourceConfig` | See below | Resource area configuration |
| `viewOptions` | `ViewOptions` | See below | View display options |
| `editable` | `boolean` | `true` | Enable/disable drag & drop and resizing |
| `className` | `string` | `''` | Additional CSS classes for wrapper |

### Default Status Colors

```typescript
{
  pending: 'hsl(var(--warning))',      // Yellow
  confirmed: 'hsl(var(--success))',    // Green
  cancelled: 'hsl(var(--muted))',      // Gray
  completed: 'hsl(var(--primary))',    // Blue
  no_show: 'hsl(var(--destructive))'   // Red
}
```

---

## Configuration Options

### TimelineConfig

Configure timeline behavior and time slots:

```typescript
interface TimelineConfig {
  slotMinTime?: string        // Start time (default: '06:00:00')
  slotMaxTime?: string        // End time (default: '22:00:00')
  slotDuration?: string       // Slot size (default: '00:30:00')
  slotLabelInterval?: string  // Label frequency (default: '01:00:00')
  scrollTime?: string         // Initial scroll position (default: '08:00:00')
  weekends?: boolean          // Show weekends (default: true)
  nowIndicator?: boolean      // Show current time line (default: true)
}
```

**Example**:

```tsx
<ResourceTimelineView
  {...otherProps}
  timelineConfig={{
    slotMinTime: '08:00:00',
    slotMaxTime: '18:00:00',
    slotDuration: '01:00:00',
    weekends: false
  }}
/>
```

### ResourceConfig

Configure resource area display:

```typescript
interface ResourceConfig {
  headerContent?: string      // Header title (default: 'Facilities')
  areaWidth?: string         // Column width (default: '200px')
  showMaxCapacity?: boolean  // Show capacity in name (default: true)
}
```

**Example**:

```tsx
<ResourceTimelineView
  {...otherProps}
  resourceConfig={{
    headerContent: 'Training Arenas',
    areaWidth: '250px',
    showMaxCapacity: false
  }}
/>
```

### ViewOptions

Configure available views and initial view:

```typescript
interface ViewOptions {
  showDay?: boolean           // Show day view button (default: true)
  showWeek?: boolean          // Show week view button (default: true)
  showMonth?: boolean         // Show month view button (default: true)
  initialView?: 'resourceTimelineDay' | 'resourceTimelineWeek' | 'resourceTimelineMonth'
}
```

**Example**:

```tsx
<ResourceTimelineView
  {...otherProps}
  viewOptions={{
    showDay: true,
    showWeek: true,
    showMonth: false,
    initialView: 'resourceTimelineWeek'
  }}
/>
```

---

## Event Handlers

### onEventClick

Called when user clicks on an event/reservation:

```typescript
const handleEventClick = (reservation: FacilityReservation) => {
  console.log('Event clicked:', reservation)
  // Open edit dialog, show details, etc.
  setSelectedReservation(reservation)
  setDialogOpen(true)
}
```

### onDateSelect

Called when user clicks/drags on empty time slot:

```typescript
const handleDateSelect = (facilityId: string, start: Date, end: Date) => {
  console.log('Empty slot selected:', { facilityId, start, end })

  // Pre-fill form with selected time
  setFormInitialValues({
    facilityId,
    date: start,
    startTime: format(start, 'HH:mm'),
    endTime: format(end, 'HH:mm')
  })
  setDialogOpen(true)
}
```

### onEventDrop

Called when user drags an event to new time/resource:

```typescript
const handleEventDrop = async (
  reservationId: string,
  newStart: Date,
  newEnd: Date,
  newFacilityId?: string
) => {
  try {
    const updates = {
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd),
      ...(newFacilityId && { facilityId: newFacilityId })
    }

    await updateReservation(reservationId, updates, user.uid)

    toast({
      title: 'Success',
      description: 'Reservation rescheduled successfully'
    })

    reloadReservations()
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to reschedule. Please try again.',
      variant: 'destructive'
    })
    reloadReservations() // Revert optimistic update
  }
}
```

### onEventResize

Called when user resizes an event:

```typescript
const handleEventResize = async (
  reservationId: string,
  newStart: Date,
  newEnd: Date
) => {
  try {
    await updateReservation(reservationId, {
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd)
    }, user.uid)

    toast({ title: 'Duration updated' })
    reloadReservations()
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to update duration',
      variant: 'destructive'
    })
    reloadReservations()
  }
}
```

---

## Customization Examples

### Example 1: Gym Equipment Scheduling

```tsx
import { ResourceTimelineView } from '@/components/ResourceTimelineView'

function GymSchedule() {
  const equipment = [
    { id: '1', name: 'Treadmill 1', maxHorsesPerReservation: 1 },
    { id: '2', name: 'Rowing Machine', maxHorsesPerReservation: 1 },
    { id: '3', name: 'Weights Area', maxHorsesPerReservation: 5 }
  ]

  return (
    <ResourceTimelineView
      facilities={equipment}
      reservations={bookings}
      onEventClick={handleBookingClick}
      onDateSelect={handleNewBooking}
      onEventDrop={handleReschedule}
      onEventResize={handleDurationChange}

      timelineConfig={{
        slotMinTime: '06:00:00',
        slotMaxTime: '22:00:00',
        slotDuration: '00:15:00',
        weekends: true
      }}

      resourceConfig={{
        headerContent: 'Equipment',
        areaWidth: '180px',
        showMaxCapacity: true
      }}

      viewOptions={{
        showDay: true,
        showWeek: true,
        showMonth: false,
        initialView: 'resourceTimelineDay'
      }}

      statusColors={{
        pending: '#fbbf24',
        confirmed: '#10b981',
        cancelled: '#6b7280'
      }}
    />
  )
}
```

### Example 2: Meeting Room Booking

```tsx
function MeetingRoomSchedule() {
  return (
    <ResourceTimelineView
      facilities={meetingRooms}
      reservations={meetings}
      onEventClick={handleMeetingClick}
      onDateSelect={handleNewMeeting}

      timelineConfig={{
        slotMinTime: '08:00:00',
        slotMaxTime: '18:00:00',
        slotDuration: '00:30:00',
        weekends: false,  // Only business days
        scrollTime: '09:00:00'
      }}

      resourceConfig={{
        headerContent: 'Meeting Rooms',
        areaWidth: '220px'
      }}

      viewOptions={{
        showDay: true,
        showWeek: true,
        showMonth: true,
        initialView: 'resourceTimelineWeek'
      }}

      editable={hasEditPermission}  // Conditional editing
    />
  )
}
```

### Example 3: Read-Only Schedule Display

```tsx
function ReadOnlySchedule() {
  return (
    <ResourceTimelineView
      facilities={facilities}
      reservations={reservations}
      onEventClick={handleViewDetails}
      onDateSelect={() => {}} // No-op for read-only

      editable={false}  // Disable drag & drop

      timelineConfig={{
        nowIndicator: true
      }}

      className="opacity-90"  // Custom styling
    />
  )
}
```

---

## Integration Patterns

### Pattern 1: With Form Dialog

Complete integration with reservation form:

```tsx
function FacilitySchedulePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<FacilityReservation>()
  const [initialValues, setInitialValues] = useState<InitialValues>()

  const handleEventClick = (reservation: FacilityReservation) => {
    setSelectedReservation(reservation)
    setInitialValues(undefined)
    setDialogOpen(true)
  }

  const handleDateSelect = (facilityId: string, start: Date, end: Date) => {
    setSelectedReservation(undefined)
    setInitialValues({
      facilityId,
      date: start,
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm')
    })
    setDialogOpen(true)
  }

  const handleSave = async (data: FormData) => {
    if (selectedReservation) {
      await updateReservation(selectedReservation.id, data, user.uid)
    } else {
      await createReservation(data, user.uid)
    }
    setDialogOpen(false)
    reloadReservations()
  }

  return (
    <>
      <ResourceTimelineView
        facilities={facilities}
        reservations={reservations}
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
      />

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reservation={selectedReservation}
        initialValues={initialValues}
        onSave={handleSave}
      />
    </>
  )
}
```

### Pattern 2: With Filtering

Add filtering controls above timeline:

```tsx
function FilterableSchedule() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [facilityFilter, setFacilityFilter] = useState<string>('all')

  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      if (statusFilter !== 'all' && res.status !== statusFilter) return false
      if (facilityFilter !== 'all' && res.facilityId !== facilityFilter) return false
      return true
    })
  }, [reservations, statusFilter, facilityFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="flex gap-4 p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={facilityFilter} onValueChange={setFacilityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Facilities</SelectItem>
              {facilities.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Timeline */}
      <ResourceTimelineView
        facilities={facilities}
        reservations={filteredReservations}
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
      />
    </div>
  )
}
```

### Pattern 3: With Multiple Views

Toggle between calendar and timeline:

```tsx
type ViewType = 'calendar' | 'timeline'

function MultiViewSchedule() {
  const [viewType, setViewType] = useState<ViewType>('timeline')

  return (
    <div className="space-y-4">
      {/* View Switcher */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={viewType === 'calendar' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewType('calendar')}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Calendar
        </Button>
        <Button
          variant={viewType === 'timeline' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewType('timeline')}
        >
          Timeline
        </Button>
      </div>

      {/* Conditional Rendering */}
      {viewType === 'calendar' && (
        <CalendarView {...props} />
      )}

      {viewType === 'timeline' && (
        <ResourceTimelineView {...props} />
      )}
    </div>
  )
}
```

---

## Styling & Theming

### Custom Colors

Override status colors:

```tsx
<ResourceTimelineView
  {...props}
  statusColors={{
    pending: '#f59e0b',      // Amber
    confirmed: '#10b981',    // Emerald
    cancelled: '#6b7280',    // Gray
    completed: '#3b82f6',    // Blue
    no_show: '#ef4444',      // Red
    custom_status: '#8b5cf6' // Purple
  }}
/>
```

### Custom Wrapper Styling

Add custom CSS classes:

```tsx
<ResourceTimelineView
  {...props}
  className="shadow-lg border-2 border-primary/20"
/>
```

### Dark Mode

The component automatically adapts to dark mode using Tailwind CSS variables. Ensure your app has dark mode CSS variables configured.

---

## Troubleshooting

### Issue: Events not showing

**Solution**: Ensure `startTime` and `endTime` are Firestore `Timestamp` objects:

```typescript
const reservation = {
  startTime: Timestamp.fromDate(new Date()),  // ✅ Correct
  endTime: Timestamp.fromDate(new Date()),
  // NOT: startTime: new Date()  ❌ Wrong
}
```

### Issue: Drag & drop not working

**Solution**: Ensure `onEventDrop` and/or `onEventResize` handlers are provided:

```tsx
<ResourceTimelineView
  {...props}
  onEventDrop={handleEventDrop}  // Required for drag & drop
  onEventResize={handleEventResize}  // Required for resizing
/>
```

### Issue: Styling conflicts

**Solution**: Ensure FullCalendar CSS is imported BEFORE Tailwind:

```css
/* src/index.css */
@import '@fullcalendar/core/main.css';
@import '@fullcalendar/resource-timeline/main.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Issue: Calendar height too small

**Solution**: The component uses `height='auto'` by default. Adjust container height:

```tsx
<div className="min-h-[600px]">
  <ResourceTimelineView {...props} />
</div>
```

### Issue: Missing CSS variables error

**Solution**: Add required CSS variables to `src/index.css`:

```css
:root {
  --warning: 38 92% 50%;
  --success: 142 76% 36%;
  /* ... other variables */
}
```

---

## Performance Optimization

### Memoize Event Handlers

```tsx
const handleEventClick = useCallback((reservation: FacilityReservation) => {
  setSelectedReservation(reservation)
  setDialogOpen(true)
}, [])

const handleDateSelect = useCallback((facilityId: string, start: Date, end: Date) => {
  // Handler logic
}, [])
```

### Filter Large Datasets

For large datasets, filter reservations before passing to component:

```tsx
const visibleReservations = useMemo(() => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return reservations.filter(res => {
    const start = res.startTime.toDate()
    return start >= weekAgo && start <= weekFromNow
  })
}, [reservations])
```

---

## Type Definitions

### Required Interfaces

```typescript
interface Facility {
  id: string
  name: string
  maxHorsesPerReservation: number
  // ... other fields
}

interface FacilityReservation {
  id: string
  facilityId: string
  userId: string
  userEmail: string
  userFullName?: string
  startTime: Timestamp
  endTime: Timestamp
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  // ... other fields
}
```

---

## Additional Resources

- [FullCalendar Documentation](https://fullcalendar.io/docs/resource-timeline-view)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Firebase Timestamp](https://firebase.google.com/docs/reference/js/firestore_.timestamp)

---

## License

This component is part of the EquiDuty project and follows the same license.

---

**Last Updated**: 2024-01-15
**Component Version**: 1.0.0
**Maintained By**: Development Team
