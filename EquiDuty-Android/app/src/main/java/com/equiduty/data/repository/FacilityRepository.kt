package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.CreateFacilityDto
import com.equiduty.data.remote.dto.FacilityDto
import com.equiduty.data.remote.dto.UpdateFacilityDto
import com.equiduty.domain.model.Facility
import com.equiduty.domain.model.FacilityAvailabilitySchedule
import com.equiduty.domain.model.FacilityDaySchedule
import com.equiduty.domain.model.FacilityScheduleException
import com.equiduty.domain.model.FacilityStatus
import com.equiduty.domain.model.FacilityTimeBlock
import com.equiduty.domain.model.FacilityType
import com.equiduty.domain.model.FacilityWeeklySchedule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FacilityRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _facilities = MutableStateFlow<List<Facility>>(emptyList())
    val facilities: StateFlow<List<Facility>> = _facilities.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    suspend fun fetchFacilities(stableId: String, reservableOnly: Boolean = false) {
        _isLoading.value = true
        _error.value = null
        try {
            val response = api.getFacilities(
                stableId = stableId,
                reservableOnly = if (reservableOnly) true else null
            )
            _facilities.value = response.facilities.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to load facilities")
            _error.value = e.message ?: "Unknown error"
        } finally {
            _isLoading.value = false
        }
    }

    suspend fun getFacility(id: String): Facility? {
        return try {
            api.getFacility(id).toDomain()
        } catch (e: Exception) {
            Timber.e(e, "Failed to load facility $id")
            null
        }
    }

    suspend fun createFacility(request: CreateFacilityDto): String {
        val response = api.createFacility(request)
        return response.id
    }

    suspend fun updateFacility(id: String, updates: UpdateFacilityDto): Facility {
        val response = api.updateFacility(id, updates)
        return response.toDomain()
    }

    suspend fun deleteFacility(id: String) {
        api.deleteFacility(id)
    }
}

fun FacilityDto.toDomain(): Facility = Facility(
    id = id,
    stableId = stableId,
    name = name,
    type = FacilityType.fromValue(type),
    description = description,
    capacity = capacity,
    status = FacilityStatus.fromValue(status),
    minSlotDuration = bookingRules?.minSlotDuration ?: minTimeSlotDuration,
    maxDuration = bookingRules?.maxDurationPerReservation ?: maxHoursPerReservation,
    maxDurationUnit = bookingRules?.maxDurationUnit,
    maxHorses = bookingRules?.maxHorsesPerReservation ?: maxHorsesPerReservation,
    requireApproval = bookingRules?.requireApproval ?: false,
    availableFrom = availabilitySchedule?.weeklySchedule?.defaultTimeBlocks?.firstOrNull()?.from,
    availableTo = availabilitySchedule?.weeklySchedule?.defaultTimeBlocks?.lastOrNull()?.to,
    planningWindowOpens = planningWindowOpens,
    planningWindowCloses = planningWindowCloses,
    availabilitySchedule = availabilitySchedule?.let { schedule ->
        FacilityAvailabilitySchedule(
            weeklySchedule = FacilityWeeklySchedule(
                defaultTimeBlocks = schedule.weeklySchedule?.defaultTimeBlocks?.map {
                    FacilityTimeBlock(from = it.from, to = it.to)
                } ?: emptyList(),
                days = schedule.weeklySchedule?.days?.mapValues { (_, dayDto) ->
                    FacilityDaySchedule(
                        available = dayDto.available ?: true,
                        timeBlocks = dayDto.timeBlocks?.map {
                            FacilityTimeBlock(from = it.from, to = it.to)
                        } ?: emptyList()
                    )
                } ?: emptyMap()
            ),
            exceptions = schedule.exceptions?.map { exc ->
                FacilityScheduleException(
                    date = exc.date,
                    type = exc.type,
                    timeBlocks = exc.timeBlocks?.map {
                        FacilityTimeBlock(from = it.from, to = it.to)
                    } ?: emptyList(),
                    reason = exc.reason
                )
            } ?: emptyList()
        )
    },
    createdAt = createdAt,
    updatedAt = updatedAt
)
