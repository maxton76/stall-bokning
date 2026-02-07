package com.equiduty.data.remote.interceptor

import com.equiduty.data.repository.PermissionRepository
import com.equiduty.data.repository.SubscriptionRepository
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import okhttp3.Interceptor
import okhttp3.Response
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val firebaseAuth: FirebaseAuth,
    private val permissionRepository: dagger.Lazy<PermissionRepository>,
    private val subscriptionRepository: dagger.Lazy<SubscriptionRepository>
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val token = runBlocking {
            try {
                firebaseAuth.currentUser?.getIdToken(false)?.await()?.token
            } catch (e: Exception) {
                Timber.w(e, "Failed to get ID token")
                null
            }
        }

        val request = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .build()
        } else {
            originalRequest.newBuilder()
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .build()
        }

        val response = chain.proceed(request)

        // Handle 403 errors: invalidate relevant caches
        if (response.code == 403) {
            val body = response.peekBody(1024).string()
            when {
                body.contains("permission", ignoreCase = true) -> {
                    Timber.w("403 permission error — invalidating permission cache")
                    permissionRepository.get().invalidateCache()
                }
                body.contains("feature", ignoreCase = true) ||
                body.contains("subscription", ignoreCase = true) -> {
                    Timber.w("403 subscription/feature error — invalidating subscription cache")
                    subscriptionRepository.get().invalidateCache()
                }
            }
        }

        return response
    }
}
