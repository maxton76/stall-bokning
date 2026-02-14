package com.equiduty.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.equiduty.R
import com.equiduty.ui.activities.ActivityDetailScreen
import com.equiduty.ui.activities.ActivityFormScreen
import com.equiduty.ui.facilities.*
import com.equiduty.ui.feeding.FeedingScreen
import com.equiduty.ui.horses.HorseDetailScreen
import com.equiduty.ui.horses.HorseFormScreen
import com.equiduty.ui.horses.HorseListScreen
import com.equiduty.ui.routines.RoutineFlowScreen
import com.equiduty.ui.routines.RoutineListScreen
import com.equiduty.ui.notifications.NotificationScreen
import com.equiduty.ui.featurerequests.*
import com.equiduty.ui.settings.*
import com.equiduty.ui.today.TodayScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavGraph(
    onSignOut: () -> Unit,
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Show settings icon on top-level tab screens
    val isTopLevelRoute = BottomNavTab.entries.any { it.route == currentRoute }

    Scaffold(
        topBar = {
            if (isTopLevelRoute) {
                TopAppBar(
                    title = { },
                    actions = {
                        IconButton(onClick = {
                            navController.navigate(Route.Settings.route) {
                                launchSingleTop = true
                            }
                        }) {
                            Icon(
                                Icons.Default.Settings,
                                contentDescription = stringResource(R.string.nav_settings)
                            )
                        }
                    }
                )
            }
        },
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

            // Facilities tab
            composable(
                route = Route.Facilities.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://facilities" })
            ) {
                FacilitiesScreen(navController = navController)
            }

            composable(
                route = Route.FacilityDetail.route,
                arguments = listOf(navArgument("facilityId") { type = NavType.StringType }),
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://facilities/{facilityId}" })
            ) {
                FacilityDetailScreen(navController = navController)
            }

            composable(
                route = Route.ReservationForm.route,
                arguments = listOf(
                    navArgument("reservationId") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("facilityId") { type = NavType.StringType; nullable = true; defaultValue = null }
                )
            ) {
                ReservationFormScreen(navController = navController)
            }

            composable(
                route = Route.ReservationDetail.route,
                arguments = listOf(navArgument("reservationId") { type = NavType.StringType }),
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://facilities/reservation/{reservationId}" })
            ) {
                ReservationDetailScreen(navController = navController)
            }

            composable(
                route = Route.MyReservations.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://facilities/my-reservations" })
            ) {
                MyReservationsScreen(navController = navController)
            }

            composable(route = Route.ManageFacilities.route) {
                ManageFacilitiesScreen(navController = navController)
            }

            composable(
                route = Route.FacilityForm.route,
                arguments = listOf(
                    navArgument("facilityId") { type = NavType.StringType; nullable = true; defaultValue = null }
                )
            ) {
                FacilityFormScreen(navController = navController)
            }

            // Feature Requests
            composable(
                route = Route.FeatureRequests.route,
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://feature-requests" })
            ) {
                FeatureRequestListScreen(navController = navController)
            }

            composable(
                route = Route.FeatureRequestDetail.route,
                arguments = listOf(navArgument("requestId") { type = NavType.StringType }),
                deepLinks = listOf(navDeepLink { uriPattern = "equiduty://feature-requests/{requestId}" })
            ) {
                FeatureRequestDetailScreen(navController = navController)
            }

            composable(route = Route.CreateFeatureRequest.route) {
                CreateFeatureRequestScreen(navController = navController)
            }

            // Settings (now accessible via top-right gear icon)
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
