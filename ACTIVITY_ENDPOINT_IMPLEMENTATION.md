# Activity Detail Endpoint Implementation

## Summary

✅ **COMPLETED** - Added `GET /api/v1/activities/:id` endpoint to fix 404 errors in iOS/Android apps when viewing activity details.

## What Was Fixed

**Problem**: iOS app crashed with 404 error when users tapped on activities to view details:
```
❌ 404 https://dev-api-service-auky5oec3a-ew.a.run.app/api/v1/activities/dtVEykwjH9wlVhN7dJie
API Error: Route GET /api/v1/activities/dtVEykwjH9wlVhN7dJie not found (status: 404)
```

**Solution**: Added missing endpoint to retrieve single activity by ID.

## Implementation Details

### Endpoint Specification

**Route**: `GET /api/v1/activities/:id`

**Authentication**: Required (JWT token via Firebase Auth)

**Permission Check**: User must have access to the stable associated with the activity

**Response**:
- **200**: Activity details with ISO 8601 timestamps
- **403**: Forbidden (no access to stable)
- **404**: Activity not found
- **500**: Internal server error

### Code Changes

**File**: `packages/api/src/routes/activities.ts`

**Location**: Lines 184-250 (added at the beginning of routes, before `/horse/:horseId`)

**Key Features**:
- ✅ Fetches activity from Firestore `activities` collection
- ✅ Validates user authentication via middleware
- ✅ Checks stable access permissions using `hasStableAccess()`
- ✅ System admins bypass permission checks
- ✅ Returns serialized timestamps (ISO 8601 format)
- ✅ Proper error handling with meaningful messages

### Security

- Authentication required via `authenticate` middleware
- Permission check ensures user has access to the activity's stable
- System admins have full access
- Activities without `stableId` are denied (except for system admins)

## Deployment Status

✅ **Deployed to dev**: 2026-02-13 17:28 UTC

**Service URL**: https://dev-api-service-auky5oec3a-ew.a.run.app

**Revision**: dev-api-service-00097-hcv

## Testing

### Prerequisites
- Valid Firebase Auth JWT token (from iOS/Android app or Firebase Auth)
- User must have access to the stable associated with the activity

### Test Endpoint

```bash
# Replace <JWT_TOKEN> with valid Firebase Auth token
curl https://dev-api-service-auky5oec3a-ew.a.run.app/api/v1/activities/dtVEykwjH9wlVhN7dJie \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

### Expected Response (200 OK)

```json
{
  "id": "dtVEykwjH9wlVhN7dJie",
  "type": "activity",
  "stableId": "...",
  "stableName": "...",
  "horseId": "...",
  "horseName": "...",
  "date": "2026-02-13T08:00:00.000Z",
  "activityType": "...",
  "status": "pending",
  "createdAt": "2026-02-10T12:00:00.000Z",
  "createdBy": "...",
  "lastModifiedAt": "2026-02-10T12:00:00.000Z",
  "lastModifiedBy": "...",
  ...
}
```

### iOS App Testing

1. **Open EquiDuty iOS app** (connected to dev environment)
2. **Navigate to Today view** - should show activity list
3. **Tap on any activity card** - should navigate to detail view
4. **Verify**:
   - ✅ Activity details load correctly
   - ✅ No 404 errors in console
   - ✅ All timestamps display properly
   - ✅ Activity information is complete

### Android App Testing

If Android app has similar functionality:
1. Open EquiDuty Android app (dev environment)
2. Navigate to activity list
3. Tap on activity to view details
4. Verify no errors and data loads correctly

## Verification Checklist

- ✅ Endpoint added to `activities.ts`
- ✅ Authentication middleware configured
- ✅ Permission checks implemented
- ✅ Timestamps serialized to ISO 8601
- ✅ Error handling for 404, 403, 500
- ✅ Code deployed to dev environment
- ✅ Cloud Run service running successfully
- ⏳ iOS app testing (pending user verification)
- ⏳ Android app testing (if applicable)

## Related Files

- **Implementation**: `packages/api/src/routes/activities.ts` (lines 184-250)
- **Authorization**: `packages/api/src/utils/authorization.ts` (`hasStableAccess()`)
- **Serialization**: `packages/api/src/utils/serialization.ts` (`serializeTimestamps()`)
- **Authentication**: `packages/api/src/middleware/auth.ts` (`authenticate`)

## Next Steps

1. **Test with iOS app** - Verify activity details view works without 404 errors
2. **Test with Android app** - If it has similar functionality
3. **Monitor logs** - Check Cloud Run logs for any errors or issues
4. **Consider staging/prod** - Deploy to staging/production once verified

## Monitoring

Check logs for activity detail requests:

```bash
# View recent activity endpoint logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=dev-api-service AND textPayload=~\"GET /api/v1/activities/\"" \
  --limit 50 --project equiduty-dev

# Monitor for errors
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=dev-api-service AND severity>=ERROR" \
  --limit 20 --project equiduty-dev
```

## Success Criteria

- ✅ API returns 200 with complete activity data
- ✅ All timestamps are ISO 8601 strings (not Firestore Timestamp objects)
- ✅ Proper permission checks prevent unauthorized access
- ✅ 404 returned for non-existent activity IDs
- ⏳ iOS app can view activity details without errors
- ⏳ Android app also works (if applicable)
- ⏳ No new errors in Cloud Run logs

---

**Implementation Date**: 2026-02-13
**Deployed By**: Claude Code
**Status**: ✅ Deployed to dev, awaiting app testing
