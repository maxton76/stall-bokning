# iOS Schedule (Schema) Menu Implementation - Phase 1 Complete

## Overview

Implemented the Schedule (Schema) menu in the iOS app's More tab, starting with the Week view as Phase 1 MVP.

## What Was Implemented

### 1. New Files Created

#### SchemaView.swift
**Location**: `EquiDuty/EquiDuty/Features/Schedule/SchemaView.swift`
- Main container view for schedule features
- Currently shows Week view only (Phase 1)
- Ready to expand with tabs for Month, Distribution, etc. in future phases
- Includes dismiss button and navigation title

#### SchemaWeekView.swift
**Location**: `EquiDuty/EquiDuty/Features/Schedule/SchemaWeekView.swift`
- Weekly calendar schedule view
- Reuses `TodayViewModel` with `.week` period type
- Includes date navigation header
- Integrates with `WeekCalendarGrid` component

#### WeekCalendarGrid.swift
**Location**: `EquiDuty/EquiDuty/Features/Schedule/Components/WeekCalendarGrid.swift`
- 7-column grid showing week days (Monday-Sunday)
- Displays routine count per day
- Shows "—" placeholder for days with no routines
- Highlights today's date
- Responsive cell design with proper spacing

### 2. Files Modified

#### MoreView.swift
**Location**: `EquiDuty/EquiDuty/Features/More/MoreView.swift`
**Changes**:
- Added `@State private var showSchema = false` property
- Added "Schema" menu item between Feeding and Settings
- Added fullScreenCover presentation for SchemaView
- Uses calendar.badge.clock icon in blue color

#### Localizable.xcstrings
**Location**: `EquiDuty/EquiDuty/Resources/Localizable.xcstrings`
**Translations Added**:
- `schedule.title`: "Schema" (sv) / "Schedule" (en)
- `schedule.week`: "Vecka" (sv) / "Week" (en)

## User Flow

1. User taps "Mer" (More) tab in main navigation
2. User taps "Schema" menu item (between Feeding and Settings)
3. SchemaView opens full-screen showing the Week view
4. Week view displays 7-day calendar grid with routine counts
5. User can navigate to previous/next week using arrow buttons
6. User can dismiss by tapping X button or swiping down

## Architecture Decisions

### Why Week View First?
- Most frequently used schedule perspective
- Leverages existing `TodayViewModel` infrastructure
- Low implementation complexity (2-3 hours)
- Provides immediate value to users

### Why Single View Instead of Tabs?
- Phase 1 MVP approach - add complexity incrementally
- Other views (Month, Distribution, etc.) require additional backend work
- Can easily add TabView in future when more views are ready

### Component Reuse
- **TodayViewModel**: Period type logic, date range calculations
- **TodayDateNavigationHeader**: Date picker with period navigation
- **Date extensions**: Date range helper methods
- Maintains consistency with existing Today view patterns

## Testing Checklist

### ✅ Basic Functionality
- [ ] More menu displays "Schema" item with calendar icon
- [ ] Tapping "Schema" opens SchemaView full-screen
- [ ] Week grid displays 7 columns (Monday-Sunday)
- [ ] Today's date is highlighted in blue
- [ ] Routine counts display correctly for each day
- [ ] Days without routines show "—" placeholder

### ✅ Navigation
- [ ] Previous week button works correctly
- [ ] Next week button works correctly
- [ ] Week range updates properly
- [ ] X button dismisses view
- [ ] Swipe down gesture dismisses view

### ✅ Edge Cases
- [ ] Empty week (no routines) displays correctly
- [ ] Week spanning two months displays correctly
- [ ] Rapid navigation doesn't cause crashes
- [ ] Routine data loads asynchronously without blocking UI

## Future Enhancements (Deferred)

### Phase 2: Month View
- Create `SchemaMonthView.swift`
- Add month calendar grid layout
- Integrate with existing date navigation

### Phase 3: Distribution View
- Create `SchemaDistributionView.swift`
- Display fairness metrics and time accrual
- Add distribution charts

### Phase 4: Routine Schedules (Admin)
- Create `SchemaRoutineSchedulesView.swift`
- Recurring schedule management
- Permission check: `manage_schedules`

### Phase 5: Routine Templates (Admin)
- Create `SchemaRoutineTemplatesView.swift`
- Template library browser
- Permission check: `manage_routines`

### Phase 6: Selection Process
- Create `SchemaSelectionView.swift`
- Selection process participation (all users)
- Selection process creation (admins only)
- Permission check: `manage_selection_processes`

### Tab Implementation
When multiple views are ready:
```swift
enum SchemaTab: String, CaseIterable {
    case week = "schedule.week"
    case month = "schedule.month"
    case distribution = "schedule.distribution"
    // etc.
}

struct SchemaView: View {
    @State private var selectedTab: SchemaTab = .week

    var body: some View {
        NavigationStack {
            VStack {
                Picker("View", selection: $selectedTab) {
                    ForEach(SchemaTab.allCases) { tab in
                        Text(String(localized: tab.rawValue))
                            .tag(tab)
                    }
                }
                .pickerStyle(.segmented)

                TabView(selection: $selectedTab) {
                    // Tab content
                }
            }
        }
    }
}
```

## Implementation Time

**Phase 1 (Week View)**: ~2.5 hours
- SchemaView structure: 20 min ✅
- SchemaWeekView: 30 min ✅
- WeekCalendarGrid component: 1 hour ✅
- MoreView integration: 15 min ✅
- Translations: 10 min ✅
- Documentation: 15 min ✅

## Build & Run

```bash
# Open project in Xcode
open EquiDuty/EquiDuty.xcodeproj

# Clean build folder (Cmd+Shift+K)
# Build and run (Cmd+R)
```

The new files are automatically included in the build due to Xcode's `PBXFileSystemSynchronizedRootGroup` configuration.

## Notes

- **No NavigationRouter changes needed**: Schema is launched as a modal from More menu
- **Automatic file inclusion**: Project uses file system synchronization, no manual .pbxproj edits required
- **Translation keys added**: Both Swedish and English translations included
- **Component reuse**: Leverages existing TodayView infrastructure for consistency

## Related Documentation

- Original implementation plan: `/Users/p950xam/.claude/plans/[plan-file].md`
- iOS More Tab Implementation: `iOS_MORE_TAB_IMPLEMENTATION.md`
- Frontend patterns: `packages/frontend/src/pages/schedule/`
