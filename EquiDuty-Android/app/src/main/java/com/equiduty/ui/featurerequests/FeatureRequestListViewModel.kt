package com.equiduty.ui.featurerequests

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.FeatureRequestRepository
import com.equiduty.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class FeatureRequestListViewModel @Inject constructor(
    private val repository: FeatureRequestRepository
) : ViewModel() {

    private val _requests = MutableStateFlow<List<FeatureRequest>>(emptyList())
    val requests: StateFlow<List<FeatureRequest>> = _requests.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isLoadingMore = MutableStateFlow(false)
    val isLoadingMore: StateFlow<Boolean> = _isLoadingMore.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _nextCursor = MutableStateFlow<String?>(null)
    val nextCursor: StateFlow<String?> = _nextCursor.asStateFlow()

    private val _selectedStatus = MutableStateFlow<FeatureRequestStatus?>(null)
    val selectedStatus: StateFlow<FeatureRequestStatus?> = _selectedStatus.asStateFlow()

    private val _selectedCategory = MutableStateFlow<FeatureRequestCategory?>(null)
    val selectedCategory: StateFlow<FeatureRequestCategory?> = _selectedCategory.asStateFlow()

    private val _sortBy = MutableStateFlow(FeatureRequestSortBy.VOTES)
    val sortBy: StateFlow<FeatureRequestSortBy> = _sortBy.asStateFlow()

    private val _showMineOnly = MutableStateFlow(false)
    val showMineOnly: StateFlow<Boolean> = _showMineOnly.asStateFlow()

    private val votingIds = mutableSetOf<String>()
    private var hasLoaded = false

    fun loadData() {
        if (hasLoaded) return
        fetchData()
    }

    private fun fetchData() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val (items, cursor) = repository.listFeatureRequests(
                    status = _selectedStatus.value,
                    category = _selectedCategory.value,
                    sort = _sortBy.value,
                    mine = _showMineOnly.value
                )
                _requests.value = items
                _nextCursor.value = cursor
                hasLoaded = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to load feature requests")
                _errorMessage.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadMore() {
        val cursor = _nextCursor.value ?: return
        if (_isLoadingMore.value) return
        viewModelScope.launch {
            _isLoadingMore.value = true
            try {
                val (items, newCursor) = repository.listFeatureRequests(
                    status = _selectedStatus.value,
                    category = _selectedCategory.value,
                    sort = _sortBy.value,
                    mine = _showMineOnly.value,
                    cursor = cursor
                )
                _requests.value = _requests.value + items
                _nextCursor.value = newCursor
            } catch (e: Exception) {
                Timber.e(e, "Failed to load more feature requests")
            } finally {
                _isLoadingMore.value = false
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                val (items, cursor) = repository.listFeatureRequests(
                    status = _selectedStatus.value,
                    category = _selectedCategory.value,
                    sort = _sortBy.value,
                    mine = _showMineOnly.value
                )
                _requests.value = items
                _nextCursor.value = cursor
            } catch (e: Exception) {
                Timber.e(e, "Failed to refresh feature requests")
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun setStatus(status: FeatureRequestStatus?) {
        _selectedStatus.value = status
        reload()
    }

    fun setCategory(category: FeatureRequestCategory?) {
        _selectedCategory.value = category
        reload()
    }

    fun setSortBy(sort: FeatureRequestSortBy) {
        _sortBy.value = sort
        reload()
    }

    fun setShowMineOnly(mine: Boolean) {
        _showMineOnly.value = mine
        reload()
    }

    private fun reload() {
        hasLoaded = false
        _requests.value = emptyList()
        _nextCursor.value = null
        fetchData()
    }

    fun toggleVote(requestId: String) {
        if (requestId in votingIds) return
        val currentList = _requests.value.toMutableList()
        val index = currentList.indexOfFirst { it.id == requestId }
        if (index == -1) return

        votingIds.add(requestId)
        val request = currentList[index]
        val wasVoted = request.hasVoted

        // Optimistic update
        currentList[index] = request.copy(
            hasVoted = !wasVoted,
            voteCount = request.voteCount + if (wasVoted) -1 else 1
        )
        _requests.value = currentList

        viewModelScope.launch {
            try {
                val response = repository.toggleVote(requestId)
                val list = _requests.value.toMutableList()
                val idx = list.indexOfFirst { it.id == requestId }
                if (idx != -1) {
                    list[idx] = list[idx].copy(
                        hasVoted = response.voted,
                        voteCount = response.voteCount
                    )
                    _requests.value = list
                }
            } catch (e: Exception) {
                // Revert
                val list = _requests.value.toMutableList()
                val idx = list.indexOfFirst { it.id == requestId }
                if (idx != -1) {
                    list[idx] = list[idx].copy(
                        hasVoted = wasVoted,
                        voteCount = request.voteCount
                    )
                    _requests.value = list
                }
            } finally {
                votingIds.remove(requestId)
            }
        }
    }
}
