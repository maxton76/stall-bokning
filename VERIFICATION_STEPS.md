# Routine Assignment Fix - Verification Steps

## Quick Verification Guide

### 1. Owner Visibility Debugging

**Steps**:
1. Start the development server:
   ```bash
   task dev:frontend
   ```

2. Open browser and navigate to `http://localhost:5173`

3. Log in as an organization owner

4. Navigate to `/schedule/routines`

5. Click "Skapa nytt schema" (Create new schedule)

6. **Open browser console** (F12 or Cmd+Option+I)

7. Look for the console log:
   ```
   [RoutineScheduleDialog] Members loaded: {
     count: X,
     members: [...],
     organizationId: "..."
   }
   ```

8. **Verify**:
   - Check if your user ID appears in the members array
   - Check if owner has `showInPlanning: true`
   - Check if owner has `roles: ["administrator"]`

9. In the dialog, set "Tilldelningsläge" to "Manuellt" (Manual)

10. Open the "Tilldelad till" (Assigned to) dropdown

11. **Expected Result**: Owner's name should appear in the dropdown list

**If owner is missing**:
- Check Firestore console
- Navigate to `organizationMembers` collection
- Look for document with ID pattern: `{userId}_{organizationId}`
- If missing, the owner member record wasn't created during organization setup
- This would indicate a bug in organization creation (see `packages/api/src/routes/organizations.ts` lines 351-373)

### 2. Name Collision Handling - Weekly Schedule

**Setup**:
1. Create two test members with identical names:
   - Go to Organization Settings → Members
   - Invite or create member: "Anna Andersson" (anna1@example.com)
   - Invite or create member: "Anna Andersson" (anna2@example.com)

2. Create a routine schedule:
   - Go to `/schedule/routines`
   - Create a new schedule with manual assignment
   - Assign different routines to each "Anna Andersson"

**Test Weekly Schedule**:
1. Navigate to `/schedule/week`

2. Find days with routines assigned to the duplicate names

3. **Expected Result**:
   - Both members should be distinguishable
   - Format: "Anna Andersson (anna1@example.com)"
   - Format: "Anna Andersson (anna2@example.com)"

4. **Before Fix (Bug)**:
   - Both would show as "Anna A." with no way to distinguish

### 3. Name Collision Handling - Monthly Schedule

**Test Monthly Schedule**:
1. Navigate to `/schedule/month`

2. Click the "Visa tilldelade" (Show assignees) toggle button

3. Find cells with routines assigned to duplicate names

4. **Expected Result**:
   - Both members should be distinguishable
   - Format: "→ Anna Andersson (anna1@example.com)"
   - Format: "→ Anna Andersson (anna2@example.com)"

### 4. Cross-View Consistency

**Verify all views use same formatting**:

1. **Routine Schedule Dialog** (`/schedule/routines`):
   - Open dropdown for "Tilldelad till" (Assigned to)
   - ✅ Should show: "Anna Andersson (anna1@example.com)"

2. **Weekly Schedule** (`/schedule/week`):
   - Slot assignee display
   - ✅ Should show: "Anna Andersson (anna1@example.com)"

3. **Monthly Schedule** (`/schedule/month`):
   - With "Visa tilldelade" enabled
   - ✅ Should show: "→ Anna Andersson (anna1@example.com)"

### 5. Edge Cases to Test

**Single name (no duplicates)**:
- Member: "Erik Svensson" (only one person with this name)
- ✅ Expected: "Erik Svensson" (no email)

**Duplicate first names only**:
- Member: "Anna Larsson"
- Member: "Anna Svensson"
- ✅ Expected: Both show full names without email (different last names)

**Three people with same name**:
- Member: "Anna Andersson" (anna1@example.com)
- Member: "Anna Andersson" (anna2@example.com)
- Member: "Anna Andersson" (anna3@example.com)
- ✅ Expected: All three show email addresses

**Unassigned routine**:
- Routine with no assignee
- ✅ Expected: "Ej tilldelad" (Unassigned) in gray text

## Automated Testing (Optional)

Create a test file to verify the logic:

```typescript
// packages/frontend/src/utils/__tests__/memberDisplayName.test.ts
import { describe, it, expect } from 'vitest';
import { getDuplicateNames, formatMemberDisplayName } from '../memberDisplayName';

describe('memberDisplayName', () => {
  const members = [
    { firstName: 'Anna', lastName: 'Andersson', userEmail: 'anna1@example.com', userId: '1' },
    { firstName: 'Anna', lastName: 'Andersson', userEmail: 'anna2@example.com', userId: '2' },
    { firstName: 'Erik', lastName: 'Svensson', userEmail: 'erik@example.com', userId: '3' },
  ];

  it('should detect duplicate names', () => {
    const duplicates = getDuplicateNames(members);
    expect(duplicates.has('Anna Andersson')).toBe(true);
    expect(duplicates.has('Erik Svensson')).toBe(false);
  });

  it('should format unique names without email', () => {
    const duplicates = getDuplicateNames(members);
    const formatted = formatMemberDisplayName(members[2], duplicates);
    expect(formatted).toBe('Erik Svensson');
  });

  it('should format duplicate names with email', () => {
    const duplicates = getDuplicateNames(members);
    const formatted1 = formatMemberDisplayName(members[0], duplicates);
    const formatted2 = formatMemberDisplayName(members[1], duplicates);
    expect(formatted1).toBe('Anna Andersson (anna1@example.com)');
    expect(formatted2).toBe('Anna Andersson (anna2@example.com)');
  });
});
```

Run tests:
```bash
cd packages/frontend
npm run test
```

## Performance Check

Verify no performance degradation:

1. Navigate to `/schedule/week` with many routines (50+)
2. Open browser DevTools → Performance tab
3. Start recording
4. Navigate between weeks
5. Stop recording
6. **Expected**: No significant slowdown (member lookup is O(1) via Map)

## Console Cleanup

After verification is complete, remove the debug logging:

1. Open `packages/frontend/src/components/routines/RoutineScheduleDialog.tsx`

2. Remove the debug useEffect (lines ~110-124):
   ```typescript
   // Debug: Log members to verify owner is present (remove after debugging)
   useEffect(() => {
     if (members.length > 0 && open) {
       console.log('[RoutineScheduleDialog] Members loaded:', {
         count: members.length,
         members: members.map(m => ({
           userId: m.userId,
           name: `${m.firstName} ${m.lastName}`,
           email: m.userEmail,
           roles: m.roles,
           showInPlanning: m.showInPlanning,
         })),
         organizationId,
       });
     }
   }, [members, open, organizationId]);
   ```

3. Commit the cleanup as a separate commit

## Rollback Plan

If issues are found:

```bash
# Rollback all changes
git checkout HEAD~1 packages/frontend/src/hooks/useOrganizationMembers.ts
git checkout HEAD~1 packages/frontend/src/components/routines/RoutineScheduleDialog.tsx
git checkout HEAD~1 packages/frontend/src/pages/schedule/ScheduleWeekPage.tsx
git checkout HEAD~1 packages/frontend/src/pages/schedule/ScheduleMonthPage.tsx

# Rebuild
task dev:frontend
```

## Success Criteria

✅ **All checks must pass**:
1. Owner appears in routine assignment dropdown
2. Duplicate names show email addresses in weekly schedule
3. Duplicate names show email addresses in monthly schedule
4. Unique names don't show email addresses
5. Formatting is consistent across all schedule views
6. No TypeScript errors
7. No runtime errors in console
8. Build completes successfully
9. No performance degradation

## Next Steps After Verification

If all checks pass:
1. Remove debug console.log
2. Commit changes with clear message
3. Create PR for review
4. Update issue tracker
5. Consider Phase 3 improvements (optional):
   - Remove old `formatAssigneeName` utility
   - Update `SelectionWeekView.tsx` with same pattern
   - Create reusable `<MemberNameDisplay>` component
