package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.*
import com.equiduty.domain.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FeedingRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _feedTypes = MutableStateFlow<List<FeedType>>(emptyList())
    val feedTypes: StateFlow<List<FeedType>> = _feedTypes.asStateFlow()

    private val _feedingTimes = MutableStateFlow<List<FeedingTime>>(emptyList())
    val feedingTimes: StateFlow<List<FeedingTime>> = _feedingTimes.asStateFlow()

    private val _horseFeedings = MutableStateFlow<List<HorseFeeding>>(emptyList())
    val horseFeedings: StateFlow<List<HorseFeeding>> = _horseFeedings.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    suspend fun fetchFeedTypes(orgId: String) {
        try {
            val response = api.getFeedTypes(orgId)
            _feedTypes.value = response.feedTypes.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch feed types")
            throw e
        }
    }

    suspend fun fetchFeedingTimes(stableId: String) {
        try {
            val response = api.getFeedingTimes(stableId)
            _feedingTimes.value = response.feedingTimes.map { it.toDomain() }
                .sortedBy { it.sortOrder }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch feeding times")
            throw e
        }
    }

    suspend fun fetchHorseFeedings(stableId: String) {
        _isLoading.value = true
        try {
            val response = api.getHorseFeedings(stableId)
            _horseFeedings.value = response.horseFeedings.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch horse feedings")
            throw e
        } finally {
            _isLoading.value = false
        }
    }

    suspend fun createFeedType(body: CreateFeedTypeDto): FeedType {
        val response = api.createFeedType(body)
        val created = response.toDomain()
        _feedTypes.update { it + created }
        return created
    }

    suspend fun updateFeedType(id: String, body: UpdateFeedTypeDto): FeedType {
        val response = api.updateFeedType(id, body)
        val updated = response.toDomain()
        _feedTypes.update { list -> list.map { if (it.id == id) updated else it } }
        return updated
    }

    suspend fun deleteFeedType(id: String) {
        api.deleteFeedType(id)
        _feedTypes.value = _feedTypes.value.filter { it.id != id }
    }

    suspend fun createHorseFeeding(body: CreateHorseFeedingDto): HorseFeeding {
        val response = api.createHorseFeeding(body)
        val created = response.toDomain()
        _horseFeedings.update { it + created }
        return created
    }

    suspend fun updateHorseFeeding(id: String, body: UpdateHorseFeedingDto): HorseFeeding {
        val response = api.updateHorseFeeding(id, body)
        val updated = response.toDomain()
        _horseFeedings.update { list -> list.map { if (it.id == id) updated else it } }
        return updated
    }

    suspend fun deleteHorseFeeding(id: String) {
        api.deleteHorseFeeding(id)
        _horseFeedings.value = _horseFeedings.value.filter { it.id != id }
    }
}

// ── DTO → Domain Mappers ─────────────────────────────────────────

fun FeedTypeDto.toDomain(): FeedType = FeedType(
    id = id,
    stableId = stableId,
    name = name,
    brand = brand,
    category = FeedCategory.fromValue(category),
    quantityMeasure = QuantityMeasure.fromValue(quantityMeasure),
    defaultQuantity = defaultQuantity,
    warning = warning,
    isActive = isActive,
    createdBy = createdBy,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun FeedingTimeDto.toDomain(): FeedingTime = FeedingTime(
    id = id,
    stableId = stableId,
    name = name,
    time = time,
    sortOrder = sortOrder,
    isActive = isActive,
    createdBy = createdBy,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun HorseFeedingDto.toDomain(): HorseFeeding = HorseFeeding(
    id = id,
    stableId = stableId,
    horseId = horseId,
    feedTypeId = feedTypeId,
    feedingTimeId = feedingTimeId,
    quantity = quantity,
    startDate = startDate,
    endDate = endDate,
    notes = notes,
    isActive = isActive,
    createdBy = createdBy,
    createdAt = createdAt,
    updatedAt = updatedAt,
    feedTypeName = feedTypeName,
    feedTypeCategory = FeedCategory.fromValue(feedTypeCategory),
    quantityMeasure = QuantityMeasure.fromValue(quantityMeasure),
    horseName = horseName,
    feedingTimeName = feedingTimeName
)
