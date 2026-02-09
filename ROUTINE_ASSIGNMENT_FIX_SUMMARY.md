# Routine Assignment Fix Summary

**Date**: 2026-02-08
**Issue**: Missing owner in routine assignment dropdown + Name collision handling inconsistency

## Changes Made

### Phase 1: Owner Visibility Investigation

**Files Modified**:
- `packages/frontend/src/hooks/useOrganizationMembers.ts`
- `packages/frontend/src/components/routines/RoutineScheduleDialog.tsx`

**Changes**:
1. Added debugging console.log to `RoutineScheduleDialog` to verify owner presence in members list
2. Added documentation comment in `useOrganizationMembers` explaining expected behavior
3. The owner SHOULD already be in the list (created during organization creation at `packages/api/src/routes/organizations.ts` lines 351-373)

**Next Steps for Debugging**:
1. Open browser console
2. Navigate to `/schedule/routines`
3. Click "Skapa nytt schema" (Create new schedule)
4. Check console output for `[RoutineScheduleDialog] Members loaded:` log
5. Verify if owner's userId appears in the members array
6. If owner is missing, check Firestore `organizationMembers` collection for document with ID pattern: `{userId}_{organizationId}`

### Phase 2: Name Collision Handling

**Problem**: Weekly and monthly schedule views didn't show email addresses when multiple members had the same name (e.g., two "Anna Andersson"), unlike the routine dialog which correctly handles this case.

**Files Modified**:
- `packages/frontend/src/pages/schedule/ScheduleWeekPage.tsx`
- `packages/frontend/src/pages/schedule/ScheduleMonthPage.tsx`

**Implementation**:

#### ScheduleWeekPage.tsx
1. **Imports Added**:
   - `useMemo` from React
   - `useOrganization` context
   - `useOrganizationMembers` hook
   - `getDuplicateNames`, `formatMemberDisplayName` utilities

2. **New State/Data**:
   - Fetch `currentOrganizationId` from organization context
   - Fetch `members` via `useOrganizationMembers(currentOrganizationId)`
   - Compute `duplicateNames` set via `getDuplicateNames(members)`
   - Create `memberMap` for O(1) member lookup by userId

3. **New Helper Function**:
   ```typescript
   const formatSlotAssigneeName = (slot: ScheduleSlot): string => {
     if (!slot.assigneeId) return "";
     const member = memberMap.get(slot.assigneeId);
     if (member) {
       return formatMemberDisplayName(member, duplicateNames);
     }
     return slot.assignee || "";
   };
   ```

4. **Updated Usage**:
   - Changed condition from `slot.assignee` to `slot.assigneeId` (more reliable)
   - Replaced `formatAssigneeName(slot.assignee)` with `formatSlotAssigneeName(slot)`

#### ScheduleMonthPage.tsx
1. **Same imports and state as ScheduleWeekPage**

2. **New Helper Function**:
   ```typescript
   const formatRoutineAssigneeName = (routine: RoutineInstance): string => {
     if (!routine.assignedTo) return "";
     const member = memberMap.get(routine.assignedTo);
     if (member) {
       return formatMemberDisplayName(member, duplicateNames);
     }
     return routine.assignedToName || "";
   };
   ```

3. **Updated Usage**:
   - Changed condition from `routine.assignedToName` to `routine.assignedTo` (userId)
   - Replaced `formatAssigneeName(routine.assignedToName)` with `formatRoutineAssigneeName(routine)`

## How It Works

### Duplicate Detection Algorithm
1. `getDuplicateNames(members)` creates a Set of names that appear more than once
2. When formatting, if a name is in the duplicate set, email is appended: `"Anna Andersson (anna@example.com)"`
3. Otherwise, just the name is shown: `"Erik Svensson"`

### Member Lookup
- Uses `assigneeId` (userId) to lookup member from `memberMap`
- This is more reliable than matching by name (which could be ambiguous)
- Falls back to stored `assignee`/`assignedToName` if member not found

## Benefits

✅ **Consistent UX**: All schedule views now use the same name formatting logic
✅ **Disambiguation**: Users can distinguish between members with identical names
✅ **Reliable**: Uses userId-based lookup instead of fragile name matching
✅ **Reusable**: Leverages existing utilities from `@/utils/memberDisplayName`

## Testing Checklist

### Issue 1 - Owner Presence
- [ ] Log in as organization owner
- [ ] Navigate to `/schedule/routines`
- [ ] Click "Skapa nytt schema"
- [ ] Check console for members log
- [ ] Verify owner appears in dropdown when assignmentMode is "manual"
- [ ] Verify owner can be selected as default assignee

### Issue 2 - Name Collision Handling
- [ ] Create two test members with identical names (e.g., both "Anna Andersson")
- [ ] Assign routines to both members in a routine schedule
- [ ] Navigate to `/schedule/week`
- [ ] Verify both members are distinguishable (email shown in parentheses)
- [ ] Navigate to `/schedule/month`
- [ ] Toggle "Visa tilldelade" (Show assignees)
- [ ] Verify both members are distinguishable in month view
- [ ] Click on a routine to verify correct assignee with email disambiguation

### Cross-View Consistency
- [ ] Check member names in:
  - Routine schedule dialog dropdowns
  - Weekly schedule view
  - Monthly calendar view (with assignees enabled)
- [ ] Verify all locations use consistent formatting
- [ ] Verify all locations show email when names are duplicates

## Files Changed

```
packages/frontend/src/hooks/useOrganizationMembers.ts
packages/frontend/src/components/routines/RoutineScheduleDialog.tsx
packages/frontend/src/pages/schedule/ScheduleWeekPage.tsx
packages/frontend/src/pages/schedule/ScheduleMonthPage.tsx
```

## Rollback Instructions

If issues arise, revert the changes to the 4 files listed above using:

```bash
git checkout HEAD~1 packages/frontend/src/hooks/useOrganizationMembers.ts
git checkout HEAD~1 packages/frontend/src/components/routines/RoutineScheduleDialog.tsx
git checkout HEAD~1 packages/frontend/src/pages/schedule/ScheduleWeekPage.tsx
git checkout HEAD~1 packages/frontend/src/pages/schedule/ScheduleMonthPage.tsx
```

## Future Improvements (Optional)

1. **Remove `formatAssigneeName` utility**: Once verified working, the old `formatAssigneeName` function in `@/utils/formatName` can be deprecated
2. **Audit other uses**: Check `SelectionWeekView.tsx` which also uses `formatAssigneeName` and may benefit from the same pattern
3. **Create reusable component**: Consider creating a `<MemberNameDisplay>` component to standardize member name formatting across the app
4. **Add TypeScript types**: Add explicit types for member lookup maps to improve type safety
