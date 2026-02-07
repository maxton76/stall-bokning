# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── Kotlinx Serialization ────────────────────────────────────────
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep @Serializable classes and their generated serializers
-keep,includedescriptorclasses class com.equiduty.data.remote.dto.**$$serializer { *; }
-keepclassmembers class com.equiduty.data.remote.dto.** {
    *** Companion;
}
-keepclasseswithmembers class com.equiduty.data.remote.dto.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep all DTO classes (they need field names for JSON)
-keep class com.equiduty.data.remote.dto.** { *; }

# ── Retrofit ─────────────────────────────────────────────────────
-keepattributes Signature
-keepattributes Exceptions

# Keep Retrofit API interface methods
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# Keep generic type info for Retrofit
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation

# ── OkHttp ───────────────────────────────────────────────────────
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ── Domain Models (used in reflection by some serializers) ───────
-keep class com.equiduty.domain.model.** { *; }

# ── Firebase ─────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
