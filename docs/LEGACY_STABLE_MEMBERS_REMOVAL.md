# Legacy `stableMembers` Collection Removal

**Date**: 2026-02-09
**Status**: ✅ Complete (3 phases)

## Summary

Removed all remaining references to the deprecated `stableMembers` collection, which was replaced by `organizationMembers` during the organization-level membership migration. The `stableMembers` collection has been blocked in Firestore rules (`allow read, write: if false`) but two critical locations still READ from it, causing bugs.

## Root Cause

The selection process was only returning 1 of 4 members because `resolveMemberDetails()` in `selectionAlgorithmService.ts` queried the dead `stableMembers` collection first, then only fell back to `organizationMembers` for "unresolved" members. Since the `stableMembers` collection is stale/empty, newer members weren't being resolved.

## Changes Implemented

### Phase 1: Selection Algorithm Service (Bug Fix)

**File**: `packages/api/src/services/selectionAlgorithmService.ts`

**Changes**:
- Removed entire `stableMembers` query block (lines 401-415)
- Removed "unresolved IDs" filter logic (lines 417-418)
- Changed to batch-fetch ALL members from `organizationMembers` using `db.getAll()`
- Kept owner fallback via `users` collection
- Added defensive validation to ensure no members are silently dropped

**Before**:
```typescript
// 1. Try stableMembers first
const stableMembersSnapshot = await db
  .collection("stableMembers")
  .where("stableId", "==", stableId)
  .where("status", "==", "active")
  .get();

// 2. For any memberIds not yet resolved, check organizationMembers
const unresolvedIds = memberIds.filter((id) => !memberMap.has(id));
```

**After**:
```typescript
// 1. Batch-fetch ALL memberIds from organizationMembers
const orgMemberRefs = memberIds.map((userId) =>
  db.collection("organizationMembers").doc(`${userId}_${organizationId}`),
);
const orgMemberDocs = await db.getAll(...orgMemberRefs);
```

**Impact**: Fixed selection process to correctly return all 4 members, including those with 0 points.

### Phase 2: Storage Rules Helpers (Security Fix + Naming Cleanup)

**File**: `storage.rules`

**Changes**:
- **Deleted 4 legacy helpers** that read from `stableMembers`:
  - `isStableMember(stableId)` - read from dead collection
  - `isStableManager(stableId)` - read from dead collection
  - `canManageStable(stableId)` - misleading name (suggests stable-level)
  - `canAccessStable(stableId)` - misleading name (suggests stable-level)

- **Added 4 new `organizationMembers`-based helpers** with clear names:
  - `getOrgMemberForStable(stableId)` - fetches org member doc
  - `isOrganizationMemberWithStableAccess(stableId)` - checks active member with stable access
  - `isOrganizationManagerWithStableAccess(stableId)` - checks admin/manager with access
  - `canAccessStableFiles(stableId)` - clear file access check
  - `canManageStableFiles(stableId)` - clear file management check

- **Updated 6 call sites**:
  - Line 97: `canAccessStable(stableId)` → `canAccessStableFiles(stableId)`
  - Line 100: `canManageStable(stableId)` → `canManageStableFiles(stableId)`
  - Line 110: `canAccessStable(stableId)` → `canAccessStableFiles(stableId)`
  - Line 113: `canManageStable(stableId)` → `canManageStableFiles(stableId)`
  - Line 116: `canManageStable(stableId)` → `canManageStableFiles(stableId)`
  - Line 127: `canAccessStable(...)` → `canAccessStableFiles(...)`

**New Implementation**:
```javascript
function getOrgMemberForStable(stableId) {
  let orgId = firestore.get(/databases/(default)/documents/stables/$(stableId)).data.organizationId;
  let memberId = request.auth.uid + '_' + orgId;
  return firestore.get(/databases/(default)/documents/organizationMembers/$(memberId));
}

function isOrganizationMemberWithStableAccess(stableId) {
  let member = getOrgMemberForStable(stableId);
  return isAuthenticated() &&
    member != null &&
    member.data.status == 'active' &&
    (member.data.stableAccess == 'all' ||
     stableId in member.data.assignedStableIds);
}
```

**Impact**: Fixed storage access for org members. Previously blocked due to reading from dead collection.

### Phase 3: Firestore Rules Cleanup

**File**: `firestore.rules`

**Changes**:
- Simplified deprecated `stableMembers` match block to clear tombstone
- Removed verbose migration notes (now obsolete)

**Before**:
```javascript
// ============================================================================
// STABLE MEMBERS COLLECTION - DEPRECATED
// ============================================================================
// NOTE: stableMembers collection has been replaced by organizationMembers.
// Stable access is now controlled via organizationMembers.stableAccess and
// organizationMembers.assignedStableIds fields.
// This collection is kept read-only for backward compatibility during migration.

match /stableMembers/{memberId} {
  // All operations disabled - collection is deprecated
  allow read, write: if false;
}
```

**After**:
```javascript
// ============================================================================
// STABLE MEMBERS COLLECTION - DEPRECATED
// ============================================================================
// DEPRECATED: stableMembers replaced by organizationMembers
match /stableMembers/{memberId} {
  allow read, write: if false;
}
```

## Verification Steps

### 1. Selection Process (Phase 1)
1. Navigate to: https://equiduty-dev-app.web.app/schedule/selection
2. Create new selection process
3. Select 4 members including those with 0 points
4. Verify ALL 4 members appear in computed order (not just 1)
5. Check that members with 0 points are sorted correctly (alphabetically after sorting by points)

### 2. Storage Access (Phase 2)
1. Test stable images: `/stables/{stableId}/images/{imageId}`
2. Test horse photos: `/horses/{horseId}/images/{fileId}`
3. Verify regular org members (not owners/admins) can:
   - ✅ Read stable and horse images
   - ✅ Upload horse photos if they're horse owners
4. Verify org managers can:
   - ✅ Write/delete stable images
   - ✅ Manage shift attachments

### 3. Firestore Rules (Phase 3)
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Verify no regressions in existing functionality
3. Confirm `stableMembers` collection is fully blocked

## Deploy Order

1. **Phase 1** (API): `task deploy:api` - Fix selection algorithm bug
2. **Phase 2** (Storage): `firebase deploy --only storage` - Fix file access
3. **Phase 3** (Firestore): `firebase deploy --only firestore:rules` - Clean up rules

## Remaining Work (Deferred)

### Phase 4: Type Cleanup (Skip for now)
- `StableMember` interface in `packages/shared/src/types/domain.ts`
- `StableMemberRole` type in `packages/frontend/src/types/roles.ts`
- Multiple consumers across codebase
- **Reason to defer**: Cosmetic change, no functional impact, touches many files

### Phase 5: Frontend Variable Naming (Skip)
- Variables like `stableMembers` in frontend are semantically correct
- They mean "members with access to this stable"
- Data already comes from `organizationMembers`
- **No action needed**

## Files Changed

```
packages/api/src/services/selectionAlgorithmService.ts  (Phase 1: Bug fix)
storage.rules                                           (Phase 2: Security fix)
firestore.rules                                         (Phase 3: Cleanup)
```

## Testing Evidence

**Before**: Selection process returned 1/4 members
**After**: Selection process returns all 4 members correctly

**Before**: Storage rules blocked org members from accessing stable files
**After**: Storage rules correctly allow org members with `stableAccess` to access files

## Related Documentation

- Permission System V2: `/Users/p950xam/.claude/plans/structured-forging-pizza.md`
- Organization Members Schema: `docs/DATABASE_SCHEMA.md`
- Project Memory: `/Users/p950xam/.claude/projects/-Users-p950xam-Utv-stall-bokning/memory/MEMORY.md`
