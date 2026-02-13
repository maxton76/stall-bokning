package com.equiduty.ui.horses

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.CreateHorseDto
import com.equiduty.data.remote.dto.UpdateHorseDto
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.HorseMediaRepository
import com.equiduty.data.repository.HorseRepository
import com.equiduty.ui.utils.DateValidation
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import java.util.UUID

data class EquipmentItemData(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val location: String? = null,
    val notes: String? = null
)

@HiltViewModel
class HorseFormViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val horseRepository: HorseRepository,
    private val horseMediaRepository: HorseMediaRepository,
    private val authRepository: AuthRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val horseId: String? = savedStateHandle["horseId"]
    val isEditing = horseId != null

    // Basic info
    val name = mutableStateOf("")
    val breed = mutableStateOf("")
    val color = mutableStateOf("")
    val gender = mutableStateOf("")
    val dateOfBirth = mutableStateOf("")
    val withersHeight = mutableStateOf("")

    // Placement
    val boxLocation = mutableStateOf("")
    val paddockLocation = mutableStateOf("")

    // Management
    val status = mutableStateOf("active")
    val usageList = mutableStateOf<List<String>>(emptyList())
    val horseGroupId = mutableStateOf<String?>(null)
    val arrivalDate = mutableStateOf("")

    // Identification
    val ueln = mutableStateOf("")
    val chipNumber = mutableStateOf("")
    val federationNumber = mutableStateOf("")
    val feiPassNumber = mutableStateOf("")
    val feiExpiryDate = mutableStateOf("")

    // Pedigree
    val sire = mutableStateOf("")
    val dam = mutableStateOf("")
    val damsire = mutableStateOf("")
    val breeder = mutableStateOf("")
    val studbook = mutableStateOf("")

    // Equipment
    val equipment = mutableStateOf<List<EquipmentItemData>>(emptyList())

    // Care
    val specialInstructions = mutableStateOf("")
    val notes = mutableStateOf("")

    // Photo states
    val coverPhotoUrl = mutableStateOf<String?>(null)
    val avatarUrl = mutableStateOf<String?>(null)
    private var coverPhotoUri: Uri? = null
    private var avatarUri: Uri? = null
    private var removeCoverPhoto = false
    private var removeAvatar = false

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _isSaved = MutableStateFlow(false)
    val isSaved: StateFlow<Boolean> = _isSaved.asStateFlow()

    init {
        if (horseId != null) {
            loadExistingHorse(horseId)
        }
    }

    private fun loadExistingHorse(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val horse = horseRepository.getHorse(id)
                // Basic info
                name.value = horse.name
                breed.value = horse.breed ?: ""
                color.value = horse.color.value
                gender.value = horse.gender?.value ?: ""
                dateOfBirth.value = horse.dateOfBirth ?: ""
                withersHeight.value = horse.withersHeight?.toString() ?: ""

                // Placement (backend doesn't have these yet, but we'll prepare for it)
                boxLocation.value = ""
                paddockLocation.value = ""

                // Management
                status.value = horse.status.value
                usageList.value = horse.usage?.map { it.value } ?: emptyList()
                horseGroupId.value = horse.horseGroupId
                arrivalDate.value = horse.assignedAt ?: ""

                // Identification
                ueln.value = horse.ueln ?: ""
                chipNumber.value = horse.chipNumber ?: ""
                federationNumber.value = horse.federationNumber ?: ""
                feiPassNumber.value = horse.feiPassNumber ?: ""
                feiExpiryDate.value = horse.feiExpiryDate ?: ""

                // Pedigree
                sire.value = horse.sire ?: ""
                dam.value = horse.dam ?: ""
                damsire.value = horse.damsire ?: ""
                breeder.value = horse.breeder ?: ""
                studbook.value = horse.studbook ?: ""

                // Equipment
                equipment.value = horse.equipment?.map {
                    EquipmentItemData(
                        id = it.id,
                        name = it.name,
                        location = it.location,
                        notes = it.notes
                    )
                } ?: emptyList()

                // Care
                specialInstructions.value = horse.specialInstructions ?: ""
                notes.value = horse.notes ?: ""

                // Photos
                coverPhotoUrl.value = horse.coverPhotoUrl
                avatarUrl.value = horse.avatarUrl
            } catch (e: Exception) {
                _error.value = "Kunde inte ladda häst"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun onCoverPhotoSelected(uri: Uri) {
        coverPhotoUri = uri
        removeCoverPhoto = false
    }

    fun onCoverPhotoRemoved() {
        coverPhotoUri = null
        coverPhotoUrl.value = null
        removeCoverPhoto = true
    }

    fun onAvatarSelected(uri: Uri) {
        avatarUri = uri
        removeAvatar = false
    }

    fun onAvatarRemoved() {
        avatarUri = null
        avatarUrl.value = null
        removeAvatar = true
    }

    fun addEquipment(name: String, location: String? = null, notes: String? = null) {
        if (name.isBlank()) return
        equipment.value = equipment.value + EquipmentItemData(
            name = name,
            location = location,
            notes = notes
        )
    }

    fun removeEquipment(item: EquipmentItemData) {
        equipment.value = equipment.value.filterNot { it.id == item.id }
    }

    fun updateEquipment(item: EquipmentItemData, name: String, location: String? = null, notes: String? = null) {
        equipment.value = equipment.value.map {
            if (it.id == item.id) {
                item.copy(name = name, location = location, notes = notes)
            } else {
                it
            }
        }
    }

    fun toggleUsage(usageValue: String) {
        val current = usageList.value.toMutableList()
        if (current.contains(usageValue)) {
            current.remove(usageValue)
        } else {
            current.add(usageValue)
        }
        usageList.value = current
    }

    private suspend fun uploadPhotos(savedHorseId: String) {
        // Upload cover photo if selected
        coverPhotoUri?.let { uri ->
            val file = uriToFile(uri, "cover_photo.jpg")
            try {
                horseMediaRepository.uploadHorsePhoto(
                    horseId = savedHorseId,
                    mediaType = "cover",
                    imageFile = file
                )
            } catch (e: Exception) {
                Timber.e(e, "Failed to upload cover photo")
                throw Exception("Kunde inte ladda upp omslagsbild: ${e.message}")
            } finally {
                // Always clean up temp file, even on error
                file.delete()
            }
        }

        // Upload avatar if selected
        avatarUri?.let { uri ->
            val file = uriToFile(uri, "avatar.jpg")
            try {
                horseMediaRepository.uploadHorsePhoto(
                    horseId = savedHorseId,
                    mediaType = "avatar",
                    imageFile = file
                )
            } catch (e: Exception) {
                Timber.e(e, "Failed to upload avatar")
                throw Exception("Kunde inte ladda upp avatar: ${e.message}")
            } finally {
                // Always clean up temp file, even on error
                file.delete()
            }
        }
    }

    private fun uriToFile(uri: Uri, fileName: String): File {
        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalArgumentException("Could not open URI")

        // Add UUID to prevent concurrent overwrites
        val uniqueFileName = "${UUID.randomUUID()}_$fileName"
        val tempFile = File(context.cacheDir, uniqueFileName)

        try {
            FileOutputStream(tempFile).use { outputStream ->
                inputStream.copyTo(outputStream)
            }
            inputStream.close()

            // Check size after writing
            if (tempFile.length() > 10 * 1024 * 1024) {  // 10MB
                tempFile.delete()
                throw Exception("Bilden är för stor. Max 10MB tillåtet.")
            }

            return tempFile
        } catch (e: Exception) {
            tempFile.delete()  // Cleanup on error
            throw e
        }
    }

    fun save() {
        if (name.value.isBlank()) {
            _error.value = "Namn krävs"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            try {
                // Validate dates before sending to API
                val dateError = DateValidation.validateDates(
                    mapOf(
                        "födelsedatum" to dateOfBirth.value,
                        "ankomstdatum" to arrivalDate.value,
                        "FEI utgångsdatum" to feiExpiryDate.value
                    )
                )
                if (dateError != null) {
                    _error.value = dateError
                    _isLoading.value = false
                    return@launch
                }

                val equipmentDtos = equipment.value.map {
                    com.equiduty.data.remote.dto.EquipmentItemDto(
                        id = it.id,
                        name = it.name,
                        location = it.location,
                        notes = it.notes
                    )
                }

                val savedHorseId = if (isEditing) {
                    horseRepository.updateHorse(
                        horseId!!,
                        UpdateHorseDto(
                            name = name.value.trim(),
                            breed = breed.value.trim().ifBlank { null },
                            color = color.value.trim().ifBlank { null },
                            gender = gender.value.trim().ifBlank { null },
                            dateOfBirth = dateOfBirth.value.trim().ifBlank { null },
                            withersHeight = withersHeight.value.trim().toIntOrNull(),
                            status = status.value.trim(),
                            usage = usageList.value.ifEmpty { null },
                            horseGroupId = horseGroupId.value,
                            ueln = ueln.value.trim().ifBlank { null },
                            chipNumber = chipNumber.value.trim().ifBlank { null },
                            federationNumber = federationNumber.value.trim().ifBlank { null },
                            feiPassNumber = feiPassNumber.value.trim().ifBlank { null },
                            feiExpiryDate = feiExpiryDate.value.trim().ifBlank { null },
                            sire = sire.value.trim().ifBlank { null },
                            dam = dam.value.trim().ifBlank { null },
                            damsire = damsire.value.trim().ifBlank { null },
                            breeder = breeder.value.trim().ifBlank { null },
                            studbook = studbook.value.trim().ifBlank { null },
                            equipment = equipmentDtos.ifEmpty { null },
                            specialInstructions = specialInstructions.value.trim().ifBlank { null },
                            notes = notes.value.trim().ifBlank { null }
                        )
                    )
                    horseId
                } else {
                    val stableId = authRepository.selectedStable.value?.id ?: throw IllegalStateException("Inget stall valt")
                    val createdHorse = horseRepository.createHorse(
                        CreateHorseDto(
                            name = name.value.trim(),
                            currentStableId = stableId,
                            breed = breed.value.trim().ifBlank { null },
                            color = color.value.trim().ifBlank { "brown" },
                            gender = gender.value.trim().ifBlank { null },
                            dateOfBirth = dateOfBirth.value.trim().ifBlank { null },
                            withersHeight = withersHeight.value.trim().toIntOrNull(),
                            usage = usageList.value.ifEmpty { null },
                            horseGroupId = horseGroupId.value,
                            ueln = ueln.value.trim().ifBlank { null },
                            chipNumber = chipNumber.value.trim().ifBlank { null },
                            federationNumber = federationNumber.value.trim().ifBlank { null },
                            feiPassNumber = feiPassNumber.value.trim().ifBlank { null },
                            feiExpiryDate = feiExpiryDate.value.trim().ifBlank { null },
                            sire = sire.value.trim().ifBlank { null },
                            dam = dam.value.trim().ifBlank { null },
                            damsire = damsire.value.trim().ifBlank { null },
                            breeder = breeder.value.trim().ifBlank { null },
                            studbook = studbook.value.trim().ifBlank { null },
                            equipment = equipmentDtos.ifEmpty { null },
                            specialInstructions = specialInstructions.value.trim().ifBlank { null },
                            notes = notes.value.trim().ifBlank { null }
                        )
                    )
                    createdHorse.id
                }

                // Upload photos if any were selected
                uploadPhotos(savedHorseId)

                _isSaved.value = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to save horse")
                _error.value = e.localizedMessage ?: "Kunde inte spara häst"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
