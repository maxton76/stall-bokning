package com.equiduty.ui.routines.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun StepProgressIndicator(
    currentStepIndex: Int,
    totalSteps: Int,
    completedHorses: Int,
    totalHorses: Int,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        // Overall routine progress
        LinearProgressIndicator(
            progress = { (currentStepIndex + 1).toFloat() / totalSteps },
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            text = "Steg ${currentStepIndex + 1} av $totalSteps",
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(vertical = 8.dp)
        )

        // Horse completion progress (if horses in step)
        if (totalHorses > 0) {
            Spacer(modifier = Modifier.height(4.dp))
            LinearProgressIndicator(
                progress = { completedHorses.toFloat() / totalHorses },
                modifier = Modifier.fillMaxWidth(),
                color = if (completedHorses == totalHorses) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.secondary
                }
            )
            Text(
                text = "$completedHorses av $totalHorses hästar klara",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 4.dp)
            )
        }
    }
}
