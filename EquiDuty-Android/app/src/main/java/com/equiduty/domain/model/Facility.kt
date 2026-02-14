package com.equiduty.domain.model

data class Facility(
    val id: String,
    val stableId: String,
    val name: String,
    val type: FacilityType,
    val description: String?,
    val capacity: Int?,
    val status: FacilityStatus,
    val minSlotDuration: Int?,
    val maxDuration: Int?,
    val maxDurationUnit: String?,
    val maxHorses: Int?,
    val requireApproval: Boolean,
    val availableFrom: String?,
    val availableTo: String?,
    val planningWindowOpens: Int?,
    val planningWindowCloses: Int?,
    val availabilitySchedule: FacilityAvailabilitySchedule?,
    val createdAt: String,
    val updatedAt: String
)

enum class FacilityType(val value: String) {
    INDOOR_ARENA("indoor_arena"),
    OUTDOOR_ARENA("outdoor_arena"),
    WALKER("walker"),
    SOLARIUM("solarium"),
    WASH_STALL("wash_stall"),
    PADDOCK("paddock"),
    LUNGING_RING("lunging_ring"),
    TREADMILL("treadmill"),
    WATER_TREADMILL("water_treadmill"),
    GALLOPING_TRACK("galloping_track"),
    JUMPING_YARD("jumping_yard"),
    VIBRATION_PLATE("vibration_plate"),
    PASTURE("pasture"),
    TRANSPORT("transport"),
    OTHER("other");

    companion object {
        fun fromValue(value: String): FacilityType =
            entries.find { it.value == value } ?: OTHER
    }
}

enum class FacilityStatus(val value: String) {
    ACTIVE("active"),
    INACTIVE("inactive"),
    MAINTENANCE("maintenance");

    companion object {
        fun fromValue(value: String): FacilityStatus =
            entries.find { it.value == value } ?: ACTIVE
    }
}

// ── Availability Schedule Domain Models ────────────────────────

data class FacilityAvailabilitySchedule(
    val weeklySchedule: FacilityWeeklySchedule,
    val exceptions: List<FacilityScheduleException>
)

data class FacilityWeeklySchedule(
    val defaultTimeBlocks: List<FacilityTimeBlock>,
    val days: Map<String, FacilityDaySchedule>
)

data class FacilityTimeBlock(
    val from: String,
    val to: String
)

data class FacilityDaySchedule(
    val available: Boolean,
    val timeBlocks: List<FacilityTimeBlock>
)

data class FacilityScheduleException(
    val date: String,
    val type: String,
    val timeBlocks: List<FacilityTimeBlock>,
    val reason: String?
)
