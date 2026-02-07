package com.equiduty

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import com.equiduty.domain.repository.AuthState
import com.equiduty.ui.auth.AuthViewModel
import com.equiduty.ui.auth.LoginScreen
import com.equiduty.ui.auth.SignUpScreen
import com.equiduty.ui.auth.SplashScreen
import com.equiduty.ui.navigation.AppNavGraph
import com.equiduty.ui.theme.EquiDutyTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EquiDutyTheme {
                val authViewModel: AuthViewModel = hiltViewModel()
                val authState by authViewModel.authState.collectAsState()
                val isLoading by authViewModel.isLoading.collectAsState()
                val error by authViewModel.error.collectAsState()

                when (authState) {
                    is AuthState.Unknown -> SplashScreen()
                    is AuthState.SignedOut -> {
                        val showSignUp by authViewModel.showSignUp
                        if (showSignUp) {
                            SignUpScreen(
                                isLoading = isLoading,
                                error = error,
                                onSignUp = authViewModel::signUp,
                                onNavigateBack = { authViewModel.showSignUp.value = false },
                                onClearError = authViewModel::clearError
                            )
                        } else {
                            LoginScreen(
                                isLoading = isLoading,
                                error = error,
                                onSignIn = authViewModel::signIn,
                                onGoogleSignIn = { /* TODO: Credential Manager */ },
                                onNavigateToSignUp = { authViewModel.showSignUp.value = true },
                                onForgotPassword = authViewModel::sendPasswordReset,
                                onClearError = authViewModel::clearError
                            )
                        }
                    }
                    is AuthState.SignedIn -> {
                        AppNavGraph(onSignOut = authViewModel::signOut)
                    }
                }
            }
        }
    }
}
