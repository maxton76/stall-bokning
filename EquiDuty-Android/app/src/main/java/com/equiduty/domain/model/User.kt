package com.equiduty.domain.model

data class User(
    val uid: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val systemRole: SystemRole,
    val createdAt: String,
    val updatedAt: String
) {
    val fullName: String get() = "$firstName $lastName"
    val initials: String
        get() = "${firstName.firstOrNull() ?: ""}${lastName.firstOrNull() ?: ""}"
}

enum class SystemRole(val value: String) {
    SYSTEM_ADMIN("system_admin"),
    STABLE_OWNER("stable_owner"),
    MEMBER("member");

    companion object {
        fun fromValue(value: String): SystemRole = when (value) {
            "system_admin" -> SYSTEM_ADMIN
            "stable_owner" -> STABLE_OWNER
            "stable_user" -> MEMBER // legacy
            else -> MEMBER
        }
    }
}
