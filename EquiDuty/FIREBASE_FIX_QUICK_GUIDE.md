# Firebase Config - Quick Fix Guide

## The Problem

```
❌ Could not locate configuration file: 'GoogleService-Info.plist'
```

## The Solution (5 Minutes)

### 1. Open Xcode
```bash
open EquiDuty.xcodeproj
```

### 2. Add Build Script

1. Select **EquiDuty** project → **EquiDuty** target → **Build Phases** tab
2. Click **"+"** → **"New Run Script Phase"**
3. Rename to: `Copy Firebase Config`
4. **Drag script BEFORE "Copy Bundle Resources"**
5. Paste this script:

```bash
#!/bin/bash
set -e

echo "🔵 Copy Firebase Config Script"

# Determine which plist file to copy
if [[ "${CONFIGURATION}" == *"dev"* ]]; then
    PLIST_NAME="GoogleService-Info-Dev.plist"
elif [[ "${CONFIGURATION}" == *"staging"* ]]; then
    PLIST_NAME="GoogleService-Info-Staging.plist"
elif [[ "${CONFIGURATION}" == *"prod"* ]]; then
    PLIST_NAME="GoogleService-Info-Production.plist"
else
    echo "❌ Error: Unknown configuration"
    exit 1
fi

# Copy the file
SOURCE_PATH="${PROJECT_DIR}/${TARGET_NAME}/Configuration/Firebase/${PLIST_NAME}"
DEST_PATH="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/GoogleService-Info.plist"

cp "${SOURCE_PATH}" "${DEST_PATH}"
echo "✅ Copied ${PLIST_NAME}"
```

6. Add **Input Files**:
   ```
   $(PROJECT_DIR)/$(TARGET_NAME)/Configuration/Firebase/GoogleService-Info-Dev.plist
   $(PROJECT_DIR)/$(TARGET_NAME)/Configuration/Firebase/GoogleService-Info-Staging.plist
   $(PROJECT_DIR)/$(TARGET_NAME)/Configuration/Firebase/GoogleService-Info-Production.plist
   ```

7. Add **Output Files**:
   ```
   $(BUILT_PRODUCTS_DIR)/$(PRODUCT_NAME).app/GoogleService-Info.plist
   ```

### 3. Clean & Build

1. Product → Clean Build Folder (Cmd+Shift+K)
2. Product → Build (Cmd+B)
3. Product → Run (Cmd+R)

### 4. Verify

✅ App should launch without Firebase error!

Check build log for:
```
🔵 Copy Firebase Config Script
✅ Copied GoogleService-Info-Dev.plist
```

## Visual Guide

```
Build Phases Order:
├── Dependencies
├── Compile Sources
├── 📋 Copy Firebase Config ← NEW SCRIPT (add here!)
├── Copy Bundle Resources
├── Embed Frameworks
└── Run Script (SwiftLint, etc.)
```

## Quick Test (Without Script)

If you need to test immediately without adding the script:

```bash
# Manually copy Dev config
cp EquiDuty/Configuration/Firebase/GoogleService-Info-Dev.plist \
   ~/Library/Developer/Xcode/DerivedData/EquiDuty-*/Build/Products/Debug-dev-iphonesimulator/EquiDuty\ Dev.app/GoogleService-Info.plist

# Run app in Xcode
```

**Note**: This is temporary. Add the build script for permanent fix.

## Troubleshooting

**Script not visible in build log?**
- Make sure script is positioned BEFORE "Copy Bundle Resources"
- Clean and rebuild

**Still crashes?**
- Verify files exist: `ls -la EquiDuty/Configuration/Firebase/`
- Check script output in build log
- Verify no GoogleService-Info files in "Copy Bundle Resources" phase

**Need more details?**
See `FIREBASE_CONFIG_SETUP.md` for complete guide.

## Success Checklist

- [ ] Build script added and positioned correctly
- [ ] Clean build successful
- [ ] App launches without Firebase error
- [ ] Build log shows "✅ Copied GoogleService-Info-Dev.plist"
- [ ] Can run all three schemes (Dev, Staging, Prod)

---

**Time to fix**: ~5 minutes
**Impact**: Critical - app won't launch without this
**Difficulty**: Easy - just copy/paste script in Xcode
