package com.equiduty.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.equiduty.data.repository.PermissionRepository

/**
 * Renders [content] only if the user has the given permission action.
 * Shows [fallback] if denied (defaults to nothing).
 */
@Composable
fun PermissionGate(
    permissionRepository: PermissionRepository,
    action: String,
    fallback: @Composable () -> Unit = {},
    content: @Composable () -> Unit
) {
    val permissions by permissionRepository.permissions.collectAsState()
    if (permissions?.hasPermission(action) == true) {
        content()
    } else {
        fallback()
    }
}
