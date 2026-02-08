# iOS Image Caching Implementation Guide

## Overview

This guide documents the image caching implementation for the EquiDuty iOS app using Kingfisher for efficient image loading and caching.

## Implementation Status

✅ **Completed:**
- ImageCacheService.swift - Core caching service with prefetching support
- BlurhashView.swift - Blurhash placeholder decoder (native implementation, no external library)
- CachedImage.swift - Reusable cached image components (HorseCachedAvatar, HorseCachedCover)
- HorseListView.swift - Updated to use cached avatars with prefetching
- HorseDetailView.swift - Updated to use cached cover photos
- HorseFormView.swift - Updated PhotoSlotView to support blurhash
- AuthService.swift - Cache clearing on logout and organization switch

⚠️ **Required: Manual SPM Dependency Setup**

## Step 1: Add Kingfisher via Swift Package Manager

Since this implementation requires the **Kingfisher** library for image caching, you need to add it to the Xcode project manually.

### Adding Kingfisher:

1. **Open the project in Xcode:**
   ```bash
   open /Users/p950xam/Utv/stall-bokning/EquiDuty/EquiDuty.xcodeproj
   ```

2. **Add Swift Package:**
   - In Xcode, go to **File > Add Package Dependencies...**
   - Enter the repository URL:
     ```
     https://github.com/onevcat/Kingfisher.git
     ```
   - Select **Version**: `Up to Next Major: 7.0.0` (or latest 7.x)
   - Click **Add Package**

3. **Link to Target:**
   - Ensure **Kingfisher** is added to the **EquiDuty** app target
   - Click **Add Package** to confirm

4. **Verify Installation:**
   - Build the project: `Cmd+B`
   - Check that all imports resolve:
     ```swift
     import Kingfisher  // Should work without errors
     ```

## Step 2: Blurhash Implementation (No External Dependency)

✅ **Good news:** Blurhash decoding is implemented natively in `BlurhashView.swift` with no external dependencies required!

The implementation includes:
- Native Swift blurhash decoder (based on Wolt's algorithm)
- Base83 character decoding
- sRGB <-> Linear color space conversions
- Direct UIImage rendering via CoreGraphics

**No additional SPM packages needed for blurhash support.**

## Architecture

### Cache Configuration

**Memory Cache:**
- Limit: 50 MB
- Expiration: 1 hour in memory
- Auto-cleanup: Every 60 seconds

**Disk Cache:**
- Limit: 200 MB
- Expiration: 30 days
- Automatic LRU eviction

**Automatic Cleanup:**
- Memory warnings → clear memory cache
- App backgrounding → memory expiration starts
- Low disk space → automatic cleanup via LRU policy

### Cache Invalidation Strategy

**Automatic (Backend-driven):**
- Firebase Storage signed URLs include timestamps/tokens
- When image changes → new signed URL → automatic cache miss
- No manual invalidation needed per image

**Manual (User-triggered):**
- Logout → clear ALL cache (security/privacy)
- Organization switch → clear MEMORY cache only (preserve disk for reload)

### Prefetching Strategy

**Horse List:**
- Prefetch all avatar thumbs when list loads
- Parallel prefetching (non-blocking)
- Automatic cache hit on scroll

**Horse Detail:**
- Cover photo prefetched if navigating from cached list item
- Large variant loaded on-demand

## Component Guide

### Generic Components

**CachedImage:**
```swift
CachedImage(
    url: URL?,
    blurhash: String?,
    contentMode: .fill,
    placeholder: { ProgressView() },
    errorView: { Color.gray }
)
```
- Generic cached image view
- Supports blurhash placeholders
- Customizable placeholder and error views
- Automatic fade transitions

### Horse-Specific Components

**HorseCachedAvatar:**
```swift
HorseCachedAvatar(horse: horse, size: 80)
```
- Circular avatar with caching
- Blurhash placeholder support
- Initials fallback if no photo
- Color-coded by horse color

**HorseCachedCover:**
```swift
HorseCachedCover(horse: horse, height: 220)
```
- Cover photo with caching
- Blurhash placeholder support
- Gray rectangle fallback
- Automatically clips to height

**HorseInitialsView:**
```swift
HorseInitialsView(horse: horse)
```
- Fallback view when no photo available
- Shows first 2 characters of name
- Color-coded background

## Service API

**ImageCacheService.shared:**

```swift
// Clear all cache (logout)
ImageCacheService.shared.clearCache()

// Clear memory only (org switch)
ImageCacheService.shared.clearMemoryCache()

// Prefetch images
let urls = horses.compactMap { $0.bestAvatarThumbURL }
ImageCacheService.shared.prefetchImages(urls: urls)

// Cancel prefetching
ImageCacheService.shared.cancelPrefetching()

// Get cache statistics
let (memory, disk) = ImageCacheService.shared.cacheStatistics()
print("Memory: \(memory) items, Disk: \(disk / 1024 / 1024)MB")
```

## Usage Examples

### In Views

**Replace AsyncImage with HorseCachedAvatar:**
```swift
// Before
HorseAvatarView(horse: horse, size: 50)

// After (same interface, now cached)
HorseCachedAvatar(horse: horse, size: 50)
```

**Replace AsyncImage with HorseCachedCover:**
```swift
// Before
AsyncImage(url: horse.bestCoverLargeURL) { phase in
    // ... 20+ lines of phase handling
}

// After
HorseCachedCover(horse: horse, height: 220)
```

**PhotoSlotView (with blurhash):**
```swift
PhotoSlotView(
    image: coverImage,
    remoteURL: existingHorse?.coverPhotoLargeURL,
    blurhash: existingHorse?.coverPhotoBlurhash,
    placeholder: "photo.fill",
    aspectRatio: 16/9,
    label: "Cover Photo"
)
```

## Performance Metrics (Expected)

| Metric | Before | After |
|--------|--------|-------|
| **List scroll FPS** | 45-55 FPS (jank) | 60 FPS (smooth) |
| **Image reloads/session** | Every view change | Once (then cached) |
| **Detail view load** | 1-2s | <0.1s (if cached) |
| **Bandwidth/session** | 5-10 MB | 1-2 MB (90% cache hit) |
| **Memory usage** | ~20 MB | ~70 MB (+50 MB cache) |
| **Disk usage** | 0 MB | <200 MB (auto-managed) |

## Testing Checklist

### Manual Testing

**Cache Persistence:**
- [ ] View horse list with 10+ horses
- [ ] Force quit app
- [ ] Relaunch and navigate to same list
- [ ] **Expected:** Images appear instantly (no loading spinners)

**Scroll Performance:**
- [ ] View horse list with 50+ horses
- [ ] Scroll rapidly up and down
- [ ] **Expected:** Smooth 60 FPS, images appear instantly on revisit

**Offline Mode:**
- [ ] View horse list online (images cache)
- [ ] Enable airplane mode
- [ ] Navigate to same list
- [ ] **Expected:** Cached images still visible

**Cache Invalidation:**
- [ ] View a horse detail with photo
- [ ] Update horse photo via admin
- [ ] Pull to refresh
- [ ] **Expected:** New image loads (new signed URL = cache miss)

**Blurhash Placeholders:**
- [ ] Enable network throttling (3G in Xcode)
- [ ] View horse list
- [ ] **Expected:** Blurhash placeholders appear instantly → fade to sharp image

**Memory Management:**
- [ ] View 100+ horses
- [ ] Monitor memory in Xcode Instruments
- [ ] **Expected:** Memory stays under 100 MB total

**Cache Clearing:**
- [ ] View horses (cache populated)
- [ ] Logout
- [ ] Login again
- [ ] **Expected:** Images reload fresh (cache cleared for security)

### Automated Testing (Optional)

**Unit Tests:**
```swift
// Test ImageCacheService configuration
func testCacheConfiguration() {
    let cache = ImageCache.default
    XCTAssertEqual(cache.memoryStorage.config.totalCostLimit, 50 * 1024 * 1024)
    XCTAssertEqual(cache.diskStorage.config.sizeLimit, 200 * 1024 * 1024)
}

// Test blurhash decoding
func testBlurhashDecoding() {
    let blurhash = "LGF5]+Yk^6#M@-5c,1J5@[or[Q6."
    let image = UIImage(blurHash: blurhash, size: CGSize(width: 32, height: 32))
    XCTAssertNotNil(image)
}
```

**UI Tests:**
```swift
// Test cached image rendering
func testHorseCachedAvatar() throws {
    let app = XCUIApplication()
    app.launch()

    // Navigate to horse list
    app.buttons["Horses"].tap()

    // Wait for first horse avatar to appear
    let firstAvatar = app.images.firstMatch
    XCTAssertTrue(firstAvatar.waitForExistence(timeout: 5))
}
```

## Troubleshooting

### Build Errors

**Error:** `Cannot find 'Kingfisher' in scope`
- **Fix:** Add Kingfisher via SPM (see Step 1 above)

**Error:** `Cannot find type 'KFImage' in scope`
- **Fix:** Add `import Kingfisher` at top of file

### Runtime Issues

**Images not caching:**
- Check signed URLs are valid (not expired)
- Verify network connectivity
- Check Xcode console for Kingfisher logs (DEBUG mode)

**High memory usage:**
- Normal: ~70 MB with cache populated
- Abnormal: >150 MB → check for memory leaks
- Memory warnings trigger automatic cleanup

**Slow image loading:**
- Check network conditions (throttling enabled?)
- Verify prefetching is working (console logs)
- Ensure URLs are using correct variant (thumb vs large)

## Future Enhancements (Optional)

### Settings UI
```swift
Section("Image Cache") {
    HStack {
        Text("Cache Size")
        Spacer()
        let stats = ImageCacheService.shared.cacheStatistics()
        Text("\(stats.diskSize / 1024 / 1024) MB")
            .foregroundColor(.secondary)
    }

    Button("Clear Image Cache", role: .destructive) {
        ImageCacheService.shared.clearCache()
    }

    Toggle("WiFi Only for Images", isOn: $wifiOnlyImages)
    Toggle("High Quality Images", isOn: $highQualityImages)
}
```

### Download Quality Preferences
```swift
enum ImageQuality {
    case auto  // WiFi → large, cellular → small
    case high  // Always large
    case low   // Always thumb
}

// Modify Horse extensions to respect user preference
var bestAvatarURL: URL? {
    switch UserDefaults.imageQuality {
    case .high: return avatarPhotoLargeURL
    case .low: return avatarPhotoThumbURL
    case .auto: return NetworkMonitor.isWiFi ? avatarPhotoLargeURL : avatarPhotoThumbURL
    }
}
```

## References

- **Kingfisher Docs:** https://github.com/onevcat/Kingfisher/wiki
- **Blurhash Algorithm:** https://github.com/woltapp/blurhash
- **Firebase Storage Signed URLs:** https://firebase.google.com/docs/storage/ios/download-files
- **iOS Image Caching Best Practices:** https://developer.apple.com/documentation/foundation/nsurlcache

## Implementation Checklist

- [x] Create ImageCacheService.swift
- [x] Create BlurhashView.swift (native implementation)
- [x] Create CachedImage.swift with horse components
- [x] Update HorseListView to use HorseCachedAvatar
- [x] Update HorseDetailView to use HorseCachedCover
- [x] Update HorseFormView PhotoSlotView with blurhash
- [x] Add cache clearing on logout (AuthService)
- [x] Add cache clearing on org switch (AuthService)
- [x] Add prefetching to HorseListView
- [ ] **Add Kingfisher SPM dependency (MANUAL STEP)**
- [ ] Build and verify no compilation errors
- [ ] Test cache persistence
- [ ] Test scroll performance
- [ ] Test offline mode
- [ ] Update CLAUDE.md with caching documentation

## Next Steps

1. **Add Kingfisher dependency** (see Step 1 above)
2. **Build the project** and fix any import errors
3. **Run the app** and verify caching works
4. **Test with real data** (50+ horses)
5. **Monitor performance** with Xcode Instruments
6. **Update documentation** in CLAUDE.md

---

**Questions or Issues?**
- Check Xcode build errors first
- Verify Kingfisher is properly linked
- Review console logs for Kingfisher debug messages
- Test with a clean build (`Cmd+Shift+K` then `Cmd+B`)
