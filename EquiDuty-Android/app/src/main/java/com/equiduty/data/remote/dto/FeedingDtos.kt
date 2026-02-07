package com.equiduty.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class FeedTypeDto(
    val id: String,
    val stableId: String,
    val name: String,
    val brand: String = "",
    val category: String = "roughage",
    val quantityMeasure: String = "kg",
    val defaultQuantity: Double = 0.0,
    val warning: String? = null,
    val isActive: Boolean = true,
    val createdBy: String = "",
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class FeedTypesResponseDto(
    val feedTypes: List<FeedTypeDto>
)

@Serializable
data class CreateFeedTypeDto(
    val stableId: String,
    val name: String,
    val brand: String,
    val category: String,
    val quantityMeasure: String,
    val defaultQuantity: Double,
    val warning: String? = null
)

@Serializable
data class UpdateFeedTypeDto(
    val name: String? = null,
    val brand: String? = null,
    val category: String? = null,
    val quantityMeasure: String? = null,
    val defaultQuantity: Double? = null,
    val warning: String? = null,
    val isActive: Boolean? = null
)

@Serializable
data class FeedingTimeDto(
    val id: String,
    val stableId: String,
    val name: String,
    val time: String, // HH:mm
    val sortOrder: Int,
    val isActive: Boolean = true,
    val createdBy: String = "",
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class FeedingTimesResponseDto(
    val feedingTimes: List<FeedingTimeDto>
)

@Serializable
data class HorseFeedingDto(
    val id: String,
    val stableId: String,
    val horseId: String,
    val feedTypeId: String,
    val feedingTimeId: String,
    val quantity: Double,
    val startDate: String,
    val endDate: String? = null,
    val notes: String? = null,
    val isActive: Boolean = true,
    val createdBy: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
    // Denormalized fields
    val feedTypeName: String = "",
    val feedTypeCategory: String = "roughage",
    val quantityMeasure: String = "kg",
    val horseName: String = "",
    val feedingTimeName: String = ""
)

@Serializable
data class HorseFeedingsResponseDto(
    val horseFeedings: List<HorseFeedingDto>
)

@Serializable
data class CreateHorseFeedingDto(
    val stableId: String,
    val horseId: String,
    val feedTypeId: String,
    val feedingTimeId: String,
    val quantity: Double,
    val startDate: String,
    val notes: String? = null
)

@Serializable
data class UpdateHorseFeedingDto(
    val quantity: Double? = null,
    val notes: String? = null,
    val isActive: Boolean? = null,
    val endDate: String? = null
)
