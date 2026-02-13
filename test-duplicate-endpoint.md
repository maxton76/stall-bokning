# Test Duplicate Routine Template Endpoint

## Implementation Summary

✅ **Endpoint Added**: `POST /api/v1/routines/templates/:id/duplicate`

**Location**: `packages/api/src/routes/routines.ts` (after line 890)

**Features Implemented**:
1. ✅ Fetches original template by ID
2. ✅ Validates user has organization access
3. ✅ Checks subscription limits (via middleware)
4. ✅ Generates new UUIDs for all steps
5. ✅ Appends " (kopia)" to template name (Swedish for "copy")
6. ✅ Creates new template with all original properties
7. ✅ Returns serialized timestamps (ISO 8601 format)
8. ✅ Proper error handling (404, 403, 500)

**Authorization Flow**:
- Middleware: `authenticate` - Verifies JWT token
- Middleware: `checkSubscriptionLimit` - Checks subscription limits
- Logic: `hasOrganizationAccess()` - Verifies user has access to organization

**Response Codes**:
- `201 Created` - Template successfully duplicated
- `404 Not Found` - Original template doesn't exist
- `403 Forbidden` - User doesn't have access or subscription limit reached
- `500 Internal Server Error` - Server error during duplication

## Testing Instructions

### 1. Start Development Environment

```bash
# Terminal 1: Start API server
cd /Users/p950xam/Utv/stall-bokning
task dev:api
```

### 2. Get Authentication Token

```bash
# Login via web frontend or use existing token from iOS app
# For testing, you can extract the token from:
# - iOS app: Debug console logs
# - Web app: Browser localStorage (key: 'authToken')
```

### 3. Test the Endpoint

```bash
# Step 1: List templates to get a valid template ID
curl -X GET "http://localhost:5003/api/v1/routines/templates?organizationId=YOUR_ORG_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Step 2: Duplicate a template
curl -X POST "http://localhost:5003/api/v1/routines/templates/TEMPLATE_ID/duplicate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Expected response (201 Created):
# {
#   "template": {
#     "id": "NEW_TEMPLATE_ID",
#     "name": "Original Name (kopia)",
#     "organizationId": "...",
#     "stableId": "...",
#     "steps": [...],
#     "createdAt": "2026-02-13T...",
#     "createdBy": "USER_ID",
#     ...
#   }
# }
```

### 4. Test with iOS App

1. Open EquiDuty iOS app in Xcode
2. Navigate to: **Schema** → **Rutinmallar** (Routine Templates)
3. Tap **Duplicera** button on any template
4. Verify:
   - ✅ No 404 error in console
   - ✅ Success toast appears
   - ✅ Duplicated template appears in list with " (kopia)" suffix
   - ✅ Duplicated template has same icon, color, and steps as original
   - ✅ Duplicated template has new ID (different from original)

### 5. Verification Checklist

- [ ] Endpoint returns 201 for successful duplicate
- [ ] Endpoint returns 404 if template ID doesn't exist
- [ ] Endpoint returns 403 if user doesn't have organization access
- [ ] Endpoint returns 403 if subscription limit reached
- [ ] Duplicated template has new ID (different from original)
- [ ] Duplicated template has new step IDs (different from original)
- [ ] Name has " (kopia)" appended
- [ ] All other fields (type, icon, color, settings) are identical to original
- [ ] `createdAt` and `updatedAt` timestamps are set to current time
- [ ] `createdBy` is set to current user ID
- [ ] Response uses ISO 8601 timestamps (not Firestore Timestamp objects)

## Integration with iOS App

**iOS Implementation**: `EquiDuty/EquiDuty/Services/Implementations/RoutineService.swift`

The iOS app's `duplicateRoutineTemplate()` method calls:
```swift
POST /api/v1/routines/templates/{templateId}/duplicate
```

This matches the endpoint we just implemented.

## Next Steps

1. ✅ Implementation complete
2. ⏳ Manual testing (follow instructions above)
3. ⏳ Deploy to dev environment: `task deploy:api`
4. ⏳ Test with iOS app on dev environment
5. ⏳ Deploy to production after successful testing

## Deployment Command

```bash
# Deploy to dev (default)
task deploy:api

# Deploy to staging (requires clean main branch)
task deploy:api ENV=staging

# Deploy to production (requires tag)
task deploy:api ENV=prod TAG=v0.13.x
```

## Files Modified

- `packages/api/src/routes/routines.ts` - Added duplicate endpoint

## No Database Changes Required

This implementation uses the existing `routineTemplates` Firestore collection. No schema changes or migrations needed.
