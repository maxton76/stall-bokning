# Quick Reference: Xcode Schemes

## Available Schemes

### 🔵 EquiDuty (Default)
**For**: Daily development work
- Bundle ID: `com.equiduty.dev`
- App Name: "EquiDuty Dev"
- Firebase: `equiduty-dev`
- Use for: Running, debugging, unit tests

### 🔵 EquiDuty (Dev)
**For**: Development builds and TestFlight
- Same as default scheme
- Use for: Development TestFlight uploads
- Archive: Creates Release-dev build

### 🟡 EquiDuty (Staging)
**For**: Staging environment testing
- Bundle ID: `com.equiduty.staging`
- App Name: "EquiDuty Staging"
- Firebase: `equiduty-staging`
- Use for: Pre-production testing, staging TestFlight

### 🔴 EquiDuty (Prod)
**For**: Production builds
- Bundle ID: `com.equiduty`
- App Name: "EquiDuty"
- Firebase: `equiduty-prod`
- Use for: App Store releases, production TestFlight

## Quick Actions

### Switch Schemes in Xcode
1. Click scheme dropdown next to device selector (top-left)
2. Select desired scheme
3. Run with Cmd+R

### Build Specific Environment
```bash
# Development
xcodebuild -scheme "EquiDuty (Dev)" -configuration Debug-dev build

# Staging
xcodebuild -scheme "EquiDuty (Staging)" -configuration Debug-staging build

# Production
xcodebuild -scheme "EquiDuty (Prod)" -configuration Release-prod build
```

### Archive for Distribution
```bash
# Dev TestFlight
xcodebuild -scheme "EquiDuty (Dev)" archive

# Staging TestFlight
xcodebuild -scheme "EquiDuty (Staging)" archive

# Production App Store
xcodebuild -scheme "EquiDuty (Prod)" archive
```

## Configuration Mapping

| Scheme | Run | Test | Profile | Archive |
|--------|-----|------|---------|---------|
| EquiDuty | Debug-dev | Debug-dev | Release-dev | Release-dev |
| EquiDuty (Dev) | Debug-dev | Debug-dev | Release-dev | Release-dev |
| EquiDuty (Staging) | Debug-staging | Debug-staging | Release-staging | Release-staging |
| EquiDuty (Prod) | Release-prod | Debug-prod | Release-prod | Release-prod |

## Multi-App Testing

All three environments can coexist on the same device:

1. **Run Dev**: Select "EquiDuty (Dev)" → Cmd+R
   - Installs as "EquiDuty Dev"

2. **Run Staging**: Select "EquiDuty (Staging)" → Cmd+R
   - Installs as "EquiDuty Staging"

3. **Run Prod**: Select "EquiDuty (Prod)" → Cmd+R
   - Installs as "EquiDuty"

All three apps appear on home screen with different icons (if configured).

## Build Configuration Details

### Debug-* Configurations
- Optimizations: **OFF**
- Debug symbols: **YES**
- ENABLE_TESTABILITY: **YES**
- Swift optimization: **-Onone**
- Best for: Daily development, debugging

### Release-* Configurations
- Optimizations: **ON**
- Debug symbols: **Separate file** or **NO**
- ENABLE_TESTABILITY: **NO** (prod only)
- Swift optimization: **-O**
- Best for: Performance testing, distribution

## Common Issues

### Wrong App Name Displayed
**Cause**: Wrong Info.plist loaded
**Fix**: Check Build Settings → Packaging → Info.plist File

### Wrong Firebase Project
**Cause**: Wrong GoogleService-Info.plist copied
**Fix**: Check Build Phases → Copy Files or script that copies plist

### Can't Install Multiple Apps
**Cause**: Same bundle ID for different schemes
**Fix**: Verify PRODUCT_BUNDLE_IDENTIFIER in each xcconfig file

### Scheme Not Visible
**Cause**: Xcode cache issue
**Fix**: Close and reopen Xcode, or Product → Clean Build Folder

## Verification Checklist

- [ ] All four schemes visible in scheme dropdown
- [ ] Each scheme marked as "Shared" in Manage Schemes
- [ ] Dev build runs successfully
- [ ] Staging build runs successfully
- [ ] Prod build runs successfully
- [ ] All three apps can coexist on device
- [ ] Correct environment detected at runtime
- [ ] Correct Firebase project connected

## Need Help?

See `SCHEME_CONFIGURATION_SUMMARY.md` for detailed information about:
- Why your 6-configuration setup is correct
- Complete configuration details for each scheme
- Step-by-step verification instructions
- Troubleshooting guide
