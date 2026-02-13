# Photo Upload Debug Guide

## Overview

Debug logging has been added to trace where `photoUrls` are getting lost between photo upload and history display.

**Problem**: User completes routine with photo evidence, but photos don't appear in history view (shows "Inga ytterligare detaljer" instead).

**Status**: 🔄 Debug logging deployed, awaiting test data from user

## Debug Logging Points

### 1. Backend - Step Progress Update ✅
**File**: `packages/api/src/routes/routines.ts:1636-1645`
**When**: After storing horse progress with photo URLs
**Log Format**:
```json
{
  "msg": "[PHOTO DEBUG] Stored horse progress for {horseId}",
  "photoUrls": ["gs://..."],
  "photoCount": 1
}
```

### 2. Backend - History Creation ✅
**File**: `packages/api/src/routes/routines.ts:361-366`
**When**: During `createStepActivityHistory()` execution
**Log Format**:
```javascript
console.log("[PHOTO DEBUG] Creating history for horse {horseId}:", {
  horseProgressPhotoUrls: ["gs://..."],
  photoCount: 1
})
```

### 3. Backend - History Query Response ✅
**File**: `packages/api/src/routes/horse-activity-history.ts:195-207`
**When**: Before returning activity history to client
**Log Format**:
```json
{
  "msg": "[PHOTO DEBUG] Returning 5 history entries"
}
{
  "msg": "[PHOTO DEBUG] Entry 0",
  "id": "abc123",
  "category": "stable_care",
  "photoUrls": ["gs://..."],
  "photoCount": 1
}
```

### 4. iOS - API Response ✅
**File**: `EquiDuty/EquiDuty/Services/Implementations/HorseActivityHistoryService.swift:70-75`
**When**: After decoding API response
**Log Format**:
```
[PHOTO DEBUG] Received 5 activities
[PHOTO DEBUG] Activity abc123: photoUrls=1
```

## Testing Instructions

### Step 1: Run iOS App
1. Open Xcode
2. Run EquiDuty app on simulator or device
3. Ensure you're connected to dev environment

### Step 2: Complete Routine with Photo
1. Navigate to "Today" view
2. Start a routine (e.g., "Morgonrutin")
3. Upload photo during a step
4. Mark step as complete
5. **CRITICAL**: Complete the entire routine (tap "Slutför rutin")
6. Navigate to horse history view

### Step 3: Check Logs

**Cloud Run API Logs**:
```bash
task logs:api | grep "PHOTO DEBUG"
```

**Xcode Console**:
Look for lines starting with `[PHOTO DEBUG]`

## Expected Log Flow

If everything works correctly, you should see:

```
# 1. Step progress stored with photo
[API] [PHOTO DEBUG] Stored horse progress for horse_123: photoUrls=1

# 2. History created with photo
[CONSOLE] [PHOTO DEBUG] Creating history for horse horse_123: photoCount=1

# 3. API response includes photo
[API] [PHOTO DEBUG] Returning 1 history entries
[API] [PHOTO DEBUG] Entry 0: id=abc123, photoUrls=1

# 4. iOS receives photo
[iOS] [PHOTO DEBUG] Received 1 activities
[iOS] [PHOTO DEBUG] Activity abc123: photoUrls=1
```

## Diagnosis Table

| Scenario | Where Photos Lost | Next Steps |
|----------|-------------------|------------|
| Point 1 shows `photoCount=0` | iOS upload flow | Check iOS photo upload code |
| Point 1 OK, Point 2 shows `photoCount=0` | History creation | Check `createStepActivityHistory()` |
| Point 2 OK, Point 3 shows `photoCount=0` | Query/serialization | Check Firestore query and `serializeTimestamps()` |
| Point 3 OK, Point 4 shows `photoUrls=0` | iOS decoding | Check Swift model `photoUrls: [String]?` |
| All points show `photoCount=0` | iOS upload didn't store URLs | Check iOS `updateProgress()` call |

## Common Issues

### Issue 1: Photos Not Stored in Progress
**Symptom**: Point 1 shows `photoCount=0`
**Cause**: iOS didn't send `photoUrls` in update request
**Fix**: Check iOS `RoutineService.updateProgress()` call

### Issue 2: Photos Lost During History Creation
**Symptom**: Point 1 OK, Point 2 shows `photoCount=0`
**Cause**: `horseProgress?.photoUrls` is nil in history creation
**Fix**: Check `stepProgress.horseProgress?.[horse.id]` access

### Issue 3: Photos Filtered Out by Query
**Symptom**: Point 2 OK, Point 3 shows `photoCount=0` or 0 entries
**Cause**: Query filters exclude entries with photos
**Fix**: Check `routineInstanceCompleted` filter in query

### Issue 4: Photos Lost in Serialization
**Symptom**: Point 3 shows `photoCount=1` but Point 4 shows `photoUrls=0`
**Cause**: `serializeTimestamps()` doesn't preserve photoUrls array
**Fix**: Check serialization utility preserves all fields

## Related Files

### Backend
- `packages/api/src/routes/routines.ts` - Step progress and history creation
- `packages/api/src/routes/horse-activity-history.ts` - History queries
- `packages/api/src/utils/serialization.ts` - Timestamp serialization

### iOS
- `EquiDuty/EquiDuty/Services/Implementations/HorseActivityHistoryService.swift` - API client
- `EquiDuty/EquiDuty/Features/Horses/HorseActivityHistoryView.swift` - History UI
- `EquiDuty/EquiDuty/Models/HorseActivityHistoryModels.swift` - Data models

## Cleanup After Debug

Once root cause is identified and fixed, remove debug logging:

1. Backend: Remove `[PHOTO DEBUG]` log statements from 3 files
2. iOS: Remove `#if DEBUG` print statements
3. Redeploy API: `task deploy:api`
4. Rebuild iOS app

## Current Status

- ✅ Debug logging added to all 4 critical points
- ✅ API deployed with debug logging (2026-02-12 21:07 CET)
- ⏳ Awaiting test data from user
- ⏳ Root cause not yet identified

## Next Steps

1. User completes routine with photo upload
2. User checks Xcode console for iOS logs
3. Developer checks Cloud Run logs: `task logs:api | grep "PHOTO DEBUG"`
4. Compare logs to diagnosis table above
5. Implement fix based on where photos are lost
6. Remove debug logging and redeploy
