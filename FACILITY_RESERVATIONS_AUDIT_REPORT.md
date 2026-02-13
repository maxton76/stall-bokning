# Facility Reservations Enhancement - Security & Quality Audit Report

**Date**: 2026-02-13
**Scope**: All new components and code from facility reservations enhancement
**Audited By**: AI Code Review System

---

## Executive Summary

**Total Issues Found**: 3 Critical, 2 High, 1 Medium
**Security Issues**: 1
**Permission V2 Compliance**: 1 critical issue
**i18n Translation Issues**: Multiple missing keys
**Code Quality**: Generally good with minor improvements needed

**Overall Risk Level**: 🔴 **HIGH** - Requires immediate attention before production deployment

---

## 🚨 Critical Issues

### Issue #1: Missing localStorage Error Handling in useViewMode.ts

**Severity**: 🔴 Critical
**Type**: Runtime Error / Security
**File**: `packages/frontend/src/hooks/useViewMode.ts`
**Lines**: 115, 126

**Description**:
The `useViewMode` hook uses `localStorage.setItem()` without try-catch blocks. This can cause runtime errors in:
- Private browsing mode (where localStorage is disabled)
- When storage quota is exceeded
- In some mobile browsers with restricted storage

**Vulnerable Code**:
```typescript
// Line 115
useEffect(() => {
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);  // ❌ No error handling
  setPreferences((prev) => ({
    ...prev,
    lastViewMode: viewMode,
  }));
}, [viewMode]);

// Line 126
useEffect(() => {
  localStorage.setItem(VIEW_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));  // ❌ No error handling
}, [preferences]);
```

**Impact**:
- App crashes for users in private browsing mode
- Loss of functionality when storage is full
- Poor user experience with unhandled errors

**Recommendation**:
Wrap all `localStorage` operations in try-catch blocks, following the pattern already used in `bookingSmartDefaults.ts`:

```typescript
// Recommended fix
useEffect(() => {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    setPreferences((prev) => ({
      ...prev,
      lastViewMode: viewMode,
    }));
  } catch (error) {
    console.warn('Failed to persist view mode:', error);
    // Optionally: show user notification
  }
}, [viewMode]);

useEffect(() => {
  try {
    localStorage.setItem(VIEW_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to persist preferences:', error);
  }
}, [preferences]);
```

**Priority**: 🔥 Fix before production deployment

---

### Issue #2: Analytics API Uses Permission V1 Instead of V2

**Severity**: 🔴 Critical
**Type**: Permission System Compliance
**File**: `packages/api/src/routes/facility-reservations.ts`
**Line**: 806

**Description**:
The analytics endpoint uses the deprecated `hasStableAccess()` function (Permission V1) instead of the new Permission V2 system (`hasStablePermission()`). According to project memory:
- Permission V2 is now permanent (feature flag removed)
- Old V1 functions should not be used in new code
- V2 provides proper role-based permission checking

**Vulnerable Code**:
```typescript
// Line 806 - WRONG (V1)
const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
if (!hasAccess) {
  return reply.status(403).send({
    error: "Forbidden",
    message: "You do not have permission to view analytics for this stable",
  });
}
```

**Impact**:
- Inconsistent permission checking across the application
- Potential permission bypass if V1 has different logic than V2
- Does not respect Permission V2 matrix configurations
- Future maintenance burden when V1 is fully deprecated

**Recommendation**:
Use Permission V2's `hasStablePermission()` with the appropriate permission action:

```typescript
// Recommended fix
import { hasStablePermission } from "../utils/permissionEngine.js";

// In the analytics endpoint (line 806)
const hasAccess = await hasStablePermission(
  user.uid,
  stableId,
  "view_financial_reports",  // or "manage_facilities" depending on requirements
  { systemRole: user.role }
);

if (!hasAccess) {
  return reply.status(403).send({
    error: "Forbidden",
    message: "You do not have permission to view analytics for this stable",
  });
}
```

**Available Permission Actions for Facilities**:
- `"manage_facilities"` - Full facility management access
- `"view_financial_reports"` - Financial analytics view (recommended for analytics)
- `"export_data"` - For CSV/PDF export functionality

**Priority**: 🔥 Fix before production deployment

---

### Issue #3: Missing i18n Translation Keys

**Severity**: 🔴 Critical
**Type**: Internationalization / User Experience
**Files**: Multiple translation files

**Description**:
Multiple translation keys used in components are missing from both Swedish (`sv/`) and English (`en/`) translation files. This will cause:
- Raw translation keys displayed to users (e.g., "facilities:quickBook.title")
- Broken user experience for non-English speakers
- Failed i18n lookups

**Missing Translation Keys**:

**Customer View**:
- `facilities:quickBook.title`
- `facilities:quickBook.favoriteLabel`
- `facilities:availability.showGrid`
- `facilities:availability.clickToBook`
- `facilities:views.customerDescription`

**View Selector**:
- `facilities:views.selectView`
- `facilities:views.noAvailableViews`
- `facilities:views.customerViewLabel`
- `facilities:views.customerViewDescription`
- `facilities:views.managerViewLabel`
- `facilities:views.managerViewDescription`
- `facilities:views.operationsViewLabel`
- `facilities:views.operationsViewDescription`
- `facilities:views.adminViewLabel`
- `facilities:views.adminViewDescription`

**Manager View**:
- `facilities:analytics.noData`
- `facilities:analytics.bookingTrends`
- `facilities:analytics.facilityComparison`

**Operations View**:
- `facilities:operations.todaySchedule`
- `facilities:operations.upcomingArrivals`
- `facilities:operations.nextArrival`
- `facilities:operations.preparationNotes`
- `facilities:operations.printSchedule`
- `facilities:operations.noBookingsToday`
- `facilities:operations.inProgress`
- `facilities:operations.upcoming`

**Impact**:
- Poor user experience with untranslated text
- Breaks app localization for Swedish users
- Looks unprofessional and incomplete

**Recommendation**:
Add all missing translation keys to both language files. See detailed fix below.

**Priority**: 🔥 Fix before production deployment

---

## ⚠️ High Priority Issues

### Issue #4: Facility Reservation Export Lacks Permission Check

**Severity**: ⚠️ High
**Type**: Authorization / Security
**File**: `packages/frontend/src/utils/exportData.ts`

**Description**:
The `exportAnalyticsToPDF()` and `exportAnalyticsToCSV()` functions export potentially sensitive analytics data (user emails, booking counts, utilization rates) without verifying the user has permission to export data.

**Current Behavior**:
```typescript
// exportData.ts - No permission check!
export function exportAnalyticsToCSV(data: AnalyticsExportData): void {
  // Directly exports data without checking permissions
  const csv = Papa.unparse(csvData, { quotes: true, delimiter: ',' });
  // ... download logic
}
```

**Impact**:
- Users without export permissions can download sensitive data
- Does not respect Permission V2 `"export_data"` action
- Potential data privacy violation

**Recommendation**:
1. Add permission check in `FacilityUtilizationDashboard` before calling export functions
2. Use Permission V2 to check `"export_data"` action
3. Disable export buttons for users without permission

```typescript
// In FacilityUtilizationDashboard.tsx
import { usePermissions } from '@/hooks/usePermissions';

export function FacilityUtilizationDashboard({ ... }) {
  const { hasPermission } = usePermissions();
  const canExport = hasPermission('export_data');

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!canExport) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to export data',
        variant: 'destructive',
      });
      return;
    }
    // ... proceed with export
  };

  // In JSX
  <Button
    variant="outline"
    onClick={() => handleExport('csv')}
    disabled={!canExport}
  >
    <Download className="mr-2 h-4 w-4" />
    CSV
  </Button>
}
```

**Priority**: ⚡ Fix before production deployment

---

### Issue #5: Analytics API Missing Input Validation

**Severity**: ⚠️ High
**Type**: Security / Data Validation
**File**: `packages/api/src/routes/facility-reservations.ts`
**Lines**: 790-796

**Description**:
The analytics endpoint accepts `startDate` and `endDate` query parameters without proper validation. Malformed dates or extreme ranges could cause:
- Server errors with invalid Date objects
- Database performance issues with very large date ranges
- Potential DoS through expensive queries

**Vulnerable Code**:
```typescript
const startDate = query.startDate
  ? new Date(query.startDate as string)  // ❌ No validation
  : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const endDate = query.endDate
  ? new Date(query.endDate as string)  // ❌ No validation
  : new Date();
```

**Impact**:
- Invalid dates can cause server errors
- Large date ranges (e.g., 10 years) create expensive queries
- No protection against malformed input

**Recommendation**:
Add proper date validation and range limits:

```typescript
// Recommended fix
const MAX_DATE_RANGE_DAYS = 365; // 1 year max

const startDate = query.startDate
  ? new Date(query.startDate as string)
  : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const endDate = query.endDate
  ? new Date(query.endDate as string)
  : new Date();

// Validate dates
if (isNaN(startDate.getTime())) {
  return reply.status(400).send({
    error: "Bad Request",
    message: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)",
  });
}

if (isNaN(endDate.getTime())) {
  return reply.status(400).send({
    error: "Bad Request",
    message: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)",
  });
}

// Validate date range
if (startDate > endDate) {
  return reply.status(400).send({
    error: "Bad Request",
    message: "startDate must be before endDate",
  });
}

const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
if (daysDiff > MAX_DATE_RANGE_DAYS) {
  return reply.status(400).send({
    error: "Bad Request",
    message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
  });
}
```

**Priority**: ⚡ Fix before production deployment

---

## ℹ️ Medium Priority Issues

### Issue #6: Export Functions Don't Handle Empty Datasets

**Severity**: ℹ️ Medium
**Type**: User Experience
**File**: `packages/frontend/src/utils/exportData.ts`

**Description**:
The export functions will generate empty CSV/PDF files if there's no data, which can confuse users.

**Recommendation**:
Add validation at the start of export functions:

```typescript
export function exportAnalyticsToCSV(data: AnalyticsExportData): void {
  // Add validation
  if (data.metrics.totalBookings === 0) {
    toast({
      title: 'No Data to Export',
      description: 'There are no bookings in the selected date range',
      variant: 'default',
    });
    return;
  }

  // ... proceed with export
}
```

**Priority**: 📝 Nice to have before production

---

## ✅ Security Best Practices Followed

1. ✅ No use of `dangerouslySetInnerHTML`
2. ✅ No use of `eval()` or `innerHTML`
3. ✅ Proper error handling in `bookingSmartDefaults.ts`
4. ✅ Input sanitization through React's built-in XSS protection
5. ✅ TypeScript strict mode enabled
6. ✅ No hardcoded secrets or API keys
7. ✅ Proper use of authentication middleware

---

## 📋 Detailed Fix: Missing Translation Keys

Add the following to both `sv/facilities.json` and `en/facilities.json`:

### Swedish (sv/facilities.json)

```json
{
  "quickBook": {
    "title": "Snabbbokning",
    "favoriteLabel": "Favoriter",
    "morning": "Morgon",
    "afternoon": "Eftermiddag",
    "evening": "Kväll",
    "selectTime": "Välj tid"
  },
  "availability": {
    "showGrid": "Tillgänglighetsöversikt",
    "clickToBook": "Klicka på en ledig tid för att boka"
  },
  "views": {
    "selectView": "Välj vy",
    "noAvailableViews": "Inga vyer tillgängliga",
    "customerViewLabel": "Kundvy",
    "customerViewDescription": "Förenklad bokningsvy för hästägare",
    "managerViewLabel": "Chefsvy",
    "managerViewDescription": "Analys och rapportering för stallägare",
    "operationsViewLabel": "Driftvy",
    "operationsViewDescription": "Dagens schema för personal",
    "adminViewLabel": "Administratörsvy",
    "adminViewDescription": "Fullständig översikt och kontroll",
    "customerDescription": "Boka enkelt anläggningar och se dina kommande bokningar",
    "managerDescription": "Översikt över utnyttjandegrad och bokningsstatistik"
  },
  "analytics": {
    "noData": "Ingen data tillgänglig för vald period"
  },
  "operations": {
    "todaySchedule": "Dagens schema",
    "upcomingArrivals": "Kommande ankomster",
    "nextArrival": "Nästa ankomst",
    "preparationNotes": "Förberedelser",
    "printSchedule": "Skriv ut schema",
    "noBookingsToday": "Inga bokningar idag",
    "inProgress": "Pågående",
    "upcoming": "Kommande",
    "minutes": "minuter",
    "hours": "timmar"
  }
}
```

### English (en/facilities.json)

```json
{
  "quickBook": {
    "title": "Quick Booking",
    "favoriteLabel": "Favorites",
    "morning": "Morning",
    "afternoon": "Afternoon",
    "evening": "Evening",
    "selectTime": "Select time"
  },
  "availability": {
    "showGrid": "Availability Overview",
    "clickToBook": "Click on an available slot to book"
  },
  "views": {
    "selectView": "Select View",
    "noAvailableViews": "No views available",
    "customerViewLabel": "Customer View",
    "customerViewDescription": "Simplified booking interface for horse owners",
    "managerViewLabel": "Manager View",
    "managerViewDescription": "Analytics and reporting for stable owners",
    "operationsViewLabel": "Operations View",
    "operationsViewDescription": "Today's schedule for staff",
    "adminViewLabel": "Administrator View",
    "adminViewDescription": "Complete overview and control",
    "customerDescription": "Easily book facilities and view your upcoming reservations",
    "managerDescription": "Overview of utilization rates and booking statistics"
  },
  "analytics": {
    "noData": "No data available for selected period"
  },
  "operations": {
    "todaySchedule": "Today's Schedule",
    "upcomingArrivals": "Upcoming Arrivals",
    "nextArrival": "Next Arrival",
    "preparationNotes": "Preparation",
    "printSchedule": "Print Schedule",
    "noBookingsToday": "No bookings today",
    "inProgress": "In Progress",
    "upcoming": "Upcoming",
    "minutes": "minutes",
    "hours": "hours"
  }
}
```

---

## 🔧 Quick Fixes Checklist

**Before Production Deployment**:
- [ ] Fix localStorage error handling in useViewMode.ts (Issue #1)
- [ ] Replace hasStableAccess with hasStablePermission in analytics endpoint (Issue #2)
- [ ] Add all missing translation keys to sv/facilities.json (Issue #3)
- [ ] Add all missing translation keys to en/facilities.json (Issue #3)
- [ ] Add permission check for export functionality (Issue #4)
- [ ] Add input validation for analytics date parameters (Issue #5)

**Nice to Have**:
- [ ] Add empty dataset validation in export functions (Issue #6)
- [ ] Add user feedback toasts for permission denied scenarios
- [ ] Add loading states during export operations

---

## 📊 Risk Assessment

**Production Readiness**: ❌ NOT READY
**Blocker Issues**: 3 critical
**Estimated Fix Time**: 2-3 hours
**Testing Required**: Yes - permission checks, i18n, error scenarios

**Recommendation**: Address all critical and high priority issues before production deployment. The code is well-structured overall but requires these security and quality fixes.

---

## ✨ Positive Findings

1. ✅ Clean component architecture with good separation of concerns
2. ✅ Comprehensive TypeScript typing throughout
3. ✅ Good use of React hooks and modern patterns
4. ✅ Proper error handling in utility functions (bookingSmartDefaults.ts)
5. ✅ No obvious SQL injection or XSS vulnerabilities
6. ✅ Good mobile responsiveness with Tailwind classes
7. ✅ Accessibility-friendly component structure

---

**End of Audit Report**
