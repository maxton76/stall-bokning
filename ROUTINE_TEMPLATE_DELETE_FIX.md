# Routine Template Delete Fix

## Issue
The iOS app showed "Delete permanently" option for routine templates, but the API only performed soft delete (setting `isActive: false`) instead of actual deletion.

## Root Cause
- **iOS UI**: Displayed "Delete permanently" button leading users to expect true deletion
- **API Behavior**: DELETE `/api/v1/routines/templates/:id` only did soft delete (line 874-879)
- **Result**: User confusion - templates marked as "deleted" were just disabled, not removed

## Solution

### 1. API Changes (`packages/api/src/routes/routines.ts`)

**Implemented permanent deletion with dependency checking:**

```typescript
// Query parameter controls behavior:
// - permanent=true (default): Attempt permanent deletion after checking dependencies
// - permanent=false: Soft delete (archive by setting isActive=false)

// Dependency checks before deletion:
- Check for active schedules using this template
- Check for routine instances referencing this template
- Return 400 error if dependencies exist

// Error response when dependencies found:
{
  error: "Bad Request",
  message: "Cannot delete template: it is being used by schedules or instances. Disable it instead.",
  hasSchedules: boolean,
  hasInstances: boolean
}
```

**Benefits:**
- ✅ True permanent deletion when no dependencies
- ✅ Prevents breaking schedules/instances by checking first
- ✅ Clear error message guides users to disable instead
- ✅ Backwards compatible with query parameter

### 2. iOS Changes

**a) Added `badRequest` error type (`EquiDuty/Core/Networking/APIClient.swift`):**
```swift
enum APIError: Error, LocalizedError {
    // ... existing cases
    case badRequest(String)  // New case for 400 errors with message
}
```

**b) Updated error handling in API client:**
```swift
case 400:
    let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)
    let errorMsg = errorResponse?.message ?? errorResponse?.error ?? "Bad request"
    throw APIError.badRequest(errorMsg)
```

**c) Updated delete handler (`EquiDuty/Features/Schedule/RoutineTemplatesView.swift`):**
```swift
private func delete(template: RoutineTemplate) async {
    do {
        try await routineService.deleteRoutineTemplate(templateId: template.id)
        templateToDelete = nil
        await refreshData()
    } catch APIError.badRequest(let message) {
        // Show specific error when template has dependencies
        errorMessage = message
        templateToDelete = nil
    } catch {
        errorMessage = error.localizedDescription
        templateToDelete = nil
    }
}
```

## User Experience Flow

### Scenario 1: Template without dependencies
1. User clicks trash icon on template
2. Confirmation dialog appears: "Disable" or "Delete permanently"
3. User chooses "Delete permanently"
4. iOS calls DELETE `/api/v1/routines/templates/:id`
5. API checks dependencies → **none found**
6. API **permanently deletes** the template document
7. Template removed from list ✅

### Scenario 2: Template with dependencies (schedules/instances)
1. User clicks trash icon on template
2. Confirmation dialog appears: "Disable" or "Delete permanently"
3. User chooses "Delete permanently"
4. iOS calls DELETE `/api/v1/routines/templates/:id`
5. API checks dependencies → **found active schedules or instances**
6. API returns 400 error: "Cannot delete template: it is being used by schedules or instances. Disable it instead."
7. iOS shows error message to user
8. User clicks "Disable" instead to keep template archived ✅

## Testing Checklist

- [ ] Delete template without dependencies → should be permanently removed
- [ ] Delete template with active schedule → should show error
- [ ] Delete template with routine instances → should show error
- [ ] Disable template (toggle off) → should set isActive=false (unchanged behavior)
- [ ] Error message displayed correctly in iOS app
- [ ] Template count updated correctly after deletion
- [ ] No orphaned data in Firestore after deletion

## Deployment

### API Deployment
```bash
task deploy:api ENV=dev
# Test on dev first, then:
task deploy:api ENV=prod TAG=v0.x.y
```

### iOS App
No deployment needed - will automatically use new API behavior when updated API is live.

## Security Considerations

✅ **Authorization**: Checks `hasOrganizationAccess()` before deletion
✅ **Data Integrity**: Prevents deletion of templates in use
✅ **Audit Trail**: Updates include `updatedAt` and `updatedBy` for soft deletes
✅ **Error Messages**: Clear feedback without exposing internal system details

## Future Enhancements (Optional)

1. **Bulk deletion**: Allow deleting multiple unused templates at once
2. **Archive view**: Show disabled templates separately with option to restore
3. **Cascade delete**: Offer to delete dependent schedules/instances (with confirmation)
4. **Dependency details**: Show which specific schedules/instances are blocking deletion
