# Android Routine Execution - Testing Guide

## Quick Verification Steps

### 1. Prerequisites
```bash
# Ensure app is built and running
cd EquiDuty-Android
./gradlew assembleDebug
# Install on device/emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 2. Test Daily Notes Flow
1. Navigate to Today screen
2. Tap on a scheduled routine
3. **Verify**: Daily notes acknowledgment screen appears (if notes exist)
4. **Verify**: Shows horse notes, alerts, and general notes
5. Tap "Jag har läst anteckningarna"
6. **Verify**: Proceeds to first step

### 3. Test Horse Loading
1. **Step with ALL horses**:
   - **Verify**: All stable horses appear
   - **Verify**: Horse names and groups display
   - **Verify**: Special instructions show if available

2. **Step with SPECIFIC horses**:
   - **Verify**: Only filtered horses appear
   - **Verify**: Correct horses based on horseFilter

3. **Step with NO horses**:
   - **Verify**: No horse cards shown
   - **Verify**: General notes input prominent

### 4. Test Horse Card Interactions
1. **Tap horse card** to expand
   - **Verify**: Card expands with animation
   - **Verify**: Notes input appears
   - **Verify**: Action buttons appear

2. **Add notes** in text field
   - **Verify**: Text saves automatically
   - **Verify**: Notes persist when collapsing/expanding

3. **Tap "Klar" button**
   - **Verify**: Badge changes to green checkmark
   - **Verify**: Button disables
   - **Verify**: Progress bar updates

4. **Tap "Hoppa över"**
   - **Verify**: Dialog appears with reason input
   - **Verify**: Must enter reason to confirm
   - **Verify**: Badge changes to red X
   - **Verify**: Progress updates

### 5. Test Step-Specific Features

#### Feeding Step
1. Find step with `showFeeding=true`
2. **Verify**: Feeding section appears (orange/secondary)
3. **Verify**: Shows "Utfodring" header with restaurant icon
4. Tap feeding checkbox
5. **Verify**: Checkbox state persists

#### Medication Step
1. Find step with `showMedication=true`
2. **Verify**: Medication section appears (purple/tertiary)
3. **Verify**: Shows "Medicinering" header with medication icon
4. Tap "Given" button
5. **Verify**: Button disables after click
6. Tap "Hoppa över" button
7. **Verify**: Dialog requires reason
8. **Verify**: State saves correctly

#### Blanket Step
1. Find step with `showBlanketStatus=true`
2. **Verify**: Blanket section appears
3. **Verify**: Shows three chips: "Ta på", "Ta av", "Oförändrat"
4. Select each chip
5. **Verify**: Only one selected at a time
6. **Verify**: Selection persists

### 6. Test Validation

#### Cannot Advance with Unmarked Horses
1. Leave at least one horse unmarked
2. Tap "Nästa steg" button
3. **Verify**: Alert dialog appears
4. **Verify**: Shows count of unmarked horses
5. **Verify**: Offers "Markera alla som klara" option

#### Mark All Done
1. Tap "Markera alla som klara" in alert
2. **Verify**: All unmarked horses get green checkmarks
3. **Verify**: Progress shows 100%
4. **Verify**: Advances to next step

#### Allow Partial Completion
1. Find step with `allowPartialCompletion=true`
2. Leave horses unmarked
3. Tap "Nästa steg"
4. **Verify**: Advances without validation alert

### 7. Test Progress Tracking

#### Step Progress
1. **Verify**: Shows "Steg X av Y"
2. **Verify**: Linear progress bar updates correctly
3. Complete horses one by one
4. **Verify**: Progress updates after each completion

#### Horse Progress
1. **Verify**: Shows "N av M hästar klara"
2. **Verify**: Progress bar color-coded correctly
3. **Verify**: Updates live as horses marked

#### Timer
1. **Verify**: Timer appears next to step name
2. **Verify**: Shows elapsed time (M:SS format)
3. **Verify**: Shows estimated duration if available
4. Wait 60 seconds
5. **Verify**: Timer updates to 1:00

### 8. Test General Notes
1. Scroll to bottom of horse list
2. **Verify**: "Allmänna anteckningar" card appears
3. Add notes in text field
4. Tap "Nästa steg"
5. **Verify**: Notes sent to API (check network logs)

### 9. Test Step Completion
1. Mark all horses as done/skipped
2. Add general notes
3. Tap "Nästa steg"
4. **Verify**: Advances to next step
5. **Verify**: Previous step data persists in instance

### 10. Test Routine Completion
1. Complete all steps
2. **Verify**: Button text changes to "Slutför rutin"
3. Tap button
4. **Verify**: Shows "Slutför rutin..." loading state
5. **Verify**: Shows success screen with checkmark
6. **Verify**: "Rutin slutförd!" message
7. Tap "Tillbaka till rutiner"
8. **Verify**: Returns to today screen

## Edge Cases to Test

### Empty States
- [ ] Routine with no steps
- [ ] Step with no horses (NONE context)
- [ ] Stable with no horses (empty list)

### Error Handling
- [ ] Network error during horse loading
- [ ] Network error during step completion
- [ ] API error responses
- [ ] Timeout scenarios

### State Persistence
- [ ] Rotate device during execution
- [ ] Minimize app and return
- [ ] Kill app and restart (should resume if needed)

### Performance
- [ ] Routine with 20+ horses in one step
- [ ] Rapid expand/collapse of cards
- [ ] Fast scrolling through horse list
- [ ] Multiple notes updates quickly

## API Verification

### Check Network Logs
```bash
# Enable Charles Proxy or similar
# Verify these requests:

# 1. Get Routine Instance
GET /api/v1/routine-instances/{instanceId}

# 2. Start Instance (first time)
POST /api/v1/routine-instances/{instanceId}/start
Body: { "dailyNotesAcknowledged": true }

# 3. Update Step Progress
PUT /api/v1/routine-instances/{instanceId}/progress
Body: {
  "stepId": "...",
  "generalNotes": "...",
  "photoUrls": [],
  "horseUpdates": [
    {
      "horseId": "...",
      "horseName": "...",
      "completed": true,
      "notes": "...",
      "feedingConfirmed": true,
      "medicationGiven": true,
      "blanketAction": "on"
    }
  ]
}

# 4. Complete Instance
POST /api/v1/routine-instances/{instanceId}/complete
```

### Verify Response Data
- [ ] Horse progress includes all fields
- [ ] Step status updates correctly
- [ ] Instance progress percentage correct
- [ ] Completed steps have proper timestamps

## Common Issues & Solutions

### Issue: Horses Don't Load
**Check**:
- Network connectivity
- Stable ID in auth context
- HorseRepository.fetchHorses called
- horseContext in step data

### Issue: Progress Not Saving
**Check**:
- horseProgressMap updates in ViewModel
- completeCurrentStep sends progress
- API request body format
- Network logs for errors

### Issue: Validation Always Blocks
**Check**:
- canProceed() logic
- allowPartialCompletion flag
- Horse completion states
- Progress map correctness

### Issue: Timer Doesn't Update
**Check**:
- LaunchedEffect running
- Coroutine not cancelled
- UI recomposition
- estimatedMinutes data

### Issue: Feature Sections Missing
**Check**:
- showFeeding/showMedication/showBlanketStatus flags in step
- Callback props passed correctly
- ViewModel methods exist
- Card expanded state

## Success Criteria

### Must Pass
- ✅ All horses load correctly
- ✅ Can mark horses done/skipped
- ✅ Notes save per horse
- ✅ Step-specific features work
- ✅ Validation prevents bad completion
- ✅ Progress tracks correctly
- ✅ API receives all data
- ✅ Routine completes successfully

### Should Pass
- ✅ Smooth animations
- ✅ Fast response times
- ✅ No UI glitches
- ✅ Clear status indicators
- ✅ Intuitive interactions

### Nice to Have
- ⏳ Photo upload works
- ⏳ Offline queue works
- ⏳ Previous step navigation
- ⏳ Step overview menu

## Reporting Issues

When reporting bugs, include:
1. **Device**: Model, OS version
2. **Steps to Reproduce**: Exact sequence
3. **Expected**: What should happen
4. **Actual**: What actually happens
5. **Logs**: Logcat output, network logs
6. **Screenshots**: Visual evidence
7. **Data**: Routine ID, step data

## Next Testing Phase

After basic verification:
1. Beta test with real users
2. Monitor crash reports (Firebase Crashlytics)
3. Collect user feedback
4. Measure performance metrics
5. Iterate based on findings
