package com.equiduty.domain.model

data class Organization(
    val id: String,
    val name: String,
    val description: String?,
    val organizationType: OrganizationType,
    val ownerId: String,
    val ownerName: String?,
    val ownerEmail: String?,
    val subscriptionTier: String?,
    val implicitStableId: String?,
    val stableCount: Int?,
    val totalMemberCount: Int?,
    val createdAt: String,
    val updatedAt: String
)

enum class OrganizationType(val value: String) {
    PERSONAL("personal"),
    BUSINESS("business");

    companion object {
        fun fromValue(value: String?): OrganizationType = when (value) {
            "business" -> BUSINESS
            else -> PERSONAL
        }
    }
}

data class Stable(
    val id: String,
    val name: String,
    val description: String?,
    val address: String?,
    val facilityNumber: String?,
    val ownerId: String,
    val ownerEmail: String?,
    val organizationId: String?,
    val createdAt: String,
    val updatedAt: String
)
