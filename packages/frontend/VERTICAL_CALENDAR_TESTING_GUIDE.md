# Vertical Calendar Layout - Visual Testing Guide

## Quick Start Testing

### 1. Start Development Server
```bash
cd packages/frontend
npm run dev
```

### 2. Navigate to Facilities Page
1. Open browser to `http://localhost:5173`
2. Log in to EquiDuty
3. Navigate to **Facilities → Reservations**
4. Calendar should load with vertical layout by default (on desktop)

## Visual Verification Checklist

### ✅ Layout Toggle (Desktop Only)

**Expected Behavior:**
- [ ] Two toggle buttons visible: "⟷ Timeline" and "⇅ Calendar"
- [ ] "⇅ Calendar" button is highlighted/selected by default
- [ ] Clicking "⟷ Timeline" switches to horizontal layout
- [ ] Clicking "⇅ Calendar" switches back to vertical layout
- [ ] Toggle buttons have smooth hover effects
- [ ] Active button has different background color

**What to Look For:**
```
┌─────────────────────────────────────────────┐
│  [← Prev Week]  Mon, Jan 15, 2026  [Next→] │
│                                             │
│  View: [⟷ Timeline] [⇅ Calendar] ← Buttons │
└─────────────────────────────────────────────┘
```

### ✅ Vertical Layout Grid Structure

**Expected Layout:**
```
┌──────┬─────────┬─────────┬─────────┐
│ Time │ Arena 1 │ Arena 2 │ Trail   │ ← Facility Names (Row 1)
├──────┼─────────┼─────────┼─────────┤
│ 6:00 │         │         │         │
│ 6:15 │         │         │         │
│ 6:30 │         │   🟦    │         │ ← Booking Block
│ 6:45 │         │   🟦    │         │
│ 7:00 │         │         │         │
│ 7:15 │   🟩    │         │         │
└──────┴─────────┴─────────┴─────────┘
  ↑
Time Labels (Column 1)
```

**Visual Checks:**
- [ ] Time labels appear in leftmost column (not top row)
- [ ] Facility names appear in top row (not leftmost column)
- [ ] Grid flows vertically (time down, facilities across)
- [ ] Scroll direction is vertical (not horizontal)
- [ ] Hour markers have visible top borders (not left borders)

### ✅ Horizontal Layout Grid Structure (For Comparison)

**Expected Layout:**
```
┌─────────┬──────┬──────┬──────┬──────┐
│Facility │ 6:00 │ 6:15 │ 6:30 │ 6:45 │ ← Time Slots
├─────────┼──────┼──────┼──────┼──────┤
│ Arena 1 │      │      │  🟦  │  🟦  │
├─────────┼──────┼──────┼──────┼──────┤
│ Arena 2 │      │  🟩  │  🟩  │      │
├─────────┼──────┼──────┼──────┼──────┤
│ Trail   │      │      │      │      │
└─────────┴──────┴──────┴──────┴──────┘
    ↑
Facility Names (Column 1)
```

**Visual Checks:**
- [ ] Facility names appear in leftmost column
- [ ] Time slots appear in top row
- [ ] Grid flows horizontally (facilities down, time across)
- [ ] Scroll direction is horizontal (not vertical)
- [ ] Hour markers have visible left borders (not top borders)

### ✅ Booking Blocks Rendering

**Vertical Mode:**
- [ ] Bookings appear in correct facility columns
- [ ] Bookings span multiple rows based on duration
- [ ] Booking block height matches time duration
- [ ] Multiple bookings in same facility don't overlap
- [ ] Very short bookings (15-30 min) are still visible

**Horizontal Mode:**
- [ ] Bookings appear in correct facility rows
- [ ] Bookings span multiple columns based on duration
- [ ] Booking block width matches time duration
- [ ] Multiple bookings in same facility don't overlap
- [ ] Very short bookings (15-30 min) are still visible

**Visual Example (Vertical):**
```
│ 9:00 │         │ [John Doe    ] │         │
│ 9:15 │         │ [9:00 - 10:00] │         │
│ 9:30 │         │ [            ] │         │
│ 9:45 │         │ [            ] │         │
│10:00 │         │                │         │
```

### ✅ Current Time Indicator

**Vertical Mode:**
- [ ] Red horizontal line spans full width
- [ ] Line positioned at current time (if today)
- [ ] Time label shows current time (e.g., "14:23")
- [ ] Small diamond/arrow indicator at left edge
- [ ] Line is above all other content (z-index)

**Horizontal Mode:**
- [ ] Red vertical line spans full height
- [ ] Line positioned at current time (if today)
- [ ] Time label shows current time
- [ ] Small diamond/arrow indicator at top
- [ ] Line is above all other content

**Visual Example (Vertical):**
```
│13:45 │         │         │         │
├──────┼─────────┼─────────┼─────────┤
│◆ 14:23 ━━━━━━━━━━━━━━━━━━━━━━━━━━━│ ← Current Time
├──────┼─────────┼─────────┼─────────┤
│14:00 │         │         │         │
```

### ✅ Click-and-Drag Selection

**Vertical Mode:**
- [ ] Mouse cursor changes to crosshair over empty cells
- [ ] Clicking and dragging creates vertical selection box
- [ ] Selection box has dashed border and semi-transparent fill
- [ ] Releasing mouse creates new booking dialog
- [ ] Selection respects business hours (greyed areas blocked)

**Horizontal Mode:**
- [ ] Mouse cursor changes to crosshair over empty cells
- [ ] Clicking and dragging creates horizontal selection box
- [ ] Selection box has dashed border and semi-transparent fill
- [ ] Releasing mouse creates new booking dialog
- [ ] Selection respects business hours

**Visual During Drag (Vertical):**
```
│10:00 │         │ ┌───────────┐ │         │
│10:15 │         │ │:::::::::::│ │         │ ← Selection Box
│10:30 │         │ │:::::::::::│ │         │
│10:45 │         │ └───────────┘ │         │
│11:00 │         │                │         │
```

### ✅ Drag-and-Drop Booking

**Vertical Mode:**
- [ ] Grabbing booking shows move cursor
- [ ] Dragging booking shows semi-transparent overlay
- [ ] Can drag to different time slots (up/down)
- [ ] Can drag to different facilities (left/right)
- [ ] Invalid drop zones highlighted differently
- [ ] Successful drop updates booking

**Horizontal Mode:**
- [ ] Grabbing booking shows move cursor
- [ ] Dragging booking shows semi-transparent overlay
- [ ] Can drag to different time slots (left/right)
- [ ] Can drag to different facilities (up/down)
- [ ] Invalid drop zones highlighted differently
- [ ] Successful drop updates booking

### ✅ Keyboard Navigation

**Vertical Mode - Arrow Keys:**
1. Click on a time slot to focus grid
2. Press **↓** → Should move down one time slot
3. Press **↑** → Should move up one time slot
4. Press **→** → Should move right one facility
5. Press **←** → Should move left one facility

**Vertical Mode - Other Keys:**
- [ ] **Home** → Jump to first time slot (6:00 AM)
- [ ] **End** → Jump to last time slot (10:00 PM)
- [ ] **PageDown** → Jump down 5 time slots
- [ ] **PageUp** → Jump up 5 time slots
- [ ] **Enter** → Start selection at focused cell
- [ ] **Enter again** → Complete selection
- [ ] **Escape** → Cancel selection

**Visual Focus Indicator:**
```
│10:00 │         │ ┏━━━━━━━━━┓ │         │
│10:15 │         │ ┃ FOCUSED ┃ │         │ ← Focus Ring
│10:30 │         │ ┗━━━━━━━━━┛ │         │
```

### ✅ Mobile Layout (Width < 768px)

**Test on Mobile/Small Window:**
- [ ] Toggle buttons should NOT be visible
- [ ] Layout should be horizontal (forced)
- [ ] Facility selector dropdown should appear
- [ ] Only one facility shown at a time
- [ ] Horizontal scrolling works smoothly
- [ ] Touch gestures work (no double-tap zoom issues)

**Mobile Visual:**
```
┌─────────────────────────────────┐
│ Select Facility: [Arena 1 ▼]   │ ← Dropdown
│                                 │
│ ┌───────┬────┬────┬────┬────┐  │
│ │Arena 1│6:00│6:15│6:30│6:45│  │ ← Horizontal
│ ├───────┼────┼────┼────┼────┤  │
│ │       │    │ 🟦 │ 🟦 │    │  │
│ └───────┴────┴────┴────┴────┘  │
└─────────────────────────────────┘
```

### ✅ Business Hours Visualization

**Expected Behavior:**
- [ ] Non-business hours have grey background (`bg-muted/20`)
- [ ] Business hours have white/default background
- [ ] Cannot create bookings in grey areas
- [ ] Cannot drag bookings into grey areas
- [ ] Selection overlay doesn't work in grey areas

**Visual Example:**
```
│ 5:00 │ ░░░░░░░ │ ░░░░░░░ │ ░░░░░░░ │ ← Before Opening
│ 5:30 │ ░░░░░░░ │ ░░░░░░░ │ ░░░░░░░ │
├──────┼─────────┼─────────┼─────────┤
│ 6:00 │         │         │         │ ← Business Hours
│ 6:30 │         │   🟦    │         │
│ 7:00 │         │         │         │
├──────┼─────────┼─────────┼─────────┤
│22:00 │ ░░░░░░░ │ ░░░░░░░ │ ░░░░░░░ │ ← After Closing
│22:30 │ ░░░░░░░ │ ░░░░░░░ │ ░░░░░░░ │
```

### ✅ Responsive Breakpoints

**Desktop (≥768px):**
- [ ] Full vertical layout with all facilities visible
- [ ] Toggle buttons visible and functional
- [ ] Smooth vertical scrolling
- [ ] All columns visible (no horizontal scroll)

**Tablet (768px - 1024px):**
- [ ] Vertical layout maintained
- [ ] Toggle buttons visible
- [ ] May have horizontal scroll if many facilities
- [ ] Touch gestures work

**Mobile (<768px):**
- [ ] Forced horizontal layout
- [ ] Toggle buttons hidden
- [ ] Facility selector dropdown visible
- [ ] Single facility view
- [ ] Touch-optimized interactions

## Browser Testing Matrix

Test in each browser with both orientations:

| Browser | Vertical Layout | Horizontal Layout | Mobile View | Notes |
|---------|----------------|-------------------|-------------|-------|
| Chrome 110+ | [ ] | [ ] | [ ] | |
| Firefox 110+ | [ ] | [ ] | [ ] | |
| Safari 16+ | [ ] | [ ] | [ ] | Check grid-rows-subgrid support |
| Edge 110+ | [ ] | [ ] | [ ] | |
| Mobile Safari | N/A | [ ] | [ ] | Should force horizontal |
| Mobile Chrome | N/A | [ ] | [ ] | Should force horizontal |

## Performance Testing

### Scroll Performance
1. Load calendar with 100+ time slots (6:00 - 22:00 in 15min increments)
2. Open browser DevTools → Performance
3. Start recording
4. Scroll rapidly through the calendar
5. Stop recording

**Expected Results:**
- [ ] Maintained 60 FPS during scroll
- [ ] No layout thrashing warnings
- [ ] Smooth animation frames
- [ ] No janky scroll behavior

### Layout Switch Performance
1. Open DevTools → Performance
2. Click vertical layout toggle
3. Immediately click horizontal layout toggle
4. Repeat 10 times rapidly

**Expected Results:**
- [ ] Each switch completes in <100ms
- [ ] No memory leaks
- [ ] No excessive re-renders
- [ ] Smooth transitions

### Memory Testing
1. Open DevTools → Memory
2. Take heap snapshot (baseline)
3. Switch layouts 50 times
4. Take another heap snapshot
5. Compare

**Expected Results:**
- [ ] Memory increase <5MB
- [ ] No detached DOM nodes
- [ ] No event listener leaks

## Accessibility Testing

### Screen Reader Testing
**NVDA/JAWS (Windows) or VoiceOver (Mac):**

1. Navigate to calendar with screen reader active
2. Tab to calendar grid
3. Use arrow keys to navigate cells

**Expected Announcements:**
- [ ] Grid role announced: "Facility booking timeline, grid"
- [ ] Cell content announced: "Arena 1, 9:00 AM, empty" or "John Doe, 9:00 to 10:00"
- [ ] Current time indicator announced: "Current time: 2:23 PM"
- [ ] Booking status announced: "confirmed" / "pending" / etc.

### Keyboard-Only Navigation
**Test without mouse:**
1. Tab to calendar
2. Navigate with arrow keys
3. Create booking with keyboard
4. Switch layouts with keyboard

**Expected Behavior:**
- [ ] All interactive elements reachable via keyboard
- [ ] Focus visible at all times (blue outline)
- [ ] Tab order logical and predictable
- [ ] Toggle buttons accessible via Tab
- [ ] Enter/Space activate buttons

### Color Contrast
**Use browser DevTools → Lighthouse:**
- [ ] Run accessibility audit
- [ ] All text meets WCAG AA (4.5:1 contrast ratio)
- [ ] Booking status colors distinguishable
- [ ] Focus indicators visible

## Edge Cases to Test

### 1. Very Long Bookings
- [ ] 4+ hour booking spans correctly in vertical mode
- [ ] Booking text doesn't overflow container
- [ ] Scroll to see full booking works

### 2. Overlapping Bookings
- [ ] Multiple bookings in same facility/time are visible
- [ ] Bookings stack or offset slightly
- [ ] Can click on each individual booking

### 3. Midnight Spanning Bookings
- [ ] Booking ending at midnight displays correctly
- [ ] No visual glitches at day boundaries

### 4. Empty Calendar
- [ ] Calendar renders correctly with no bookings
- [ ] Click-and-drag still works
- [ ] No console errors

### 5. Many Facilities (>10)
- [ ] Vertical layout shows all facilities (horizontal scroll if needed)
- [ ] Facility names don't overlap
- [ ] Performance remains acceptable

### 6. Different Time Ranges
**Test with different `slotMinTime` and `slotMaxTime`:**
- [ ] Early morning: `06:00 - 12:00`
- [ ] Full day: `00:00 - 23:59`
- [ ] Evening only: `18:00 - 23:00`

### 7. Different Slot Durations
**Test with different `slotDuration` prop:**
- [ ] 15 minutes (default)
- [ ] 30 minutes
- [ ] 60 minutes

### 8. Date Navigation
- [ ] Previous week button works
- [ ] Next week button works
- [ ] Bookings update correctly
- [ ] Current time indicator hides when not today

### 9. LocalStorage Persistence
1. Set to vertical layout
2. Refresh page
3. Should load in vertical layout

4. Set to horizontal layout
5. Refresh page
6. Should load in horizontal layout

7. Open in incognito/private browsing
8. Should default to vertical layout

### 10. Rapid Layout Switching
- [ ] Toggle between layouts 20 times rapidly
- [ ] No console errors
- [ ] Layout renders correctly each time
- [ ] No visual glitches or flashing

## Common Issues & Solutions

### Issue: Grid Cells Not Aligned
**Symptoms:** Booking blocks don't align with time slots
**Check:**
1. Verify `gridRowStart/gridRowEnd` calculations
2. Check `+2` offset is applied consistently
3. Inspect with DevTools grid overlay

### Issue: Time Indicator Not Visible
**Symptoms:** Red line doesn't appear
**Check:**
1. Verify `selectedDate` is today
2. Check current time is within `slotMinTime` to `slotMaxTime`
3. Verify `z-index: 30` on indicator element

### Issue: Keyboard Navigation Doesn't Work
**Symptoms:** Arrow keys don't move focus
**Check:**
1. Grid container has `tabIndex={0}`
2. Click on grid to focus before using arrows
3. Check `handleKeyDown` function is attached

### Issue: Layout Doesn't Switch
**Symptoms:** Clicking toggle buttons does nothing
**Check:**
1. Browser localStorage is enabled
2. Check console for errors
3. Verify `setOrientation` state update is firing

### Issue: Mobile Shows Toggle Buttons
**Symptoms:** Toggle visible on small screens
**Check:**
1. Verify `isMobile` state is detecting correctly
2. Check `window.innerWidth < 768` logic
3. Test with browser DevTools device emulation

## Reporting Issues

When reporting a bug, include:
1. **Browser**: Name and version
2. **Screen Size**: Desktop/tablet/mobile dimensions
3. **Orientation**: Vertical or horizontal
4. **Steps to Reproduce**: Detailed sequence
5. **Expected Behavior**: What should happen
6. **Actual Behavior**: What actually happened
7. **Screenshots**: Visual proof
8. **Console Logs**: Any JavaScript errors

**Issue Template:**
```
Browser: Chrome 121.0.6167.184
Screen: 1920x1080 (Desktop)
Orientation: Vertical

Steps:
1. Navigate to Facilities → Reservations
2. Switch to vertical layout
3. Create booking from 9:00 to 10:00

Expected: Booking block should span 4 rows (15min slots)
Actual: Booking block only spans 2 rows

Screenshot: [attach]
Console: TypeError: Cannot read property 'gridRowStart' of null
```

## Success Criteria

All boxes should be checked before considering implementation complete:

### Critical (Must Pass)
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Vertical layout renders correctly
- [ ] Horizontal layout still works
- [ ] Toggle switches between layouts
- [ ] Preference persists in localStorage
- [ ] Mobile forces horizontal layout
- [ ] Booking blocks positioned correctly
- [ ] Current time indicator visible (today only)
- [ ] Click-and-drag creates bookings
- [ ] Drag-and-drop moves bookings
- [ ] Keyboard navigation works

### Important (Should Pass)
- [ ] Performance: 60fps scrolling
- [ ] Performance: Layout switch <100ms
- [ ] Accessibility: Screen reader compatible
- [ ] Accessibility: Keyboard-only usable
- [ ] Browser: Works in Chrome, Firefox, Safari, Edge
- [ ] Responsive: Works on desktop, tablet, mobile
- [ ] Business hours visualized correctly
- [ ] Long bookings (>2 hours) render well

### Nice to Have (Can Fix Later)
- [ ] Smooth animations during layout switch
- [ ] Optimized for very large facility lists (>20)
- [ ] Print stylesheet for vertical layout
- [ ] Custom keyboard shortcuts

---

**Testing Date**: _____________
**Tested By**: _____________
**Overall Result**: [ ] PASS [ ] FAIL [ ] NEEDS WORK

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________
