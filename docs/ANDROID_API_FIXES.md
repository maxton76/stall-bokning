# Android App API Response Parsing Fixes

**Date**: 2026-02-09
**Status**: Implementation Guide
**Context**: Fix JSON parsing errors in Android app to match EquiDuty API response formats

## Summary

The Android app has two API integration issues:

1. **Tiers endpoint**: Expects wrapped object `{"tiers": [...]}` but API returns array directly `[...]`
2. **Feature toggles**: Calls non-existent `GET /api/v1/feature-toggles` endpoint (404)

## Issue 1: Tiers API Response Format

### Current API Response
**Endpoint**: `GET /api/v1/tiers`
**Returns**: Array directly (NOT wrapped in object)

```json
[
  {
    "tier": "starter",
    "name": "Starter",
    "description": "Basic features for small stables",
    "price": 0,
    "limits": {
      "members": 3,
      "stables": 1,
      "horses": 5,
      ...
    },
    "modules": { ... },
    "addons": { ... },
    "sortOrder": 1,
    "isBillable": false
  },
  ...
]
```

### Android Code Changes Required

#### Option A: Use Typealias (Recommended)

**File**: `app/src/main/java/com/equiduty/data/remote/dto/AuthDtos.kt`

**Remove** the `TierDefinitionsResponseDto` class:
```kotlin
// DELETE THIS (around line 127-130)
@Serializable
data class TierDefinitionsResponseDto(
    val tiers: List<TierDefinitionDto>
)
```

**Add** typealias instead:
```kotlin
// ADD THIS
/**
 * Tiers API returns array directly, not wrapped in object
 * Example: [{"tier": "starter", ...}, {"tier": "pro", ...}]
 */
typealias TierDefinitionsResponseDto = List<TierDefinitionDto>
```

**File**: `app/src/main/java/com/equiduty/data/remote/api/EquiDutyApi.kt`

**Update** return type (around line 32-33):
```kotlin
// BEFORE
@GET("tiers")
suspend fun getTierDefinitions(): TierDefinitionsResponseDto

// AFTER (no change needed if using typealias)
@GET("tiers")
suspend fun getTierDefinitions(): TierDefinitionsResponseDto  // Now resolves to List<TierDefinitionDto>
```

#### Option B: Return List Directly

**File**: `app/src/main/java/com/equiduty/data/remote/api/EquiDutyApi.kt`

```kotlin
@GET("tiers")
suspend fun getTierDefinitions(): List<TierDefinitionDto>  // Direct array
```

Then remove `TierDefinitionsResponseDto` class entirely.

### Update Repository Usage

**File**: `app/src/main/java/com/equiduty/data/repository/SubscriptionRepository.kt`

**Before**:
```kotlin
val response = api.getTierDefinitions()
val tiers = response.tiers  // ❌ Won't work - property doesn't exist
```

**After** (if using Option A - typealias):
```kotlin
val tiers = api.getTierDefinitions()  // ✅ Returns List<TierDefinitionDto> directly
```

**After** (if using Option B - direct list):
```kotlin
val tiers = api.getTierDefinitions()  // ✅ Returns List<TierDefinitionDto> directly
```

## Issue 2: Feature Toggles Endpoint

### Current Situation

The Android app calls: `GET /api/v1/feature-toggles`
**Result**: 404 - Endpoint doesn't exist

### Available Endpoints

The API has two feature toggle endpoints:

1. **Admin endpoint** (system admin only):
   - `GET /api/v1/admin/feature-toggles` - List all toggles
   - `PUT /api/v1/admin/feature-toggles/:key` - Update toggle
   - `DELETE /api/v1/admin/feature-toggles/:key` - Delete toggle

2. **Organization endpoint** (authenticated users):
   - `POST /api/v1/feature-toggles/check` - Check features for org
   - Requires: `x-organization-id` header
   - Body: `{"features": ["feature1", "feature2"]}`
   - Returns: `{"success": true, "data": {"features": {"feature1": {...}, ...}}}`

### Recommended Solution: Remove Feature Toggles

**Reason**: Feature toggles are not used in iOS app and add unnecessary complexity.

**File**: `app/src/main/java/com/equiduty/data/repository/FeatureToggleRepository.kt`

**Option A: Return Empty State** (Simplest)
```kotlin
class FeatureToggleRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    /**
     * Feature toggles endpoint not implemented on backend yet.
     * Returns null to use default app behavior.
     */
    suspend fun getFeatureToggles(): Result<FeatureTogglesDto?> {
        // Skip API call entirely - feature toggles not available yet
        Log.d("FeatureToggleRepository", "Feature toggles not available, using defaults")
        return Result.success(null)
    }
}
```

**Option B: Handle 404 Gracefully** (If toggles are needed)
```kotlin
suspend fun getFeatureToggles(): Result<FeatureTogglesDto?> {
    return try {
        val response = api.getFeatureToggles()
        Result.success(response)
    } catch (e: HttpException) {
        when (e.code()) {
            404 -> {
                // Endpoint not implemented yet - use defaults
                Log.d("FeatureToggleRepository",
                    "Feature toggles endpoint not available (404), using defaults")
                Result.success(null)
            }
            else -> {
                Log.e("FeatureToggleRepository",
                    "Failed to fetch feature toggles: HTTP ${e.code()}", e)
                Result.failure(e)
            }
        }
    } catch (e: Exception) {
        Log.e("FeatureToggleRepository", "Failed to fetch feature toggles", e)
        Result.failure(e)
    }
}
```

**Option C: Use POST /feature-toggles/check** (If feature checks needed)
```kotlin
suspend fun checkFeatures(
    organizationId: String,
    features: List<String>
): Result<Map<String, Boolean>> {
    return try {
        // Add organization header to all API calls that need it
        val response = api.checkFeatureToggles(
            organizationId = organizationId,
            request = CheckFeaturesRequest(features = features)
        )

        if (response.success) {
            // Extract enabled flags from response
            val enabledMap = response.data.features.mapValues { (_, value) ->
                value.enabled
            }
            Result.success(enabledMap)
        } else {
            Result.failure(Exception("Feature check failed"))
        }
    } catch (e: HttpException) {
        when (e.code()) {
            404 -> Result.success(emptyMap())  // Not available
            403 -> Result.failure(Exception("No access to organization"))
            else -> Result.failure(e)
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

**File**: `app/src/main/java/com/equiduty/data/remote/api/EquiDutyApi.kt`

If using Option C, update API interface:
```kotlin
@POST("feature-toggles/check")
suspend fun checkFeatureToggles(
    @Header("x-organization-id") organizationId: String,
    @Body request: CheckFeaturesRequest
): FeatureToggleCheckResponse

// Add DTOs
@Serializable
data class CheckFeaturesRequest(
    val features: List<String>
)

@Serializable
data class FeatureToggleCheckResponse(
    val success: Boolean,
    val data: FeatureToggleCheckData
)

@Serializable
data class FeatureToggleCheckData(
    val features: Map<String, FeatureToggleResult>
)

@Serializable
data class FeatureToggleResult(
    val enabled: Boolean,
    val reason: String? = null
)
```

## Implementation Checklist

### Step 1: Fix Tiers Parsing ✅
- [ ] Open `AuthDtos.kt`
- [ ] Replace `TierDefinitionsResponseDto` class with typealias
- [ ] Verify `TierDefinitionDto` has all required fields
- [ ] Update `SubscriptionRepository.kt` to use array directly
- [ ] Test tier loading in app

### Step 2: Handle Feature Toggles ✅
- [ ] Decide: Remove, handle 404, or implement POST endpoint
- [ ] Update `FeatureToggleRepository.kt` with chosen solution
- [ ] Remove API endpoint from `EquiDutyApi.kt` if not needed
- [ ] Update ViewModels/UI that depend on feature toggles
- [ ] Test login flow without feature toggles

### Step 3: Verify Changes ✅
- [ ] Build app successfully
- [ ] Login with Google
- [ ] Verify tiers load without errors
- [ ] Verify no 404 errors for feature toggles
- [ ] Check logs for successful responses
- [ ] Test dashboard/today view loads correctly

## Testing

### Before Fix
```
E  JsonDecodingException: Expected start of the object '{', but had '[' instead
   at line 1 column 1 path: $
   at TierDefinitionsResponseDto.deserialize(AuthDtos.kt:127)

E  HttpException: HTTP 404
   Route GET /api/v1/feature-toggles not found
```

### After Fix (Expected)
```
D  SubscriptionRepository: Loaded 5 tier definitions
D  FeatureToggleRepository: Feature toggles not available, using defaults
D  AuthViewModel: Login successful
D  OrganizationRepository: Loaded 2 stables for org l7889CZl2QPKmKJBPb8L
```

### Manual Testing Steps

1. **Clean Build**:
   ```bash
   ./gradlew clean
   ./gradlew assembleDebug
   ```

2. **Install and Run**:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   adb logcat | grep -E "EquiDuty|Subscription|FeatureToggle|Auth"
   ```

3. **Login Flow**:
   - Open app
   - Tap "Sign in with Google"
   - Complete Google auth
   - Verify tiers load (check logcat)
   - Verify dashboard loads

4. **Check Responses**:
   ```bash
   # Monitor HTTP traffic
   adb logcat | grep -E "OkHttp|Retrofit"
   ```

## Files Modified

```
app/src/main/java/com/equiduty/
├── data/
│   ├── remote/
│   │   ├── api/EquiDutyApi.kt              # Update getTierDefinitions() return type
│   │   └── dto/AuthDtos.kt                 # Change to typealias
│   └── repository/
│       ├── SubscriptionRepository.kt       # Update to use array directly
│       └── FeatureToggleRepository.kt      # Add 404 handling or return null
```

## Reference: iOS Implementation

The iOS app handles these endpoints correctly:

**Tiers** (`ios/EquiDuty/Services/SubscriptionService.swift`):
```swift
func loadTierDefinitions() async throws -> [TierDefinition] {
    // iOS expects array directly, not wrapped
    let tiers: [TierDefinition] = try await apiClient.get("/tiers")
    return tiers
}
```

**Feature Toggles**: Not used in iOS app.

## API Contract Documentation

### GET /api/v1/tiers

**Response Format**: JSON Array (NOT object wrapper)

```json
[
  {
    "tier": "starter|lite|pro|enterprise",
    "name": "Display name",
    "description": "Marketing description",
    "price": 0,
    "limits": {
      "members": 3,
      "stables": 1,
      "horses": 5,
      "routineTemplates": 2,
      "routineSchedules": 1,
      "feedingPlans": 5,
      "facilities": 1,
      "contacts": 5,
      "supportContacts": 0
    },
    "modules": {
      "analytics": false,
      "selectionProcess": false,
      "locationHistory": false,
      "photoEvidence": false,
      "leaveManagement": false,
      "inventory": false,
      "lessons": false,
      "staffMatrix": false,
      "advancedPermissions": false,
      "integrations": false,
      "manure": false,
      "aiAssistant": false,
      "supportAccess": false
    },
    "addons": {
      "portal": false,
      "invoicing": false
    },
    "sortOrder": 1,
    "features": ["feature1", "feature2"],
    "popular": false,
    "isBillable": false,
    "isDefault": false
  }
]
```

**Rate Limit**: 30 requests/minute per IP
**Cache**: 5 minutes server-side
**Authentication**: Not required (public endpoint)

### POST /api/v1/feature-toggles/check

**Request**:
```json
{
  "features": ["analytics", "aiAssistant", "inventory"]
}
```

**Headers**:
```
Authorization: Bearer <firebase-jwt-token>
x-organization-id: <org-id>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "features": {
      "analytics": {
        "enabled": true,
        "reason": "tier_included"
      },
      "aiAssistant": {
        "enabled": false,
        "reason": "tier_limitation"
      },
      "inventory": {
        "enabled": true,
        "reason": "beta_access"
      }
    }
  }
}
```

**Rate Limit**: 100 requests/minute
**Authentication**: Required (Firebase JWT)
**Authorization**: Must have access to specified organization

## Support

If issues persist after implementing these fixes:

1. **Check API logs** (Cloud Run):
   ```bash
   gcloud run services logs read api-service \
     --project equiduty-dev \
     --region europe-west1 \
     --limit 50
   ```

2. **Verify Android HTTP requests** match expected format:
   ```bash
   adb logcat | grep -E "OkHttp|-->|<--"
   ```

3. **Compare with iOS** implementation for reference

4. **Contact backend team** if API contract differs from documentation
