package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.domain.model.OrganizationRole
import com.equiduty.domain.model.UserPermissions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PermissionRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _permissions = MutableStateFlow<UserPermissions?>(null)
    val permissions: StateFlow<UserPermissions?> = _permissions.asStateFlow()

    private var cachedOrgId: String? = null
    private var cacheTimestamp: Long = 0L

    /** Fetch permissions for the current user in the given org. Caches for 5 minutes. */
    suspend fun fetchPermissions(orgId: String, forceRefresh: Boolean = false) {
        val now = System.currentTimeMillis()
        if (!forceRefresh && cachedOrgId == orgId && now - cacheTimestamp < CACHE_TTL_MS) {
            return
        }

        try {
            val response = api.getMyPermissions(orgId)
            _permissions.value = UserPermissions(
                permissions = response.permissions,
                roles = response.roles.mapNotNull { OrganizationRole.fromValue(it) },
                isOrgOwner = response.isOrgOwner,
                isSystemAdmin = response.isSystemAdmin
            )
            cachedOrgId = orgId
            cacheTimestamp = now
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch permissions for org $orgId")
            throw e
        }
    }

    fun hasPermission(action: String): Boolean =
        _permissions.value?.hasPermission(action) ?: false

    /** Invalidate cache — called on 403 permission errors. */
    fun invalidateCache() {
        cacheTimestamp = 0L
    }

    /** Clear all permission state — called on sign-out. */
    fun clear() {
        _permissions.value = null
        cachedOrgId = null
        cacheTimestamp = 0L
    }

    companion object {
        private const val CACHE_TTL_MS = 5 * 60 * 1000L // 5 minutes
    }
}
