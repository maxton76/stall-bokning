package com.equiduty.domain.model

data class FeatureRequest(
    val id: String,
    val title: String,
    val description: String,
    val category: FeatureRequestCategory,
    val status: FeatureRequestStatus,
    val priority: FeatureRequestPriority?,
    val authorId: String,
    val authorDisplayName: String,
    val voteCount: Int,
    val commentCount: Int,
    val adminResponse: String?,
    val adminResponseAuthorName: String?,
    val adminResponseAt: String?,
    val createdAt: String,
    val updatedAt: String,
    val hasVoted: Boolean
)

data class FeatureRequestComment(
    val id: String,
    val body: String,
    val authorId: String,
    val authorDisplayName: String,
    val isAdmin: Boolean,
    val createdAt: String,
    val updatedAt: String
)

enum class FeatureRequestStatus(val value: String) {
    OPEN("open"),
    UNDER_REVIEW("under_review"),
    PLANNED("planned"),
    IN_PROGRESS("in_progress"),
    COMPLETED("completed"),
    DECLINED("declined");

    companion object {
        fun fromValue(value: String): FeatureRequestStatus =
            entries.find { it.value == value } ?: OPEN
    }
}

enum class FeatureRequestCategory(val value: String) {
    IMPROVEMENT("improvement"),
    NEW_FEATURE("new_feature"),
    INTEGRATION("integration"),
    BUG_FIX("bug_fix"),
    OTHER("other");

    companion object {
        fun fromValue(value: String): FeatureRequestCategory =
            entries.find { it.value == value } ?: OTHER
    }
}

enum class FeatureRequestPriority(val value: String) {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high"),
    CRITICAL("critical");

    companion object {
        fun fromValue(value: String): FeatureRequestPriority? =
            entries.find { it.value == value }
    }
}

enum class FeatureRequestSortBy(val value: String) {
    VOTES("votes"),
    NEWEST("newest"),
    OLDEST("oldest")
}
