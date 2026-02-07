package com.equiduty.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.equiduty.data.repository.SubscriptionRepository

/**
 * Renders [content] only if the given module is enabled in the current subscription.
 * Shows [fallback] if the module is not available (defaults to an upgrade prompt).
 */
@Composable
fun FeatureGate(
    subscriptionRepository: SubscriptionRepository,
    module: String,
    fallback: @Composable () -> Unit = { UpgradePrompt(module) },
    content: @Composable () -> Unit
) {
    val subscription by subscriptionRepository.subscription.collectAsState()
    if (subscription?.modules?.isModuleEnabled(module) == true) {
        content()
    } else {
        fallback()
    }
}

@Composable
private fun UpgradePrompt(module: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.Lock,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            "Funktionen kräver en uppgradering",
            style = MaterialTheme.typography.titleMedium
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "Kontakta din administratör för att uppgradera prenumerationen.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
