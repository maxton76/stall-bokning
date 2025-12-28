# ResourceTimelineView - Quick Reference

**Component**: `ResourceTimelineView`
**Import**: `import { ResourceTimelineView } from '@/components/ResourceTimelineView'`

---

## 🚀 Basic Setup (Copy & Paste)

```tsx
import { ResourceTimelineView } from '@/components/ResourceTimelineView'
import { Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'

function MyPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState()
  const [initialValues, setInitialValues] = useState()

  return (
    <>
      <ResourceTimelineView
        facilities={facilities}
        reservations={reservations}

        // Click handlers
        onEventClick={(res) => {
          setSelectedReservation(res)
          setDialogOpen(true)
        }}

        onDateSelect={(facilityId, start, end) => {
          setInitialValues({
            facilityId,
            date: start,
            startTime: format(start, 'HH:mm'),
            endTime: format(end, 'HH:mm')
          })
          setDialogOpen(true)
        }}

        // Drag & drop handlers
        onEventDrop={async (id, start, end, facilityId) => {
          await updateReservation(id, {
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end),
            ...(facilityId && { facilityId })
          }, user.uid)
          reloadReservations()
        }}

        onEventResize={async (id, start, end) => {
          await updateReservation(id, {
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end)
          }, user.uid)
          reloadReservations()
        }}
      />

      <YourDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reservation={selectedReservation}
        initialValues={initialValues}
      />
    </>
  )
}
```

---

## 📋 Props Cheat Sheet

### Essential Props

```tsx
facilities={[]}           // Required: Array of resources
reservations={[]}         // Required: Array of events
onEventClick={fn}         // Required: Handle event clicks
onDateSelect={fn}         // Required: Handle empty slot clicks
onEventDrop={fn}          // Optional: Enable drag & drop
onEventResize={fn}        // Optional: Enable resizing
```

### Configuration Props

```tsx
timelineConfig={{
  slotMinTime: '06:00:00',        // Start time
  slotMaxTime: '22:00:00',        // End time
  slotDuration: '00:30:00',       // Time slot size
  slotLabelInterval: '01:00:00',  // Label frequency
  scrollTime: '08:00:00',         // Initial scroll
  weekends: true,                 // Show weekends
  nowIndicator: true              // Show current time
}}

resourceConfig={{
  headerContent: 'Facilities',    // Header title
  areaWidth: '200px',             // Column width
  showMaxCapacity: true           // Show capacity in name
}}

viewOptions={{
  showDay: true,                  // Show day button
  showWeek: true,                 // Show week button
  showMonth: true,                // Show month button
  initialView: 'resourceTimelineWeek'  // Default view
}}

statusColors={{
  pending: '#fbbf24',
  confirmed: '#10b981',
  cancelled: '#6b7280',
  completed: '#3b82f6',
  no_show: '#ef4444'
}}

editable={true}          // Enable/disable editing
className="custom-class" // Additional CSS
```

---

## 🎯 Common Use Cases

### Use Case 1: Business Hours Only

```tsx
<ResourceTimelineView
  {...props}
  timelineConfig={{
    slotMinTime: '08:00:00',
    slotMaxTime: '18:00:00',
    weekends: false
  }}
/>
```

### Use Case 2: 15-Minute Intervals

```tsx
<ResourceTimelineView
  {...props}
  timelineConfig={{
    slotDuration: '00:15:00',
    slotLabelInterval: '00:30:00'
  }}
/>
```

### Use Case 3: Read-Only Display

```tsx
<ResourceTimelineView
  {...props}
  editable={false}
  onDateSelect={() => {}}
/>
```

### Use Case 4: Month View Only

```tsx
<ResourceTimelineView
  {...props}
  viewOptions={{
    showDay: false,
    showWeek: false,
    showMonth: true,
    initialView: 'resourceTimelineMonth'
  }}
/>
```

### Use Case 5: Custom Colors

```tsx
<ResourceTimelineView
  {...props}
  statusColors={{
    pending: '#f59e0b',
    confirmed: '#10b981',
    cancelled: '#6b7280'
  }}
/>
```

---

## ⚡ Data Format Examples

### Facility Object

```typescript
{
  id: 'facility-123',
  name: 'Indoor Arena',
  maxHorsesPerReservation: 2
}
```

### Reservation Object

```typescript
{
  id: 'res-456',
  facilityId: 'facility-123',
  userId: 'user-789',
  userEmail: 'john@example.com',
  userFullName: 'John Doe',
  startTime: Timestamp.fromDate(new Date('2024-01-15T10:00:00')),
  endTime: Timestamp.fromDate(new Date('2024-01-15T11:00:00')),
  status: 'confirmed'
}
```

---

## 🔧 Event Handler Signatures

```typescript
// Event click
onEventClick: (reservation: FacilityReservation) => void

// Empty slot selection
onDateSelect: (
  facilityId: string,
  start: Date,
  end: Date
) => void

// Drag & drop (can move to different facility)
onEventDrop: (
  reservationId: string,
  newStart: Date,
  newEnd: Date,
  newFacilityId?: string
) => void

// Resize (same facility, different time)
onEventResize: (
  reservationId: string,
  newStart: Date,
  newEnd: Date
) => void
```

---

## 🎨 Styling Quick Fixes

### Change Container Style

```tsx
<ResourceTimelineView
  className="shadow-lg rounded-xl border-2"
  {...props}
/>
```

### Override Calendar Colors

Add to your CSS file:

```css
.fc {
  --fc-border-color: #your-color !important;
  --fc-button-bg-color: #your-color !important;
}
```

---

## 🐛 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Cannot read toDate of undefined" | Ensure `startTime`/`endTime` are Firestore `Timestamp` objects |
| Events not draggable | Add `onEventDrop` prop |
| Calendar too small | Wrap in `<div className="min-h-[600px]">` |
| Missing CSS | Import FullCalendar CSS in `index.css` |
| Wrong colors | Add `--warning` and `--success` CSS variables |

---

## 📦 Required CSS Variables

Add to `src/index.css` if missing:

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

## 🔗 Dependencies

Install if needed:

```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/resource-timeline @fullcalendar/interaction
```

Add to `src/index.css`:

```css
@import '@fullcalendar/core/main.css';
@import '@fullcalendar/resource-timeline/main.css';
```

---

## 💡 Pro Tips

1. **Memoize handlers** with `useCallback` for better performance
2. **Filter large datasets** before passing to component
3. **Use loading states** while fetching data
4. **Add error boundaries** for production
5. **Test drag & drop** with async update failures
6. **Implement optimistic updates** for better UX
7. **Add confirmation dialogs** for destructive actions
8. **Validate time overlaps** before saving

---

## 📖 Full Documentation

See [RESOURCE_TIMELINE_GUIDE.md](./RESOURCE_TIMELINE_GUIDE.md) for complete documentation.

---

**Quick Links**:
- Component: `packages/frontend/src/components/ResourceTimelineView.tsx`
- Example Usage: `packages/frontend/src/pages/FacilitiesReservationsPage.tsx`
- Types: `packages/frontend/src/types/facility.ts` & `facilityReservation.ts`
