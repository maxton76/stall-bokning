package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.*
import com.equiduty.domain.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HorseRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _horses = MutableStateFlow<List<Horse>>(emptyList())
    val horses: StateFlow<List<Horse>> = _horses.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    suspend fun fetchHorses(stableId: String, scope: String = "stable") {
        _isLoading.value = true
        try {
            val response = api.getHorses(stableId = stableId, scope = scope)
            _horses.value = response.horses.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch horses")
            throw e
        } finally {
            _isLoading.value = false
        }
    }

    suspend fun getHorse(horseId: String): Horse {
        val response = api.getHorse(horseId)
        return response.horse.toDomain()
    }

    suspend fun createHorse(dto: CreateHorseDto): Horse {
        val response = api.createHorse(dto)
        val horse = response.horse.toDomain()
        _horses.update { it + horse }
        return horse
    }

    suspend fun updateHorse(horseId: String, dto: UpdateHorseDto): Horse {
        val response = api.updateHorse(horseId, dto)
        val horse = response.horse.toDomain()
        _horses.value = _horses.value.map { if (it.id == horseId) horse else it }
        return horse
    }

    suspend fun deleteHorse(horseId: String) {
        api.deleteHorse(horseId)
        _horses.value = _horses.value.filter { it.id != horseId }
    }

    suspend fun getVaccinationRecords(horseId: String): List<VaccinationRecord> {
        val response = api.getVaccinationRecords(horseId)
        return response.records.map { it.toDomain() }
    }

    suspend fun getTeam(horseId: String): HorseTeam {
        val response = api.getHorseTeam(horseId)
        return response.team.toDomain()
    }

    suspend fun getOwnerships(horseId: String): List<HorseOwnership> {
        val response = api.getHorseOwnerships(horseId)
        return response.ownerships.map { it.toDomain() }
    }
}

// ── DTO → Domain Mappers ─────────────────────────────────────────

fun HorseDto.toDomain(): Horse = Horse(
    id = id,
    name = name,
    breed = breed,
    age = age,
    color = HorseColor.fromValue(color),
    gender = HorseGender.fromValue(gender),
    ownerId = ownerId,
    ownerName = ownerName,
    ownerEmail = ownerEmail,
    currentStableId = currentStableId,
    currentStableName = currentStableName,
    assignedAt = assignedAt,
    status = HorseStatus.fromValue(status),
    notes = notes,
    specialInstructions = specialInstructions,
    equipment = equipment?.map { it.toDomain() },
    hasSpecialInstructions = hasSpecialInstructions,
    usage = usage?.mapNotNull { HorseUsage.fromValue(it) },
    horseGroupId = horseGroupId,
    horseGroupName = horseGroupName,
    lastVaccinationDate = lastVaccinationDate,
    nextVaccinationDue = nextVaccinationDue,
    vaccinationStatus = VaccinationStatus.fromValue(vaccinationStatus),
    ueln = ueln,
    chipNumber = chipNumber,
    federationNumber = federationNumber,
    feiPassNumber = feiPassNumber,
    feiExpiryDate = feiExpiryDate,
    sire = sire,
    dam = dam,
    damsire = damsire,
    breeder = breeder,
    studbook = studbook,
    dateOfBirth = dateOfBirth,
    withersHeight = withersHeight,
    externalLocation = externalLocation,
    externalMoveType = externalMoveType,
    externalDepartureDate = externalDepartureDate,
    team = team?.toDomain(),
    createdAt = createdAt,
    updatedAt = updatedAt,
    accessLevel = AccessLevel.fromValue(accessLevel),
    isOwner = isOwner ?: false
)

fun HorseTeamDto.toDomain(): HorseTeam = HorseTeam(
    defaultRider = defaultRider?.toDomain(),
    defaultGroom = defaultGroom?.toDomain(),
    defaultFarrier = defaultFarrier?.toDomain(),
    defaultVet = defaultVet?.toDomain(),
    defaultTrainer = defaultTrainer?.toDomain(),
    defaultDentist = defaultDentist?.toDomain(),
    additionalContacts = additionalContacts?.map { it.toDomain() } ?: emptyList()
)

fun TeamMemberDto.toDomain(): TeamMember = TeamMember(
    name = resolvedName,
    role = TeamMemberRole.fromValue(role),
    isPrimary = isPrimary ?: false,
    email = email,
    phone = phone,
    notes = notes
)

fun EquipmentItemDto.toDomain(): EquipmentItem = EquipmentItem(
    id = id,
    name = name,
    location = location,
    notes = notes
)

fun VaccinationRecordDto.toDomain(): VaccinationRecord = VaccinationRecord(
    id = id,
    horseId = horseId,
    vaccinationDate = vaccinationDate,
    vaccinationRuleName = vaccinationRuleName,
    veterinarianName = veterinarianName,
    notes = notes,
    vaccinationRuleId = vaccinationRuleId,
    ruleName = ruleName,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun HorseOwnershipDto.toDomain(): HorseOwnership = HorseOwnership(
    id = id,
    horseId = horseId,
    ownerId = ownerId,
    ownerName = ownerName,
    role = OwnershipRole.fromValue(role),
    percentage = percentage,
    startDate = startDate,
    endDate = endDate,
    email = email,
    phone = phone,
    notes = notes,
    createdAt = createdAt,
    updatedAt = updatedAt
)
