package com.equiduty.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.equiduty.R
import com.equiduty.domain.model.RoutineInstanceStatus

/**
 * Extension function to convert RoutineInstanceStatus enum to localized string
 */
@Composable
fun RoutineInstanceStatus.toLocalizedString(): String {
    return stringResource(
        when (this) {
            RoutineInstanceStatus.SCHEDULED -> R.string.routine_status_scheduled
            RoutineInstanceStatus.STARTED -> R.string.routine_status_started
            RoutineInstanceStatus.IN_PROGRESS -> R.string.routine_status_in_progress
            RoutineInstanceStatus.COMPLETED -> R.string.routine_status_completed
            RoutineInstanceStatus.MISSED -> R.string.routine_status_missed
            RoutineInstanceStatus.CANCELLED -> R.string.routine_status_cancelled
        }
    )
}
