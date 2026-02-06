# Multi-Environment Setup - Completion Checklist

Use this checklist to track your progress setting up the multi-environment configuration.

## ✅ Automated Steps (Completed)

- [x] Updated xcconfig files with bundle ID suffix pattern
  - [x] Dev.xcconfig created with all environment variables
  - [x] Staging.xcconfig updated with OAuth credentials
  - [x] Production.xcconfig updated with OAuth credentials
- [x] Created environment-specific Info.plist files
  - [x] Info-Dev.plist with Dev OAuth URL scheme
  - [x] Info-Staging.plist with Staging OAuth URL scheme
  - [x] Info.plist (Production) updated with Prod OAuth URL scheme
- [x] Replaced GoogleService-Info.plist files
  - [x] GoogleService-Info-Dev.plist (equiduty-dev project)
  - [x] GoogleService-Info-Staging.plist (equiduty-staging project)
  - [x] GoogleService-Info-Production.plist (equiduty-prod project)
- [x] Updated Environment.swift
  - [x] Changed DEVELOPMENT flag to DEV
  - [x] Updated firebaseProjectId values to match Firebase projects
- [x] Cleaned up old configuration files
  - [x] Removed old Development.xcconfig
  - [x] Removed temporary GoogleService-Info files from EquiDuty folder
- [x] Created comprehensive documentation
  - [x] ENVIRONMENT_CONFIG_REFERENCE.md
  - [x] XCODE_SETUP_GUIDE.md
  - [x] SETUP_CHECKLIST.md (this file)

## ⏳ Manual Steps (Xcode Configuration Required)

Follow the instructions in `XCODE_SETUP_GUIDE.md` to complete these steps:

### Part 1: Build Configurations (~10 min)
- [ ] Open EquiDuty.xcodeproj in Xcode
- [ ] Navigate to Project Settings → Info → Configurations
- [ ] Delete old custom configurations (optional)
- [ ] Create Debug-Dev configuration
- [ ] Create Release-Dev configuration
- [ ] Create Debug-Staging configuration
- [ ] Create Release-Staging configuration
- [ ] Create Debug-Prod configuration
- [ ] Create Release-Prod configuration
- [ ] Assign Dev.xcconfig to Debug-Dev and Release-Dev
- [ ] Assign Staging.xcconfig to Debug-Staging and Release-Staging
- [ ] Assign Production.xcconfig to Debug-Prod and Release-Prod

### Part 2: Build Settings (~5 min)
- [ ] Select EquiDuty target → Build Settings
- [ ] Update Product Bundle Identifier to: \`Maxton.EquiDuty\$(BUNDLE_ID_SUFFIX)\`
- [ ] Set Info.plist File for Debug-Dev: \`EquiDuty/Info-Dev.plist\`
- [ ] Set Info.plist File for Release-Dev: \`EquiDuty/Info-Dev.plist\`
- [ ] Set Info.plist File for Debug-Staging: \`EquiDuty/Info-Staging.plist\`
- [ ] Set Info.plist File for Release-Staging: \`EquiDuty/Info-Staging.plist\`
- [ ] Set Info.plist File for Debug-Prod: \`EquiDuty/Info.plist\`
- [ ] Set Info.plist File for Release-Prod: \`EquiDuty/Info.plist\`
- [ ] Verify Product Name shows: \`\$(APP_DISPLAY_NAME)\`
- [ ] Verify Code Sign Style is: \`Automatic\`
- [ ] Verify Development Team is: \`9MXCMYP7FA\`

### Part 3: Schemes (~10 min)
- [ ] Go to Product → Scheme → Manage Schemes
- [ ] Create "EquiDuty (Dev)" scheme
  - [ ] Run: Debug-Dev
  - [ ] Test: Debug-Dev
  - [ ] Profile: Release-Dev
  - [ ] Analyze: Debug-Dev
  - [ ] Archive: Release-Dev
- [ ] Create "EquiDuty (Staging)" scheme
  - [ ] Run: Debug-Staging
  - [ ] Test: Debug-Staging
  - [ ] Profile: Release-Staging
  - [ ] Analyze: Debug-Staging
  - [ ] Archive: Release-Staging
- [ ] Create "EquiDuty (Prod)" scheme
  - [ ] Run: Release-Prod (or Debug-Prod)
  - [ ] Test: Debug-Prod
  - [ ] Profile: Release-Prod
  - [ ] Analyze: Release-Prod
  - [ ] Archive: Release-Prod
- [ ] Mark schemes as Shared (if working in a team)
- [ ] Delete old schemes (optional)

### Part 4: Verification (~15 min)
- [ ] Build EquiDuty (Dev) scheme successfully
- [ ] Build EquiDuty (Staging) scheme successfully
- [ ] Build EquiDuty (Prod) scheme successfully
- [ ] Run EquiDuty (Dev) - verify app name "EquiDuty Dev"
- [ ] Run EquiDuty (Staging) - verify app name "EquiDuty Staging"
- [ ] Run EquiDuty (Prod) - verify app name "EquiDuty"
- [ ] Verify all three apps installed simultaneously
- [ ] Test Google Sign-In in Dev environment
- [ ] Test Google Sign-In in Staging environment
- [ ] Test Google Sign-In in Prod environment
- [ ] Verify each connects to correct Firebase project
- [ ] Check console logs show correct environment
- [ ] Check bundle IDs: Maxton.EquiDuty.dev, Maxton.EquiDuty.staging, Maxton.EquiDuty

## 🚀 Post-Setup Tasks

- [ ] Commit changes to git
  - [ ] Add new xcconfig files (Dev.xcconfig, Staging.xcconfig, Production.xcconfig)
  - [ ] Add new Info.plist files (Info-Dev.plist, Info-Staging.plist)
  - [ ] Add updated GoogleService-Info files
  - [ ] Add updated Environment.swift
  - [ ] Add scheme files (if shared)
  - [ ] Add documentation files
  - [ ] Remove old files from tracking
- [ ] Update .gitignore if needed
- [ ] Update team documentation
- [ ] Notify team members of new configuration
- [ ] Update CI/CD pipelines
  - [ ] Configure Dev scheme for continuous deployment
  - [ ] Configure Staging scheme for QA builds
  - [ ] Configure Prod scheme for App Store releases
- [ ] Set up TestFlight tracks
  - [ ] Internal Testing track for Dev builds
  - [ ] External Testing track for Staging builds
- [ ] Update deployment documentation
- [ ] Test archive process for each environment
- [ ] Verify code signing for distribution builds

## 📝 Optional Enhancements

- [ ] Add environment-specific app icons
  - [ ] Dev: Blue tint or "Dev" badge
  - [ ] Staging: Yellow tint or "Staging" badge
  - [ ] Prod: Official brand icon
- [ ] Add environment indicator banner in debug builds
- [ ] Configure different color themes per environment
- [ ] Set up automated build number incrementing
- [ ] Add Fastlane for automated deployment
- [ ] Configure environment-specific analytics
- [ ] Set up different crash reporting buckets per environment

## 🎯 Success Criteria

Your setup is complete when:
- ✅ All 6 build configurations exist and build successfully
- ✅ 3 schemes are configured and working
- ✅ Each environment uses the correct Bundle ID (suffix pattern)
- ✅ Each environment connects to its own Firebase project
- ✅ Google Sign-In works in all three environments
- ✅ All three apps can be installed simultaneously
- ✅ Environment detection works correctly at runtime
- ✅ Archive process works for TestFlight/App Store

## 📚 Reference Documents

- **XCODE_SETUP_GUIDE.md** - Step-by-step Xcode configuration instructions
- **ENVIRONMENT_CONFIG_REFERENCE.md** - Complete environment configuration reference
- **Configuration/*.xcconfig** - Build configuration files
- **EquiDuty/Info-*.plist** - Environment-specific Info.plist files
- **Configuration/Firebase/GoogleService-Info-*.plist** - Firebase SDK configuration

## 🆘 Need Help?

If you encounter issues:
1. Check the Troubleshooting section in XCODE_SETUP_GUIDE.md
2. Verify all checklist items are completed
3. Review ENVIRONMENT_CONFIG_REFERENCE.md for configuration details
4. Clean build folder (Cmd+Shift+K) and rebuild
5. Restart Xcode if settings don't seem to take effect

## Estimated Time

- Automated setup: ✅ Already completed
- Manual Xcode setup: ~25-30 minutes
- Testing and verification: ~15-20 minutes
- Post-setup tasks: ~30-60 minutes

**Total**: ~1.5-2 hours for complete setup and verification
