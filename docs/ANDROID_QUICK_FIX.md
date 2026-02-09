# Android API Fixes - Quick Reference

**TL;DR**: Two lines of code to fix, feature toggles to remove/handle gracefully.

## Fix 1: Tiers API Returns Array (Not Object)

**File**: `AuthDtos.kt` (line ~127)

**Change this**:
```kotlin
@Serializable
data class TierDefinitionsResponseDto(
    val tiers: List<TierDefinitionDto>  // ❌ Wrong - API doesn't wrap
)
```

**To this**:
```kotlin
// API returns array directly: [{"tier": "starter",...}, {...}]
typealias TierDefinitionsResponseDto = List<TierDefinitionDto>
```

**Why**: API returns `[{...}]` not `{"tiers": [{...}]}`

---

## Fix 2: Feature Toggles Endpoint Doesn't Exist

**File**: `FeatureToggleRepository.kt`

**Option A - Skip entirely** (Recommended):
```kotlin
suspend fun getFeatureToggles(): Result<FeatureTogglesDto?> {
    // Endpoint doesn't exist yet - return null for defaults
    return Result.success(null)
}
```

**Option B - Handle 404**:
```kotlin
suspend fun getFeatureToggles(): Result<FeatureTogglesDto?> {
    return try {
        api.getFeatureToggles()
    } catch (e: HttpException) {
        if (e.code() == 404) Result.success(null) else Result.failure(e)
    }
}
```

**Why**: Endpoint `/api/v1/feature-toggles` returns 404 (not implemented)

---

## Test

**Before**:
```
E  JsonDecodingException: Expected '{', but had '['
E  HttpException: HTTP 404
```

**After**:
```
D  Loaded 5 tier definitions
D  Feature toggles not available, using defaults
D  Login successful
```

---

**Full Documentation**: See `ANDROID_API_FIXES.md` for complete details, testing steps, and API contract.
