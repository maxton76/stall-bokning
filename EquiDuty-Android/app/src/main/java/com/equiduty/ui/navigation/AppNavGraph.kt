package com.equiduty.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.equiduty.ui.activities.ActivityDetailScreen
import com.equiduty.ui.activities.ActivityFormScreen
import com.equiduty.ui.feeding.FeedingScreen
import com.equiduty.ui.horses.HorseDetailScreen
import com.equiduty.ui.horses.HorseFormScreen
import com.equiduty.ui.horses.HorseListScreen
import com.equiduty.ui.routines.RoutineFlowScreen
import com.equiduty.ui.routines.RoutineListScreen
import com.equiduty.ui.notifications.NotificationScreen
import com.equiduty.ui.settings.*
import com.equiduty.ui.today.TodayScreen

@Composable
fun AppNavGraph(
    onSignOut: () -> Unit,
    navController: NavHostController = rememberNavController()
) {
    Scaffold(
        bottomBar = { BottomNavBar(navController) }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Route.Today.route,
            modifier = Modifier.padding(padding)
        ) {
            // Today tab
            composable(
                route = Route.Today.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://today" })
            ) {
                TodayScreen(navController = navController)
            }

            // Horses tab
            composable(
                route = Route.Horses.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://horses" })
            ) {
                HorseListScreen(navController = navController)
            }

            composable(
                route = Route.HorseDetail.route,
                arguments = listOf(navArgument("horseId") { type = NavType.StringType }),
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://horse/{horseId}" })
            ) {
                HorseDetailScreen(navController = navController)
            }

            composable(
                route = Route.HorseForm.route,
                arguments = listOf(
                    navArgument("horseId") { type = NavType.StringType; nullable = true; defaultValue = null }
                )
            ) {
                HorseFormScreen(navController = navController)
            }

            // Activities
            composable(
                route = Route.ActivityDetail.route,
                arguments = listOf(navArgument("activityId") { type = NavType.StringType }),
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://activity/{activityId}" })
            ) {
                ActivityDetailScreen(navController = navController)
            }

            composable(
                route = Route.ActivityForm.route,
                arguments = listOf(
                    navArgument("activityId") { type = NavType.StringType; nullable = true; defaultValue = null }
                )
            ) {
                ActivityFormScreen(navController = navController)
            }

            // Feeding tab
            composable(
                route = Route.Feeding.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://feeding" })
            ) {
                FeedingScreen(navController = navController)
            }

            // Routines tab
            composable(
                route = Route.Routines.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://routines" })
            ) {
                RoutineListScreen(navController = navController)
            }

            composable(
                route = Route.RoutineFlow.route,
                arguments = listOf(navArgument("instanceId") { type = NavType.StringType }),
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://routine/{instanceId}" })
            ) {
                RoutineFlowScreen(navController = navController)
            }

            // Settings tab
            composable(
                route = Route.Settings.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://settings" })
            ) {
                SettingsScreen(navController = navController, onSignOut = onSignOut)
            }

            composable(Route.Account.route) {
                AccountScreen(navController = navController)
            }

            composable(Route.NotificationSettings.route) {
                NotificationSettingsScreen(navController = navController)
            }

            composable(Route.LanguageSettings.route) {
                LanguageSettingsScreen(navController = navController)
            }

            composable(Route.StableSelection.route) {
                StableSelectionScreen(navController = navController)
            }

            composable(Route.OrganizationSelection.route) {
                OrganizationSelectionScreen(navController = navController)
            }

            // Notifications
            composable(
                route = Route.Notifications.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://notifications" })
            ) {
                NotificationScreen(navController = navController)
            }
        }
    }
}
