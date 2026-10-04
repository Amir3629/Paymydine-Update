package com.paymydine.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val PmdDeepGreen = Color(0xFF063F36)
val PmdGreen = Color(0xFF0A6B57)
val PmdBrandGreen = Color(0xFF00A651)
val PmdGold = Color(0xFFF2C23E)
val PmdBackground = Color(0xFFF4F8F6)
val PmdSurfaceSoft = Color(0xFFF1F8F5)
val PmdText = Color(0xFF17342F)
val PmdMuted = Color(0xFF6D7C79)
val PmdLine = Color(0xFFD7E4E0)

private val PmdLightColors = lightColorScheme(
    primary = PmdDeepGreen,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDDF2EA),
    onPrimaryContainer = PmdDeepGreen,
    secondary = PmdGreen,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE6F4EF),
    onSecondaryContainer = PmdDeepGreen,
    tertiary = PmdGold,
    onTertiary = PmdDeepGreen,
    background = PmdBackground,
    onBackground = PmdText,
    surface = Color.White,
    onSurface = PmdText,
    surfaceVariant = PmdSurfaceSoft,
    onSurfaceVariant = PmdMuted,
    outline = PmdLine,
    outlineVariant = Color(0xFFE7EFEC),
    error = Color(0xFFB42318),
    onError = Color.White,
)

@Composable
fun PmdTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PmdLightColors,
        typography = Typography(),
        content = content,
    )
}
