package com.equiduty.ui.featurerequests

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.FeatureRequestRepository
import com.equiduty.domain.model.FeatureRequest
import com.equiduty.domain.model.FeatureRequestComment
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class FeatureRequestDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: FeatureRequestRepository
) : ViewModel() {

    val requestId: String = savedStateHandle["requestId"] ?: ""

    private val _request = MutableStateFlow<FeatureRequest?>(null)
    val request: StateFlow<FeatureRequest?> = _request.asStateFlow()

    private val _comments = MutableStateFlow<List<FeatureRequestComment>>(emptyList())
    val comments: StateFlow<List<FeatureRequestComment>> = _comments.asStateFlow()

    private val _commentsNextCursor = MutableStateFlow<String?>(null)
    val commentsNextCursor: StateFlow<String?> = _commentsNextCursor.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isLoadingMoreComments = MutableStateFlow(false)
    val isLoadingMoreComments: StateFlow<Boolean> = _isLoadingMoreComments.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _newCommentText = MutableStateFlow("")
    val newCommentText: StateFlow<String> = _newCommentText.asStateFlow()

    private val _isSendingComment = MutableStateFlow(false)
    val isSendingComment: StateFlow<Boolean> = _isSendingComment.asStateFlow()

    private var isVoting = false

    fun loadData() {
        if (requestId.isBlank()) return
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val (req, cmts, cursor) = repository.getFeatureRequest(requestId)
                _request.value = req
                _comments.value = cmts
                _commentsNextCursor.value = cursor
            } catch (e: Exception) {
                Timber.e(e, "Failed to load feature request detail")
                _errorMessage.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadMoreComments() {
        val cursor = _commentsNextCursor.value ?: return
        if (_isLoadingMoreComments.value) return
        viewModelScope.launch {
            _isLoadingMoreComments.value = true
            try {
                val (cmts, newCursor) = repository.getComments(requestId, cursor)
                _comments.value = _comments.value + cmts
                _commentsNextCursor.value = newCursor
            } catch (e: Exception) {
                Timber.e(e, "Failed to load more comments")
            } finally {
                _isLoadingMoreComments.value = false
            }
        }
    }

    fun toggleVote() {
        if (isVoting) return
        val req = _request.value ?: return

        isVoting = true
        val wasVoted = req.hasVoted

        // Optimistic update
        _request.value = req.copy(
            hasVoted = !wasVoted,
            voteCount = req.voteCount + if (wasVoted) -1 else 1
        )

        viewModelScope.launch {
            try {
                val response = repository.toggleVote(requestId)
                _request.value = _request.value?.copy(
                    hasVoted = response.voted,
                    voteCount = response.voteCount
                )
            } catch (e: Exception) {
                _request.value = _request.value?.copy(
                    hasVoted = wasVoted,
                    voteCount = req.voteCount
                )
            } finally {
                isVoting = false
            }
        }
    }

    fun setCommentText(text: String) {
        _newCommentText.value = text
    }

    fun sendComment() {
        val text = _newCommentText.value.trim()
        if (text.isBlank() || _isSendingComment.value) return

        viewModelScope.launch {
            _isSendingComment.value = true
            try {
                val comment = repository.addComment(requestId, text)
                _comments.value = _comments.value + comment
                _newCommentText.value = ""
            } catch (e: Exception) {
                Timber.e(e, "Failed to send comment")
                _errorMessage.value = e.message
            } finally {
                _isSendingComment.value = false
            }
        }
    }
}
