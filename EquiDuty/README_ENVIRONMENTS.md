# Multi-Environment Setup - Complete! 🎉

The EquiDuty iOS app now has a professional multi-environment configuration following iOS best practices.

## What Was Implemented

### ✅ Automated Configuration (Already Complete)

The following files have been created/updated:

#### 1. xcconfig Files (Configuration/*.xcconfig)
- **Dev.xcconfig** - Development environment with bundle ID suffix `.dev`
- **Staging.xcconfig** - Staging environment with bundle ID suffix `.staging`
- **Production.xcconfig** - Production environment with no suffix

Each file contains:
- Bundle ID suffix pattern
- App display name
- Firebase configuration filename
- OAuth Client IDs and reversed client IDs
- API endpoints
- Code signing configuration
- Compile-time flags (DEV, STAGING, PRODUCTION)

#### 2. Info.plist Files (EquiDuty/*.plist)
- **Info-Dev.plist** - Development with OAuth URL scheme for Dev
- **Info-Staging.plist** - Staging with OAuth URL scheme for Staging
- **Info.plist** - Production with OAuth URL scheme for Production

Each file has the correct `CFBundleURLSchemes` for OAuth redirect handling.

#### 3. GoogleService-Info Files (Configuration/Firebase/*.plist)
Replaced with your generated Firebase SDK configuration files:
- **GoogleService-Info-Dev.plist** (equiduty-dev project)
- **GoogleService-Info-Staging.plist** (equiduty-staging project)
- **GoogleService-Info-Production.plist** (equiduty-prod project)

#### 4. Environment.swift Updated
- Changed compile-time flag from `DEVELOPMENT` to `DEV`
- Updated Firebase project IDs to match your Firebase projects
- Now detects environment at compile-time via xcconfig flags

#### 5. Comprehensive Documentation
- **ENVIRONMENT_CONFIG_REFERENCE.md** - Complete configuration reference
- **XCODE_SETUP_GUIDE.md** - Step-by-step Xcode configuration guide
- **SETUP_CHECKLIST.md** - Checklist to track progress
- **README_ENVIRONMENTS.md** - This overview document

### ⏳ Manual Xcode Configuration Required

The following must be done manually in Xcode (estimated 40-50 minutes):

1. **Create 6 Build Configurations** (10 min)
   - Debug-Dev, Release-Dev
   - Debug-Staging, Release-Staging
   - Debug-Prod, Release-Prod

2. **Update Build Settings** (5 min)
   - Product Bundle Identifier: `Maxton.EquiDuty$(BUNDLE_ID_SUFFIX)`
   - Info.plist File paths per configuration

3. **Create 3 Schemes** (10 min)
   - EquiDuty (Dev)
   - EquiDuty (Staging)
   - EquiDuty (Prod)

4. **Verify and Test** (15-25 min)
   - Build all configurations
   - Test Google Sign-In
   - Verify environment detection

## Quick Start

Follow these 3 steps:

### Step 1: Read the Setup Guide
Open `XCODE_SETUP_GUIDE.md` and follow the detailed instructions.

### Step 2: Configure Xcode
Complete the manual Xcode configuration (Parts 1-3 in the guide).

### Step 3: Verify Everything Works
Run through the verification steps (Part 4 in the guide).

## Environment Details

### Development
- **Bundle ID**: `Maxton.EquiDuty.dev`
- **Display Name**: EquiDuty Dev
- **Firebase Project**: equiduty-dev
- **Client ID**: `623133738566-nt09r2stcchfa17p2se76trnjscddog4.apps.googleusercontent.com`
- **API**: `https://api-service-773558333623.europe-west1.run.app/api/v1`

### Staging
- **Bundle ID**: `Maxton.EquiDuty.staging`
- **Display Name**: EquiDuty Staging
- **Firebase Project**: equiduty-staging
- **Client ID**: `724301451273-18q02m30oe4e3ng8234hf6n331n5sqg5.apps.googleusercontent.com`
- **API**: `https://api-staging-service.europe-west1.run.app/api/v1`

### Production
- **Bundle ID**: `Maxton.EquiDuty`
- **Display Name**: EquiDuty
- **Firebase Project**: equiduty-prod
- **Client ID**: `618787536909-du9t652ousstc9um4liq0na5n68hcg2l.apps.googleusercontent.com`
- **API**: `https://api.equiduty.se/api/v1`

## Key Benefits

✅ **Standard iOS Practice** - Follows Apple's recommended multi-environment approach
✅ **Bundle ID Suffix Pattern** - Clean, maintainable bundle identifiers
✅ **Xcode Native** - No custom scripts for core configuration
✅ **Debug/Release Separation** - Proper configurations for development and distribution
✅ **Separate Info.plist Files** - Most reliable way to handle environment-specific URL schemes
✅ **Compile-Time Detection** - Environment determined at build time, not runtime
✅ **Multi-App Installation** - All three environments can coexist on same device
✅ **TestFlight Ready** - Archive configurations ready for TestFlight distribution

## File Structure

```
EquiDuty/
├── Configuration/
│   ├── Dev.xcconfig                    ✅ Created
│   ├── Staging.xcconfig                ✅ Updated
│   ├── Production.xcconfig             ✅ Updated
│   └── Firebase/
│       ├── GoogleService-Info-Dev.plist              ✅ Replaced
│       ├── GoogleService-Info-Staging.plist          ✅ Replaced
│       └── GoogleService-Info-Production.plist       ✅ Replaced
├── EquiDuty/
│   ├── Info-Dev.plist                  ✅ Created
│   ├── Info-Staging.plist              ✅ Created
│   ├── Info.plist                      ✅ Updated
│   └── Core/Configuration/
│       └── Environment.swift           ✅ Updated
├── ENVIRONMENT_CONFIG_REFERENCE.md     ✅ Created
├── XCODE_SETUP_GUIDE.md                ✅ Created
├── SETUP_CHECKLIST.md                  ✅ Created
└── README_ENVIRONMENTS.md              ✅ This file
```

## Common Commands

### Build Specific Environment
```bash
# Development
xcodebuild -scheme "EquiDuty (Dev)" -configuration Debug-Dev clean build

# Staging
xcodebuild -scheme "EquiDuty (Staging)" -configuration Debug-Staging clean build

# Production
xcodebuild -scheme "EquiDuty (Prod)" -configuration Release-Prod clean build
```

### Archive for Distribution
```bash
# Development (TestFlight Internal)
xcodebuild -scheme "EquiDuty (Dev)" -configuration Release-Dev clean archive

# Staging (TestFlight External)
xcodebuild -scheme "EquiDuty (Staging)" -configuration Release-Staging clean archive

# Production (App Store)
xcodebuild -scheme "EquiDuty (Prod)" -configuration Release-Prod clean archive
```

## Next Steps

1. ✅ Open `SETUP_CHECKLIST.md` and start checking off manual steps
2. ✅ Follow `XCODE_SETUP_GUIDE.md` for detailed instructions
3. ✅ Verify everything works (build, run, test Google Sign-In)
4. ✅ Commit all changes to git
5. ✅ Update team documentation and notify team members
6. ✅ Configure CI/CD pipelines to use new schemes
7. ✅ Set up TestFlight tracks for each environment

## Troubleshooting

If you encounter issues, check these resources:
- **Troubleshooting section** in `XCODE_SETUP_GUIDE.md`
- **ENVIRONMENT_CONFIG_REFERENCE.md** for configuration details
- **Build logs** in Xcode for specific error messages
- **Clean build folder** (Cmd+Shift+K) and rebuild

## Support

For questions or issues:
1. Review the documentation files
2. Check that all manual steps are completed
3. Verify file paths and configuration values
4. Try cleaning and rebuilding

## Estimated Completion Time

- ✅ Automated setup: Complete
- ⏳ Manual Xcode setup: 25-30 minutes
- ⏳ Testing and verification: 15-20 minutes
- 📋 Post-setup tasks: 30-60 minutes

**Total remaining**: ~1.5-2 hours

Good luck with the setup! 🚀
