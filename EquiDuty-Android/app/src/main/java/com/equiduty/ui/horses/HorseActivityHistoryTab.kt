package com.equiduty.ui.horses

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.equiduty.ui.components.EmptyStateView

@Composable
fun HorseActivityHistoryTab(viewModel: HorseDetailViewModel) {
    // TODO: Phase 4 - Load activities for this horse
    EmptyStateView(
        icon = Icons.Default.History,
        title = "Aktivitetshistorik",
        message = "Aktivitetshistorik kommer att visas här"
    )
}
