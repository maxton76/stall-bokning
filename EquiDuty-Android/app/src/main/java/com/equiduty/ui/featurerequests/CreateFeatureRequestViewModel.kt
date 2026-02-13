package com.equiduty.ui.featurerequests

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.FeatureRequestRepository
import com.equiduty.domain.model.FeatureRequestCategory
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class CreateFeatureRequestViewModel @Inject constructor(
    private val repository: FeatureRequestRepository
) : ViewModel() {

    private val _title = MutableStateFlow("")
    val title: StateFlow<String> = _title.asStateFlow()

    private val _description = MutableStateFlow("")
    val description: StateFlow<String> = _description.asStateFlow()

    private val _selectedCategory = MutableStateFlow(FeatureRequestCategory.IMPROVEMENT)
    val selectedCategory: StateFlow<FeatureRequestCategory> = _selectedCategory.asStateFlow()

    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting: StateFlow<Boolean> = _isSubmitting.asStateFlow()

    private val _isRefining = MutableStateFlow(false)
    val isRefining: StateFlow<Boolean> = _isRefining.asStateFlow()

    private val _isShowingRefined = MutableStateFlow(false)
    val isShowingRefined: StateFlow<Boolean> = _isShowingRefined.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _didCreate = MutableStateFlow(false)
    val didCreate: StateFlow<Boolean> = _didCreate.asStateFlow()

    private var originalTitle: String? = null
    private var originalDescription: String? = null

    val isValid: Boolean
        get() = _title.value.trim().length >= 5 && _description.value.trim().length >= 20

    fun setTitle(value: String) { _title.value = value }
    fun setDescription(value: String) { _description.value = value }
    fun setCategory(value: FeatureRequestCategory) { _selectedCategory.value = value }

    fun submit() {
        if (!isValid || _isSubmitting.value) return
        viewModelScope.launch {
            _isSubmitting.value = true
            _errorMessage.value = null
            try {
                repository.createFeatureRequest(
                    title = _title.value.trim(),
                    description = _description.value.trim(),
                    category = _selectedCategory.value
                )
                _didCreate.value = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to create feature request")
                _errorMessage.value = e.message
            } finally {
                _isSubmitting.value = false
            }
        }
    }

    fun refine(language: String = "sv") {
        if (_isRefining.value) return

        if (!_isShowingRefined.value) {
            originalTitle = _title.value
            originalDescription = _description.value
        }

        viewModelScope.launch {
            _isRefining.value = true
            _errorMessage.value = null
            try {
                val response = repository.refineText(_title.value, _description.value, language)
                _title.value = response.title
                _description.value = response.description
                _isShowingRefined.value = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to refine text")
                _errorMessage.value = e.message
            } finally {
                _isRefining.value = false
            }
        }
    }

    fun revertToOriginal() {
        originalTitle?.let { _title.value = it }
        originalDescription?.let { _description.value = it }
        _isShowingRefined.value = false
        originalTitle = null
        originalDescription = null
    }
}
