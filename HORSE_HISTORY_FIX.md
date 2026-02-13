# Horse Activity History - Data Fix

## Problem

Horse activity history showing "Inga ytterligare detaljer" (No additional details) and no photos because Firestore contains incomplete historical data with only 4 fields instead of 20+.

**Incomplete record example**:
```json
{
  "id": "...",
  "horseId": "...",
  "routineInstanceId": "...",
  "category": "turnout"
}
```

**Complete record should have**:
- stepName, executedAt, executedBy, scheduledDate
- routineTemplateName, horseName, stableName
- organizationId, stableId, routineStepId
- notes, photoUrls, feedingSnapshot, etc.

## Root Cause

Early test data was created before the full `HorseActivityHistoryEntry` schema was implemented. These incomplete records passed the `routineInstanceCompleted === true` filter but lack the fields needed for display.

## Solutions

### Option 1: Clean Up Incomplete Data (Recommended)

Run the cleanup script to remove incomplete entries:

```bash
# Navigate to project root
cd /Users/p950xam/Utv/stall-bokning

# Install ts-node if not already installed
npm install -g ts-node typescript

# Run cleanup script
ts-node scripts/cleanup-incomplete-history.ts --env dev
```

**What it does**:
1. Scans all `horseActivityHistory` documents
2. Identifies entries missing required fields
3. Shows summary and waits 5 seconds for confirmation
4. Deletes incomplete entries in batches

**After cleanup**:
- Complete new routines to generate fresh, complete history entries
- History view will show full details and photos

### Option 2: Manual Firestore Cleanup

1. Open Firebase Console: https://console.firebase.google.com/project/equiduty-dev/firestore/data
2. Navigate to `horseActivityHistory` collection
3. Identify incomplete documents (only have 4-5 fields)
4. Delete them manually

### Option 3: Keep Incomplete Data (Not Recommended)

If you want to keep the incomplete data visible, you can remove the iOS safety checks, but this will show "No additional details" for all incomplete records:

```swift
// This is NOT recommended as it shows broken data
// Just documenting as an option
```

## Preventing Future Issues

The current code **already prevents this issue** for new data:

1. **Complete schema**: `createActivityHistoryEntries()` creates entries with all 20+ fields (line 49-78 in horseActivityHistoryService.ts)
2. **Proper workflow**: Entries only become visible after routine completion via `markRoutineEntriesCompleted()`
3. **iOS model**: Now has optional fields to handle edge cases gracefully

## Testing After Fix

1. **Delete incomplete data** using the script
2. **Complete a routine** with photos:
   ```
   - Start a routine
   - Add photo evidence to any step
   - Mark step complete
   - Complete entire routine
   ```
3. **View horse history**:
   ```
   - Navigate to horse detail
   - Tap "Historik" tab
   - Should see activity with camera icon
   - Tap to expand
   - Should see photo thumbnail
   - Tap photo to view full-screen
   ```

## UI Fix Applied

**Issue**: Blue edit button (FAB) was blocking the expand area of the last card.

**Fix**: Added 80pt bottom padding to ScrollView in `HorseActivityHistoryView.swift`:
```swift
.padding(.bottom, 80)  // Prevent FAB from blocking last card
```

Now the last card can be expanded without the edit button interfering.

## Files Modified

1. ✅ `EquiDuty/EquiDuty/Models/HorseActivityHistoryModels.swift` - Made fields optional
2. ✅ `EquiDuty/EquiDuty/Features/Horses/HorseActivityHistoryView.swift` - Safe unwrapping + padding fix
3. ✅ `scripts/cleanup-incomplete-history.ts` - New cleanup script

## Next Steps

1. Run cleanup script: `ts-node scripts/cleanup-incomplete-history.ts --env dev`
2. Complete a test routine with photos
3. Verify history shows full details and photos
4. If needed, run same cleanup for staging/prod environments

---

**Note**: The API code is already correct and creates complete records. The issue is only with old/incomplete test data in Firestore.
