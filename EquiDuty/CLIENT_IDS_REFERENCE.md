# OAuth Client IDs Reference

This document tracks your Google OAuth Client IDs for each environment.

## ✅ Development (Configured)

**Bundle ID:** `Maxton.EquiDuty.dev`
**Firebase Project:** `stall-bokning-dev`

**Client ID:**
```
1040307775882-f3r9t5gjeh6sea96aul8d7s3sbhskg1p.apps.googleusercontent.com
```

**Reversed Client ID:**
```
com.googleusercontent.apps.1040307775882-f3r9t5gjeh6sea96aul8d7s3sbhskg1p
```

**Note:** This matches the CLIENT_ID in your GoogleService-Info-Dev.plist

**Status:** ✅ Configured in `Configuration/Development.xcconfig`

---

## ⚠️ Staging (Pending)

**Bundle ID:** `Maxton.EquiDuty.staging`
**Firebase Project:** `equiduty-staging` (to be created)

### Steps to Get Staging Client ID:

1. Create Firebase project: `equiduty-staging`
2. Register iOS app with Bundle ID: `Maxton.EquiDuty.staging`
3. Enable Google Sign-In in Firebase Authentication
4. Go to [Google Cloud Console](https://console.cloud.google.com/)
5. Select project: `equiduty-staging`
6. Navigate to: **APIs & Services** → **Credentials**
7. Find the iOS OAuth 2.0 Client ID
8. Copy the Client ID (format: `XXXXX.apps.googleusercontent.com`)
9. Derive Reversed Client ID: `com.googleusercontent.apps.XXXXX`

**Client ID:**
```
[TO BE FILLED - Format: XXXXX-YYYYYYY.apps.googleusercontent.com]
```

**Reversed Client ID:**
```
[TO BE FILLED - Format: com.googleusercontent.apps.XXXXX-YYYYYYY]
```

**Update Location:** `Configuration/Staging.xcconfig`

---

## ⚠️ Production (Pending)

**Bundle ID:** `Maxton.EquiDuty`
**Firebase Project:** `equiduty-production` (to be created)

### Steps to Get Production Client ID:

1. Create Firebase project: `equiduty-production`
2. Register iOS app with Bundle ID: `Maxton.EquiDuty`
3. Enable Google Sign-In in Firebase Authentication
4. Go to [Google Cloud Console](https://console.cloud.google.com/)
5. Select project: `equiduty-production`
6. Navigate to: **APIs & Services** → **Credentials**
7. Find the iOS OAuth 2.0 Client ID
8. Copy the Client ID (format: `XXXXX.apps.googleusercontent.com`)
9. Derive Reversed Client ID: `com.googleusercontent.apps.XXXXX`

**Client ID:**
```
[TO BE FILLED - Format: XXXXX-YYYYYYY.apps.googleusercontent.com]
```

**Reversed Client ID:**
```
[TO BE FILLED - Format: com.googleusercontent.apps.XXXXX-YYYYYYY]
```

**Update Location:** `Configuration/Production.xcconfig`

---

## 🔍 How to Find Your Client IDs

### Method 1: From GoogleService-Info.plist

After downloading the `GoogleService-Info.plist` from Firebase:

1. Open the plist file
2. Find the key: `CLIENT_ID`
   - Value: `XXXXX-YYYYYYY.apps.googleusercontent.com`
3. Find the key: `REVERSED_CLIENT_ID`
   - Value: `com.googleusercontent.apps.XXXXX-YYYYYYY`

### Method 2: From Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Select your Firebase project
3. Click **APIs & Services** → **Credentials**
4. Look for OAuth 2.0 Client IDs section
5. Find the iOS client (created automatically by Firebase)
6. Click on it to see the full Client ID

---

## 📝 Quick Update Instructions

When you get a new Client ID for Staging or Production:

### Step 1: Update xcconfig file

Edit the respective file:
- Staging: `Configuration/Staging.xcconfig`
- Production: `Configuration/Production.xcconfig`

Replace this line:
```
REVERSED_CLIENT_ID = REPLACE_WITH_XXX_REVERSED_CLIENT_ID
```

With your actual Reversed Client ID:
```
REVERSED_CLIENT_ID = com.googleusercontent.apps.YOUR-ACTUAL-CLIENT-ID
```

### Step 2: Update this reference document

Fill in the Client ID and Reversed Client ID sections above for future reference.

### Step 3: Verify in Xcode

1. Open Xcode
2. Select the appropriate scheme (Staging or Production)
3. Build & Run
4. Test Google Sign-In
5. Should work without errors

---

## 🔒 Security Notes

**⚠️ Important:**
- These Client IDs are safe to commit to Git (they're public by design)
- The corresponding secrets are managed by Google
- Never commit the full `GoogleService-Info.plist` files
- Keep API Keys from Firebase in the plist files (not in xcconfig)

**What's in xcconfig (safe to commit):**
- ✅ REVERSED_CLIENT_ID
- ✅ Bundle Identifiers
- ✅ Display Names
- ✅ Build Settings

**What's in plist (DO NOT commit):**
- ❌ Full GoogleService-Info.plist files
- ❌ API_KEY
- ❌ GCM_SENDER_ID
- ❌ GOOGLE_APP_ID
- ❌ Storage Bucket URLs

---

## ✅ Verification Checklist

Before deploying to a new environment:

- [ ] Client ID obtained from Google Cloud Console
- [ ] Reversed Client ID derived correctly
- [ ] Updated in respective `.xcconfig` file
- [ ] Info.plist uses `$(REVERSED_CLIENT_ID)` variable
- [ ] Scheme created in Xcode for environment
- [ ] Build succeeds without errors
- [ ] Google Sign-In tested and working
- [ ] This reference document updated

---

## 📚 Related Documentation

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- Main Setup Guide: [FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md)
- Environment Overview: [README_ENVIRONMENTS.md](./README_ENVIRONMENTS.md)

---

**Last Updated:** February 6, 2025
**Development Client ID:** ✅ Configured
**Staging Client ID:** ⚠️ Pending
**Production Client ID:** ⚠️ Pending
