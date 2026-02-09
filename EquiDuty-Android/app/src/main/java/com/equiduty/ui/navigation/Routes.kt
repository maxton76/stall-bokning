package com.equiduty.ui.navigation

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector
import com.equiduty.R

sealed class NavIcon {
    data class Vector(val imageVector: ImageVector) : NavIcon()
    data class Drawable(@DrawableRes val resId: Int) : NavIcon()
}

sealed class Route(val route: String) {
    // Top-level tab routes
    data object Today : Route("today")
    data object Horses : Route("horses")
    data object Feeding : Route("feeding")
    data object Routines : Route("routines")
    data object Settings : Route("settings")

    // Horse sub-routes
    data object HorseDetail : Route("horses/{horseId}") {
        fun createRoute(horseId: String) = "horses/$horseId"
    }
    data object HorseForm : Route("horses/form?horseId={horseId}") {
        fun createRoute(horseId: String? = null) =
            if (horseId != null) "horses/form?horseId=$horseId" else "horses/form"
    }

    // Activity sub-routes
    data object ActivityDetail : Route("activities/{activityId}") {
        fun createRoute(activityId: String) = "activities/$activityId"
    }
    data object ActivityForm : Route("activities/form?activityId={activityId}") {
        fun createRoute(activityId: String? = null) =
            if (activityId != null) "activities/form?activityId=$activityId" else "activities/form"
    }

    // Routine sub-routes
    data object RoutineFlow : Route("routines/flow/{instanceId}") {
        fun createRoute(instanceId: String) = "routines/flow/$instanceId"
    }

    // Settings sub-routes
    data object Account : Route("settings/account")
    data object NotificationSettings : Route("settings/notifications")
    data object LanguageSettings : Route("settings/language")
    data object StableSelection : Route("settings/stable")
    data object OrganizationSelection : Route("settings/organization")

    // Notification route
    data object Notifications : Route("notifications")
}

enum class BottomNavTab(
    val route: String,
    @StringRes val labelRes: Int,
    val icon: NavIcon
) {
    TODAY(Route.Today.route, R.string.nav_today, NavIcon.Vector(Icons.Default.CalendarToday)),
    HORSES(Route.Horses.route, R.string.nav_horses, NavIcon.Drawable(R.drawable.ic_horse)),
    FEEDING(Route.Feeding.route, R.string.nav_feeding, NavIcon.Vector(Icons.Default.Restaurant)),
    ROUTINES(Route.Routines.route, R.string.nav_routines, NavIcon.Vector(Icons.Default.Checklist)),
    SETTINGS(Route.Settings.route, R.string.nav_settings, NavIcon.Vector(Icons.Default.Settings))
}
