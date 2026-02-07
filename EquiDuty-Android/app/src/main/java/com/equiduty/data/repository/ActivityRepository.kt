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
class ActivityRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _activities = MutableStateFlow<List<ActivityInstance>>(emptyList())
    val activities: StateFlow<List<ActivityInstance>> = _activities.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    suspend fun fetchActivities(
        stableId: String,
        startDate: String? = null,
        endDate: String? = null,
        userId: String? = null,
        horseId: String? = null
    ) {
        _isLoading.value = true
        try {
            val response = api.getActivitiesByStable(
                stableId = stableId,
                startDate = startDate,
                endDate = endDate
            )
            _activities.value = response.activities.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch activities")
            throw e
        } finally {
            _isLoading.value = false
        }
    }

    suspend fun getActivity(activityId: String): ActivityInstance {
        val response = api.getActivity(activityId)
        return response.toDomain()
    }

    suspend fun createActivity(dto: CreateActivityDto): ActivityInstance {
        val response = api.createActivity(dto)
        val activity = response.toDomain()
        _activities.update { it + activity }
        return activity
    }

    suspend fun updateActivity(activityId: String, dto: UpdateActivityDto): ActivityInstance {
        val response = api.updateActivity(activityId, dto)
        val activity = response.toDomain()
        _activities.value = _activities.value.map { if (it.id == activityId) activity else it }
        return activity
    }

    suspend fun deleteActivity(activityId: String) {
        api.deleteActivity(activityId)
        _activities.value = _activities.value.filter { it.id != activityId }
    }
}

// ── DTO → Domain Mapper ─────────────────────────────────────────

fun ActivityInstanceDto.toDomain(): ActivityInstance = ActivityInstance(
    id = id,
    organizationId = organizationId,
    stableId = stableId,
    stableName = stableName,
    activityTypeId = activityTypeConfigId,
    activityTypeName = activityTypeName ?: activityType ?: "Unknown",
    activityTypeCategory = ActivityTypeCategory.fromValue(type),
    activityTypeColor = activityTypeColor,
    scheduledDate = resolvedDate,
    scheduledTime = scheduledTime,
    duration = duration,
    horseIds = resolvedHorseIds,
    horseNames = resolvedHorseNames,
    assignedTo = assignedTo,
    assignedToName = assignedToName,
    status = ActivityInstanceStatus.fromValue(status),
    startedAt = startedAt,
    completedAt = completedAt,
    completedBy = completedBy,
    completedByName = completedByName,
    notes = resolvedNotes,
    photoUrls = photoUrls,
    contactId = contactId,
    contactName = contactName,
    createdAt = createdAt,
    updatedAt = resolvedUpdatedAt,
    createdBy = createdBy
)
