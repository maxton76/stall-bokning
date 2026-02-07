package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.ModuleFlagsDto
import com.equiduty.data.remote.dto.SubscriptionAddonsDto
import com.equiduty.data.remote.dto.SubscriptionLimitsDto
import com.equiduty.data.remote.dto.TierDefinitionDto
import com.equiduty.domain.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SubscriptionRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _tierDefinitions = MutableStateFlow<List<TierDefinition>>(emptyList())
    val tierDefinitions: StateFlow<List<TierDefinition>> = _tierDefinitions.asStateFlow()

    private val _subscription = MutableStateFlow<OrganizationSubscription?>(null)
    val subscription: StateFlow<OrganizationSubscription?> = _subscription.asStateFlow()

    private var tiersCacheTimestamp: Long = 0L
    private var subCachedOrgId: String? = null
    private var subCacheTimestamp: Long = 0L

    /** Fetch tier definitions (global, cached 5 min). */
    suspend fun fetchTierDefinitions(forceRefresh: Boolean = false) {
        val now = System.currentTimeMillis()
        if (!forceRefresh && now - tiersCacheTimestamp < CACHE_TTL_MS && _tierDefinitions.value.isNotEmpty()) {
            return
        }

        try {
            val response = api.getTierDefinitions()
            _tierDefinitions.value = response.tiers.map { it.toDomain() }
            tiersCacheTimestamp = now
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch tier definitions")
            throw e
        }
    }

    /** Fetch subscription for an org. Resolves limits/modules from tier definitions. */
    suspend fun fetchSubscription(orgId: String, forceRefresh: Boolean = false) {
        val now = System.currentTimeMillis()
        if (!forceRefresh && subCachedOrgId == orgId && now - subCacheTimestamp < CACHE_TTL_MS) {
            return
        }

        try {
            // Ensure tier definitions are loaded
            fetchTierDefinitions()

            val response = api.getOrganizationSubscription(orgId)
            val tier = SubscriptionTier(response.tier)

            // Find matching tier definition for limits/modules/addons
            val tierDef = _tierDefinitions.value.find { it.tier == tier }

            _subscription.value = OrganizationSubscription(
                tier = tier,
                limits = tierDef?.limits ?: SubscriptionLimits(),
                modules = tierDef?.modules ?: ModuleFlags(),
                addons = tierDef?.addons ?: SubscriptionAddons(),
                stripeStatus = response.subscription?.status,
                billingInterval = response.subscription?.billingInterval,
                cancelAtPeriodEnd = response.subscription?.cancelAtPeriodEnd ?: false
            )
            subCachedOrgId = orgId
            subCacheTimestamp = now
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch subscription for org $orgId")
            throw e
        }
    }

    fun isFeatureAvailable(module: String): Boolean =
        _subscription.value?.modules?.isModuleEnabled(module) ?: false

    fun isWithinLimit(key: String, currentCount: Int): Boolean =
        _subscription.value?.limits?.isWithinLimit(key, currentCount) ?: true

    /** Invalidate subscription cache — called on 403 subscription errors. */
    fun invalidateCache() {
        subCacheTimestamp = 0L
    }

    /** Clear all state — called on sign-out. */
    fun clear() {
        _subscription.value = null
        subCachedOrgId = null
        subCacheTimestamp = 0L
        tiersCacheTimestamp = 0L
    }

    companion object {
        private const val CACHE_TTL_MS = 5 * 60 * 1000L // 5 minutes
    }
}

// ── DTO → Domain Mappers ─────────────────────────────────────────

fun TierDefinitionDto.toDomain(): TierDefinition = TierDefinition(
    tier = SubscriptionTier(tier),
    name = name,
    description = description,
    price = price,
    limits = limits.toDomain(),
    modules = modules.toDomain(),
    addons = addons.toDomain(),
    sortOrder = sortOrder,
    isBillable = isBillable
)

fun SubscriptionLimitsDto.toDomain(): SubscriptionLimits = SubscriptionLimits(
    members = members,
    stables = stables,
    horses = horses,
    routineTemplates = routineTemplates,
    routineSchedules = routineSchedules,
    feedingPlans = feedingPlans,
    facilities = facilities,
    contacts = contacts,
    supportContacts = supportContacts
)

fun ModuleFlagsDto.toDomain(): ModuleFlags = ModuleFlags(
    analytics = analytics,
    selectionProcess = selectionProcess,
    locationHistory = locationHistory,
    photoEvidence = photoEvidence,
    leaveManagement = leaveManagement,
    inventory = inventory,
    lessons = lessons,
    staffMatrix = staffMatrix,
    advancedPermissions = advancedPermissions,
    integrations = integrations,
    manure = manure,
    aiAssistant = aiAssistant,
    supportAccess = supportAccess
)

fun SubscriptionAddonsDto.toDomain(): SubscriptionAddons = SubscriptionAddons(
    portal = portal,
    invoicing = invoicing
)
