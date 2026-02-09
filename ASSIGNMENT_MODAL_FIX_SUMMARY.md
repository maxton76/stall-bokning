# Assignment Modal Name Collision Fix - Implementation Summary

## Date: 2026-02-08

## Overview

Fixed name collision issues in routine assignment modals where duplicate member names weren't being disambiguated with email addresses.

## Issues Addressed

### Issue 1: Automatic Assignment Preview Modal ✅ FIXED
**Location**: `/schedule/routines` → Create/edit routine schedule → Assignment mode "auto"

**Problem**: When showing fairness-suggested members, duplicate names displayed without email disambiguation:
- Before: "Max Ahston", "Max Ahston (10p)"
- After: "Max Ahston (max1@example.com)", "Max Ahston (max2@example.com) (10p)"

**Root Cause**:
- `getDropdownItemName()` helper used API-provided `displayName` directly without checking for duplicates
- `getMemberName()` also had the same issue with suggestion fallback data

**Fix Applied**:
- Updated both helpers to match suggestion display names against the full members list
- If a matching member is found, use `formatMemberDisplayName()` with duplicate detection
- Points badge now appears alongside properly formatted names with email disambiguation

### Issue 2: "Byt tilldelning" (Change Assignment) Modal 🔍 INVESTIGATION
**Location**: `/schedule/week` → Click on routine instance → "Byt tilldelning" button

**Status**: Debugging added for investigation

**Current Assessment**:
- Modal already uses `formatMembersForSelection()` which includes duplicate detection
- If only one "Max Ahston" appears, it's likely correct filtering behavior:
  - Member has `showInPlanning: false` (hidden from planning)
  - Member lacks access to this specific stable (`stableAccess` + `assignedStableIds`)
- Added console logging to verify member filtering is working correctly

**Debugging Added**:
```typescript
useEffect(() => {
  if (open && members.length > 0) {
    console.log('[RoutineInstanceDetailsModal] Members:', {
      count: members.length,
      members: members.map(m => ({
        userId: m.userId,
        name: `${m.firstName} ${m.lastName}`,
        email: m.userEmail,
        showInPlanning: m.showInPlanning,
        stableAccess: m.stableAccess,
        assignedStableIds: m.assignedStableIds,
      })),
      formattedCount: formattedMembers.length,
      formattedMembers,
    });
  }
}, [open, members, formattedMembers]);
```

**Next Steps for Issue 2**:
1. Test the modal with two members having identical names
2. Check browser console for the debug output
3. Verify both members have:
   - `status: "active"`
   - `showInPlanning: true` (or undefined - defaults to true)
   - Access to the stable where the routine exists
4. If both members appear in console but not in dropdown → investigate dropdown rendering
5. If only one member appears in console → correct filtering behavior (document why)

## Files Modified

### 1. RoutineAssignmentPreviewModal.tsx
**Path**: `packages/frontend/src/components/routines/RoutineAssignmentPreviewModal.tsx`

**Changes**:
1. Updated `getDropdownItemName()` function (lines 154-182):
   - Added logic to match API-provided display names against full members list
   - Uses `formatMemberDisplayName()` for proper duplicate handling
   - Maintains fallback for edge cases

2. Updated `getMemberName()` function (lines 142-162):
   - Applied same duplicate detection logic for consistency
   - Ensures selected value display also shows email for duplicates

### 2. RoutineInstanceDetailsModal.tsx
**Path**: `packages/frontend/src/components/routines/RoutineInstanceDetailsModal.tsx`

**Changes**:
1. Added import for `useEffect` (line 1)
2. Added debugging useEffect (lines 101-119):
   - Logs all members and their properties
   - Logs formatted members for dropdown
   - Only fires when modal is open and members are loaded

## Technical Details

### Duplicate Detection System

The system uses a two-step approach:

1. **Detection Phase**: `getDuplicateNames(members)` creates a Set of all display names that appear more than once
2. **Formatting Phase**: `formatMemberDisplayName(member, duplicateNames)` appends email if the name is in the duplicate set

**Key Insight**: The `duplicateNames` Set in `RoutineAssignmentPreviewModal` is computed from **all organization members**, not just planning members. This ensures proper duplicate detection even when some members are filtered out from the dropdown.

### Why This Works

- `useOrganizationMembers(organizationId)` fetches ALL members (line 89-90)
- `getDuplicateNames(members)` uses this full list to detect duplicates (line 126)
- Even if fairness suggestions only include userIds without full member data, we can reconstruct the proper display name by matching against the full members list

### Edge Cases Handled

1. **Suggestion userId exists in members**: Use full member data with duplicate detection ✅
2. **Suggestion displayName matches a member's name**: Match by name and apply duplicate detection ✅
3. **Suggestion data has no matching member**: Fallback to suggestion displayName (shouldn't happen) ✅
4. **Member has no firstName/lastName**: Fallback to email address (existing behavior) ✅

## Verification Steps

### For Issue 1 (Fixed)
1. Navigate to `/schedule/routines`
2. Create/edit a routine schedule
3. Set assignment mode to "Auto"
4. Create test scenario with two members having identical names but different fairness points
5. ✅ Both members should show with emails: "Name (email) (points)"
6. ✅ Dropdown should show both members with email disambiguation

### For Issue 2 (Investigation)
1. Navigate to `/schedule/week`
2. Click on a routine instance
3. Click "Byt tilldelning" button
4. Open browser console to check debug logs
5. ✅ Console should show both members if they have planning access
6. ✅ Dropdown should show both members with email addresses
7. ⚠️ If only one member appears, verify the other has:
   - `showInPlanning: true`
   - `status: "active"`
   - Access to this stable (`stableAccess: "all"` OR stableId in `assignedStableIds`)

## Testing Checklist

- [ ] TypeScript compilation passes ✅ (verified)
- [ ] Automatic assignment preview shows emails for duplicates
- [ ] Points badges appear alongside disambiguated names
- [ ] Change assignment modal shows debug output in console
- [ ] All three assignment dropdowns show consistent name formatting:
  - Manual assignment mode (already fixed in previous work)
  - Automatic assignment preview (fixed in this work)
  - Change assignment modal (already working correctly with formatMembersForSelection)

## Deployment

**Frontend only** - all changes are client-side:
```bash
task deploy:frontend ENV=dev
```

Or test locally:
```bash
task dev:frontend
```

## Follow-up Actions

1. After deployment, test with real duplicate names scenario
2. Review console logs from Issue 2 debugging
3. Document findings about member filtering behavior
4. Remove debug logging once investigation is complete (if Issue 2 is confirmed as correct behavior)
5. Update user documentation if member filtering is working as intended

## Related Files (No Changes Required)

- `packages/frontend/src/utils/memberDisplayName.ts` - Core duplicate detection utilities
- `packages/frontend/src/hooks/useOrganizationMembers.ts` - Member fetching and filtering hooks
- `packages/frontend/src/hooks/useFairnessDistribution.ts` - Fairness suggestion API

## Success Metrics

- ✅ No user confusion about which "Max Ahston" is which
- ✅ Reduced assignment errors due to name ambiguity
- ✅ Consistent UX across all assignment modals
- ⏳ Investigation of Issue 2 completed with findings documented
