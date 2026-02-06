# Xcode Setup Guide - Multi-Environment Configuration

This guide walks you through the manual Xcode configuration needed to complete the multi-environment setup.

## Prerequisites

✅ xcconfig files updated (Dev.xcconfig, Staging.xcconfig, Production.xcconfig)
✅ Info.plist files created (Info-Dev.plist, Info-Staging.plist, Info.plist)
✅ GoogleService-Info.plist files replaced with correct versions
✅ Environment.swift updated with DEV/STAGING/PRODUCTION flags

## Part 1: Create Build Configurations

**Time Required**: ~10 minutes

### Step 1: Open Project Settings

1. Open `EquiDuty.xcodeproj` in Xcode
2. Click on the **EquiDuty** project (blue icon) in the Project Navigator (left sidebar)
3. Make sure you're on the **Info** tab (top bar)

### Step 2: Delete Old Configurations (Optional)

If you have existing custom configurations you want to replace:

1. Under **Configurations**, you'll see a list of existing configurations
2. Select any custom configurations (like "Development", "Staging", "Production")
3. Click the **-** button to delete them
4. Keep the default **Debug** and **Release** configurations for now

### Step 3: Create New Build Configurations

You need to create 6 configurations. Here's how to do it:

#### Create Debug-Dev

1. Click the **+** button under Configurations
2. Select **Duplicate "Debug" Configuration**
3. Name it: `Debug-Dev`
4. Press Enter

#### Create Release-Dev

1. Click the **+** button
2. Select **Duplicate "Release" Configuration**
3. Name it: `Release-Dev`
4. Press Enter

#### Create Debug-Staging

1. Click the **+** button
2. Select **Duplicate "Debug" Configuration**
3. Name it: `Debug-Staging`
4. Press Enter

#### Create Release-Staging

1. Click the **+** button
2. Select **Duplicate "Release" Configuration**
3. Name it: `Release-Staging`
4. Press Enter

#### Create Debug-Prod

1. Click the **+** button
2. Select **Duplicate "Debug" Configuration**
3. Name it: `Debug-Prod`
4. Press Enter

#### Create Release-Prod

1. Click the **+** button
2. Select **Duplicate "Release" Configuration**
3. Name it: `Release-Prod`
4. Press Enter

### Step 4: Assign xcconfig Files

Now you need to assign the correct xcconfig file to each configuration.

For each configuration, you'll see a chevron (▸) next to it. Click to expand and see the **EquiDuty** target.

#### Assign Dev.xcconfig

1. Find **Debug-Dev** in the list
2. Click the chevron to expand
3. Under **EquiDuty** target, click the dropdown (currently shows "None")
4. Select **Dev** from the list
5. Repeat for **Release-Dev**

#### Assign Staging.xcconfig

1. Find **Debug-Staging** in the list
2. Click the chevron to expand
3. Under **EquiDuty** target, select **Staging**
4. Repeat for **Release-Staging**

#### Assign Production.xcconfig

1. Find **Debug-Prod** in the list
2. Click the chevron to expand
3. Under **EquiDuty** target, select **Production**
4. Repeat for **Release-Prod**

### Step 5: Optional - Delete Default Configurations

If you want a cleaner setup and only have the 6 new configurations:

1. Select **Debug** configuration
2. Click the **-** button to delete it
3. Select **Release** configuration
4. Click the **-** button to delete it

**Note**: If you delete these, you'll need to update your schemes to not reference them.

---

## Part 2: Update Build Settings

**Time Required**: ~5 minutes

### Step 1: Select Target

1. Click on **EquiDuty** project (blue icon)
2. Select the **EquiDuty** target (app icon, under "Targets")
3. Go to the **Build Settings** tab

### Step 2: Update Product Bundle Identifier

1. In the search box, type: `bundle identifier`
2. Find **Product Bundle Identifier** under Packaging
3. For **All configurations**, click on the value
4. Change it to: `Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)`
5. Press Enter

This allows the xcconfig files to control the suffix (.dev, .staging, or empty for production).

### Step 3: Update Info.plist File Per Configuration

This is crucial for the environment-specific URL schemes to work.

1. In the search box, type: `info.plist file`
2. Find **Info.plist File** under Packaging
3. Click the chevron to expand and see all configurations

Now set the path for each configuration:

- **Debug-Dev**: `EquiDuty/Info-Dev.plist`
- **Release-Dev**: `EquiDuty/Info-Dev.plist`
- **Debug-Staging**: `EquiDuty/Info-Staging.plist`
- **Release-Staging**: `EquiDuty/Info-Staging.plist`
- **Debug-Prod**: `EquiDuty/Info.plist`
- **Release-Prod**: `EquiDuty/Info.plist`

**How to set per-configuration values**:
1. Click on a configuration name in the left column (e.g., "Debug-Dev")
2. Double-click the value field
3. Enter the path: `EquiDuty/Info-Dev.plist`
4. Press Enter
5. Repeat for all 6 configurations

### Step 4: Verify Other Settings

The following should already be set via xcconfig files, but double-check:

1. Search for `product name` → Should show `$(APP_DISPLAY_NAME)`
2. Search for `code sign style` → Should show `Automatic`
3. Search for `development team` → Should show `9MXCMYP7FA`

---

## Part 3: Create Schemes

**Time Required**: ~10 minutes

### Step 1: Manage Schemes

1. Go to **Product** → **Scheme** → **Manage Schemes** (or Cmd+Shift+<)
2. You'll see a list of existing schemes

### Step 2: Create EquiDuty (Dev) Scheme

1. Click the **+** button at the bottom left
2. Name: `EquiDuty (Dev)`
3. Target: **EquiDuty**
4. Click **OK**
5. Select the newly created scheme and click **Edit**

Now configure each action:

#### Run Action
1. Select **Run** in the left sidebar
2. Set **Build Configuration**: `Debug-Dev`
3. Click **Close**

#### Test Action
1. Select **Test** in the left sidebar
2. Set **Build Configuration**: `Debug-Dev`

#### Profile Action
1. Select **Profile** in the left sidebar
2. Set **Build Configuration**: `Release-Dev`

#### Analyze Action
1. Select **Analyze** in the left sidebar
2. Set **Build Configuration**: `Debug-Dev`

#### Archive Action
1. Select **Archive** in the left sidebar
2. Set **Build Configuration**: `Release-Dev`

Click **Close** to save.

### Step 3: Create EquiDuty (Staging) Scheme

Repeat the process for Staging:

1. Click **+** to create a new scheme
2. Name: `EquiDuty (Staging)`
3. Target: **EquiDuty**
4. Click **Edit**

Configure actions:
- **Run**: `Debug-Staging`
- **Test**: `Debug-Staging`
- **Profile**: `Release-Staging`
- **Analyze**: `Debug-Staging`
- **Archive**: `Release-Staging`

### Step 4: Create EquiDuty (Prod) Scheme

Repeat for Production:

1. Click **+** to create a new scheme
2. Name: `EquiDuty (Prod)`
3. Target: **EquiDuty**
4. Click **Edit**

Configure actions:
- **Run**: `Release-Prod` (or `Debug-Prod` if you need production debugging)
- **Test**: `Debug-Prod`
- **Profile**: `Release-Prod`
- **Analyze**: `Release-Prod`
- **Archive**: `Release-Prod`

### Step 5: Share Schemes (Optional)

If you're working in a team and want others to have the same schemes:

1. In the Manage Schemes window
2. Check the **Shared** checkbox for each scheme
3. This will save the schemes in `.xcodeproj/xcshareddata/xcschemes/`

### Step 6: Delete Old Schemes (Optional)

If you have old schemes you don't need:

1. Select the old scheme in the list
2. Click the **-** button to delete it

---

## Part 4: Verify the Setup

### Test 1: Build Each Configuration

Select each scheme and verify it builds successfully:

1. Select **EquiDuty (Dev)** scheme from the scheme dropdown (next to stop button)
2. Press **Cmd+B** to build
3. Check for errors in the Issue Navigator (Cmd+5)
4. Repeat for **EquiDuty (Staging)** and **EquiDuty (Prod)**

### Test 2: Verify Bundle Identifiers

Build each scheme and check the resulting app's Bundle ID:

1. Select **EquiDuty (Dev)** scheme
2. Build and run in simulator (Cmd+R)
3. Check the app name on the home screen: "EquiDuty Dev"
4. Stop the app
5. Select **EquiDuty (Staging)** scheme
6. Build and run
7. Check the app name: "EquiDuty Staging"
8. Both apps should be installed simultaneously

### Test 3: Verify Environment Detection

Add a temporary print statement in `EquiDutyApp.swift`:

```swift
init() {
    print("🔵 Current Environment: \(Environment.current.name)")
    print("🔵 Firebase Project: \(Environment.current.firebaseProjectId)")
    print("🔵 API Base URL: \(Environment.current.apiBaseURL)")
}
```

Build and run each scheme:
- **Dev**: Should print "Development", "equiduty-dev"
- **Staging**: Should print "Staging", "equiduty-staging"
- **Prod**: Should print "Production", "equiduty-prod"

### Test 4: Verify Google Sign-In

For each environment:
1. Build and run
2. Tap "Sign in with Google"
3. OAuth consent screen should appear
4. Sign in with a test account
5. Should redirect back to the app successfully
6. Check Firebase Console to verify user appears in correct project

---

## Troubleshooting

### Issue: "Configuration file not found"

**Solution**:
1. Verify xcconfig files exist in `EquiDuty/Configuration/` folder
2. Check that the file names match exactly: `Dev.xcconfig`, `Staging.xcconfig`, `Production.xcconfig`
3. In Xcode, go to Project → Info → Configurations and reassign the xcconfig files

### Issue: "Info.plist file not found"

**Solution**:
1. Verify Info.plist files exist in `EquiDuty/EquiDuty/` folder
2. Check file names: `Info-Dev.plist`, `Info-Staging.plist`, `Info.plist`
3. In Build Settings, update "Info.plist File" paths to be relative: `EquiDuty/Info-Dev.plist`

### Issue: "No such configuration Debug"

**Solution**:
1. You likely deleted the default Debug configuration
2. Update all schemes to use the new configuration names (Debug-Dev, Debug-Staging, Debug-Prod)

### Issue: Google Sign-In fails with "redirect URI mismatch"

**Solution**:
1. Verify the `CFBundleURLSchemes` in Info-Dev.plist, Info-Staging.plist, and Info.plist
2. Check that they match the REVERSED_CLIENT_ID from GoogleService-Info files
3. Clean build folder (Cmd+Shift+K) and rebuild

### Issue: Wrong Firebase project

**Solution**:
1. Check which scheme is selected
2. Verify the build configuration selected in the scheme
3. Check that the correct GoogleService-Info.plist is being copied (look at build logs)
4. Clean build folder and rebuild

---

## Next Steps

After completing this setup:

1. ✅ Test all three environments build and run successfully
2. ✅ Verify Google Sign-In works in each environment
3. ✅ Commit the changes to git:
   - New xcconfig files
   - New Info.plist files
   - Updated Environment.swift
   - New scheme files (if shared)
4. ✅ Update team documentation
5. ✅ Configure CI/CD pipelines to use the new schemes
6. ✅ Set up TestFlight tracks for Dev and Staging environments

## Summary

You now have a clean, standard iOS multi-environment setup:

- ✅ 6 build configurations (Debug + Release for each environment)
- ✅ Bundle ID suffix pattern for clean bundle IDs
- ✅ Environment-specific Info.plist files with proper URL schemes
- ✅ 3 schemes for easy switching between environments
- ✅ Compile-time environment detection
- ✅ All three apps can be installed simultaneously

This setup follows iOS best practices and will scale well as your project grows.
