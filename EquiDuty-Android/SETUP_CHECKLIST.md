# Android Environment Setup Checklist

## ✅ Completed

1. ✅ Created product flavors (dev, staging, prod) in `build.gradle.kts`
2. ✅ Organized flavor-specific directories:
   - `app/src/dev/`
   - `app/src/staging/`
   - `app/src/prod/`
3. ✅ Moved existing `google-services.json` to `app/src/dev/`
4. ✅ Updated `.gitignore` to exclude Firebase config files
5. ✅ Created README guides for staging and prod
6. ✅ Configured environment-specific settings:
   - App IDs (maxton.EquiDuty.dev, .staging, base)
   - API URLs for each environment
   - App names for easy identification
   - BuildConfig fields for runtime access

## ⚠️ Action Required

### 1. Update Dev Firebase Configuration

The current `google-services.json` has package name `maxton.EquiDuty` but needs `maxton.EquiDuty.dev`:

**Option A: Update Firebase Console (Recommended)**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select **equiduty-dev** project
3. Go to Project Settings → Your apps → Android app
4. Update package name to: `maxton.EquiDuty.dev`
5. Download the new `google-services.json`
6. Replace `app/src/dev/google-services.json`

**Option B: Add New App in Firebase**
1. In Firebase Console for equiduty-dev
2. Add a new Android app with package: `maxton.EquiDuty.dev`
3. Download `google-services.json`
4. Replace `app/src/dev/google-services.json`

### 2. Create Staging Firebase Project

1. Create new Firebase project: **equiduty-staging**
2. Add Android app with package: `maxton.EquiDuty.staging`
3. Download `google-services.json`
4. Place at: `app/src/staging/google-services.json`

### 3. Configure Production Firebase

1. Ensure production Firebase project exists
2. Add Android app with package: `maxton.EquiDuty`
3. Download `google-services.json`
4. Place at: `app/src/prod/google-services.json`

### 4. Android Studio Configuration

1. Open project in Android Studio
2. **Sync Gradle files**: File → Sync Project with Gradle Files
3. **Select build variant**: View → Tool Windows → Build Variants
4. Choose `devDebug` for development
5. **Run** to verify configuration

### 5. Verify Build Variants

Test that all variants build successfully:

```bash
# From EquiDuty-Android directory
./gradlew assembleDevDebug
./gradlew assembleStagingDebug
./gradlew assembleProdDebug
```

## Build Variants Reference

| Variant | App ID | API URL | Firebase Project |
|---------|--------|---------|------------------|
| devDebug | maxton.EquiDuty.dev | dev-api-service | equiduty-dev |
| devRelease | maxton.EquiDuty.dev | dev-api-service | equiduty-dev |
| stagingDebug | maxton.EquiDuty.staging | staging-api-service | equiduty-staging |
| stagingRelease | maxton.EquiDuty.staging | staging-api-service | equiduty-staging |
| prodDebug | maxton.EquiDuty | prod-api-service | equiduty-prod |
| prodRelease | maxton.EquiDuty | prod-api-service | equiduty-prod |

## Testing Multi-Environment Install

You can install all three environments on the same device:

```bash
# Install all three debug versions
./gradlew installDevDebug
./gradlew installStagingDebug
./gradlew installProdDebug
```

Each will appear as a separate app:
- 🟢 **EquiDuty Dev** (green badge)
- 🟡 **EquiDuty Staging** (yellow badge)
- 🔵 **EquiDuty** (standard)

## Next Steps

1. 🔥 Update Firebase configurations (see Action Required above)
2. 🔄 Sync project in Android Studio
3. ✅ Test all build variants
4. 📱 Install on device to verify
5. 🔐 Configure release signing (for production builds)

## Documentation

- Detailed setup guide: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
- Main project docs: [../CLAUDE.md](../CLAUDE.md)
- iOS environment config: [../EquiDuty/ENVIRONMENT_CONFIG_REFERENCE.md](../EquiDuty/ENVIRONMENT_CONFIG_REFERENCE.md)
