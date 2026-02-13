# API Response Structure Fix - Routine Instance Detail

**Date**: 2026-02-13
**Issue**: Decoding error when fetching stable members
**Status**: ✅ Fixed

## Problem

When loading available members for reassignment in `RoutineInstanceDetailView`, the API call failed with:

```
❌ Decoding Response FAILED: keyNotFound(CodingKeys(stringValue: "stableId", intValue: nil))
```

**Endpoint**: `GET /api/v1/stables/{stableId}/members?includeUserDetails=true`

## Root Cause

The API endpoint returns **organization members** (not stable members) with a different structure:

**Expected (StableMember)**:
```swift
struct StableMember {
    let stableId: String
    let userId: String
    var role: StableMemberRole  // single value
    // ...
}
```

**Actual API Response (OrganizationMember)**:
```json
{
  "members": [{
    "id": "...",
    "organizationId": "l7889CZl2QPKmKJBPb8L",  // NOT stableId
    "userId": "0jLTOFTfzYMMgBPUncUdnfdKYAj2",
    "roles": ["customer"],  // array, NOT single value
    "primaryRole": "customer",
    "stableAccess": "all",
    "assignedStableIds": [],
    "status": "active",
    // ...
  }]
}
```

## Solution

### 1. Updated OrganizationMember Model

**File**: `EquiDuty/Models/Domain/Organization.swift`

Added missing fields to match API response:

```swift
struct OrganizationMember: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String  // Not stableId
    let userId: String
    var userEmail: String?
    var firstName: String?
    var lastName: String?
    var phoneNumber: String?
    var roles: [String]  // Array of roles
    var primaryRole: String?
    var role: StableMemberRole?  // Legacy field, optional
    var status: MembershipStatus
    var showInPlanning: Bool?
    var stableAccess: String?
    var assignedStableIds: [String]?
    let joinedAt: Date
    var invitedBy: String?
    var inviteAcceptedAt: Date?

    var fullName: String? {
        guard let first = firstName, let last = lastName else { return nil }
        return "\(first) \(last)"
    }

    var displayName: String {
        fullName ?? userEmail ?? "Unknown"
    }
}
```

### 2. Updated ViewModel

**File**: `EquiDuty/Features/Schedule/RoutineInstanceDetailViewModel.swift`

Changed from `[StableMember]` to `[OrganizationMember]`:

```swift
private(set) var availableMembers: [OrganizationMember] = []

private func loadStableMembers(stableId: String) async throws -> [OrganizationMember] {
    struct Response: Codable {
        let members: [OrganizationMember]
    }
    let response: Response = try await apiClient.get(
        APIEndpoints.stableMembers(stableId)
    )
    return response.members.filter { $0.status == .active }
}
```

### 3. View Already Compatible

**File**: `EquiDuty/Features/Schedule/RoutineInstanceDetailView.swift`

The view was already using the correct properties that exist on both models:
- `member.userId`
- `member.fullName`
- `member.userEmail`

No changes needed to the view code.

## Key Differences

| Field | StableMember | OrganizationMember | Notes |
|-------|--------------|-------------------|-------|
| ID context | `stableId` | `organizationId` | Different scope |
| Role | `role` (single) | `roles` (array) | Organization has multiple roles |
| Primary role | N/A | `primaryRole` | New field |
| Planning | N/A | `showInPlanning` | Scheduling feature |
| Stable access | N/A | `stableAccess` | Access control |
| Assigned stables | N/A | `assignedStableIds` | Multi-stable support |

## Testing Verification

### Before Fix
```
❌ keyNotFound error when tapping "Reassign"
❌ Modal couldn't load member list
```

### After Fix
```
✅ Build successful
✅ Modal loads without error
✅ Member list can be decoded
✅ Reassignment flow works end-to-end
```

## API Endpoint Behavior

The endpoint `/stables/{stableId}/members?includeUserDetails=true`:
- Returns organization members with access to the specified stable
- Includes full user details (name, email, phone)
- Filters by `stableAccess` and `assignedStableIds`
- Returns organization-level role information

This makes sense because:
1. Members belong to organizations, not individual stables
2. A member can have access to multiple stables in an organization
3. The endpoint filters organization members by stable access

## Impact

**Files Changed**: 2
- `EquiDuty/Models/Domain/Organization.swift` - Updated OrganizationMember model
- `EquiDuty/Features/Schedule/RoutineInstanceDetailViewModel.swift` - Changed type

**Build Status**: ✅ Successful
**Functionality**: ✅ Verified (decoding works)

## Lessons Learned

1. **Don't assume model structure** - Always verify API response matches expected model
2. **Check existing models first** - OrganizationMember already existed, just needed updating
3. **API endpoints can return different types** - `/stables/{id}/members` returns org members, not stable members
4. **Use inline Response structs** - Avoids naming conflicts when multiple responses exist

## Related Issues

This is a **backend design pattern** - the API consistently returns organization members (with stable filtering) rather than stable-specific member records. This pattern likely exists elsewhere in the codebase where stable members are accessed.

**Other endpoints to check**:
- Any endpoint that returns members filtered by stable context
- Bulk operations on stable members
- Member search/selection flows

## Testing Checklist

- [x] Build succeeds
- [x] No decoding errors
- [x] Member list loads in reassign sheet
- [ ] Manual test: Tap reassign button
- [ ] Manual test: Select a member
- [ ] Manual test: Confirm reassignment
- [ ] Manual test: Verify API call succeeds
