# iOS Date Format Fix - Implementation Summary

## Problem

The iOS app was receiving 400 validation errors when calling API endpoints with date query parameters:

```
Error: querystring/startDate must match format "date-time" (status: 400)
```

**Root Cause**: iOS was sending date-only strings (`2026-02-01`) while the API expects ISO 8601 datetime format (`2026-02-01T00:00:00Z`).

## Solution

### 1. Created Date Extension for ISO 8601 Formatting

**File**: `EquiDuty/Core/Networking/Date+ISO8601.swift`

Added utility methods to convert Swift `Date` objects to ISO 8601 datetime strings:

- `iso8601DateTimeString()` - Basic ISO 8601 datetime in UTC
- `startOfDayISO8601()` - ISO 8601 datetime at 00:00:00 UTC (for `startDate` parameters)
- `endOfDayISO8601()` - ISO 8601 datetime at 23:59:59 UTC (for `endDate` parameters)

### 2. Updated Services

Fixed date formatting in two service files:

#### HorseActivityHistoryService.swift
- **Before**: Used `DateFormatter` with `"yyyy-MM-dd"` format
- **After**: Uses `Date+ISO8601` extension methods
- **Lines Changed**: 15-20, 48-52

#### ActivityService.swift
- **Before**: Used `DateFormatter` with `"yyyy-MM-dd"` format
- **After**: Uses `Date+ISO8601` extension methods
- **Lines Changed**: 16-21, 34-39

### 3. Changes Made

**Removed**:
```swift
private let dateFormatter: DateFormatter

private init() {
    dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    dateFormatter.locale = Locale(identifier: "en_US_POSIX")
}

// Usage:
params["startDate"] = dateFormatter.string(from: startDate)
```

**Added**:
```swift
// Extension in Date+ISO8601.swift provides:
params["startDate"] = startDate.startOfDayISO8601()  // "2026-02-01T00:00:00Z"
params["endDate"] = endDate.endOfDayISO8601()        // "2026-02-08T23:59:59Z"
```

## Verification Steps

### 1. Build the Project

Open the Xcode project:
```bash
open EquiDuty/EquiDuty.xcodeproj
```

The new `Date+ISO8601.swift` file will be automatically discovered by Xcode's file system synchronization.

**Build**: ⌘B (Cmd+B)

### 2. Test Horse Activity History

1. Run the app on a simulator or device
2. Navigate to a horse detail view
3. Open the activity history tab
4. Try filtering by different date ranges (week, month, custom)
5. Verify no 400 errors in the console

**Expected API Request Format**:
```
GET /api/v1/horse-activity-history/horse/{horseId}?startDate=2026-02-01T00:00:00Z&endDate=2026-02-08T23:59:59Z&limit=50
```

### 3. Network Logging

Enable network logging to verify the correct format is being sent:

In `APIClient.swift`, the debug logging will show:
```
📡 API Request: GET https://dev-api-service-auky5oec3a-ew.a.run.app/api/v1/horse-activity-history/horse/RMkDjW055EHmdr7NrmGR?startDate=2026-02-01T00:00:00Z&endDate=2026-02-08T23:59:59Z&limit=50
📥 API Response: 200
```

### 4. Test Activity Filtering

1. Navigate to "Today" view or activity list
2. Apply date filters for stable activities
3. Verify activities load correctly without errors

## API Contract Compliance

### Date Parameter Format Requirements

| Parameter | Type | Format | Example |
|-----------|------|--------|---------|
| `startDate` | string | ISO 8601 datetime | `2026-02-01T00:00:00Z` |
| `endDate` | string | ISO 8601 datetime | `2026-02-08T23:59:59Z` |

### Required Format Components

✅ Full date: `YYYY-MM-DD`
✅ Time separator: `T`
✅ Time: `HH:mm:ss`
✅ Timezone: `Z` (UTC) or `±HH:mm` offset
✅ Optional: milliseconds `.sss`

### Backend Behavior

The API service (`packages/api/src/services/horseActivityHistoryService.ts`) accepts ISO 8601 datetime strings and:

1. Parses them to JavaScript `Date` objects
2. Converts to Firestore `Timestamp` objects
3. For `endDate`, automatically sets time to 23:59:59.999 to include the entire day

## Files Modified

1. **Created**: `EquiDuty/Core/Networking/Date+ISO8601.swift`
2. **Modified**: `EquiDuty/Services/Implementations/HorseActivityHistoryService.swift`
3. **Modified**: `EquiDuty/Services/Implementations/ActivityService.swift`

## Related Endpoints

The following API endpoints expect ISO 8601 datetime format for date parameters:

- `GET /api/v1/horse-activity-history/horse/:horseId` ✅ Fixed
- `GET /api/v1/activities/stable/:stableId` ✅ Fixed
- Any future endpoints using `startDate`/`endDate` query parameters

## Success Criteria

✅ iOS app sends ISO 8601 datetime strings for `startDate` and `endDate`
✅ API returns 200 OK with valid activity history
✅ No 400 validation errors in API logs
✅ Horse activity timeline displays correct data
✅ Date filtering works across all time ranges
✅ Consistent date formatting across all iOS API calls

## Testing Checklist

- [ ] Project builds without errors in Xcode
- [ ] Horse activity history loads without 400 errors
- [ ] Date filtering works for day/week/month views
- [ ] Network logs show correct ISO 8601 format
- [ ] Activity list filtering works correctly
- [ ] No console errors when navigating between dates

## Notes

- The fix maintains API stability (no backend changes required)
- Uses UTC timezone for all date parameters
- Automatically handles start of day (00:00:00) and end of day (23:59:59)
- Consistent with web and Android app implementations
