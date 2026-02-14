package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.*
import com.equiduty.domain.model.FacilityReservation
import com.equiduty.domain.model.FacilityType
import com.equiduty.domain.model.ReservationStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class SuggestedSlot(
    val startTime: String,
    val endTime: String,
    val remainingCapacity: Int = 0
)

@Serializable
private data class CapacityErrorBody(
    val error: String = "",
    val message: String = "",
    val remainingCapacity: Int = 0,
    val suggestedSlots: List<SuggestedSlot> = emptyList()
)

class CapacityExceededException(
    message: String,
    val suggestedSlots: List<SuggestedSlot>,
    val remainingCapacity: Int
) : Exception(message)

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

    private val errorJson = Json { ignoreUnknownKeys = true }

    suspend fun createReservation(dto: CreateReservationDto): FacilityReservation {
        try {
            val result = api.createFacilityReservation(dto).toDomain()
            _reservations.value = _reservations.value + result
            return result
        } catch (e: HttpException) {
            if (e.code() == 409) throw parseCapacityError(e)
            throw e
        }
    }

    suspend fun updateReservation(id: String, dto: UpdateReservationDto): FacilityReservation {
        try {
            val result = api.updateFacilityReservation(id, dto).toDomain()
            _reservations.value = _reservations.value.map { if (it.id == id) result else it }
            return result
        } catch (e: HttpException) {
            if (e.code() == 409) throw parseCapacityError(e)
            throw e
        }
    }

    private fun parseCapacityError(e: HttpException): CapacityExceededException {
        val body = e.response()?.errorBody()?.string()
        return try {
            val parsed = errorJson.decodeFromString<CapacityErrorBody>(body ?: "")
            CapacityExceededException(
                message = parsed.message,
                suggestedSlots = parsed.suggestedSlots,
                remainingCapacity = parsed.remainingCapacity
            )
        } catch (parseEx: Exception) {
            Timber.e(parseEx, "Failed to parse 409 error body")
            CapacityExceededException(
                message = "Kapaciteten är full",
                suggestedSlots = emptyList(),
                remainingCapacity = 0
            )
        }
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
    horseIds = horseIds,
    horseNames = horseNames,
    startTime = startTime,
    endTime = endTime,
    purpose = purpose,
    notes = notes,
    status = ReservationStatus.fromValue(status),
    createdAt = createdAt,
    updatedAt = updatedAt
)
