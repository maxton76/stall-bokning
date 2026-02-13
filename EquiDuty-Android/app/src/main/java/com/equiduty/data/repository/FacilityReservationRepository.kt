package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.*
import com.equiduty.domain.model.FacilityReservation
import com.equiduty.domain.model.FacilityType
import com.equiduty.domain.model.ReservationStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FacilityReservationRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _reservations = MutableStateFlow<List<FacilityReservation>>(emptyList())
    val reservations: StateFlow<List<FacilityReservation>> = _reservations.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    suspend fun fetchReservations(
        stableId: String? = null,
        facilityId: String? = null,
        userId: String? = null,
        startDate: String? = null,
        endDate: String? = null
    ) {
        _isLoading.value = true
        try {
            val response = api.getFacilityReservations(
                stableId = stableId,
                facilityId = facilityId,
                userId = userId,
                startDate = startDate,
                endDate = endDate
            )
            _reservations.value = response.reservations.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to load reservations")
        } finally {
            _isLoading.value = false
        }
    }

    suspend fun getReservation(id: String): FacilityReservation? {
        return try {
            api.getFacilityReservation(id).toDomain()
        } catch (e: Exception) {
            Timber.e(e, "Failed to load reservation $id")
            null
        }
    }

    suspend fun createReservation(dto: CreateReservationDto): FacilityReservation {
        val result = api.createFacilityReservation(dto).toDomain()
        _reservations.value = _reservations.value + result
        return result
    }

    suspend fun updateReservation(id: String, dto: UpdateReservationDto): FacilityReservation {
        val result = api.updateFacilityReservation(id, dto).toDomain()
        _reservations.value = _reservations.value.map { if (it.id == id) result else it }
        return result
    }

    suspend fun cancelReservation(id: String) {
        api.cancelFacilityReservation(id)
        _reservations.value = _reservations.value.map {
            if (it.id == id) it.copy(status = ReservationStatus.CANCELLED) else it
        }
    }

    suspend fun checkConflicts(dto: CheckConflictsDto): ConflictsResponseDto {
        return try {
            api.checkReservationConflicts(dto)
        } catch (e: Exception) {
            Timber.e(e, "Failed to check conflicts")
            ConflictsResponseDto(emptyList(), false)
        }
    }
}

fun FacilityReservationDto.toDomain(): FacilityReservation = FacilityReservation(
    id = id,
    facilityId = facilityId,
    facilityName = facilityName ?: "",
    facilityType = FacilityType.fromValue(facilityType ?: "other"),
    stableId = stableId,
    stableName = stableName ?: "",
    userId = userId,
    userEmail = userEmail ?: "",
    userFullName = userFullName ?: "",
    horseId = horseId,
    horseName = horseName,
    startTime = startTime,
    endTime = endTime,
    purpose = purpose,
    notes = notes,
    status = ReservationStatus.fromValue(status),
    createdAt = createdAt,
    updatedAt = updatedAt
)
