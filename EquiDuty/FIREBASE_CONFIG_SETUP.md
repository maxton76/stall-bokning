# Firebase Configuration Setup - Critical Fix

## Problem

The app crashes on launch with:
```
Could not locate configuration file: 'GoogleService-Info.plist'
```

This happens because Firebase expects a file named `GoogleService-Info.plist` (without environment suffix), but we have three environment-specific files:
- `GoogleService-Info-Dev.plist`
- `GoogleService-Info-Staging.plist`
- `GoogleService-Info-Production.plist`

## Solution

Add a **Build Phase script** that automatically copies the correct Firebase config file based on the build configuration.

## Implementation Steps

### Step 1: Open Xcode Project

```bash
open /Users/p950xam/Utv/stall-bokning/EquiDuty/EquiDuty.xcodeproj
```

### Step 2: Add Build Phase Script

1. In Xcode, select the **EquiDuty** project in the Navigator (left sidebar)
2. Select the **EquiDuty** target (under TARGETS)
3. Click the **"Build Phases"** tab at the top
4. Click the **"+"** button (top-left of Build Phases section)
5. Select **"New Run Script Phase"**

### Step 3: Configure the Script

A new "Run Script" phase will appear at the bottom. Configure it:

1. **Rename** the phase (double-click "Run Script"):
   - New name: `Copy Firebase Config`

2. **Drag** the script phase to run **BEFORE** "Copy Bundle Resources"
   - This ensures Firebase config is copied before the app bundle is finalized
   - Order should be:
     - Dependencies
     - Compile Sources
     - **Copy Firebase Config** ← Your new script
     - Copy Bundle Resources
     - Embed Frameworks

3. **Paste** this script in the script text area:

```bash
#!/bin/bash

# Script to copy the correct GoogleService-Info.plist based on build configuration

set -e

echo "🔵 Copy Firebase Config Script"
echo "Configuration: ${CONFIGURATION}"
echo "Target Name: ${TARGET_NAME}"

# Determine which plist file to copy based on configuration
if [[ "${CONFIGURATION}" == *"dev"* ]]; then
    PLIST_NAME="GoogleService-Info-Dev.plist"
    ENV_NAME="Development"
elif [[ "${CONFIGURATION}" == *"staging"* ]]; then
    PLIST_NAME="GoogleService-Info-Staging.plist"
    ENV_NAME="Staging"
elif [[ "${CONFIGURATION}" == *"prod"* ]]; then
    PLIST_NAME="GoogleService-Info-Production.plist"
    ENV_NAME="Production"
else
    echo "❌ Error: Unknown configuration '${CONFIGURATION}'"
    exit 1
fi

# Source and destination paths
SOURCE_PATH="${PROJECT_DIR}/${TARGET_NAME}/Configuration/Firebase/${PLIST_NAME}"
DEST_PATH="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/GoogleService-Info.plist"

# Verify source file exists
if [ ! -f "${SOURCE_PATH}" ]; then
    echo "❌ Error: Source file not found at ${SOURCE_PATH}"
    exit 1
fi

# Copy and rename the file
echo "📋 Copying ${PLIST_NAME}"
echo "   From: ${SOURCE_PATH}"
echo "   To:   ${DEST_PATH}"

cp "${SOURCE_PATH}" "${DEST_PATH}"

if [ -f "${DEST_PATH}" ]; then
    echo "✅ Successfully copied Firebase config for ${ENV_NAME} environment"
else
    echo "❌ Error: Failed to copy Firebase config"
    exit 1
fi
```

4. **Expand** "Input Files" (click the disclosure triangle)
   - Add these three input files:
   ```
   $(PROJECT_DIR)/$(TARGET_NAME)/Configuration/Firebase/GoogleService-Info-Dev.plist
   $(PROJECT_DIR)/$(TARGET_NAME)/Configuration/Firebase/GoogleService-Info-Staging.plist
   $(PROJECT_DIR)/$(TARGET_NAME)/Configuration/Firebase/GoogleService-Info-Production.plist
   ```

5. **Expand** "Output Files" (click the disclosure triangle)
   - Add this output file:
   ```
   $(BUILT_PRODUCTS_DIR)/$(PRODUCT_NAME).app/GoogleService-Info.plist
   ```

### Step 4: Remove GoogleService-Info Files from Copy Bundle Resources

**Important**: Make sure the environment-specific Firebase files are NOT in "Copy Bundle Resources":

1. Still in **Build Phases** tab
2. Expand **"Copy Bundle Resources"**
3. Look for any files named `GoogleService-Info*.plist`
4. If found, select them and click the **"-"** button to remove
5. This prevents copying the wrong file or multiple copies

### Step 5: Verify the Setup

1. **Clean Build Folder**: Product → Clean Build Folder (or Cmd+Shift+K)
2. **Build**: Product → Build (or Cmd+B)
3. **Check Build Log**: View → Navigators → Show Report Navigator (or Cmd+9)
4. Look for your script output, should see:
   ```
   🔵 Copy Firebase Config Script
   Configuration: Debug-dev
   Target Name: EquiDuty
   📋 Copying GoogleService-Info-Dev.plist
   ✅ Successfully copied Firebase config for Development environment
   ```

### Step 6: Test Each Environment

Test all three schemes to ensure correct Firebase config is loaded:

**Test Dev:**
1. Select "EquiDuty (Dev)" scheme
2. Run (Cmd+R)
3. App should launch without Firebase error

**Test Staging:**
1. Select "EquiDuty (Staging)" scheme
2. Run (Cmd+R)
3. App should launch without Firebase error

**Test Prod:**
1. Select "EquiDuty (Prod)" scheme
2. Run (Cmd+R)
3. App should launch without Firebase error

## Verification Checklist

- [ ] Build script added to Build Phases
- [ ] Script positioned BEFORE "Copy Bundle Resources"
- [ ] Script has correct input/output files
- [ ] GoogleService-Info files removed from "Copy Bundle Resources"
- [ ] Dev build succeeds and app launches
- [ ] Staging build succeeds and app launches
- [ ] Prod build succeeds and app launches
- [ ] Build log shows correct Firebase config being copied

## Troubleshooting

### Script Fails: "Source file not found"

**Problem**: Script can't find the Firebase config files

**Solution**: Verify file paths in Finder:
```bash
ls -la /Users/p950xam/Utv/stall-bokning/EquiDuty/EquiDuty/Configuration/Firebase/
```

Should show:
- GoogleService-Info-Dev.plist
- GoogleService-Info-Staging.plist
- GoogleService-Info-Production.plist

### App Still Crashes with "Could not locate configuration file"

**Problem**: Script didn't copy the file to the app bundle

**Causes**:
1. Script not running (check build log)
2. Script running after "Copy Bundle Resources" (reorder phases)
3. Output path is wrong (verify script variables)

**Solution**:
1. Clean Build Folder (Cmd+Shift+K)
2. Build again (Cmd+B)
3. Check build log for script output
4. Verify file copied:
   ```bash
   # After building, check the app bundle
   ls -la ~/Library/Developer/Xcode/DerivedData/EquiDuty-*/Build/Products/Debug-dev-iphonesimulator/EquiDuty\ Dev.app/ | grep GoogleService
   ```
   Should show: `GoogleService-Info.plist` (without suffix)

### Wrong Firebase Project Loading

**Problem**: Dev build connects to Production Firebase

**Causes**:
1. Script logic not detecting configuration correctly
2. Wrong file being copied

**Solution**:
1. Check build log for which file is being copied
2. Verify configuration name matches script conditions:
   - Must contain "dev", "staging", or "prod"
3. Check that build configuration names are correct in project settings

## Alternative: Manual Copy (Quick Test)

If you want to quickly test without adding the script:

```bash
# For Dev environment
cp /Users/p950xam/Utv/stall-bokning/EquiDuty/EquiDuty/Configuration/Firebase/GoogleService-Info-Dev.plist \
   ~/Library/Developer/Xcode/DerivedData/EquiDuty-heslcsfjlugvmbewovamhflqmygt/Build/Products/Debug-dev-iphonesimulator/EquiDuty\ Dev.app/GoogleService-Info.plist

# Then run the app in Xcode
```

**Note**: This is temporary - you'll need to do this after every clean build. Use the Build Phase script for permanent solution.

## Expected Behavior After Fix

- ✅ App launches without Firebase error
- ✅ Dev scheme connects to `equiduty-dev` Firebase project
- ✅ Staging scheme connects to `equiduty-staging` Firebase project
- ✅ Prod scheme connects to `equiduty-prod` Firebase project
- ✅ Build log shows correct Firebase config being copied
- ✅ All three apps can coexist on device with correct Firebase backends

## Files Created

- **Script**: `/Users/p950xam/Utv/stall-bokning/EquiDuty/Scripts/copy-firebase-config.sh`
- **Guide**: This file (FIREBASE_CONFIG_SETUP.md)

## Next Steps After Setup

Once the script is working:

1. **Commit the script**:
   ```bash
   git add EquiDuty/Scripts/copy-firebase-config.sh
   git add EquiDuty/FIREBASE_CONFIG_SETUP.md
   git commit -m "feat: add Firebase config copy script for multi-environment setup"
   ```

2. **Document in CLAUDE.md**: Add note about Build Phase script requirement

3. **Update team**: If working with a team, ensure they know about this Build Phase

## Related Documentation

- SCHEME_CONFIGURATION_SUMMARY.md - Scheme setup details
- QUICK_REFERENCE_SCHEMES.md - Daily usage guide
- Environment.swift - AppEnvironment enum (renamed from Environment)
