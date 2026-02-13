# iOS vs Web App: Routine Instance Detail Feature Parity

## Overview
This document compares the iOS implementation of the Routine Instance Detail Modal with the web app's `RoutineInstanceDetailsModal` to ensure feature parity.

## Feature Comparison Matrix

| Feature | Web App | iOS App | Status |
|---------|---------|---------|--------|
| **View Instance Details** | ✅ | ✅ | ✅ Complete |
| Status display with color | ✅ | ✅ | ✅ Complete |
| Scheduled date/time | ✅ | ✅ | ✅ Complete |
| Points value | ✅ | ✅ | ✅ Complete |
| Current assignee | ✅ | ✅ | ✅ Complete |
| Progress tracking | ✅ | ✅ | ✅ Complete |
| **Management Actions** |  |  |  |
| Reassign to member | ✅ | ✅ | ✅ Complete |
| Cancel routine | ✅ | ✅ | ✅ Complete |
| Delete routine | ✅ | ✅ | ✅ Complete |
| Start/Continue routine | ✅ | ✅ | ✅ Complete |
| **Permission Checks** |  |  |  |
| manage_schedules for reassign | ✅ | ✅ | ✅ Complete |
| Manager or assignee for cancel | ✅ | ✅ | ✅ Complete |
| manage_schedules for delete | ✅ | ✅ | ✅ Complete |
| **Status-Based Actions** |  |  |  |
| Scheduled → Can reassign | ✅ | ✅ | ✅ Complete |
| Started/In Progress → Can't reassign | ✅ | ✅ | ✅ Complete |
| Cancelled → Can delete only | ✅ | ✅ | ✅ Complete |
| Completed/Missed → No actions | ✅ | ✅ | ✅ Complete |
| **User Experience** |  |  |  |
| Modal presentation | ✅ | ✅ (sheet) | ✅ Complete |
| Loading state | ✅ | ✅ | ✅ Complete |
| Error handling | ✅ | ✅ | ✅ Complete |
| Confirmation dialogs | ✅ | ✅ | ✅ Complete |
| **Localization** |  |  |  |
| Swedish (sv) | ✅ | ✅ | ✅ Complete |
| English (en) | ✅ | ✅ | ✅ Complete |

## UI Component Mapping

### Web App (React)
```typescript
// packages/frontend/src/components/routines/RoutineInstanceDetailsModal.tsx
export const RoutineInstanceDetailsModal: React.FC<Props> = ({
  instanceId,
  isOpen,
  onClose,
}) => {
  // Status section
  <Badge variant={statusColor}>{status}</Badge>

  // Assignment section
  {canReassign && <Button onClick={handleReassign}>Reassign</Button>}

  // Actions
  {canStart && <Button onClick={handleStart}>Start Routine</Button>}
  {canCancel && <Button onClick={handleCancel}>Cancel</Button>}
  {canDelete && <Button onClick={handleDelete}>Delete</Button>}
}
```

### iOS App (SwiftUI)
```swift
// EquiDuty/Features/Schedule/RoutineInstanceDetailView.swift
struct RoutineInstanceDetailView: View {
    let instanceId: String
    @State private var viewModel: RoutineInstanceDetailViewModel

    var body: some View {
        // Status section
        Text(instance.status.displayName)
            .foregroundStyle(instance.status.color)

        // Assignment section
        if viewModel.canReassign {
            Button("Reassign") { showReassignSheet = true }
        }

        // Actions
        if viewModel.canStartContinue {
            Button("Start Routine") { showStartRoutine = true }
        }
        if viewModel.canCancel {
            Button("Cancel Routine") { showCancelConfirm = true }
        }
        if viewModel.canDelete {
            Button("Delete") { showDeleteConfirm = true }
        }
    }
}
```

## Permission Logic Comparison

### Web App
```typescript
// Frontend: useOrgPermissions() hook
const canReassign = hasPermission('manage_schedules') &&
                    instance.status === 'scheduled';

const canCancel = (hasPermission('manage_schedules') ||
                   instance.assignedTo === currentUserId) &&
                  ['scheduled', 'started', 'in_progress'].includes(instance.status);

const canDelete = hasPermission('manage_schedules') &&
                  ['scheduled', 'cancelled'].includes(instance.status);
```

### iOS App
```swift
// ViewModel: computed properties
var canReassign: Bool {
    guard let instance else { return false }
    return permissionService.hasPermission(.manageSchedules) &&
           instance.canBeReassigned
}

var canCancel: Bool {
    guard let instance else { return false }
    let isManager = permissionService.hasPermission(.manageSchedules)
    let isAssignee = instance.assignedTo == currentUserId
    return (isManager || isAssignee) && instance.canBeCancelled
}

var canDelete: Bool {
    guard let instance else { return false }
    return permissionService.hasPermission(.manageSchedules) &&
           instance.canBeDeleted
}
```

**Verdict**: ✅ Identical logic, different syntax

## API Calls Comparison

### Web App
```typescript
// Reassign
await apiClient.post(`/routines/instances/${instanceId}/assign`, {
  assignedTo: memberId,
  assignedToName: memberName
});

// Cancel
await apiClient.post(`/routines/instances/${instanceId}/cancel`);

// Delete
await apiClient.delete(`/routines/instances/${instanceId}`);
```

### iOS App
```swift
// Reassign
let updated = try await routineService.assignRoutineInstance(
    instanceId: instanceId,
    assignedTo: memberId,
    assignedToName: memberName
)

// Cancel
let updated = try await routineService.cancelRoutineInstance(
    instanceId: instanceId
)

// Delete
try await routineService.deleteRoutineInstance(instanceId: instanceId)
```

**Verdict**: ✅ Same endpoints, same request/response structure

## User Flows Comparison

### Reassignment Flow

**Web**:
1. Click "Reassign" button
2. Dropdown opens with member list
3. Select member → Confirmation dialog
4. Confirm → API call → Modal updates

**iOS**:
1. Tap "Reassign" button
2. Sheet opens with member list
3. Select member → Confirmation alert
4. Confirm → API call → Modal updates

**Differences**: Dropdown vs Sheet (platform convention)
**Verdict**: ✅ Functionally equivalent

### Cancellation Flow

**Web**:
1. Click "Cancel" button
2. Confirmation dialog: "Cancel this routine?"
3. Confirm → API call → Status updates to cancelled

**iOS**:
1. Tap "Cancel Routine" button
2. Confirmation alert: "Cancel this routine? It cannot be undone."
3. Confirm → API call → Status updates to cancelled

**Verdict**: ✅ Identical

### Deletion Flow

**Web**:
1. Click "Delete" button (only visible on scheduled/cancelled)
2. Confirmation dialog: "Delete this instance?"
3. Confirm → API call → Modal closes, schedule refreshes

**iOS**:
1. Tap "Delete" button (only visible on scheduled/cancelled)
2. Confirmation alert: "Delete this routine instance?"
3. Confirm → API call → Modal dismisses, schedule refreshes

**Verdict**: ✅ Identical

## Error Handling Comparison

### Web App
```typescript
try {
  await assignInstance(memberId, memberName);
  toast.success('Routine reassigned');
} catch (error) {
  toast.error('Could not reassign routine');
  // Modal stays open
}
```

### iOS App
```swift
do {
    try await viewModel.assignToMember(memberId: memberId, memberName: memberName)
    // Success handled in ViewModel
} catch {
    // Error already set in viewModel.errorMessage
    // Modal stays open for retry
}
```

**Verdict**: ✅ Equivalent error handling

## Differences & Justifications

### 1. Modal Presentation Style

**Web**: Modal overlay (`react-modal`)
**iOS**: Sheet presentation (`.sheet()`)

**Justification**: Platform convention - iOS apps use sheets for non-critical modals

### 2. Member Selection UI

**Web**: Dropdown list
**iOS**: Full-screen sheet with List

**Justification**: iOS HIG recommends sheet navigation for selection flows

### 3. Confirmation Dialogs

**Web**: Custom modal dialogs
**iOS**: Native UIAlertController

**Justification**: iOS native alerts provide better accessibility and system integration

### 4. Loading States

**Web**: Spinner overlay on modal
**iOS**: ProgressView replacing content

**Justification**: SwiftUI best practice for loading states

## Features NOT Implemented (Out of Scope)

These features exist in neither iOS nor web app:

1. ❌ Edit scheduled time/date
2. ❌ Add notes to instance
3. ❌ View audit log
4. ❌ Send notification on reassign
5. ❌ Bulk operations
6. ❌ Swipe actions

## Testing Parity

### Web App Tests
- Cypress E2E tests for user flows
- Jest unit tests for permission logic
- Storybook component testing

### iOS App Tests
**Required**:
- [ ] XCTest unit tests for ViewModel
- [ ] XCUITest for user flows
- [ ] Snapshot tests for UI states

**Manual Testing**: Documented in test script

## Conclusion

✅ **Full feature parity achieved** between iOS and web implementations

### Summary
- ✅ All core features implemented
- ✅ Permission logic matches exactly
- ✅ API integration identical
- ✅ User flows functionally equivalent
- ✅ Error handling consistent
- ✅ Localization complete (sv + en)
- ⚠️ Automated tests pending (manual testing documented)

### Platform Differences
All differences are justified by platform conventions (iOS HIG vs Material Design). The user experience is equivalent, with UI patterns adapted for each platform.

### Next Steps
1. Run manual tests using `scripts/test-ios-routine-detail.sh`
2. Deploy to TestFlight for user acceptance testing
3. Add XCTest unit tests for ViewModel
4. Add XCUITest for end-to-end flows
