# Staging Google Services Configuration

Place the `google-services.json` file for the **staging** environment in this directory.

## How to get the file:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the **equiduty-staging** project
3. Go to Project Settings → Your apps → Android app
4. Download `google-services.json`
5. Place it in this directory: `EquiDuty-Android/app/src/staging/google-services.json`

## Important:
- **DO NOT** commit this file to git (already in .gitignore)
- The package name should be: `maxton.EquiDuty.staging`
- The file must be named exactly: `google-services.json`
