# Android App Fixes - 2026-02-09

## Issues Fixed

### 1. Today View - Missing Routines

**Problem**: The "Today" view only displayed activities but did not show routines assigned to the user.

**Solution**:
- Modified `TodayViewModel` to fetch both activities and routines from the API
- Created a sealed class `TodayItem` to represent both activity and routine instances
- Added a new `todayItems` StateFlow that combines and sorts both activities and routines by scheduled time
- Updated `loadData()` to fetch routines for the selected date range alongside activities
- Created a new `RoutineCard` composable to display routine instances with:
  - Routine name and status badge
  - Assigned user
  - Scheduled time and estimated duration
  - Progress indicator for in-progress routines (steps completed/total)
- Updated `TodayScreen` to display both items in a unified list

**Files Modified**:
- `TodayViewModel.kt` - Added routine repository injection, combined data flow, and routine fetching
- `TodayScreen.kt` - Added RoutineCard composable and unified list display

### 2. Horse Icon - Replaced Paw Icon

**Problem**: The bottom navigation bar used a paw icon (Icons.Default.Pets) for the horses tab instead of a horse-related icon.

**Solution**:
- Created a custom horse icon as a vector drawable (`ic_horse.xml`) featuring a simplified horse head silhouette
- Modified the navigation system to support both Material Icons (ImageVector) and custom drawable resources
- Created a sealed class `NavIcon` with two variants:
  - `NavIcon.Vector` - For Material Icons (ImageVector)
  - `NavIcon.Drawable` - For custom drawable resources
- Updated `BottomNavTab` to use `NavIcon` instead of `ImageVector`
- Updated `BottomNavBar` to render icons appropriately based on their type
- Changed the HORSES tab to use the custom horse icon (`NavIcon.Drawable(R.drawable.ic_horse)`)

**Files Modified**:
- `Routes.kt` - Added NavIcon sealed class and updated BottomNavTab enum
- `BottomNavBar.kt` - Added icon type handling with painterResource support
- `res/drawable/ic_horse.xml` - New custom horse icon drawable

## Technical Details

### Today View Data Flow

```
TodayViewModel
  ├── ActivityRepository.activities (fetched activities)
  ├── RoutineRepository.getInstances() (fetched routines)
  └── todayItems (combined, filtered, and sorted)
       ├── TodayItem.Activity(ActivityInstance)
       └── TodayItem.Routine(RoutineInstance)
```

### Icon System Architecture

```
NavIcon (sealed class)
  ├── Vector(ImageVector) - Material Icons
  └── Drawable(@DrawableRes Int) - Custom drawables

BottomNavBar
  └── when (icon)
       ├── is NavIcon.Vector → Icon(imageVector)
       └── is NavIcon.Drawable → Icon(painterResource)
```

## User-Visible Changes

1. **Today View**: Users now see both their assigned activities AND routines in chronological order
2. **Navigation**: The horses tab now displays a horse icon instead of a paw print icon
3. **Routine Cards**: Display routine progress, assigned user, and scheduled time

## Testing Recommendations

1. Verify routines appear in Today view when assigned to the current user
2. Test the "Show Only Mine" toggle works for both activities and routines
3. Verify routines and activities are sorted correctly by scheduled time
4. Check that the custom horse icon displays correctly in the bottom navigation bar
5. Test navigation to routine flow when tapping a routine card
