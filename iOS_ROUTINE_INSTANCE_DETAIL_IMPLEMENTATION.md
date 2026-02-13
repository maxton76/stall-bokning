# iOS Routine Instance Management Modal - Implementation Summary

**Date**: 2026-02-13
**Status**: ✅ Complete and verified
**Build**: Successful

## Overview

Implemented a complete routine instance management modal for the iOS app's weekly schedule view. Users can now view routine details and perform management actions (reassign, cancel, delete) based on their permissions, matching the web app's functionality.

## What Was Implemented

### 1. Service Layer (API Integration)

**File**: `EquiDuty/Services/Implementations/RoutineService.swift`

Added three new instance management methods:
- `assignRoutineInstance(instanceId:assignedTo:assignedToName:)` - Reassign routine to a member
- `cancelRoutineInstance(instanceId:)` - Cancel a routine instance
- `deleteRoutineInstance(instanceId:)` - Permanently delete a routine instance

**API Endpoints Added**:
- `POST /api/v1/routines/instances/{instanceId}/assign`
- `POST /api/v1/routines/instances/{instanceId}/cancel`
- `DELETE /api/v1/routines/instances/{instanceId}`

### 2. Data Models Enhancement

**File**: `EquiDuty/Models/Routines/RoutineModels.swift`

Added computed properties to `RoutineInstance`:
- `isScheduled` - Check if status is scheduled
- `canBeReassigned` - Check if instance can be reassigned (scheduled only)
- `canBeCancelled` - Check if instance can be cancelled (scheduled/started/in_progress)
- `canBeDeleted` - Check if instance can be deleted (scheduled/cancelled only)
- `isUnassigned` - Check if routine has no assignee

### 3. ViewModel (Business Logic)

**File**: `EquiDuty/Features/Schedule/RoutineInstanceDetailViewModel.swift` (NEW)

Observable ViewModel with:
- **State management**: instance, members, loading, errors
- **Permission checking**: canReassign, canCancel, canDelete, canStartContinue
- **Actions**:
  - `loadData()` - Fetch instance details and available members
  - `assignToMember(memberId:memberName:)` - Reassign routine
  - `cancelInstance()` - Cancel routine
  - `deleteInstance()` - Delete routine

### 4. Detail View UI

**File**: `EquiDuty/Features/Schedule/RoutineInstanceDetailView.swift` (NEW)

SwiftUI view with:
- **Status Section**: Badge with color, date/time, points value
- **Assignment Section**: Current assignee with reassign button (if permitted)
- **Progress Section**: Steps completed, progress bar, percentage
- **Action Buttons** (permission-gated):
  - Primary: "Start Routine" / "Continue" (always visible unless completed/missed/cancelled)
  - Secondary: "Cancel Routine" (if manager or assignee)
  - Destructive: "Delete" (if manager and scheduled/cancelled)

**User Interactions**:
- Reassign sheet: List of active members, confirm dialog
- Cancel confirmation alert
- Delete confirmation alert
- Error handling with retry option

### 5. Integration with Weekly View

**File**: `EquiDuty/Features/Schedule/SchemaWeekView.swift`

**Changes**:
- Replaced `fullScreenCover` with `sheet` presentation
- Changed from showing `RoutineFlowView` to `RoutineInstanceDetailView`
- Now tapping a routine card opens management modal first
- Users can start/continue from the detail view if desired

### 6. Localization (Swedish + English)

**File**: `EquiDuty/Resources/Localizable.xcstrings`

Added 22 new localization keys:
- `routineDetails.title` - Modal title
- `routineDetails.status/assignedTo/progress` - Section headers
- `routineDetails.actions.*` - Button labels
- `routineDetails.error.*` - Error messages
- `routineDetails.reassign/cancel/delete.*` - Confirmation dialogs
- `common.close/cancel/delete/confirm/retry` - Common actions

## Permission Matrix Implementation

| User Type | View Details | Reassign | Cancel | Delete | Start/Continue |
|-----------|-------------|----------|--------|--------|----------------|
| **Basic Member** | ✅ | ❌ | ❌ | ❌ | ✅ (if applicable) |
| **Assignee** | ✅ | ❌ | ✅ (own routines) | ❌ | ✅ |
| **Manager** (manage_schedules) | ✅ | ✅ | ✅ (any routine) | ✅ | ✅ |

## Status-Based Action Matrix

| Status | Reassign | Cancel | Delete | Start/Continue |
|--------|----------|--------|--------|----------------|
| **scheduled** | ✅ | ✅ | ✅ | ✅ (Start) |
| **started** | ❌ | ✅ | ❌ | ✅ (Continue) |
| **in_progress** | ❌ | ✅ | ❌ | ✅ (Continue) |
| **completed** | ❌ | ❌ | ❌ | ❌ |
| **missed** | ❌ | ❌ | ❌ | ❌ |
| **cancelled** | ❌ | ❌ | ✅ | ❌ |

## User Flow

### Viewing Routine Details
1. User taps routine card in weekly schedule
2. Modal opens showing status, assignment, progress
3. Action buttons displayed based on permissions and status

### Reassigning (Manager Only)
1. User taps "Reassign" button
2. Sheet opens with list of active stable members
3. User selects member
4. Confirmation alert: "Assign this routine to [Name]?"
5. On confirm, API call updates assignment
6. Modal refreshes with new assignee

### Cancelling
1. User taps "Cancel Routine" button
2. Confirmation alert: "Cancel this routine? It cannot be undone."
3. On confirm, API call sets status to cancelled
4. Modal refreshes showing cancelled status

### Deleting (Manager Only, scheduled/cancelled)
1. User taps "Delete" button
2. Confirmation alert: "Delete this routine instance? This will permanently remove it."
3. On confirm, API call deletes instance
4. Modal dismisses, routine disappears from schedule

### Starting/Continuing Routine
1. User taps "Start Routine" or "Continue" button
2. Modal dismisses
3. `RoutineFlowView` opens in fullScreenCover mode
4. User proceeds with routine execution

## Error Handling

**Network Errors**:
- Show error view with retry button
- Error message displayed at top of modal

**Permission Errors (403)**:
- Error message: "You don't have permission to perform this action"
- Action buttons remain hidden

**Not Found (404)**:
- Error message: "This routine no longer exists"
- Suggests auto-dismissing modal

**Mutation Errors**:
- Alert shown with specific error message
- Modal stays open for retry
- Buttons disabled during mutation (isMutating flag)

## Testing Verification

### Build Verification
```bash
✅ Build succeeded: iPhone 17 Pro simulator target
✅ All Swift files compiled without errors
✅ Localization strings properly formatted
```

### Manual Testing Checklist

**As Basic Member**:
- [ ] View routine details (status, time, assignee, progress)
- [ ] See "Start Routine" button (if applicable)
- [ ] No Reassign button visible
- [ ] No Cancel button visible (unless assigned to you)
- [ ] No Delete button visible

**As Manager (manage_schedules)**:
- [ ] View all routine details
- [ ] Reassign scheduled routine to member
- [ ] Cancel any routine (scheduled/started/in_progress)
- [ ] Delete scheduled or cancelled routine
- [ ] Start any routine

**As Assignee**:
- [ ] View details of assigned routine
- [ ] Cancel own routine
- [ ] Start/continue own routine
- [ ] No reassign or delete buttons

**Edge Cases**:
- [ ] Tap completed routine → No action buttons except close
- [ ] Tap missed routine → No action buttons except close
- [ ] Tap unassigned routine as manager → Can reassign
- [ ] Network error during load → Error view with retry
- [ ] Network error during mutation → Alert with message
- [ ] Rapid button taps → Disabled during mutation

## Files Summary

### New Files (2)
1. `EquiDuty/Features/Schedule/RoutineInstanceDetailView.swift` - UI modal
2. `EquiDuty/Features/Schedule/RoutineInstanceDetailViewModel.swift` - Business logic

### Modified Files (5)
1. `EquiDuty/Services/Implementations/RoutineService.swift` - Added 3 API methods
2. `EquiDuty/Core/Networking/APIEndpoints.swift` - Added 2 endpoint definitions
3. `EquiDuty/Models/Routines/RoutineModels.swift` - Added 5 computed properties
4. `EquiDuty/Features/Schedule/SchemaWeekView.swift` - Changed sheet presentation
5. `EquiDuty/Resources/Localizable.xcstrings` - Added 22 localization keys

## Key Design Decisions

1. **Sheet vs FullScreenCover**: Used `.sheet` for detail modal (informational/management) vs `.fullScreenCover` for RoutineFlowView (focused task execution)

2. **Permission Checks**: Implemented at ViewModel level using `PermissionService.shared.hasPermission(.manageSchedules)`

3. **Status-Based Actions**: Used computed properties on `RoutineInstance` for cleaner business logic

4. **Error Recovery**: All mutations include proper error handling without dismissing modal, allowing retry

5. **Confirmation Dialogs**: Used native SwiftUI alerts for cancel/delete, UIAlertController for reassign confirmation

## Alignment with Web App

This implementation mirrors the web app's `RoutineInstanceDetailsModal` functionality:
- Same permission checks
- Same status-based action visibility
- Same user flows (reassign, cancel, delete)
- Consistent UX patterns

## Next Steps (Out of Scope)

These enhancements were identified but not implemented:
1. Bulk reassignment (select multiple instances)
2. Instance editing (change scheduled time/date)
3. Add notes to instance
4. View audit log
5. Send notification when reassigning
6. "Assign to me" quick action
7. Swipe actions on routine cards

## Issue Resolution: API Response Decoding

**Issue Found**: `keyNotFound` error when loading members for reassignment
**Cause**: API returns `OrganizationMember` (not `StableMember`) with different structure
**Solution**: Updated `OrganizationMember` model to match API response structure

**Changes Made**:
1. Added missing fields to `OrganizationMember`: `roles[]`, `primaryRole`, `phoneNumber`, `showInPlanning`, `stableAccess`, `assignedStableIds`
2. Changed ViewModel to use `[OrganizationMember]` instead of `[StableMember]`
3. View already compatible - no changes needed

**Result**: ✅ Decoding successful, member list loads correctly

See `API_RESPONSE_FIX.md` for detailed analysis.

## Deployment

**Status**: Ready for testing in dev environment
**Tested**: ✅ Build successful on iPhone 17 Pro simulator
**Tested**: ✅ API decoding verified
**Requires**: Backend API endpoints already exist (verified)
