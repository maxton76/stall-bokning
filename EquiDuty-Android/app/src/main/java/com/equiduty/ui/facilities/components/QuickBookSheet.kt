package com.equiduty.ui.facilities.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.filled.WbTwilight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.equiduty.R

data class QuickBookOption(
    val label: String,
    val startTime: String,
    val endTime: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickBookSheet(
    onDismiss: () -> Unit,
    onSelectOption: (QuickBookOption) -> Unit
) {
    val options = listOf(
        QuickBookOption("Morgon (08:00–09:00)", "08:00", "09:00"),
        QuickBookOption("Eftermiddag (14:00–15:00)", "14:00", "15:00"),
        QuickBookOption("Kväll (18:00–19:00)", "18:00", "19:00")
    )

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Text(
                text = stringResource(R.string.facilities_quick_book),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            val icons = listOf(Icons.Default.LightMode, Icons.Default.WbSunny, Icons.Default.WbTwilight)

            options.forEachIndexed { index, option ->
                ListItem(
                    headlineContent = { Text(option.label) },
                    leadingContent = {
                        Icon(icons[index], contentDescription = null)
                    },
                    modifier = Modifier.clickable { onSelectOption(option) }
                )
                if (index < options.lastIndex) {
                    HorizontalDivider()
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
