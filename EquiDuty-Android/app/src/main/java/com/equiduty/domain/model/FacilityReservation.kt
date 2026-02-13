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
    val startTime: String,
    val endTime: String,
    val purpose: String?,
    val notes: String?,
    val status: ReservationStatus,
    val createdAt: String,
    val updatedAt: String
)

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
