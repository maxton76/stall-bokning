package com.equiduty.domain.model

data class Horse(
    val id: String,
    val name: String,
    val breed: String?,
    val age: Int?,
    val color: HorseColor,
    val gender: HorseGender?,
    val ownerId: String,
    val ownerName: String?,
    val ownerEmail: String?,
    val currentStableId: String?,
    val currentStableName: String?,
    val assignedAt: String?,
    val status: HorseStatus,
    val notes: String?,
    val specialInstructions: String?,
    val equipment: List<EquipmentItem>?,
    val hasSpecialInstructions: Boolean?,
    val usage: List<HorseUsage>?,
    val horseGroupId: String?,
    val horseGroupName: String?,
    val lastVaccinationDate: String?,
    val nextVaccinationDue: String?,
    val vaccinationStatus: VaccinationStatus?,
    val ueln: String?,
    val chipNumber: String?,
    val federationNumber: String?,
    val feiPassNumber: String?,
    val feiExpiryDate: String?,
    val sire: String?,
    val dam: String?,
    val damsire: String?,
    val breeder: String?,
    val studbook: String?,
    val dateOfBirth: String?,
    val withersHeight: Int?,
    val externalLocation: String?,
    val externalMoveType: String?,
    val externalDepartureDate: String?,
    val team: HorseTeam?,
    val createdAt: String,
    val updatedAt: String,
    val accessLevel: AccessLevel?,
    val isOwner: Boolean
)

data class HorseTeam(
    val defaultRider: TeamMember?,
    val defaultGroom: TeamMember?,
    val defaultFarrier: TeamMember?,
    val defaultVet: TeamMember?,
    val defaultTrainer: TeamMember?,
    val defaultDentist: TeamMember?,
    val additionalContacts: List<TeamMember>
) {
    val allMembers: List<TeamMember>
        get() = listOfNotNull(
            defaultRider, defaultGroom, defaultFarrier,
            defaultVet, defaultTrainer, defaultDentist
        ) + additionalContacts
}

data class TeamMember(
    val name: String,
    val role: TeamMemberRole,
    val isPrimary: Boolean,
    val email: String?,
    val phone: String?,
    val notes: String?
)

data class EquipmentItem(
    val id: String,
    val name: String,
    val location: String?,
    val notes: String?
)

enum class HorseColor(val value: String) {
    BLACK("black"), BROWN("brown"), BAY_BROWN("bay_brown"), DARK_BROWN("dark_brown"),
    CHESTNUT("chestnut"), GREY("grey"), STRAWBERRY("strawberry"), PIEBALD("piebald"),
    SKEWBALD("skewbald"), DUN("dun"), CREAM("cream"), PALOMINO("palomino"),
    APPALOOSA("appaloosa");

    companion object {
        fun fromValue(value: String): HorseColor =
            entries.find { it.value == value } ?: BROWN
    }
}

enum class HorseGender(val value: String) {
    STALLION("stallion"), MARE("mare"), GELDING("gelding");

    companion object {
        fun fromValue(value: String?): HorseGender? =
            value?.let { v -> entries.find { it.value == v } }
    }
}

enum class HorseUsage(val value: String) {
    CARE("care"), SPORT("sport"), BREEDING("breeding");

    companion object {
        fun fromValue(value: String): HorseUsage? =
            entries.find { it.value == value }
    }
}

enum class HorseStatus(val value: String) {
    ACTIVE("active"), INACTIVE("inactive");

    companion object {
        fun fromValue(value: String): HorseStatus =
            entries.find { it.value == value } ?: ACTIVE
    }
}

enum class VaccinationStatus(val value: String) {
    CURRENT("current"), EXPIRING_SOON("expiring_soon"), EXPIRED("expired"),
    NO_RULE("no_rule"), NO_RECORDS("no_records");

    companion object {
        fun fromValue(value: String?): VaccinationStatus? =
            value?.let { v -> entries.find { it.value == v } }
    }
}

enum class TeamMemberRole(val value: String) {
    RIDER("rider"), GROOM("groom"), FARRIER("farrier"), VETERINARIAN("veterinarian"),
    TRAINER("trainer"), DENTIST("dentist"), PHYSIOTHERAPIST("physiotherapist"),
    SADDLER("saddler"), OTHER("other");

    companion object {
        fun fromValue(value: String): TeamMemberRole =
            entries.find { it.value == value } ?: OTHER
    }
}

enum class AccessLevel(val value: String, val numericLevel: Int) {
    PUBLIC("public", 1),
    BASIC_CARE("basic_care", 2),
    PROFESSIONAL("professional", 3),
    MANAGEMENT("management", 4),
    OWNER("owner", 5);

    companion object {
        fun fromValue(value: String?): AccessLevel? =
            value?.let { v -> entries.find { it.value == v } }
    }
}

enum class OwnershipRole(val value: String) {
    PRIMARY("primary"), CO_OWNER("co_owner"),
    SYNDICATE("syndicate"), LEASEHOLDER("leaseholder");

    companion object {
        fun fromValue(value: String): OwnershipRole =
            entries.find { it.value == value } ?: PRIMARY
    }
}

data class HorseOwnership(
    val id: String,
    val horseId: String,
    val ownerId: String,
    val ownerName: String,
    val role: OwnershipRole,
    val percentage: Double,
    val startDate: String,
    val endDate: String?,
    val email: String?,
    val phone: String?,
    val notes: String?,
    val createdAt: String,
    val updatedAt: String
)

data class VaccinationRecord(
    val id: String,
    val horseId: String,
    val date: String,
    val vaccineName: String,
    val vetName: String?,
    val notes: String?,
    val ruleId: String?,
    val ruleName: String?,
    val createdAt: String,
    val updatedAt: String
)

data class VaccinationRule(
    val id: String,
    val organizationId: String,
    val name: String,
    val description: String?,
    val intervalDays: Int,
    val warningDays: Int,
    val isDefault: Boolean?,
    val createdAt: String,
    val updatedAt: String
)
