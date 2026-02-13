package com.equiduty.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class HorseDto(
    val id: String,
    val name: String,
    val breed: String? = null,
    val age: Int? = null,
    val color: String = "brown",
    val gender: String? = null,
    val ownerId: String,
    val ownerName: String? = null,
    val ownerEmail: String? = null,
    val currentStableId: String? = null,
    val currentStableName: String? = null,
    val assignedAt: String? = null,
    val status: String = "active",
    val notes: String? = null,
    val specialInstructions: String? = null,
    val equipment: List<EquipmentItemDto>? = null,
    val hasSpecialInstructions: Boolean? = null,
    val usage: List<String>? = null,
    val horseGroupId: String? = null,
    val horseGroupName: String? = null,
    val lastVaccinationDate: String? = null,
    val nextVaccinationDue: String? = null,
    val vaccinationStatus: String? = null,
    val ueln: String? = null,
    val chipNumber: String? = null,
    val federationNumber: String? = null,
    val feiPassNumber: String? = null,
    val feiExpiryDate: String? = null,
    val sire: String? = null,
    val dam: String? = null,
    val damsire: String? = null,
    val breeder: String? = null,
    val studbook: String? = null,
    val dateOfBirth: String? = null,
    val withersHeight: Int? = null,
    val externalLocation: String? = null,
    val externalMoveType: String? = null,
    val externalDepartureDate: String? = null,
    // Photos
    val coverPhotoUrl: String? = null,
    val avatarUrl: String? = null,
    // Team is an object with named slots (backend verified)
    val team: HorseTeamDto? = null,
    val createdAt: String = "",
    val updatedAt: String = "",
    // RBAC metadata
    @SerialName("_accessLevel") val accessLevel: String? = null,
    @SerialName("_isOwner") val isOwner: Boolean? = null
)

@Serializable
data class EquipmentItemDto(
    val id: String,
    val name: String,
    val location: String? = null,
    val notes: String? = null
)

@Serializable
data class HorseTeamDto(
    val defaultRider: TeamMemberDto? = null,
    val defaultGroom: TeamMemberDto? = null,
    val defaultFarrier: TeamMemberDto? = null,
    val defaultVet: TeamMemberDto? = null,
    val defaultTrainer: TeamMemberDto? = null,
    val defaultDentist: TeamMemberDto? = null,
    val additionalContacts: List<TeamMemberDto>? = null
)

@Serializable
data class TeamMemberDto(
    val name: String? = null,
    val displayName: String? = null,
    val role: String,
    val isPrimary: Boolean? = null,
    val email: String? = null,
    val phone: String? = null,
    val notes: String? = null
) {
    val resolvedName: String get() = name ?: displayName ?: ""
}

@Serializable
data class HorseTeamResponseDto(
    val team: HorseTeamDto
)

@Serializable
data class HorsesResponseDto(
    val horses: List<HorseDto>
)

@Serializable
data class HorseResponseDto(
    val horse: HorseDto
)

@Serializable
data class CreateHorseDto(
    val name: String,
    val breed: String? = null,
    val color: String = "brown",
    val gender: String? = null,
    val currentStableId: String? = null,
    val notes: String? = null,
    val specialInstructions: String? = null,
    val usage: List<String>? = null,
    val dateOfBirth: String? = null,
    val withersHeight: Int? = null,
    val horseGroupId: String? = null,
    val ueln: String? = null,
    val chipNumber: String? = null,
    val federationNumber: String? = null,
    val feiPassNumber: String? = null,
    val feiExpiryDate: String? = null,
    val sire: String? = null,
    val dam: String? = null,
    val damsire: String? = null,
    val breeder: String? = null,
    val studbook: String? = null,
    val equipment: List<EquipmentItemDto>? = null
)

@Serializable
data class UpdateHorseDto(
    val name: String? = null,
    val breed: String? = null,
    val color: String? = null,
    val gender: String? = null,
    val notes: String? = null,
    val specialInstructions: String? = null,
    val usage: List<String>? = null,
    val dateOfBirth: String? = null,
    val withersHeight: Int? = null,
    val status: String? = null,
    val horseGroupId: String? = null,
    val ueln: String? = null,
    val chipNumber: String? = null,
    val federationNumber: String? = null,
    val feiPassNumber: String? = null,
    val feiExpiryDate: String? = null,
    val sire: String? = null,
    val dam: String? = null,
    val damsire: String? = null,
    val breeder: String? = null,
    val studbook: String? = null,
    val equipment: List<EquipmentItemDto>? = null
)

// ── Vaccination ──────────────────────────────────────────────────

@Serializable
data class VaccinationRecordDto(
    val id: String,
    val horseId: String,
    val vaccinationDate: String,
    val vaccinationRuleName: String,
    val veterinarianName: String? = null,
    val notes: String? = null,
    val vaccinationRuleId: String? = null,
    val ruleName: String? = null,
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class VaccinationRecordsResponseDto(
    val records: List<VaccinationRecordDto>
)

@Serializable
data class VaccinationRuleDto(
    val id: String,
    val organizationId: String,
    val name: String,
    val description: String? = null,
    val intervalDays: Int,
    val warningDays: Int,
    val isDefault: Boolean? = null,
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class VaccinationRulesResponseDto(
    val rules: List<VaccinationRuleDto>
)

@Serializable
data class CreateVaccinationRecordDto(
    val horseId: String,
    val vaccinationDate: String,
    val vaccinationRuleName: String,
    val veterinarianName: String? = null,
    val notes: String? = null,
    val vaccinationRuleId: String? = null
)

// ── Ownership ────────────────────────────────────────────────────

@Serializable
data class HorseOwnershipDto(
    val id: String,
    val horseId: String,
    val ownerId: String,
    val ownerName: String,
    val role: String,
    val percentage: Double,
    val startDate: String,
    val endDate: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val notes: String? = null,
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class HorseOwnershipResponseDto(
    val ownerships: List<HorseOwnershipDto>
)

@Serializable
data class CreateHorseOwnershipDto(
    val horseId: String,
    val ownerId: String,
    val ownerName: String,
    val role: String,
    val percentage: Double,
    val startDate: String,
    val email: String? = null,
    val phone: String? = null,
    val notes: String? = null
)

@Serializable
data class UpdateHorseOwnershipDto(
    val ownerName: String? = null,
    val role: String? = null,
    val percentage: Double? = null,
    val endDate: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val notes: String? = null
)

// ── Horse Media ──────────────────────────────────────────────────

@Serializable
data class HorseMediaUploadRequestDto(
    val horseId: String,
    val mediaType: String, // "cover" or "avatar"
    val contentType: String = "image/jpeg"
)

@Serializable
data class HorseMediaUploadResponseDto(
    val uploadUrl: String,
    val publicUrl: String,
    val mediaId: String,
    val expiresAt: String
)

// ── Horse Activity History ───────────────────────────────────────

@Serializable
data class HorseActivityHistoryEntryDto(
    val id: String,
    val type: String,
    val title: String,
    val description: String? = null,
    val date: String,
    val performedBy: String? = null,
    val performedByName: String? = null
)

@Serializable
data class HorseActivityHistoryResponseDto(
    val history: List<HorseActivityHistoryEntryDto> = emptyList()
)
