package com.equiduty.data.remote.dto

import kotlinx.serialization.Serializable

// ── Feature Request DTOs ────────────────────────────────────────

@Serializable
data class FeatureRequestDto(
    val id: String,
    val title: String,
    val description: String,
    val category: String,
    val status: String,
    val priority: String? = null,
    val authorId: String,
    val authorDisplayName: String,
    val voteCount: Int = 0,
    val commentCount: Int = 0,
    val adminResponse: String? = null,
    val adminResponseAuthorName: String? = null,
    val adminResponseAt: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val hasVoted: Boolean? = null
)

@Serializable
data class FeatureRequestCommentDto(
    val id: String,
    val body: String,
    val authorId: String,
    val authorDisplayName: String,
    val isAdmin: Boolean = false,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class FeatureRequestListResponseDto(
    val items: List<FeatureRequestDto>,
    val nextCursor: String? = null
)

@Serializable
data class FeatureRequestDetailResponseDto(
    val request: FeatureRequestDto,
    val comments: List<FeatureRequestCommentDto>,
    val commentsNextCursor: String? = null
)

@Serializable
data class FeatureRequestVoteResponseDto(
    val voted: Boolean,
    val voteCount: Int
)

@Serializable
data class FeatureRequestCommentsResponseDto(
    val comments: List<FeatureRequestCommentDto>,
    val nextCursor: String? = null
)

// ── Input DTOs ──────────────────────────────────────────────────

@Serializable
data class CreateFeatureRequestDto(
    val title: String,
    val description: String,
    val category: String
)

@Serializable
data class RefineTextRequestDto(
    val title: String,
    val description: String,
    val language: String = "sv"
)

@Serializable
data class RefineTextResponseDto(
    val title: String,
    val description: String
)

@Serializable
data class CreateFeatureRequestCommentDto(
    val body: String
)
