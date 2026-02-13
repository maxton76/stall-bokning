package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.*
import com.equiduty.domain.model.*
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FeatureRequestRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    suspend fun listFeatureRequests(
        status: FeatureRequestStatus? = null,
        category: FeatureRequestCategory? = null,
        sort: FeatureRequestSortBy = FeatureRequestSortBy.VOTES,
        mine: Boolean = false,
        cursor: String? = null,
        limit: Int = 20
    ): Pair<List<FeatureRequest>, String?> {
        val response = api.getFeatureRequests(
            status = status?.value,
            category = category?.value,
            sort = sort.value,
            mine = if (mine) "true" else null,
            cursor = cursor,
            limit = limit
        )
        return Pair(response.items.map { it.toDomain() }, response.nextCursor)
    }

    suspend fun getFeatureRequest(id: String): Triple<FeatureRequest, List<FeatureRequestComment>, String?> {
        val response = api.getFeatureRequest(id)
        return Triple(
            response.request.toDomain(),
            response.comments.map { it.toDomain() },
            response.commentsNextCursor
        )
    }

    suspend fun createFeatureRequest(
        title: String,
        description: String,
        category: FeatureRequestCategory
    ): FeatureRequest {
        val response = api.createFeatureRequest(
            CreateFeatureRequestDto(title, description, category.value)
        )
        return response.toDomain()
    }

    suspend fun refineText(title: String, description: String, language: String = "sv"): RefineTextResponseDto {
        return api.refineFeatureRequestText(RefineTextRequestDto(title, description, language))
    }

    suspend fun toggleVote(requestId: String): FeatureRequestVoteResponseDto {
        return api.toggleFeatureRequestVote(requestId)
    }

    suspend fun getComments(requestId: String, cursor: String? = null): Pair<List<FeatureRequestComment>, String?> {
        val response = api.getFeatureRequestComments(requestId, cursor)
        return Pair(response.comments.map { it.toDomain() }, response.nextCursor)
    }

    suspend fun addComment(requestId: String, body: String): FeatureRequestComment {
        val response = api.addFeatureRequestComment(requestId, CreateFeatureRequestCommentDto(body))
        return response.toDomain()
    }
}

fun FeatureRequestDto.toDomain(): FeatureRequest = FeatureRequest(
    id = id,
    title = title,
    description = description,
    category = FeatureRequestCategory.fromValue(category),
    status = FeatureRequestStatus.fromValue(status),
    priority = priority?.let { FeatureRequestPriority.fromValue(it) },
    authorId = authorId,
    authorDisplayName = authorDisplayName,
    voteCount = voteCount,
    commentCount = commentCount,
    adminResponse = adminResponse,
    adminResponseAuthorName = adminResponseAuthorName,
    adminResponseAt = adminResponseAt,
    createdAt = createdAt,
    updatedAt = updatedAt,
    hasVoted = hasVoted ?: false
)

fun FeatureRequestCommentDto.toDomain(): FeatureRequestComment = FeatureRequestComment(
    id = id,
    body = body,
    authorId = authorId,
    authorDisplayName = authorDisplayName,
    isAdmin = isAdmin,
    createdAt = createdAt,
    updatedAt = updatedAt
)
