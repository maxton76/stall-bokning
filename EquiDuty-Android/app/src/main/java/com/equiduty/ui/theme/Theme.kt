package com.equiduty.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val LightColorScheme = lightColorScheme(
    primary = EquiBlue,
    onPrimary = Color.White,
    primaryContainer = EquiBlueLight.copy(alpha = 0.2f),
    onPrimaryContainer = EquiBlueDark,
    secondary = EquiGreen,
    onSecondary = Color.White,
    secondaryContainer = EquiGreenLight.copy(alpha = 0.2f),
    tertiary = EquiOrange,
    onTertiary = Color.White,
    error = EquiRed,
    onError = Color.White,
    background = NeutralLight,
    onBackground = NeutralDark,
    surface = SurfaceLight,
    onSurface = NeutralDark,
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = NeutralGray,
    outline = NeutralGrayLight
)

private val DarkColorScheme = darkColorScheme(
    primary = EquiBlueLight,
    onPrimary = Color.White,
    primaryContainer = EquiBlueDark,
    onPrimaryContainer = EquiBlueLight,
    secondary = EquiGreenLight,
    onSecondary = Color.White,
    tertiary = EquiOrangeLight,
    onTertiary = Color.White,
    error = EquiRedLight,
    onError = Color.White,
    background = NeutralDark,
    onBackground = Color(0xFFE2E8F0),
    surface = SurfaceDark,
    onSurface = Color(0xFFE2E8F0),
    surfaceVariant = Color(0xFF334155),
    onSurfaceVariant = NeutralGrayLight,
    outline = NeutralGray
)

@Composable
fun EquiDutyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Disabled to use brand colors
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
