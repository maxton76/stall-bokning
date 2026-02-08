# EquiDuty Android - Environment Configuration Guide

This guide explains how to configure and build the EquiDuty Android app for different environments (dev, staging, prod).

## Overview

The app uses **Product Flavors** to manage three environments:

| Environment | App ID | API URL | App Name |
|-------------|--------|---------|----------|
| **Dev** | `maxton.EquiDuty.dev` | https://dev-api-service-auky5oec3a-ew.a.run.app | EquiDuty Dev |
| **Staging** | `maxton.EquiDuty.staging` | https://staging-api-service-auky5oec3a-ew.a.run.app | EquiDuty Staging |
| **Production** | `maxton.EquiDuty` | https://prod-api-service-wigho7gnca-ew.a.run.app | EquiDuty |

## Build Variants

Each environment has **Debug** and **Release** build types, creating 6 build variants:

1. `devDebug` - Development debug build
2. `devRelease` - Development release build
3. `stagingDebug` - Staging debug build
4. `stagingRelease` - Staging release build
5. `prodDebug` - Production debug build
6. `prodRelease` - Production release build

## Firebase Configuration Setup

### 1. Dev Environment (Already Configured) ✅

The dev `google-services.json` is already in place at:
```
app/src/dev/google-services.json
```

### 2. Staging Environment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the **equiduty-staging** project (or create it if it doesn't exist)
3. Add an Android app with package name: `maxton.EquiDuty.staging`
4. Download `google-services.json`
5. Place it at: `app/src/staging/google-services.json`

### 3. Production Environment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **prod** Firebase project
3. Add an Android app with package name: `maxton.EquiDuty`
4. Download `google-services.json`
5. Place it at: `app/src/prod/google-services.json`

## Android Studio Configuration

### Switching Build Variants

1. Open Android Studio
2. Go to **View → Tool Windows → Build Variants**
3. Select the desired variant from the dropdown:
   - `devDebug` for local development
   - `stagingDebug` for staging testing
   - `prodRelease` for prod builds

### Run Configurations

Android Studio automatically creates run configurations for each flavor. To select:

1. Click the run configuration dropdown (next to the Run button)
2. Select your desired configuration:
   - `app-dev` for development
   - `app-staging` for staging
   - `app-prod` for prod

## Building from Command Line

### Debug Builds

```bash
# Dev debug
./gradlew assembleDevDebug

# Staging debug
./gradlew assembleStagingDebug

# Production debug
./gradlew assembleProductionDebug
```

### Release Builds

```bash
# Dev release
./gradlew assembleDevRelease

# Staging release
./gradlew assembleStagingRelease

# Production release
./gradlew assembleProductionRelease
```

### Install APK Directly

```bash
# Install dev debug on connected device
./gradlew installDevDebug

# Install staging debug
./gradlew installStagingDebug

# Install prod release
./gradlew installProductionRelease
```

## Environment-Specific Configuration

Each environment has different configuration accessible via `BuildConfig`:

```kotlin
// Get current API base URL
val apiUrl = BuildConfig.BASE_URL

// Get current environment
val env = BuildConfig.ENVIRONMENT // "dev", "staging", or "prod"

// Check if debug build
val isDebug = BuildConfig.DEBUG
```

## App Naming

The app name varies by environment for easy identification:

- **Dev**: "EquiDuty Dev" (green icon badge)
- **Staging**: "EquiDuty Staging" (yellow icon badge)
- **Production**: "EquiDuty" (standard icon)

This allows installing all three versions on the same device simultaneously.

## Signing Configuration

### Debug Builds
- Use the default Android debug keystore
- Automatically signed by Android Studio

### Release Builds
- Require a release keystore (to be configured)
- Add keystore configuration to `local.properties`:

```properties
RELEASE_STORE_FILE=/path/to/keystore.jks
RELEASE_STORE_PASSWORD=your_store_password
RELEASE_KEY_ALIAS=your_key_alias
RELEASE_KEY_PASSWORD=your_key_password
```

## Troubleshooting

### "google-services.json is missing"

**Solution**: Make sure you have the `google-services.json` file in the correct flavor directory:
- Dev: `app/src/dev/google-services.json`
- Staging: `app/src/staging/google-services.json`
- Production: `app/src/prod/google-services.json`

### "Package name mismatch"

**Solution**: The package name in `google-services.json` must match:
- Dev: `maxton.EquiDuty.dev`
- Staging: `maxton.EquiDuty.staging`
- Production: `maxton.EquiDuty`

### Build variant not showing

**Solution**:
1. Go to **File → Sync Project with Gradle Files**
2. Clean and rebuild: **Build → Clean Project** then **Build → Rebuild Project**

### Multiple apps installed

This is **expected behavior**. Each environment has a different app ID, so you can install all three:
- Dev (maxton.EquiDuty.dev)
- Staging (maxton.EquiDuty.staging)
- Production (maxton.EquiDuty)

## Security Notes

⚠️ **IMPORTANT**: The `google-services.json` files are **NOT** committed to git (.gitignore):
- They contain Firebase API keys and project IDs
- Each developer must download their own copies
- Share securely via 1Password or encrypted channels

## Next Steps

1. ✅ Verify dev environment works
2. 📥 Download staging `google-services.json` from Firebase Console
3. 📥 Download prod `google-services.json` from Firebase Console
4. 🔑 Configure release signing keystore
5. 🚀 Build and test each environment

## Related Documentation

- [iOS Environment Setup](../EquiDuty/ENVIRONMENT_CONFIG_REFERENCE.md)
- [Firebase Setup Guide](../EquiDuty/FIREBASE_SETUP_GUIDE.md)
- [Main Project README](../CLAUDE.md)
