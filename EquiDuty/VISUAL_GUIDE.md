# 📱 iOS Multi-Environment Visual Guide

## 🎯 The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                   Your Development Flow                     │
└─────────────────────────────────────────────────────────────┘

   1️⃣ SELECT SCHEME          2️⃣ BUILD PROCESS          3️⃣ RUNTIME

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Choose Scheme   │      │  Xcode Builds    │      │   App Runs       │
│                  │      │                  │      │                  │
│ • EquiDuty Dev   │──────▶  Loads .xcconfig │──────▶  Uses correct   │
│ • EquiDuty Stage │      │  Runs script     │      │  Firebase        │
│ • EquiDuty Prod  │      │  Copies config   │      │  & API URLs      │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

## 🔄 Complete Build Flow

```
YOU SELECT SCHEME
       │
       ▼
┌─────────────────────────────────────────────┐
│  Xcode Scheme: "EquiDuty Staging"           │
│  Build Configuration: Staging               │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Loads: Configuration/Staging.xcconfig      │
│  Sets:                                      │
│    PRODUCT_BUNDLE_IDENTIFIER = ...staging   │
│    FIREBASE_CONFIG_FILENAME = ...-Staging   │
│    SWIFT_ACTIVE_COMPILATION_CONDITIONS      │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Runs: Scripts/copy-firebase-config.sh      │
│  Action: Copy GoogleService-Info-Staging    │
│  To: App Bundle/GoogleService-Info.plist    │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Compiles Swift code with flags:            │
│    #if STAGING                              │
│    Environment.current = .staging           │
│    #endif                                   │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Creates App with:                          │
│    Bundle ID: Maxton.EquiDuty.staging       │
│    Display Name: EquiDuty Staging           │
│    Firebase Config: Staging project         │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  App Launches:                              │
│    FirebaseApp.configure()                  │
│    Environment.current.apiBaseURL           │
│    Ready to use staging environment! ✅     │
└─────────────────────────────────────────────┘
```

## 📁 File Relationships

```
EquiDuty Project
│
├─ Configuration/
│  ├─ Development.xcconfig ─────┐
│  ├─ Staging.xcconfig ──────────┼─── Xcode Build Settings
│  └─ Production.xcconfig ───────┘
│
├─ Scripts/
│  └─ copy-firebase-config.sh ──────── Run at Build Time
│
└─ EquiDuty/
   ├─ Configuration/Firebase/
   │  ├─ GoogleService-Info-Dev.plist ──────┐
   │  ├─ GoogleService-Info-Staging.plist ───┼─ Source Files
   │  └─ GoogleService-Info-Production.plist ┘  (Build script picks one)
   │
   └─ Core/Configuration/
      └─ Environment.swift ──────────────────── Runtime Detection
```

## 🎨 Three Apps, One Codebase

```
┌─────────────────────────────────────────────────────────────────┐
│                       YOUR iOS DEVICE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ 🟦 Dev       │  │ 🟨 Staging   │  │ 🟩 Production│         │
│  │              │  │              │  │              │         │
│  │ EquiDuty Dev │  │ EquiDuty     │  │ EquiDuty     │         │
│  │              │  │ Staging      │  │              │         │
│  │ .dev         │  │ .staging     │  │ (no suffix)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│        │                 │                  │                   │
│        ▼                 ▼                  ▼                   │
│  ┌─────────────────────────────────────────────────┐          │
│  │         Different Firebase Projects             │          │
│  ├─────────────────────────────────────────────────┤          │
│  │ stall-bokning-dev                               │          │
│  │ equiduty-staging                                │          │
│  │ equiduty-production                             │          │
│  └─────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔍 Environment Detection at Runtime

```swift
// In your code, this automatically works:

let env = Environment.current

switch env {
case .development:
    // Firebase: stall-bokning-dev
    // API: dev-api-service
    // Can have debug logging
    print("Running in DEV")

case .staging:
    // Firebase: equiduty-staging
    // API: staging-api-service
    // Mirrors production
    print("Running in STAGING")

case .production:
    // Firebase: equiduty-production
    // API: api.equiduty.se
    // Optimized, no debug logs
    print("Running in PRODUCTION")
}

// Use environment-specific settings
let apiURL = Environment.current.apiBaseURL
let projectId = Environment.current.firebaseProjectId
```

## 📊 Configuration Inheritance

```
                    ┌─────────────────┐
                    │  Base Settings  │
                    │  (Xcode Defaults)│
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Development  │  │   Staging    │  │  Production  │
    │   .xcconfig  │  │   .xcconfig  │  │   .xcconfig  │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                │                │
    ┌───────┴───────┐  ┌─────┴────────┐  ┌───┴─────────┐
    │ Bundle: .dev  │  │ Bundle: .stg │  │ Bundle: prod│
    │ Config: -Dev  │  │ Config: -Stg │  │ Config: Prod│
    │ DEVELOPMENT   │  │ STAGING      │  │ PRODUCTION  │
    │ flag set      │  │ flag set     │  │ flag set    │
    └───────────────┘  └──────────────┘  └─────────────┘
```

## 🎯 Quick Decision Tree

```
Need to build the app?
│
├─ For daily development?
│  └─▶ Use "EquiDuty Development" scheme
│      • Fast builds
│      • Debug logging
│      • Local or dev API
│
├─ For QA testing?
│  └─▶ Use "EquiDuty Staging" scheme
│      • Matches production setup
│      • Separate data
│      • Safe to test
│
└─ For App Store release?
   └─▶ Use "EquiDuty Production" scheme
       • Optimized builds
       • No debug code
       • Real user data
```

## 🛠️ Xcode Project Structure

```
EquiDuty.xcodeproj
├─ Project: EquiDuty
│  └─ Info
│     └─ Configurations
│        ├─ Development ──▶ Configuration/Development.xcconfig
│        ├─ Staging ─────▶ Configuration/Staging.xcconfig
│        └─ Production ──▶ Configuration/Production.xcconfig
│
└─ Target: EquiDuty
   ├─ Build Settings (inherited from xcconfig)
   ├─ Build Phases
   │  ├─ Copy Firebase Config ◀── Our custom script
   │  ├─ Compile Sources
   │  └─ Link Frameworks
   └─ Info.plist
      └─ CFBundleURLTypes ◀── Uses $(REVERSED_CLIENT_ID)
```

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────┐
│             Git Repository (Public/Team)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✅ SAFE TO COMMIT:                                 │
│  • Development.xcconfig (no secrets)                │
│  • Staging.xcconfig (no secrets)                    │
│  • Production.xcconfig (no secrets)                 │
│  • Environment.swift (no secrets)                   │
│  • copy-firebase-config.sh (just logic)             │
│  • GoogleService-Info-Template.plist                │
│                                                     │
│  ❌ NEVER COMMIT:                                    │
│  • GoogleService-Info-Dev.plist                     │
│  • GoogleService-Info-Staging.plist                 │
│  • GoogleService-Info-Production.plist              │
│                                                     │
└─────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│          Developer's Local Machine                  │
├─────────────────────────────────────────────────────┤
│  • Has all three GoogleService-Info plists          │
│  • Can build all environments                       │
│  • Configs stored in password manager               │
└─────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│               CI/CD Pipeline                        │
├─────────────────────────────────────────────────────┤
│  • Gets configs from secrets manager                │
│  • Creates plists at build time                     │
│  • Never logs sensitive data                        │
└─────────────────────────────────────────────────────┘
```

## 📋 What Each File Does

```
┌──────────────────────────────────────────────────┐
│ Development.xcconfig                             │
├──────────────────────────────────────────────────┤
│ Tells Xcode:                                     │
│ • Bundle ID = Maxton.EquiDuty.dev                │
│ • Use GoogleService-Info-Dev.plist               │
│ • Set DEVELOPMENT compiler flag                  │
│ • Enable testability                             │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ copy-firebase-config.sh                          │
├──────────────────────────────────────────────────┤
│ At build time:                                   │
│ 1. Reads FIREBASE_CONFIG_FILENAME from xcconfig  │
│ 2. Copies matching plist from Configuration/    │
│ 3. Places in app bundle as GoogleService-Info   │
│ 4. Logs success/failure                          │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Environment.swift                                │
├──────────────────────────────────────────────────┤
│ At runtime:                                      │
│ • Checks #if DEVELOPMENT / STAGING / PRODUCTION  │
│ • Returns correct environment enum               │
│ • Provides environment-specific URLs             │
│ • Used by entire app for config                  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ GoogleService-Info-*.plist                       │
├──────────────────────────────────────────────────┤
│ Contains:                                        │
│ • Firebase project connection info               │
│ • OAuth client IDs for Google Sign-In            │
│ • Storage bucket URLs                            │
│ • API keys (safe for iOS apps)                   │
│                                                  │
│ Loaded by Firebase SDK automatically             │
└──────────────────────────────────────────────────┘
```

## 🎓 Learning the Flow

### Day 1: Understanding
```
Read this guide → Understand file structure → Check existing setup
```

### Day 2: Configuration
```
Create Firebase projects → Download configs → Configure Xcode
```

### Day 3: Testing
```
Build Development → Build Staging → Build Production → Verify each works
```

### Day 4: Development
```
Use Development for daily work → Push to Staging for testing → Deploy Production when ready
```

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Console shows correct environment on launch
2. ✅ Firebase connects to right project
3. ✅ Google Sign-In works in each environment
4. ✅ All three apps install simultaneously
5. ✅ Each app has unique icon/name
6. ✅ API calls go to correct endpoints
7. ✅ No Firebase configs in Git

---

**Visual Guide Complete!** 🎉

For detailed steps, see [README_ENVIRONMENTS.md](./README_ENVIRONMENTS.md)
