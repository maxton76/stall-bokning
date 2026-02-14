package com.equiduty.domain.model

data class FacilityReservation(
    val id: String,
    val facilityId: String,
    val facilityName: String,
    val facilityType: FacilityType,
    val stableId: String,
    val stableName: String,
    val userId: String,
    val userEmail: String,
    val userFullName: String,
    val horseId: String?,
    val horseName: String?,
    val horseIds: List<String>?,
    val horseNames: List<String>?,
    val externalHorseCount: Int = 0,
    val startTime: String,
    val endTime: String,
    val purpose: String?,
    val notes: String?,
    val status: ReservationStatus,
    val createdAt: String,
    val updatedAt: String
) {
    /** All horse IDs, normalizing both legacy and new formats */
    val allHorseIds: List<String>
        get() = when {
            !horseIds.isNullOrEmpty() -> horseIds
            !horseId.isNullOrBlank() -> listOf(horseId)
            else -> emptyList()
        }

    /** All horse names, normalizing both legacy and new formats */
    val allHorseNames: List<String>
        get() = when {
            !horseNames.isNullOrEmpty() -> horseNames
            !horseName.isNullOrBlank() -> listOf(horseName)
            else -> emptyList()
        }

    /** Number of horses in this reservation (stable + external) */
    val horseCount: Int get() = allHorseIds.size + externalHorseCount

    /** Display string for horses (single name or count) */
    fun horseDisplayText(pluralFormat: (Int) -> String): String = when (allHorseNames.size) {
        0 -> ""
        1 -> allHorseNames[0]
        else -> pluralFormat(allHorseNames.size)
    }
}

enum class ReservationStatus(val value: String) {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    CANCELLED("cancelled"),
    COMPLETED("completed"),
    NO_SHOW("no_show"),
    REJECTED("rejected");

    companion object {
        fun fromValue(value: String): ReservationStatus =
            entries.find { it.value == value } ?: PENDING
    }
}
