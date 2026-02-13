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
