# Horse Photo Upload Fix - Complete Summary

## Problem Statement

Users experienced 403 Forbidden errors when uploading horse photos through the iOS app, even after the initial fix that added signed URL generation capability.

## Root Cause Analysis

### How Signed URLs Work
1. Service account creates a signed URL with a specific action (e.g., "write")
2. The signed URL grants **temporary permission** to anyone who has the URL
3. **Critical constraint**: The service account **must possess the permission it's delegating**

### The Issue
- The Cloud Run API service account had:
  - ✅ `roles/iam.serviceAccountTokenCreator` - Can generate signed URLs
  - ✅ `roles/storage.objectViewer` - Can read from storage
  - ❌ Missing: `roles/storage.objectCreator` - Can write to storage

- When generating a signed URL for **write access**, the service account was trying to delegate a permission it didn't have.
- Result: Signed URL was created successfully (200 OK), but actual upload attempts failed with 403 Forbidden.

## Complete Solution

### Fix 1: Signed URL Generation (Already Applied - 2026-02-08 00:55)
Added `roles/iam.serviceAccountTokenCreator` to enable signed URL generation.

### Fix 2: Storage Write Permission (Applied - 2026-02-08 02:26)
Added `roles/storage.objectCreator` to allow the service account to delegate write permissions via signed URLs.

**File Modified**: `terraform/modules/iam/variables.tf`

**Change**:
```hcl
variable "cloud_run_api_roles" {
  description = "IAM roles to grant to the Cloud Run API service account"
  type        = list(string)
  default = [
    "roles/datastore.user",
    "roles/firebaseauth.admin",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectViewer",         # Read from storage
    "roles/storage.objectCreator",        # ← ADDED: Write to storage
    "roles/iam.serviceAccountTokenCreator", # Generate signed URLs
    "roles/logging.logWriter",
    "roles/cloudtrace.agent",
    "roles/monitoring.metricWriter",
    "roles/aiplatform.user",
  ]
}
```

### CORS Configuration (Already Applied)
The `storage-cors.json` configuration was already applied to the Firebase Storage bucket, allowing cross-origin requests from the mobile apps.

## Implementation Status

### ✅ Completed
1. Updated `terraform/modules/iam/variables.tf` with `roles/storage.objectCreator`
2. Released Terraform state lock
3. Ran `terraform plan` - confirmed 1 resource to add (IAM binding)
4. Ran `terraform apply` - successfully created IAM binding
5. Verified IAM policy in GCP - both roles present
6. Verified CORS configuration - properly configured
7. Updated documentation:
   - `MEMORY.md` - Added complete fix details
   - `VERIFICATION_GUIDE.md` - Updated with comprehensive testing steps

### ⏳ Pending User Verification
The infrastructure changes are complete, but the fix needs to be tested:

1. **API Endpoint Test**:
   - Request upload URL: `POST /api/v1/horse-media/upload-url`
   - Expected: 200 OK with signed URL
   - Upload to signed URL: `PUT <signed-url>`
   - Expected: 200 OK (not 403 Forbidden)

2. **iOS App Test**:
   - Open horse profile
   - Tap "Edit" → "Change Cover Photo"
   - Select photo from library
   - Expected: Successful upload and immediate display

3. **Verify in Storage**:
   - Check that file appears in Firebase Storage bucket
   - Path: `horses/<horseId>/profile/<filename>`

## Security Implications

### Permissions Granted
- **`storage.objectCreator`**: Minimum privilege for uploads
  - Can create new objects
  - Can delete own objects only
  - Cannot modify or delete others' objects
  - Cannot change bucket configuration

### Why This Is Safe
1. **Least Privilege**: Only grants minimum permissions needed
2. **Limited Scope**: Can't modify/delete objects created by others
3. **Storage Rules**: Firebase Storage security rules still enforce access control
4. **Auditable**: All operations logged in Cloud Logging
5. **Time-Limited**: Signed URLs expire (15 min for uploads)

## Verification Commands

### Check IAM Roles
```bash
gcloud projects get-iam-policy equiduty-dev \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:dev-cloud-run-api@equiduty-dev.iam.gserviceaccount.com" \
  --format="table(bindings.role)" | grep -E "(storage.objectCreator|iam.serviceAccountTokenCreator)"
```

**Expected Output**:
```
roles/iam.serviceAccountTokenCreator
roles/storage.objectCreator
```

### Test Upload Flow
See `VERIFICATION_GUIDE.md` for complete testing procedures including:
- Manual curl tests
- iOS/Android app testing
- Log verification
- Storage file verification

## Next Steps

1. **User Testing** (Required):
   - Test photo upload from iOS app with actual user account
   - Monitor Xcode console for any errors
   - Verify photo appears in horse profile

2. **If Successful**:
   - Mark verification checklist items as complete in `VERIFICATION_GUIDE.md`
   - Apply same Terraform changes to staging/production environments
   - Close issue/ticket

3. **If Issues Persist**:
   - Check Cloud Run logs: `task logs:api`
   - Verify IAM roles with commands above
   - Check for CORS errors in browser console (if web app)
   - Review error messages for specific failure points

## Rollback Plan

If issues occur after these changes:

```bash
cd terraform/environments/dev

# Edit terraform/modules/iam/variables.tf
# Remove line: "roles/storage.objectCreator",

terraform plan
terraform apply
```

**Note**: Rollback is safe - only removes the added permission.

## Related Files

- **Implementation Plan**: Plan file in `.claude/plans/`
- **API Routes**: `packages/api/src/routes/horse-media.ts`
- **Terraform Module**: `terraform/modules/iam/variables.tf`
- **Memory**: `.claude/projects/-Users-p950xam-Utv-stall-bokning/memory/MEMORY.md`
- **Verification Guide**: `VERIFICATION_GUIDE.md`

## Timeline

- **2026-02-08 00:55**: Fix 1 applied - Added `iam.serviceAccountTokenCreator`
- **2026-02-08 01:26**: User reports continued 403 errors
- **2026-02-08 02:26**: Fix 2 applied - Added `storage.objectCreator`
- **2026-02-08 02:28**: Documentation updated
- **Pending**: User verification and testing

## Success Criteria

- [ ] Upload URL generation returns 200 OK
- [ ] PUT to signed URL returns 200 OK (not 403)
- [ ] iOS app uploads photos successfully
- [ ] Photos appear in Firebase Storage
- [ ] Photos display in horse profile
- [ ] No permission errors in Cloud Run logs

---

**Status**: ✅ Infrastructure changes complete, awaiting user testing
**Contact**: Review `VERIFICATION_GUIDE.md` for testing procedures
