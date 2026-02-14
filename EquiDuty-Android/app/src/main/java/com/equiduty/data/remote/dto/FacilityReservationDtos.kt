package com.equiduty.data.remote.dto

import kotlinx.serialization.Serializable

// ── Facility DTOs ────────────────────────────────────────────────

@Serializable
data class FacilityDto(
    val id: String,
    val stableId: String,
    val name: String,
    val type: String = "other",
    val description: String? = null,
    val capacity: Int? = null,
    val status: String = "active",
    val bookingRules: BookingRulesDto? = null,
    val availabilitySchedule: AvailabilityScheduleDto? = null,
    val createdAt: String = "",
    val updatedAt: String = "",
    val createdBy: String? = null
)

@Serializable
data class BookingRulesDto(
    val minSlotDuration: Int? = null,
    val maxDurationPerReservation: Int? = null,
    val maxDurationUnit: String? = null,
    val maxHorsesPerReservation: Int? = null,
    val requireApproval: Boolean = false
)

@Serializable
data class AvailabilityScheduleDto(
    val weeklySchedule: WeeklyScheduleDto? = null,
    val exceptions: List<ScheduleExceptionDto>? = null
)

@Serializable
data class WeeklyScheduleDto(
    val defaultTimeBlocks: List<TimeBlockDto>? = null
)

@Serializable
data class TimeBlockDto(
    val from: String = "",
    val to: String = ""
)

@Serializable
data class ScheduleExceptionDto(
    val date: String,
    val type: String = "closed",
    val timeBlocks: List<TimeBlockDto>? = null,
    val reason: String? = null
)

@Serializable
data class FacilitiesResponseDto(
    val facilities: List<FacilityDto>
)

// ── Reservation DTOs ─────────────────────────────────────────────

@Serializable
data class FacilityReservationDto(
    val id: String,
    val facilityId: String,
    val facilityName: String? = null,
    val facilityType: String? = null,
    val stableId: String,
    val stableName: String? = null,
    val userId: String,
    val userEmail: String? = null,
    val userFullName: String? = null,
    val horseId: String? = null,
    val horseName: String? = null,
    val horseIds: List<String>? = null,
    val horseNames: List<String>? = null,
    val externalHorseCount: Int? = null,
    val startTime: String,
    val endTime: String,
    val purpose: String? = null,
    val notes: String? = null,
    val status: String = "pending",
    val createdAt: String = "",
    val updatedAt: String = "",
    val createdBy: String? = null,
    val lastModifiedBy: String? = null
)

@Serializable
data class FacilityReservationsResponseDto(
    val reservations: List<FacilityReservationDto>
)

// ── Create / Update DTOs ─────────────────────────────────────────

@Serializable
data class CreateReservationDto(
    val facilityId: String,
    val facilityName: String? = null,
    val facilityType: String? = null,
    val stableId: String,
    val stableName: String? = null,
    val userId: String,
    val userEmail: String? = null,
    val userFullName: String? = null,
    val horseId: String? = null,
    val horseName: String? = null,
    val horseIds: List<String>? = null,
    val horseNames: List<String>? = null,
    val externalHorseCount: Int? = null,
    val startTime: String,
    val endTime: String,
    val purpose: String? = null,
    val notes: String? = null,
    val adminOverride: Boolean? = null
)

@Serializable
data class UpdateReservationDto(
    val startTime: String? = null,
    val endTime: String? = null,
    val purpose: String? = null,
    val notes: String? = null,
    val status: String? = null,
    val horseId: String? = null,
    val horseName: String? = null,
    val horseIds: List<String>? = null,
    val horseNames: List<String>? = null,
    val externalHorseCount: Int? = null
)

// ── Conflict Check DTOs ──────────────────────────────────────────

@Serializable
data class CheckConflictsDto(
    val facilityId: String,
    val startTime: String,
    val endTime: String,
    val excludeReservationId: String? = null
)

@Serializable
data class ConflictsResponseDto(
    val conflicts: List<FacilityReservationDto> = emptyList(),
    val hasConflicts: Boolean = false,
    val maxHorsesPerReservation: Int? = null,
    val peakConcurrentHorses: Int? = null,
    val remainingCapacity: Int? = null
)
