package com.equiduty.ui.navigation

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState

@Composable
fun BottomNavBar(navController: NavController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    NavigationBar {
        BottomNavTab.entries.forEach { tab ->
            val label = stringResource(tab.labelRes)
            val isSelected = currentRoute == tab.route ||
                currentRoute?.startsWith(tab.route + "/") == true
            NavigationBarItem(
                icon = { Icon(tab.icon, contentDescription = label) },
                label = { Text(label) },
                selected = isSelected,
                onClick = {
                    if (currentRoute != tab.route) {
                        navController.navigate(tab.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                }
            )
        }
    }
}
