# Security Fix: Authorization Bypass in Custom Routine Assignments

**Date**: 2026-02-08
**Severity**: Medium
**Status**: ✅ Fixed
**Category**: Authorization Bypass

## Vulnerability Summary

### Issue
The routine schedule creation endpoint accepted `customAssignments` (date-to-userId mappings) without validating that the specified user IDs were members of the target organization or had access to the target stable. This allowed authenticated attackers to assign routine instances to users from other organizations.

### Impact
- **Cross-organization assignment abuse**: Attacker could assign routines to users outside their organization
- **Data integrity violation**: Created false assignment records linking victims to unauthorized organizations
- **Minor information disclosure**: Victims could potentially see stable names and organization details
- **Privacy violation**: Unwanted task assignments to users

### Attack Scenario
1. Attacker authenticates and gains legitimate access to Organization A, Stable A
2. Attacker creates routine schedule via `POST /api/v1/routine-schedules`
3. Attacker includes malicious payload:
   ```json
   {
     "organizationId": "org-a",
     "stableId": "stable-a",
     "customAssignments": {
       "2026-03-01": "victim_user_id_from_org_b"
     }
   }
   ```
4. Backend validates attacker's access to Organization A and Stable A ✅
5. Backend does NOT validate victim user IDs ❌
6. Routine instances created with unauthorized assignments

## Fix Implementation

### Location
**File**: `packages/api/src/routes/routine-schedules.ts`
**Lines**: 249-284 (added validation)

### Solution
Added comprehensive validation for all user IDs in `customAssignments` before creating the schedule:

```typescript
// Validate customAssignments - ensure all user IDs are members with stable access
if (input.customAssignments) {
  const userIds = Object.values(input.customAssignments).filter(
    (id): id is string => id !== null,
  );

  for (const userId of userIds) {
    // Check if user is an active member of the organization
    const memberDoc = await db
      .collection("organizationMembers")
      .doc(`${userId}_${input.organizationId}`)
      .get();

    if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
      return reply.status(400).send({
        error: "Bad Request",
        message: `User ${userId} is not an active member of this organization`,
      });
    }

    // Verify the member has access to this specific stable
    const memberData = memberDoc.data();
    const hasStableAccess =
      memberData?.stableAccess === "all" ||
      (memberData?.stableAccess === "specific" &&
        memberData?.assignedStableIds?.includes(input.stableId));

    if (!hasStableAccess) {
      return reply.status(400).send({
        error: "Bad Request",
        message: `User ${userId} does not have access to this stable`,
      });
    }
  }
}
```

### Validation Logic

The fix implements two-level validation:

1. **Organization Membership Check**:
   - Verifies user ID exists in `organizationMembers` collection
   - Checks member status is "active" (not pending/suspended/removed)
   - Composite key: `${userId}_${organizationId}`

2. **Stable Access Check**:
   - Verifies member has access to the specific stable
   - Supports two access patterns:
     - `stableAccess: "all"` - Access to all stables in organization
     - `stableAccess: "specific"` - Access only to stables in `assignedStableIds` array

### Error Responses

**Invalid Organization Member** (400 Bad Request):
```json
{
  "error": "Bad Request",
  "message": "User abc123 is not an active member of this organization"
}
```

**No Stable Access** (400 Bad Request):
```json
{
  "error": "Bad Request",
  "message": "User abc123 does not have access to this stable"
}
```

## Verification Steps

### 1. Build Verification
```bash
cd packages/api && npm run build
# ✅ Build succeeded with no TypeScript errors
```

### 2. Test Valid Assignment
```bash
# Create schedule with valid member assignments
curl -X POST https://equiduty-dev-api.europe-west1.run.app/api/v1/routine-schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "my-org",
    "stableId": "my-stable",
    "templateId": "template-1",
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "repeatPattern": "daily",
    "scheduledStartTime": "09:00",
    "assignmentMode": "auto",
    "customAssignments": {
      "2026-03-01": "valid_member_user_id"
    }
  }'

# Expected: 201 Created
```

### 3. Test Invalid Assignment (Different Organization)
```bash
# Attempt to assign to user from different organization
curl -X POST https://equiduty-dev-api.europe-west1.run.app/api/v1/routine-schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "my-org",
    "stableId": "my-stable",
    "customAssignments": {
      "2026-03-01": "user_from_different_org"
    }
  }'

# Expected: 400 Bad Request
# Message: "User ... is not an active member of this organization"
```

### 4. Test Invalid Assignment (No Stable Access)
```bash
# Assign to organization member without stable access
curl -X POST https://equiduty-dev-api.europe-west1.run.app/api/v1/routine-schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "my-org",
    "stableId": "restricted-stable",
    "customAssignments": {
      "2026-03-01": "member_without_stable_access"
    }
  }'

# Expected: 400 Bad Request
# Message: "User ... does not have access to this stable"
```

## Security Improvements

### Before Fix
- ❌ No validation of user IDs in customAssignments
- ❌ Could assign to arbitrary users across organizations
- ❌ Cross-organization boundary violation
- ❌ Information disclosure risk

### After Fix
- ✅ Validates organization membership for all assigned users
- ✅ Verifies stable access permissions
- ✅ Enforces organization boundaries
- ✅ Prevents unauthorized assignments
- ✅ Returns clear error messages for debugging

## Related Files

- `packages/api/src/routes/routine-schedules.ts` - Fixed route handler
- `packages/api/src/utils/routineInstanceGenerator.ts` - Utility that uses validated IDs
- `packages/api/src/services/routineAutoAssignmentService.ts` - Auto-assignment service

## Deployment Notes

### Prerequisites
- ✅ Build verification passed
- ✅ No TypeScript errors
- ✅ Backward compatible (rejects invalid requests that should have been rejected)

### Deployment Command
```bash
task deploy:api
```

### Rollback Plan
If issues arise, revert commit and redeploy previous version:
```bash
git revert HEAD
task deploy:api
```

### Monitoring
After deployment, monitor:
- Error rate for 400 responses on `/routine-schedules` endpoint
- Logs for "not an active member" and "does not have access" messages
- Verify no legitimate users are being blocked

## Security Recommendations

### Immediate
- ✅ **COMPLETED**: Add membership validation for customAssignments

### Short-term
- [ ] Add rate limiting to schedule creation endpoint
- [ ] Implement audit logging for authorization failures
- [ ] Add integration tests for cross-organization assignment attempts

### Long-term
- [ ] Consider adding CSP headers to prevent XSS attacks
- [ ] Implement automated security scanning in CI/CD pipeline
- [ ] Add penetration testing for all assignment workflows
- [ ] Review other endpoints for similar authorization gaps

## Conclusion

This fix eliminates a medium-severity authorization bypass vulnerability that could allow authenticated attackers to assign routine instances to users outside their organization. The validation ensures that all assigned users are verified members with appropriate stable access before any routine instances are created.

**Impact**: Protects organization boundaries and prevents unauthorized work assignments across organizations.

**Risk Reduction**: Eliminates cross-organization data leakage and assignment abuse.
