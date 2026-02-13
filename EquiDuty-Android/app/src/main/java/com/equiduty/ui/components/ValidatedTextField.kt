package com.equiduty.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Reusable text field component with built-in max length validation and character counter.
 *
 * @param value Current text value
 * @param onValueChange Callback when text changes
 * @param label Field label
 * @param modifier Modifier for the component
 * @param maxLength Maximum allowed character length (default: 5000)
 * @param minLines Minimum number of visible lines (default: 1)
 * @param singleLine Whether field should be single line (default: true)
 * @param supportingText Optional supporting text shown below field
 * @param isError Whether field is in error state
 * @param enabled Whether field is enabled for input
 */
@Composable
fun ValidatedTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    maxLength: Int = 5000,
    minLines: Int = 1,
    singleLine: Boolean = true,
    supportingText: String? = null,
    isError: Boolean = false,
    enabled: Boolean = true
) {
    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = {
                // Only accept input if within max length
                if (it.length <= maxLength) onValueChange(it)
            },
            label = { Text(label) },
            singleLine = singleLine,
            minLines = minLines,
            modifier = Modifier.fillMaxWidth(),
            supportingText = supportingText?.let { { Text(it) } },
            isError = isError,
            enabled = enabled
        )

        // Show character counter when approaching limit (90% of max)
        if (value.length > maxLength * 0.9) {
            Text(
                "${value.length}/$maxLength tecken",
                style = MaterialTheme.typography.bodySmall,
                color = if (value.length >= maxLength) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )
        }
    }
}
