# Firebase Environment Setup Guide for iOS

This guide explains how to set up and manage multiple Firebase environments (Development, Staging, Production) for the EquiDuty iOS app.

## 📁 Current Directory Structure

```
EquiDuty/
├── Configuration/
│   ├── Development.xcconfig
│   ├── Staging.xcconfig
│   └── Production.xcconfig
├── Scripts/
│   └── copy-firebase-config.sh
└── EquiDuty/
    ├── Configuration/
    │   └── Firebase/
    │       ├── GoogleService-Info-Dev.plist
    │       ├── GoogleService-Info-Staging.plist
    │       └── GoogleService-Info-Production.plist
    └── Core/
        └── Configuration/
            └── Environment.swift
```

## 🎯 Step-by-Step Setup Instructions

### Step 1: Obtain Firebase Configuration Files

For **each environment** (Dev, Staging, Production), you need to:

#### 1.1 Create or Access Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select or create your Firebase project:
   - **Development**: `stall-bokning-dev` (already exists)
   - **Staging**: Create new project `equiduty-staging`
   - **Production**: Create new project `equiduty-production`

#### 1.2 Register iOS App in Firebase

For each Firebase project:

1. Click **"Add app"** → Select **iOS** icon
2. Fill in the registration form:
   - **Development**:
     - Bundle ID: `Maxton.EquiDuty.dev`
     - App nickname: `EquiDuty Dev`
   - **Staging**:
     - Bundle ID: `Maxton.EquiDuty.staging`
     - App nickname: `EquiDuty Staging`
   - **Production**:
     - Bundle ID: `Maxton.EquiDuty`
     - App nickname: `EquiDuty`
3. Click **"Register app"**
4. **Download `GoogleService-Info.plist`** file

#### 1.3 Place Configuration Files

Replace the placeholder files with the downloaded ones:

```bash
# Development (already done - current file)
cp ~/Downloads/GoogleService-Info.plist EquiDuty/EquiDuty/Configuration/Firebase/GoogleService-Info-Dev.plist

# Staging
cp ~/Downloads/GoogleService-Info.plist EquiDuty/EquiDuty/Configuration/Firebase/GoogleService-Info-Staging.plist

# Production
cp ~/Downloads/GoogleService-Info.plist EquiDuty/EquiDuty/Configuration/Firebase/GoogleService-Info-Production.plist
```

### Step 2: Configure Google Sign-In

For **each Firebase project**, you need to set up Google Sign-In:

#### 2.1 Enable Google Sign-In in Firebase

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Google** → **Enable** → **Save**

#### 2.2 Get OAuth Client IDs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** → **Credentials**
4. You'll see OAuth 2.0 Client IDs created by Firebase:
   - **iOS Client ID**: Used for Google Sign-In
   - **Web Client ID**: Used for Firebase Auth
5. Note down the **iOS Client ID** (format: `XXXXXX.apps.googleusercontent.com`)
6. The **Reversed Client ID** is: `com.googleusercontent.apps.XXXXXX`

#### 2.3 Update Info.plist URL Schemes

You need to add URL schemes for each environment. We'll do this in Step 3.

### Step 3: Configure Xcode Build Settings

#### 3.1 Open the Project in Xcode

```bash
open EquiDuty/EquiDuty.xcodeproj
```

#### 3.2 Create New Build Configurations

1. Select the **EquiDuty** project in Project Navigator
2. Select the **EquiDuty** project (not target) in the editor
3. Go to **Info** tab
4. Under **Configurations**, click **+** button at the bottom
5. Duplicate **Debug** → Rename to **Development**
6. Duplicate **Debug** → Rename to **Staging**
7. Duplicate **Release** → Rename to **Production**
8. You should now have:
   - Development
   - Staging
   - Production

#### 3.3 Assign xcconfig Files to Build Configurations

1. Still in **Info** tab → **Configurations**
2. For each configuration, expand it and for the **EquiDuty** target:
   - **Development** → Select `Configuration/Development.xcconfig`
   - **Staging** → Select `Configuration/Staging.xcconfig`
   - **Production** → Select `Configuration/Production.xcconfig`

#### 3.4 Add Firebase Config Copy Build Phase

1. Select **EquiDuty** target (not project)
2. Go to **Build Phases** tab
3. Click **+** → **New Run Script Phase**
4. Drag it to run **before** "Compile Sources"
5. Rename to "Copy Firebase Config"
6. Add this script:

```bash
# Copy Firebase Configuration
"${SRCROOT}/Scripts/copy-firebase-config.sh"
```

7. Under **Input Files**, add:
```
$(SRCROOT)/$(TARGET_NAME)/Configuration/Firebase/$(FIREBASE_CONFIG_FILENAME).plist
```

8. Under **Output Files**, add:
```
$(BUILT_PRODUCTS_DIR)/$(PRODUCT_NAME).app/GoogleService-Info.plist
```

#### 3.5 Update Info.plist for URL Schemes

1. Open `EquiDuty/Info.plist` in Xcode
2. Find `CFBundleURLTypes` array
3. Currently it has one scheme for dev
4. You'll need to update this to use a build setting

**Option A: Use a single URL scheme variable**

Add to each `.xcconfig` file:
```
REVERSED_CLIENT_ID = com.googleusercontent.apps.YOUR_CLIENT_ID
```

Then in Info.plist, change the hard-coded value to `$(REVERSED_CLIENT_ID)`

**Option B: Add all schemes (simpler but less clean)**

Keep the current structure and add URL schemes for all environments in Info.plist.

I recommend **Option A** for cleaner separation.

#### 3.6 Create Schemes for Each Environment

1. Go to **Product** → **Scheme** → **Manage Schemes...**
2. Delete or rename the existing "EquiDuty" scheme
3. Click **+** to add a new scheme:
   - **Name**: EquiDuty Development
   - **Target**: EquiDuty
   - Click **Edit**
   - For **Run**, **Test**, **Profile**, **Analyze**, **Archive**:
     - Set **Build Configuration** to **Development**
   - Check **Shared** if working in a team
4. Repeat for **Staging** and **Production**

### Step 4: Update App Code

#### 4.1 Update EquiDutyApp.swift

Add environment info logging:

```swift
import SwiftUI
import SwiftData
import FirebaseCore
import GoogleSignIn

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()

        // Print environment info for debugging
        #if DEBUG
        Environment.printEnvironmentInfo()
        #endif

        return true
    }
}

// Rest of your app code...
```

### Step 5: Configure API Client to Use Environment

Update your API client to use the environment-specific URL:

```swift
import Foundation

class APIClient {
    static let shared = APIClient()

    private let baseURL: String

    private init() {
        self.baseURL = Environment.current.apiBaseURL
    }

    // Rest of your API client code...
}
```

### Step 6: Test the Setup

#### 6.1 Build and Run Each Configuration

1. Select **EquiDuty Development** scheme
2. Build and run (⌘R)
3. Check console output:
   - Should see environment info printed
   - Should show "Environment: Development"
   - Firebase should initialize with dev project

4. Repeat for **Staging** and **Production** schemes

#### 6.2 Verify App Installation

Each configuration creates a separate app on your device:
- **EquiDuty Dev** (blue/dev icon)
- **EquiDuty Staging** (yellow/staging icon)
- **EquiDuty** (production icon)

All three can be installed simultaneously for testing.

### Step 7: Add Environment-Specific App Icons (Optional)

To visually distinguish environments:

1. Create separate asset catalogs or use build phases
2. Add colored badges to development/staging icons
3. Tools like [Badge](https://github.com/HazAT/badge) can automate this

## 📝 What You Need from Firebase/Google Cloud

### For Each Environment, Collect:

1. **Firebase Project ID** (e.g., `stall-bokning-dev`)
2. **Firebase Web API Key** (from Firebase Console → Project Settings)
3. **Firebase Storage Bucket** (from Firebase Console → Storage)
4. **Google App ID** (from GoogleService-Info.plist)
5. **OAuth 2.0 Client IDs**:
   - iOS Client ID
   - Reversed Client ID
   - Web Client ID (for Firebase Auth)
6. **GCM Sender ID** (from GoogleService-Info.plist)

### Quick Reference Table:

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| Bundle ID | `Maxton.EquiDuty.dev` | `Maxton.EquiDuty.staging` | `Maxton.EquiDuty` |
| Firebase Project | `stall-bokning-dev` | `equiduty-staging` | `equiduty-production` |
| Display Name | EquiDuty Dev | EquiDuty Staging | EquiDuty |
| Build Config | Development | Staging | Production |

## 🔒 Security Considerations

### Add to .gitignore

Add this to your `.gitignore`:

```gitignore
# Firebase Configuration Files
**/GoogleService-Info*.plist
!**/GoogleService-Info-Template.plist

# Xcode user-specific files
*.xcuserstate
*.xcuserdatad/
```

### Environment Variables for CI/CD

For automated builds, store Firebase configs as secrets:

```bash
# GitHub Actions example
- name: Create Firebase Config
  env:
    FIREBASE_CONFIG: ${{ secrets.FIREBASE_CONFIG_STAGING }}
  run: |
    echo "$FIREBASE_CONFIG" > EquiDuty/EquiDuty/Configuration/Firebase/GoogleService-Info-Staging.plist
```

## 🐛 Troubleshooting

### Issue: App crashes with "Could not load Firebase config"

**Solution**:
- Verify the build script ran (check Build Report in Xcode)
- Check that GoogleService-Info.plist exists in the app bundle
- Ensure FIREBASE_CONFIG_FILENAME is set correctly in xcconfig

### Issue: Google Sign-In fails with "Client ID not found"

**Solution**:
- Verify REVERSED_CLIENT_ID in Info.plist matches GoogleService-Info.plist
- Check that URL scheme is registered correctly
- Ensure OAuth Client ID is enabled in Google Cloud Console

### Issue: Wrong Firebase project is being used

**Solution**:
- Check which scheme you're building with
- Verify the scheme's build configuration matches your intent
- Print `Environment.current.firebaseProjectId` to debug

### Issue: Multiple apps can't be installed simultaneously

**Solution**:
- Ensure each configuration has a unique Bundle ID
- Check that PRODUCT_BUNDLE_IDENTIFIER is set correctly in xcconfig files
- Clean build folder (⇧⌘K) and rebuild

## 🚀 Deployment

### Development
- Used for daily development
- Auto-deploy to TestFlight beta track "Internal Testing"

### Staging
- Used for QA and pre-production testing
- Deploy to TestFlight beta track "External Testing"
- Mirrors production environment

### Production
- Released to App Store
- Requires thorough testing in Staging first
- Follow App Store review guidelines

## 📚 Additional Resources

- [Firebase iOS Setup](https://firebase.google.com/docs/ios/setup)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios/start)
- [Xcode Build Configuration Files](https://nshipster.com/xcconfig/)
- [Managing Different Environments](https://www.appcoda.com/xcconfig-guide/)

## 🎓 Learning Tips

1. **Start with Development**: Get comfortable with the dev environment first
2. **Test Each Configuration**: Build and run each scheme to verify setup
3. **Use Environment Helper**: Call `Environment.printEnvironmentInfo()` to debug
4. **Check Bundle IDs**: Verify correct bundle ID is used in each build
5. **Monitor Console**: Watch for Firebase initialization messages

---

**Next Steps:**
1. ✅ Follow Step 1 to obtain Firebase configs for staging and production
2. ✅ Follow Step 2-3 to configure Xcode
3. ✅ Follow Step 4-6 to update code and test
4. 🎉 You're done! You now have multi-environment support
