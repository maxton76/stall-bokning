package com.equiduty.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String? = null,
    val uid: String? = null,
    val email: String,
    val firstName: String,
    val lastName: String,
    val systemRole: String = "member",
    val createdAt: String = "",
    val updatedAt: String = ""
) {
    val resolvedUid: String get() = uid ?: id ?: ""
}

@Serializable
data class OrganizationDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val organizationType: String? = null,
    val ownerId: String,
    val ownerName: String? = null,
    val ownerEmail: String? = null,
    val subscriptionTier: String? = null,
    val implicitStableId: String? = null,
    val stats: OrganizationStatsDto? = null,
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class OrganizationStatsDto(
    val stableCount: Int? = null,
    val totalMemberCount: Int? = null
)

@Serializable
data class OrganizationsResponseDto(
    val organizations: List<OrganizationDto>
)

@Serializable
data class StableDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val address: String? = null,
    val facilityNumber: String? = null,
    val ownerId: String,
    val ownerEmail: String? = null,
    val organizationId: String? = null,
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class StablesResponseDto(
    val stables: List<StableDto>
)

// ── Signup ───────────────────────────────────────────────────────

@Serializable
data class SignupRequestDto(
    val email: String,
    val firstName: String,
    val lastName: String,
    val organizationType: String? = null,
    val organizationName: String? = null,
    val contactEmail: String? = null,
    val phoneNumber: String? = null
)

// ── Permissions ──────────────────────────────────────────────────

@Serializable
data class UserPermissionsResponseDto(
    val permissions: Map<String, Boolean>,
    val roles: List<String>,
    val isOrgOwner: Boolean,
    val isSystemAdmin: Boolean
)

// ── Subscriptions ────────────────────────────────────────────────

@Serializable
data class ModuleFlagsDto(
    val analytics: Boolean = false,
    val selectionProcess: Boolean = false,
    val locationHistory: Boolean = false,
    val photoEvidence: Boolean = false,
    val leaveManagement: Boolean = false,
    val inventory: Boolean = false,
    val lessons: Boolean = false,
    val staffMatrix: Boolean = false,
    val advancedPermissions: Boolean = false,
    val integrations: Boolean = false,
    val manure: Boolean = false,
    val aiAssistant: Boolean = false,
    val supportAccess: Boolean = false
)

@Serializable
data class SubscriptionLimitsDto(
    val members: Int = -1,
    val stables: Int = -1,
    val horses: Int = -1,
    val routineTemplates: Int = -1,
    val routineSchedules: Int = -1,
    val feedingPlans: Int = -1,
    val facilities: Int = -1,
    val contacts: Int = -1,
    val supportContacts: Int = -1
)

@Serializable
data class SubscriptionAddonsDto(
    val portal: Boolean = false,
    val invoicing: Boolean = false
)

@Serializable
data class TierDefinitionDto(
    val tier: String,
    val name: String,
    val description: String = "",
    val price: Int = 0,
    val limits: SubscriptionLimitsDto,
    val modules: ModuleFlagsDto,
    val addons: SubscriptionAddonsDto,
    val sortOrder: Int? = null,
    val isBillable: Boolean = false
)

/**
 * API returns array directly, not wrapped in object.
 * Response format: [{"tier": "starter", ...}, {"tier": "pro", ...}]
 */
typealias TierDefinitionsResponseDto = List<TierDefinitionDto>

@Serializable
data class StripeSubscriptionInfoDto(
    val status: String,
    val billingInterval: String? = null,
    val currentPeriodStart: String? = null,
    val currentPeriodEnd: String? = null,
    val cancelAtPeriodEnd: Boolean = false,
    val hasHadTrial: Boolean? = null,
    val subscriptionId: String? = null,
    val customerId: String? = null
)

@Serializable
data class OrganizationSubscriptionResponseDto(
    val tier: String,
    val subscription: StripeSubscriptionInfoDto? = null
)

// ── Feature Toggles ──────────────────────────────────────────────

@Serializable
data class FeatureToggleDto(
    val id: String,
    val name: String,
    val enabled: Boolean = false,
    val description: String? = null
)

@Serializable
data class FeatureTogglesResponseDto(
    val toggles: List<FeatureToggleDto> = emptyList()
)

// ── Settings ─────────────────────────────────────────────────────

@Serializable
data class NotificationPreferencesDto(
    val email: Boolean = true,
    val push: Boolean = false,
    val routines: Boolean = true,
    val feeding: Boolean = true,
    val activities: Boolean = true
)

@Serializable
data class UserPreferencesDto(
    val defaultStableId: String? = null,
    val defaultOrganizationId: String? = null,
    val language: String = "sv",
    val timezone: String = "Europe/Stockholm",
    val notifications: NotificationPreferencesDto = NotificationPreferencesDto(),
    val updatedAt: String? = null
)

@Serializable
data class UserPreferencesResponseDto(
    val preferences: UserPreferencesDto
)

@Serializable
data class UpdatePreferencesDto(
    val defaultStableId: String? = null,
    val defaultOrganizationId: String? = null,
    val language: String? = null,
    val timezone: String? = null,
    val notifications: PartialNotificationPreferencesDto? = null
)

@Serializable
data class PartialNotificationPreferencesDto(
    val email: Boolean? = null,
    val push: Boolean? = null,
    val routines: Boolean? = null,
    val feeding: Boolean? = null,
    val activities: Boolean? = null
)
