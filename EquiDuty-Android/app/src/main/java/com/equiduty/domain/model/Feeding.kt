package com.equiduty.domain.model

data class FeedType(
    val id: String,
    val stableId: String,
    val name: String,
    val brand: String,
    val category: FeedCategory,
    val quantityMeasure: QuantityMeasure,
    val defaultQuantity: Double,
    val warning: String?,
    val isActive: Boolean,
    val createdBy: String,
    val createdAt: String,
    val updatedAt: String
)

data class FeedingTime(
    val id: String,
    val stableId: String,
    val name: String,
    val time: String, // HH:mm
    val sortOrder: Int,
    val isActive: Boolean,
    val createdBy: String,
    val createdAt: String,
    val updatedAt: String
)

data class HorseFeeding(
    val id: String,
    val stableId: String,
    val horseId: String,
    val feedTypeId: String,
    val feedingTimeId: String,
    val quantity: Double,
    val startDate: String,
    val endDate: String?,
    val notes: String?,
    val isActive: Boolean,
    val createdBy: String,
    val createdAt: String,
    val updatedAt: String,
    val feedTypeName: String,
    val feedTypeCategory: FeedCategory,
    val quantityMeasure: QuantityMeasure,
    val horseName: String,
    val feedingTimeName: String
) {
    val formattedQuantity: String
        get() = "${quantity.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} ${quantityMeasure.abbreviation}"
}

enum class FeedCategory(val value: String) {
    ROUGHAGE("roughage"), CONCENTRATE("concentrate"),
    SUPPLEMENT("supplement"), MEDICINE("medicine");

    companion object {
        fun fromValue(value: String): FeedCategory =
            entries.find { it.value == value } ?: ROUGHAGE
    }
}

enum class QuantityMeasure(val value: String, val abbreviation: String) {
    SCOOP("scoop", "sk"),
    TEASPOON("teaspoon", "tsk"),
    TABLESPOON("tablespoon", "msk"),
    CUP("cup", "cup"),
    ML("ml", "ml"),
    L("l", "l"),
    G("g", "g"),
    KG("kg", "kg"),
    CUSTOM("custom", "");

    companion object {
        fun fromValue(value: String): QuantityMeasure =
            entries.find { it.value == value } ?: KG
    }
}
