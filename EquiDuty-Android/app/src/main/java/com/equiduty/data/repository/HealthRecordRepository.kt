package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.*
import com.equiduty.domain.model.*
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HealthRecordRepository @Inject constructor(
    private val api: EquiDutyApi
) {

    suspend fun getHealthRecords(
        horseId: String,
        professionalType: String? = null
    ): List<HealthRecord> {
        return try {
            val response = api.getHealthRecords(horseId, professionalType)
            response.records.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch health records")
            throw e
        }
    }

    suspend fun getHealthRecordStats(horseId: String): HealthRecordStats {
        return try {
            val response = api.getHealthRecordStats(horseId)
            response.stats.toDomain()
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch health record stats")
            throw e
        }
    }

    suspend fun getUpcomingFollowups(horseId: String): List<UpcomingFollowup> {
        return try {
            val response = api.getUpcomingFollowups(horseId)
            response.followups.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch upcoming followups")
            throw e
        }
    }

    suspend fun createHealthRecord(record: CreateHealthRecordDto): HealthRecord {
        return try {
            val response = api.createHealthRecord(record)
            response.toDomain()
        } catch (e: Exception) {
            Timber.e(e, "Failed to create health record")
            throw e
        }
    }

    suspend fun updateHealthRecord(id: String, record: UpdateHealthRecordDto): HealthRecord {
        return try {
            val response = api.updateHealthRecord(id, record)
            response.toDomain()
        } catch (e: Exception) {
            Timber.e(e, "Failed to update health record")
            throw e
        }
    }

    suspend fun deleteHealthRecord(id: String) {
        return try {
            api.deleteHealthRecord(id)
        } catch (e: Exception) {
            Timber.e(e, "Failed to delete health record")
            throw e
        }
    }
}

// ── DTO → Domain Mappers ─────────────────────────────────────────

fun HealthRecordDto.toDomain(): HealthRecord = HealthRecord(
    id = id,
    horseId = horseId,
    horseName = horseName,
    professionalType = HealthProfessionalType.fromValue(professionalType),
    professionalName = professionalName,
    date = date,
    type = HealthRecordType.fromValue(type),
    title = title,
    description = description,
    diagnosis = diagnosis,
    treatment = treatment,
    medications = medications,
    cost = cost,
    followupDate = followupDate,
    followupNotes = followupNotes,
    attachments = attachments,
    createdAt = createdAt,
    createdBy = createdBy,
    updatedAt = updatedAt,
    updatedBy = updatedBy
)

fun HealthRecordStatsDto.toDomain(): HealthRecordStats = HealthRecordStats(
    totalRecords = totalRecords,
    recordsByType = recordsByType,
    recordsByProfessional = recordsByProfessional,
    totalCost = totalCost,
    lastVisit = lastVisit,
    upcomingFollowups = upcomingFollowups
)

fun UpcomingFollowupDto.toDomain(): UpcomingFollowup = UpcomingFollowup(
    recordId = recordId,
    horseId = horseId,
    horseName = horseName,
    professionalType = HealthProfessionalType.fromValue(professionalType),
    followupDate = followupDate,
    followupNotes = followupNotes,
    originalTitle = originalTitle
)
