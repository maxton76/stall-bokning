package com.equiduty.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.equiduty.data.repository.SubscriptionRepository

/**
 * Renders [content] only if the current count is within the subscription limit for [limitKey].
 * Shows [fallback] if the limit has been reached (defaults to a limit-reached message).
 */
@Composable
fun LimitGate(
    subscriptionRepository: SubscriptionRepository,
    limitKey: String,
    currentCount: Int,
    fallback: @Composable () -> Unit = { LimitReachedView() },
    content: @Composable () -> Unit
) {
    val subscription by subscriptionRepository.subscription.collectAsState()
    val withinLimit = subscription?.limits?.isWithinLimit(limitKey, currentCount) ?: true
    if (withinLimit) {
        content()
    } else {
        fallback()
    }
}

@Composable
private fun LimitReachedView() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.Block,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            "Gränsen har nåtts",
            style = MaterialTheme.typography.titleMedium
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "Du har nått maxgränsen för din nuvarande prenumeration. Uppgradera för att lägga till fler.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
