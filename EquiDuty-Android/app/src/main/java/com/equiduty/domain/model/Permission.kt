package com.equiduty.domain.model

/**
 * User's resolved permissions loaded from API.
 * Permissions are a flat map — not hardcoded enum matching.
 */
data class UserPermissions(
    val permissions: Map<String, Boolean>,
    val roles: List<OrganizationRole>,
    val isOrgOwner: Boolean,
    val isSystemAdmin: Boolean
) {
    fun hasPermission(action: String): Boolean {
        if (isSystemAdmin) return true
        if (isOrgOwner) return true
        return permissions[action] == true
    }

    fun hasAnyRole(targetRoles: List<OrganizationRole>): Boolean =
        roles.any { it in targetRoles }

    fun hasRole(role: OrganizationRole): Boolean = role in roles
}

/**
 * 16 organization roles matching backend.
 * Used for display/convenience — actual permission checks use the flat map.
 */
enum class OrganizationRole(val value: String) {
    ADMINISTRATOR("administrator"),
    STABLE_MANAGER("stable_manager"),
    SCHEDULE_PLANNER("schedule_planner"),
    BOOKKEEPER("bookkeeper"),
    VETERINARIAN("veterinarian"),
    DENTIST("dentist"),
    FARRIER("farrier"),
    CUSTOMER("customer"),
    GROOM("groom"),
    SADDLE_MAKER("saddle_maker"),
    HORSE_OWNER("horse_owner"),
    RIDER("rider"),
    INSEMINATOR("inseminator"),
    TRAINER("trainer"),
    TRAINING_ADMIN("training_admin"),
    SUPPORT_CONTACT("support_contact");

    companion object {
        fun fromValue(value: String): OrganizationRole? =
            entries.find { it.value == value }
    }
}
