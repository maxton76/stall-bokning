package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

data class FeatureToggle(
    val id: String,
    val name: String,
    val enabled: Boolean,
    val description: String?
)

@Singleton
class FeatureToggleRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _toggles = MutableStateFlow<List<FeatureToggle>>(emptyList())
    val toggles: StateFlow<List<FeatureToggle>> = _toggles.asStateFlow()

    private var cacheTimestamp: Long = 0L

    suspend fun fetchToggles(forceRefresh: Boolean = false) {
        val now = System.currentTimeMillis()
        if (!forceRefresh && now - cacheTimestamp < CACHE_TTL_MS && _toggles.value.isNotEmpty()) {
            return
        }

        try {
            val response = api.getFeatureToggles()
            _toggles.value = response.toggles.map { dto ->
                FeatureToggle(
                    id = dto.id,
                    name = dto.name,
                    enabled = dto.enabled,
                    description = dto.description
                )
            }
            cacheTimestamp = now
        } catch (e: retrofit2.HttpException) {
            when (e.code()) {
                404 -> {
                    // Feature toggles endpoint not implemented yet - use defaults
                    Timber.d("Feature toggles endpoint not available (404), using defaults")
                    _toggles.value = emptyList()
                }
                else -> {
                    Timber.e(e, "Failed to fetch feature toggles: HTTP ${e.code()}")
                    // Non-critical: don't throw, keep existing toggles
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch feature toggles")
            // Non-critical: don't throw, keep existing toggles
        }
    }

    fun isFeatureEnabled(featureId: String): Boolean =
        _toggles.value.find { it.id == featureId }?.enabled ?: false

    fun clear() {
        _toggles.value = emptyList()
        cacheTimestamp = 0L
    }

    companion object {
        private const val CACHE_TTL_MS = 5 * 60 * 1000L // 5 minutes
    }
}
