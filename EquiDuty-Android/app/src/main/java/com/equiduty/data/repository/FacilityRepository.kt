package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.FacilityDto
import com.equiduty.domain.model.Facility
import com.equiduty.domain.model.FacilityStatus
import com.equiduty.domain.model.FacilityType
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

    suspend fun fetchFacilities(stableId: String) {
        _isLoading.value = true
        try {
            val response = api.getFacilities(stableId)
            _facilities.value = response.facilities.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to load facilities")
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
}

fun FacilityDto.toDomain(): Facility = Facility(
    id = id,
    stableId = stableId,
    name = name,
    type = FacilityType.fromValue(type),
    description = description,
    capacity = capacity,
    status = FacilityStatus.fromValue(status),
    minSlotDuration = bookingRules?.minSlotDuration,
    maxDuration = bookingRules?.maxDurationPerReservation,
    maxDurationUnit = bookingRules?.maxDurationUnit,
    maxHorses = bookingRules?.maxHorsesPerReservation,
    requireApproval = bookingRules?.requireApproval ?: false,
    availableFrom = availabilitySchedule?.weeklySchedule?.defaultTimeBlocks?.firstOrNull()?.from,
    availableTo = availabilitySchedule?.weeklySchedule?.defaultTimeBlocks?.lastOrNull()?.to,
    createdAt = createdAt,
    updatedAt = updatedAt
)
