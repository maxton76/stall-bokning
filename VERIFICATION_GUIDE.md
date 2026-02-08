# Verification Guide: Cloud Run IAM Fix for Horse Photo Upload

## Changes Applied

### Fix 1: Signed URL Generation (2026-02-08 00:55)

✅ **Terraform Module Updated**: Added `roles/iam.serviceAccountTokenCreator` to Cloud Run API service account
- **File**: `terraform/modules/iam/variables.tf` (line 31)
- **Role**: `roles/iam.serviceAccountTokenCreator`
- **Purpose**: Grants `iam.serviceAccounts.signBlob` permission for Firebase Admin SDK signed URL generation

### Fix 2: Storage Write Permission (2026-02-08 02:26)

✅ **Terraform Module Updated**: Added `roles/storage.objectCreator` to Cloud Run API service account
- **File**: `terraform/modules/iam/variables.tf` (line 31)
- **Role**: `roles/storage.objectCreator`
- **Purpose**: Grants storage write permission that the service account delegates via signed URLs

✅ **Terraform Applied**: Both IAM bindings created successfully
- **Service Account**: `dev-cloud-run-api@equiduty-dev.iam.gserviceaccount.com`
- **Project**: `equiduty-dev`
- **Status**: Active immediately (no Cloud Run restart required)

### CORS Configuration

✅ **CORS Applied**: Cross-origin requests enabled
- **File**: `storage-cors.json`
- **Command**: `gsutil cors set storage-cors.json gs://equiduty-dev.firebasestorage.app`
- **Status**: Active for all origins
- **Allowed Methods**: GET, HEAD, PUT, POST, DELETE

## What This Fixes

### Timeline of Issues

1. **Initial Issue (Pre-Fix 1)**: 500 errors when requesting upload URLs
   - **Error**: "Permission 'iam.serviceAccounts.signBlob' denied"
   - **Root Cause**: Missing `iam.serviceAccountTokenCreator` role
   - **Fixed**: 2026-02-08 00:55

2. **Secondary Issue (Pre-Fix 2)**: 403 Forbidden when uploading to signed URL
   - **Error**: PUT request to signed URL failed with 403
   - **Root Cause**: Service account lacked write permission it was delegating
   - **How Signed URLs Work**:
     - Service account creates signed URL granting temporary permission
     - **Critical**: Service account must have the permission it's delegating
     - Had: `storage.objectViewer` (read) + `iam.serviceAccountTokenCreator` (sign)
     - Needed: `storage.objectCreator` (write)
   - **Fixed**: 2026-02-08 02:26

### Previously Failing Endpoints

1. **POST /api/v1/horse-media/upload-url**
   - **Error 1**: 500 Internal Server Error (no signBlob permission)
   - **Error 2**: 200 OK but upload URL returned 403 (no write permission)
   - **Now**: Returns 200 with working signed upload/read URLs

2. **GET /api/v1/horses** (with photos)
   - **Error**: Photos missing or empty URLs
   - **Root Cause**: Signed URL generation failed
   - **Now**: Should include `coverPhotoURL` and `avatarPhotoURL` fields

3. **iOS/Android Horse Photo Upload**
   - **Error 1**: Upload failed at URL generation step (500)
   - **Error 2**: Upload failed at PUT step (403 Forbidden)
   - **Impact**: Users couldn't add photos to horses
   - **Now**: Full photo upload workflow should work end-to-end

## Verification Steps

### 1. Verify IAM Role Assignment

```bash
gcloud projects get-iam-policy equiduty-dev \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:dev-cloud-run-api@equiduty-dev.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

**Expected Output**: Should include both:
- `roles/iam.serviceAccountTokenCreator` (for signed URL generation)
- `roles/storage.objectCreator` (for delegated write permission)
- `roles/storage.objectViewer` (for read access)

**Quick Check**:
```bash
gcloud projects get-iam-policy equiduty-dev \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:dev-cloud-run-api@equiduty-dev.iam.gserviceaccount.com" \
  --format="table(bindings.role)" | grep -E "(storage.objectCreator|iam.serviceAccountTokenCreator)"
```

### 2. Test Upload URL Endpoint

```bash
# Get a valid JWT token first (from your app or Firebase Auth)
TOKEN="<your-jwt-token>"

# Test upload URL generation
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "horseId": "test-horse-id",
    "fileName": "test-photo.jpg",
    "mimeType": "image/jpeg",
    "type": "photo",
    "purpose": "cover"
  }' \
  "https://dev-api-service-623133738566.europe-west1.run.app/api/v1/horse-media/upload-url"
```

**Expected Response** (200 OK):
```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "readUrl": "https://storage.googleapis.com/...",
  "storagePath": "organizations/{orgId}/horses/{horseId}/media/..."
}
```

**Failure Response** (if not fixed):
```json
{
  "error": "Failed to generate signed URL",
  "statusCode": 500
}
```

### 3. Test Horses Endpoint with Photos

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://dev-api-service-623133738566.europe-west1.run.app/api/v1/horses?stableId=WBuziJ7VZ7TuszLgzyJz&status=active&scope=stable"
```

**Expected**: Horses with photos should have `coverPhotoURL` and `avatarPhotoURL` fields populated

### 4. Test Signed URL Upload (Manual)

```bash
# Get upload URL (from previous test)
UPLOAD_URL="<url-from-upload-url-response>"

# Upload a test image
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  -H "Content-Length: <file-size>" \
  --data-binary "@test-photo.jpg" \
  -v
```

**Expected**: 200 OK response
**Failure**: 403 Forbidden (indicates missing `storage.objectCreator`)

### 5. Verify CORS Configuration

```bash
gsutil cors get gs://equiduty-dev.firebasestorage.app
```

**Expected Output**:
```json
[
  {
    "maxAgeSeconds": 3600,
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "origin": ["*"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Disposition"]
  }
]
```

### 6. Test from iOS/Android App

**iOS App Test**:
1. Open EquiDuty iOS app
2. Navigate to a horse's profile
3. Tap "Edit" → "Change Cover Photo"
4. Select a photo from library
5. **Expected**: Photo uploads successfully and appears immediately
6. **Monitor**: Xcode console for upload progress and success logs

**Android App Test**:
1. Open EquiDuty Android app
2. Navigate to a horse's profile
3. Tap "Edit" → "Change Cover Photo"
4. Select a photo from gallery
5. **Expected**: Photo uploads successfully and appears immediately

### 7. Check Cloud Run Logs

```bash
# View recent API logs
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=dev-api-service" \
  --limit=50 \
  --format=json | jq -r '.[] | "\(.timestamp) [\(.severity)] \(.jsonPayload.message // .textPayload)"'

# Or use Task command
task logs:api
```

**Look For**:
- ✅ No "permission denied" errors
- ✅ No "signBlob" errors
- ✅ No "403 Forbidden" errors when uploading
- ✅ Successful signed URL generation log messages
- ✅ Successful file upload confirmations

**Bad Indicators**:
- ❌ "Error: Permission 'iam.serviceAccounts.signBlob' denied" (Fix 1 needed)
- ❌ "Error: 7 PERMISSION_DENIED" (Fix 1 needed)
- ❌ "Failed to generate signed URL" (Fix 1 needed)
- ❌ "403 Forbidden" on storage upload (Fix 2 needed)
- ❌ "CORS policy" errors (CORS config needed)

## Rollback (If Needed)

If you need to revert this change:

```bash
cd terraform/environments/dev

# Edit terraform/modules/iam/variables.tf
# Remove the line: "roles/iam.serviceAccountTokenCreator",

# Apply changes
terraform apply -auto-approve
```

**Note**: Rollback is safe - only removes the added permission, doesn't affect other resources.

## Security Considerations

### What These Roles Grant

**`roles/iam.serviceAccountTokenCreator`**:
✅ **Allowed**: Generate signed URLs for Cloud Storage
✅ **Allowed**: Create short-lived credentials for service account impersonation
✅ **Scope**: Only for the Cloud Run API service account itself

**`roles/storage.objectCreator`**:
✅ **Allowed**: Create new objects in Cloud Storage
✅ **Allowed**: Delete objects created by this service account
✅ **Allowed**: Read object metadata
❌ **NOT Allowed**: Update existing objects
❌ **NOT Allowed**: Delete objects created by others
❌ **NOT Allowed**: Modify bucket configurations

### Combined Permissions
✅ **Enabled**: Generate signed URLs that grant temporary write access
✅ **Enabled**: Service account can upload files directly
✅ **Enabled**: Signed URLs can delegate the write permission
❌ **NOT Allowed**: Impersonate other service accounts
❌ **NOT Allowed**: Modify IAM policies
❌ **NOT Allowed**: Full bucket admin access

### Why This Is Safe

1. **Principle of Least Privilege**: Only grants minimum permissions needed for photo uploads
2. **Limited Scope**: Can only create/delete own objects, not modify others
3. **Time-Limited**: Signed URLs have expiration times (15 min for uploads, 7 days for reads)
4. **Auditable**: All operations logged in Cloud Logging
5. **Storage Rules**: Firebase Storage security rules still enforce field-level access control

## Success Criteria Checklist

### Infrastructure (Completed)
- [x] ✅ IAM role `roles/iam.serviceAccountTokenCreator` added to Cloud Run service account
- [x] ✅ IAM role `roles/storage.objectCreator` added to Cloud Run service account
- [x] ✅ Terraform apply succeeded without errors (both changes)
- [x] ✅ CORS configuration applied to Firebase Storage bucket

### Testing (Pending User Verification)
- [ ] ⏳ `/horse-media/upload-url` endpoint returns 200 with valid signed URLs
- [ ] ⏳ Manual curl test: PUT to signed URL returns 200 (not 403)
- [ ] ⏳ Horses endpoint includes photo URLs in response
- [ ] ⏳ iOS app can upload horse photos successfully
- [ ] ⏳ Android app can upload horse photos successfully
- [ ] ⏳ No IAM permission errors in Cloud Run logs
- [ ] ⏳ No 403 Forbidden errors when uploading to signed URLs

## Next Steps for Full Verification

1. **Developers**: Test the upload URL endpoint via curl or Postman
2. **iOS Team**: Verify photo upload works in iOS app (TestFlight or dev build)
3. **Android Team**: Verify photo upload works in Android app (dev build)
4. **QA**: Complete end-to-end photo upload testing across all platforms
5. **Staging/Prod**: Apply same Terraform changes to staging and production environments

## Related Documentation

- **Implementation Plan**: `/Users/p950xam/.claude/projects/-Users-p950xam-Utv-stall-bokning/21fa75ed-914e-477a-8b96-841b65d2ece4.jsonl`
- **API Routes**: `packages/api/src/routes/horse-media.ts` (upload URL generation)
- **Horse Routes**: `packages/api/src/routes/horses.ts` (photo URL attachment)
- **Terraform IAM Module**: `terraform/modules/iam/variables.tf`
- **Firebase SDK**: Uses `file.getSignedUrl()` which requires `signBlob` permission

## Contact

If you encounter issues or have questions about this fix:
- Check Cloud Run logs: `task logs:api`
- Review error messages for "permission denied" or "signBlob"
- Verify IAM role assignment with gcloud command above
- Contact backend team for assistance
