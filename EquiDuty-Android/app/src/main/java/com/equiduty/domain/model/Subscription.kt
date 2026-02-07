package com.equiduty.domain.model

/**
 * String-based subscription tier — NOT an enum.
 * Any tier value from the backend is valid. Admin can create custom tiers.
 */
@JvmInline
value class SubscriptionTier(val value: String) {
    companion object {
        val FREE = SubscriptionTier("free")
        val STANDARD = SubscriptionTier("standard")
        val PRO = SubscriptionTier("pro")
        val ENTERPRISE = SubscriptionTier("enterprise")
    }
}

data class ModuleFlags(
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
) {
    fun isModuleEnabled(key: String): Boolean = when (key) {
        "analytics" -> analytics
        "selectionProcess" -> selectionProcess
        "locationHistory" -> locationHistory
        "photoEvidence" -> photoEvidence
        "leaveManagement" -> leaveManagement
        "inventory" -> inventory
        "lessons" -> lessons
        "staffMatrix" -> staffMatrix
        "advancedPermissions" -> advancedPermissions
        "integrations" -> integrations
        "manure" -> manure
        "aiAssistant" -> aiAssistant
        "supportAccess" -> supportAccess
        else -> false
    }
}

data class SubscriptionLimits(
    val members: Int = -1,
    val stables: Int = -1,
    val horses: Int = -1,
    val routineTemplates: Int = -1,
    val routineSchedules: Int = -1,
    val feedingPlans: Int = -1,
    val facilities: Int = -1,
    val contacts: Int = -1,
    val supportContacts: Int = -1
) {
    /** Check if current count is within limit. -1 = unlimited. */
    fun isWithinLimit(key: String, currentCount: Int): Boolean {
        val limit = when (key) {
            "members" -> members
            "stables" -> stables
            "horses" -> horses
            "routineTemplates" -> routineTemplates
            "routineSchedules" -> routineSchedules
            "feedingPlans" -> feedingPlans
            "facilities" -> facilities
            "contacts" -> contacts
            "supportContacts" -> supportContacts
            else -> -1
        }
        return limit == -1 || currentCount < limit
    }
}

data class SubscriptionAddons(
    val portal: Boolean = false,
    val invoicing: Boolean = false
)

data class TierDefinition(
    val tier: SubscriptionTier,
    val name: String,
    val description: String,
    val price: Int,
    val limits: SubscriptionLimits,
    val modules: ModuleFlags,
    val addons: SubscriptionAddons,
    val sortOrder: Int?,
    val isBillable: Boolean
)

data class OrganizationSubscription(
    val tier: SubscriptionTier,
    val limits: SubscriptionLimits,
    val modules: ModuleFlags,
    val addons: SubscriptionAddons,
    val stripeStatus: String?,
    val billingInterval: String?,
    val cancelAtPeriodEnd: Boolean
)
