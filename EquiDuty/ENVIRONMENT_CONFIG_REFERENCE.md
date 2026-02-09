# Environment Configuration Reference

This document provides a comprehensive reference for the EquiDuty iOS app's multi-environment configuration setup.

## Environment Overview

The app supports three environments, each with separate Firebase projects and OAuth configurations:

| Environment | Bundle ID | Display Name | Firebase Project |
|------------|-----------|--------------|------------------|
| Development | `Maxton.EquiDuty.dev` | EquiDuty Dev | equiduty-dev |
| Staging | `Maxton.EquiDuty.staging` | EquiDuty Staging | equiduty-staging |
| Production | `Maxton.EquiDuty` | EquiDuty | equiduty-prod |

## OAuth Client IDs

### Development
- **Client ID**: `623133738566-nt09r2stcchfa17p2se76trnjscddog4.apps.googleusercontent.com`
- **Reversed Client ID**: `com.googleusercontent.apps.623133738566-nt09r2stcchfa17p2se76trnjscddog4`
- **GCM Sender ID**: `623133738566`
- **Google App ID**: `1:623133738566:ios:bd91e52e0f1e7157186c47`

### Staging
- **Client ID**: `724301451273-18q02m30oe4e3ng8234hf6n331n5sqg5.apps.googleusercontent.com`
- **Reversed Client ID**: `com.googleusercontent.apps.724301451273-18q02m30oe4e3ng8234hf6n331n5sqg5`
- **GCM Sender ID**: `724301451273`
- **Google App ID**: `1:724301451273:ios:bd2f2fa9d071b1bb8fe8d8`

### Production
- **Client ID**: `618787536909-du9t652ousstc9um4liq0na5n68hcg2l.apps.googleusercontent.com`
- **Reversed Client ID**: `com.googleusercontent.apps.618787536909-du9t652ousstc9um4liq0na5n68hcg2l`
- **GCM Sender ID**: `618787536909`
- **Google App ID**: `1:618787536909:ios:04882ffaf8608dabd95544`

## API Endpoints

- **Development**: `https://api-service-773558333623.europe-west1.run.app/api/v1`
- **Staging**: `https://api-staging-service.europe-west1.run.app/api/v1`
- **Production**: `https://api.equiduty.se/api/v1`

## Configuration Files

### xcconfig Files (Configuration/\*.xcconfig)
- `Dev.xcconfig` - Development environment settings
- `Staging.xcconfig` - Staging environment settings
- `Production.xcconfig` - Production environment settings

Key variables in xcconfig files:
- `BUNDLE_ID_SUFFIX` - Appended to base bundle ID
- `APP_DISPLAY_NAME` - App name shown on device
- `FIREBASE_CONFIG_FILENAME` - Which GoogleService-Info file to use
- `REVERSED_CLIENT_ID` - OAuth URL scheme
- `GOOGLE_CLIENT_ID` - OAuth client identifier
- `API_BASE_URL` - Backend API endpoint
- `SWIFT_ACTIVE_COMPILATION_CONDITIONS` - Compile-time flags (DEV, STAGING, PRODUCTION)

### Info.plist Files (EquiDuty/\*.plist)
- `Info-Dev.plist` - Development-specific Info.plist with Dev URL scheme
- `Info-Staging.plist` - Staging-specific Info.plist with Staging URL scheme
- `Info.plist` - Production Info.plist with Production URL scheme

Each Info.plist contains environment-specific `CFBundleURLSchemes` for OAuth redirect handling.

### GoogleService-Info Files (Configuration/Firebase/\*.plist)
- `GoogleService-Info-Dev.plist` - Firebase SDK configuration for Development
- `GoogleService-Info-Staging.plist` - Firebase SDK configuration for Staging
- `GoogleService-Info-Production.plist` - Firebase SDK configuration for Production

## Build Configurations (Manual Setup Required)

⚠️ **Important**: Build configurations must be set up manually in Xcode.

### Required Build Configurations

You need 6 build configurations (Debug + Release for each environment):

1. **Debug-Dev** (daily development)
   - xcconfig: `Dev.xcconfig`
   - Info.plist: `Info-Dev.plist`
   - Bundle ID: `Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)` → `Maxton.EquiDuty.dev`

2. **Release-Dev** (TestFlight dev builds)
   - xcconfig: `Dev.xcconfig`
   - Info.plist: `Info-Dev.plist`
   - Bundle ID: `Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)` → `Maxton.EquiDuty.dev`

3. **Debug-Staging** (QA testing)
   - xcconfig: `Staging.xcconfig`
   - Info.plist: `Info-Staging.plist`
   - Bundle ID: `Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)` → `Maxton.EquiDuty.staging`

4. **Release-Staging** (TestFlight staging builds)
   - xcconfig: `Staging.xcconfig`
   - Info.plist: `Info-Staging.plist`
   - Bundle ID: `Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)` → `Maxton.EquiDuty.staging`

5. **Debug-Prod** (production debugging if needed)
   - xcconfig: `Production.xcconfig`
   - Info.plist: `Info.plist`
   - Bundle ID: `Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)` → `Maxton.EquiDuty`

6. **Release-Prod** (App Store submission)
   - xcconfig: `Production.xcconfig`
   - Info.plist: `Info.plist`
   - Bundle ID: `Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)` → `Maxton.EquiDuty`

### How to Create Build Configurations in Xcode

1. Open the project in Xcode
2. Select the project in the Project Navigator
3. Go to the **Info** tab
4. Under **Configurations**, click the **+** button
5. Duplicate existing configurations and rename them according to the list above
6. For each configuration:
   - Set the xcconfig file (click the chevron next to EquiDuty target)
   - Update **Build Settings** → **Packaging** → **Info.plist File** to point to the correct plist

### Bundle Identifier Setup

In **Build Settings** → **Packaging** → **Product Bundle Identifier**, set:
```
Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)
```

This allows the xcconfig files to control the suffix:
- Dev: `.dev` → `Maxton.EquiDuty.dev`
- Staging: `.staging` → `Maxton.EquiDuty.staging`
- Production: empty → `Maxton.EquiDuty`

## Schemes (Manual Setup Required)

Create 3 schemes, each targeting different build configurations:

### 1. EquiDuty (Dev)
- **Run**: Debug-Dev
- **Test**: Debug-Dev
- **Profile**: Release-Dev
- **Analyze**: Debug-Dev
- **Archive**: Release-Dev

### 2. EquiDuty (Staging)
- **Run**: Debug-Staging
- **Test**: Debug-Staging
- **Profile**: Release-Staging
- **Analyze**: Debug-Staging
- **Archive**: Release-Staging

### 3. EquiDuty (Prod)
- **Run**: Release-Prod (or Debug-Prod if you need production debugging)
- **Test**: Debug-Prod
- **Profile**: Release-Prod
- **Analyze**: Release-Prod
- **Archive**: Release-Prod

### How to Create Schemes in Xcode

1. Go to **Product** → **Scheme** → **Manage Schemes**
2. Click the **+** button to create a new scheme
3. Name it according to the list above
4. Click **Edit** on the scheme
5. For each action (Run, Test, Profile, etc.), select the appropriate build configuration
6. Check **Shared** if you're working in a team (stores in .xcschemes)

## Build Script

The `copy-firebase-config.sh` script automatically copies the correct `GoogleService-Info.plist` based on the `FIREBASE_CONFIG_FILENAME` variable from xcconfig files.

**Location**: `Scripts/copy-firebase-config.sh`

**Run Phase**: Pre-build phase in Xcode target

This script remains unchanged and continues to work with the new configuration system.

## Compile-Time Environment Detection

The Swift code uses compile-time flags to detect the environment:

```swift
enum Environment {
    case development
    case staging
    case production

    static var current: Environment {
        #if DEV
        return .development
        #elseif STAGING
        return .staging
        #elseif PRODUCTION
        return .production
        #else
        return .development // Default fallback
        #endif
    }
}
```

The flags `DEV`, `STAGING`, and `PRODUCTION` are set via `SWIFT_ACTIVE_COMPILATION_CONDITIONS` in the xcconfig files.

## Testing the Setup

### Verify Each Environment Builds

```bash
# Dev
xcodebuild -scheme "EquiDuty (Dev)" -configuration Debug-Dev clean build

# Staging
xcodebuild -scheme "EquiDuty (Staging)" -configuration Debug-Staging clean build

# Production
xcodebuild -scheme "EquiDuty (Prod)" -configuration Release-Prod clean build
```

### Verify Google Sign-In

For each environment:
1. Build and run on simulator/device
2. Tap "Sign in with Google"
3. Authorize with a Google account
4. Verify successful authentication
5. Check that the app connects to the correct Firebase project

### Verify Multi-App Installation

You should be able to install all three environments simultaneously:
- **EquiDuty Dev** (blue icon if you add app icons)
- **EquiDuty Staging** (yellow icon)
- **EquiDuty** (production icon)

Each app is completely independent with its own data and Firebase project.

## Troubleshooting

### Google Sign-In Fails

**Symptoms**: OAuth consent screen doesn't appear or redirect fails

**Solution**:
1. Verify `CFBundleURLSchemes` in the Info.plist matches the `REVERSED_CLIENT_ID`
2. Check that the correct GoogleService-Info.plist is being copied (check build logs)
3. Ensure the Bundle ID matches what's registered in Firebase and Google Cloud Console

### Wrong Firebase Project

**Symptoms**: App connects to the wrong Firebase project

**Solution**:
1. Check the build configuration selected in Xcode
2. Verify the `FIREBASE_CONFIG_FILENAME` in the active xcconfig file
3. Clean build folder (Cmd+Shift+K) and rebuild
4. Check that Environment.swift returns the correct environment

### Build Fails with "Bundle Identifier Already Exists"

**Symptoms**: Can't build because another app has the same Bundle ID

**Solution**:
1. Verify you're using the correct scheme for the environment
2. Check that `BUNDLE_ID_SUFFIX` is set correctly in xcconfig
3. Uninstall conflicting apps from simulator/device

### Info.plist Not Found

**Symptoms**: Build fails with "Info.plist file not found"

**Solution**:
1. Check **Build Settings** → **Packaging** → **Info.plist File** for each configuration
2. Verify the path is relative to the target directory: `Info-Dev.plist`, `Info-Staging.plist`, or `Info.plist`
3. Ensure the files exist in `EquiDuty/EquiDuty/` directory

## Deployment Workflows

### Development Builds
- **Use**: Daily development and debugging
- **Scheme**: EquiDuty (Dev)
- **Configuration**: Debug-Dev
- **Destination**: Simulator or physical device via cable

### TestFlight Builds
- **Development Track**:
  - Scheme: EquiDuty (Dev)
  - Configuration: Release-Dev
  - Archive and upload to App Store Connect → TestFlight → Internal Testing

- **Staging Track**:
  - Scheme: EquiDuty (Staging)
  - Configuration: Release-Staging
  - Archive and upload to App Store Connect → TestFlight → External Testing

### App Store Submission
- **Scheme**: EquiDuty (Prod)
- **Configuration**: Release-Prod
- **Process**: Archive → Upload to App Store Connect → Submit for Review

## Security Considerations

1. **Never commit sensitive data** to version control:
   - GoogleService-Info.plist files (gitignored)
   - API keys or secrets

2. **Use different OAuth clients** for each environment to prevent cross-contamination

3. **Enable Testability** is `YES` for Dev/Staging, `NO` for Production

4. **Production builds** should have:
   - Debug logging disabled
   - Analytics enabled
   - Proper error reporting

## Future Enhancements

Consider adding:
- Different app icons for each environment (easier visual identification)
- Different color schemes (Dev: blue, Staging: yellow, Prod: brand colors)
- Build number automation via CI/CD
- Automated TestFlight uploads from CI/CD pipeline
- Environment indicator in debug builds (Dev/Staging banner)
