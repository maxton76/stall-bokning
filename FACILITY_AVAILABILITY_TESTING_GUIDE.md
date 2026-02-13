# Facility Availability Grid - Testing Guide

**Purpose**: Verify the time slot visualization fix is working correctly
**Date**: 2026-02-13
**Related**: FACILITY_AVAILABILITY_GRID_FIX.md

## Prerequisites

1. **Start development environment**:
   ```bash
   # Terminal 1: Firebase emulators
   task dev:emulators

   # Terminal 2: Frontend dev server
   task dev:frontend

   # Terminal 3: API server
   task dev:api
   ```

2. **Navigate to**: http://localhost:5173/my-reservations

3. **Required test data**:
   - At least 1 stable with facilities
   - At least 1 facility with capacity ≥ 3
   - At least 1 horse assigned to your account

## Test Case 1: Exact Hour Boundary (Critical Fix)

**Purpose**: Verify reservations ending at exact hour boundaries don't mark the next slot as booked

### Setup
1. Navigate to "Mina bokningar" (My Reservations)
2. Select a facility
3. Click "Visa tillgänglighet" (View Availability)
4. Select today's date

### Test Steps
1. **Create reservation**: 10:00 - 11:00 (exactly 1 hour)
   - Click on 10:00 slot
   - Verify dialog opens with:
     - Start time: 10:00
     - End time: 10:30 (auto-filled based on slot)
   - Change end time to: 11:00
   - Select a horse
   - Click "Skapa bokning" (Create Reservation)

2. **Verify slot display**:
   - ✅ Slot 09:30 → GREEN, shows "X/X" (available)
   - ✅ Slot 10:00 → RED or YELLOW, shows "0/X" or "(X-1)/X" (booked)
   - ✅ Slot 10:30 → RED or YELLOW, shows "0/X" or "(X-1)/X" (booked)
   - ✅ Slot 11:00 → GREEN, shows "X/X" (available) ← **CRITICAL: Should NOT be booked**
   - ✅ Slot 11:30 → GREEN, shows "X/X" (available)

3. **Verify tooltips**:
   - Hover over 10:00 slot → "Fullbokat (X platser)" or "Y av X platser kvar"
   - Hover over 11:00 slot → "Tillgänglig (X platser)" ← **CRITICAL: Should show available**

### Expected Result
- ✅ Only slots 10:00 and 10:30 are marked as booked
- ✅ Slot 11:00 remains available (GREEN)
- ✅ Capacity numbers are visible on all slots
- ✅ Tooltips show correct availability status

### Common Failures (Before Fix)
- ❌ Slot 11:00 showing as RED (full) or YELLOW (limited)
- ❌ Tooltip saying "Fullbokat" or "Begränsat" for 11:00 slot
- ❌ User unable to book 11:00-12:00 even though 11:00 is free

---

## Test Case 2: Multi-Capacity Display

**Purpose**: Verify capacity information is shown clearly for all slot states

### Setup
1. Select a facility with **capacity = 3**
2. View availability grid for today

### Test Steps - Progressive Booking
1. **State 1: No bookings**
   - ✅ All slots show "3/3" (green)
   - ✅ Tooltip: "Tillgänglig (3 platser)"

2. **Create 1st booking**: 10:00-11:00
   - ✅ Slots 10:00, 10:30 show "2/3" (yellow)
   - ✅ Tooltip: "2 av 3 platser kvar"

3. **Create 2nd booking**: 10:00-11:00 (different horse)
   - ✅ Slots 10:00, 10:30 show "1/3" (yellow)
   - ✅ Tooltip: "1 av 3 platser kvar"

4. **Create 3rd booking**: 10:00-11:00 (third horse)
   - ✅ Slots 10:00, 10:30 show "0/3" (red)
   - ✅ Tooltip: "Fullbokat (3 platser)"
   - ✅ Slots become non-clickable (disabled)

5. **Delete 1 booking**
   - ✅ Slots 10:00, 10:30 revert to "1/3" (yellow)
   - ✅ Slots become clickable again

### Expected Result
- ✅ Capacity always visible (not just for "limited" slots)
- ✅ Correct color coding:
  - GREEN = 100% available
  - YELLOW = 1-99% available
  - RED = 0% available (full)
  - GRAY = Closed/outside operating hours
- ✅ Tooltips match visual state
- ✅ Numbers are readable on all background colors

---

## Test Case 3: Edge Cases

**Purpose**: Verify correct behavior for boundary conditions

### Test 3.1: Reservation Ending Exactly at Slot Start
```
Booking: 09:30 - 10:00
Expected:
- Slot 09:00 → GREEN (available)
- Slot 09:30 → YELLOW/RED (booked)
- Slot 10:00 → GREEN (available) ← Should NOT be booked
```

### Test 3.2: Reservation Starting Exactly at Slot Start
```
Booking: 10:00 - 10:30
Expected:
- Slot 09:30 → GREEN (available)
- Slot 10:00 → YELLOW/RED (booked) ← Should be booked
- Slot 10:30 → GREEN (available)
```

### Test 3.3: Multi-Hour Reservation
```
Booking: 09:00 - 12:00 (3 hours)
Expected:
- Slot 08:30 → GREEN (available)
- Slots 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 → YELLOW/RED (booked) ← 6 slots
- Slot 12:00 → GREEN (available) ← Should NOT be booked
```

### Test 3.4: Overlapping Reservations
```
Booking 1: 10:00 - 11:00
Booking 2: 10:30 - 11:30
Expected:
- Slot 10:00 → Shows 1 reservation (if capacity=1, RED)
- Slot 10:30 → Shows 2 reservations (if capacity=2, RED; if capacity=3, YELLOW)
- Slot 11:00 → Shows 1 reservation (if capacity=1, RED)
- Slot 11:30 → GREEN (available)
```

---

## Test Case 4: Visual & UX Verification

**Purpose**: Ensure UI is user-friendly and accessible

### Desktop View (≥640px)
1. ✅ Grid displays 8 columns
2. ✅ Time labels (HH:mm) clearly visible
3. ✅ Capacity numbers (X/Y) readable below time
4. ✅ Tooltips appear on hover
5. ✅ Color contrast meets accessibility standards

### Mobile View (<640px)
1. ✅ Grid displays 6 columns
2. ✅ Horizontal scroll enabled
3. ✅ Touch targets large enough (min 44x44px)
4. ✅ Capacity numbers still readable at small size
5. ✅ Tooltips work on tap/hold

### Color Accessibility
1. ✅ Green: High contrast with text
2. ✅ Yellow: High contrast with text
3. ✅ Red: High contrast with text
4. ✅ Gray: Clearly distinguishable as "closed"

### Internationalization
1. **Swedish (default)**:
   - ✅ "Tillgänglig (X platser)"
   - ✅ "Y av X platser kvar"
   - ✅ "Fullbokat (X platser)"
   - ✅ "Stängt"

2. **English**:
   - Change language in user settings
   - ✅ "Available (X spots)"
   - ✅ "Y of X spots available"
   - ✅ "Fully booked (X spots)"
   - ✅ "Closed"

---

## Test Case 5: Performance Verification

**Purpose**: Ensure grid remains responsive with many reservations

### Load Test
1. Create 20+ reservations across different times
2. ✅ Grid renders within 1 second
3. ✅ No lag when switching dates
4. ✅ Smooth scrolling on mobile
5. ✅ No console errors or warnings

### Memory Test
1. Switch between dates rapidly (10+ times)
2. ✅ No memory leaks
3. ✅ Grid clears old data correctly
4. ✅ New data loads without stutter

---

## Debug Mode (Optional)

If issues are found, enable debug logging:

1. **File**: `packages/frontend/src/components/AvailabilityGrid.tsx`
2. **Line**: ~150 (look for commented debug block)
3. **Action**: Uncomment the console.log section

```typescript
// BEFORE
// if (process.env.NODE_ENV === 'development' && overlappingReservations.length > 0) {
//   console.log(...);
// }

// AFTER (uncommented)
if (process.env.NODE_ENV === 'development' && overlappingReservations.length > 0) {
  console.log(`Slot ${format(slotTime, 'HH:mm')}-${format(slotEnd, 'HH:mm')}:`, {
    overlappingReservations: overlappingReservations.map(r => ({
      id: r.id,
      start: format(toDate(r.startTime)!, 'HH:mm:ss'),
      end: format(toDate(r.endTime)!, 'HH:mm:ss'),
    })),
    reservationCount,
    maxCapacity,
    status: reservationCount >= maxCapacity ? 'FULL' : reservationCount > 0 ? 'LIMITED' : 'AVAILABLE',
  });
}
```

**Debug Output** (example):
```
Slot 10:00-10:30: {
  overlappingReservations: [
    { id: 'abc123', start: '10:00:00', end: '11:00:00' }
  ],
  reservationCount: 1,
  maxCapacity: 3,
  status: 'LIMITED'
}

Slot 11:00-11:30: {
  overlappingReservations: [],
  reservationCount: 0,
  maxCapacity: 3,
  status: 'AVAILABLE'
}
```

**Analysis**: If you see `:00:00.001` or any milliseconds in the debug output, the time precision fix didn't work.

---

## Regression Testing

After confirming the fix works, verify these features still function:

### Existing Features
- ✅ Date picker navigation
- ✅ Facility filter dropdown
- ✅ Slot click → Opens reservation dialog
- ✅ Reservation creation flow
- ✅ Reservation editing
- ✅ Reservation deletion
- ✅ Operating hours enforcement (gray slots)
- ✅ Conflict detection
- ✅ Admin override checkbox

### Related Components
- ✅ FacilitiesReservationsPage: Main reservation management
- ✅ ManageFacilitiesPage: Facility configuration
- ✅ MyUpcomingReservations: User's reservation list

---

## Acceptance Criteria

**Fix is considered successful if**:

1. ✅ **Time Precision**: Reservations ending at HH:00 don't mark HH:00 slot as booked
2. ✅ **Capacity Display**: All non-closed slots show "X/Y" capacity information
3. ✅ **Tooltips**: Hover text shows exact remaining capacity with context
4. ✅ **Visual Clarity**: Users can immediately see which slots have availability
5. ✅ **No Regressions**: All existing functionality continues to work
6. ✅ **i18n Support**: Works correctly in both Swedish and English
7. ✅ **Mobile Responsive**: Grid is usable on small screens
8. ✅ **Performance**: No lag or slowdown with 20+ reservations

**If any criteria fails**, refer to:
- FACILITY_AVAILABILITY_GRID_FIX.md (implementation details)
- `/Users/p950xam/.claude/plans/[plan-id].md` (original plan)
- Enable debug mode for detailed investigation

---

## Reporting Issues

If you find a bug during testing:

1. **Note the exact scenario**:
   - Reservation times
   - Facility capacity
   - Number of existing bookings
   - Which slot is incorrectly displayed

2. **Enable debug logging** (see Debug Mode section above)

3. **Capture console output**:
   - Check browser DevTools → Console
   - Copy relevant debug logs

4. **Take screenshots**:
   - Grid showing incorrect state
   - Tooltip text
   - Browser dimensions

5. **Document in issue**:
   - Create markdown file: `FACILITY_AVAILABILITY_BUG_[DATE].md`
   - Include all captured information
   - Reference this testing guide

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Commit changes with descriptive message
2. ✅ Push to development branch
3. ✅ Deploy to dev environment: `task deploy:frontend ENV=dev`
4. ✅ Re-test in deployed environment
5. ✅ Create PR for staging deployment
6. ✅ Final production deployment: `task deploy:frontend ENV=prod TAG=v0.x.y`

**Related Commands**:
```bash
# Commit changes
git add packages/frontend/
git commit -m "fix: resolve facility availability grid time slot visualization issue

- Add roundToMinute() utility to ensure exact minute precision
- Show capacity (X/Y) on all non-closed slots, not just limited ones
- Enhanced tooltips with contextual capacity information
- Added i18n support for new tooltip messages (sv/en)

Fixes issue where time slots appeared as fully booked for longer
periods than actual reservation duration due to seconds/milliseconds
in timestamp causing off-by-one errors in overlap detection."

# Deploy to dev
task deploy:frontend ENV=dev

# After successful testing in dev, merge to main and deploy to production
git checkout main
git merge develop
git tag v0.14.1  # or appropriate version
task deploy:frontend ENV=prod TAG=v0.14.1
```
