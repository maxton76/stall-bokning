package com.equiduty.ui.components

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage

/**
 * Photo picker component with preview and remove functionality.
 *
 * @param photoUrl Current photo URL (if any)
 * @param onPhotoSelected Callback when a new photo is selected (returns URI)
 * @param onPhotoRemoved Callback when photo is removed
 * @param label Label to display above the photo picker
 * @param modifier Modifier for the component
 * @param aspectRatio Width/height ratio (e.g., 16f/9f for cover, 1f for avatar)
 * @param shape Shape of the photo container
 */
@Composable
fun PhotoPicker(
    photoUrl: String?,
    onPhotoSelected: (Uri) -> Unit,
    onPhotoRemoved: () -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    aspectRatio: Float = 16f / 9f,
    shape: RoundedCornerShape = RoundedCornerShape(8.dp)
) {
    var selectedUri by remember { mutableStateOf<Uri?>(null) }

    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedUri = it
            onPhotoSelected(it)
        }
    }

    Column(modifier = modifier) {
        // Label
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        // Photo container
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(aspectRatio)
                .clip(shape)
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clickable { photoPicker.launch("image/*") }
        ) {
            val displayUrl = selectedUri?.toString() ?: photoUrl

            if (displayUrl != null) {
                // Show photo with remove button
                AsyncImage(
                    model = displayUrl,
                    contentDescription = label,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )

                // Remove button
                IconButton(
                    onClick = {
                        selectedUri = null
                        onPhotoRemoved()
                    },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .size(32.dp)
                        .background(
                            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                            shape = RoundedCornerShape(16.dp)
                        )
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Ta bort foto",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
            } else {
                // Show placeholder with add icon
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.AddAPhoto,
                        contentDescription = "Lägg till foto",
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Tryck för att lägga till",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
