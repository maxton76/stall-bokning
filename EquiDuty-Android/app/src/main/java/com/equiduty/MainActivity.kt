package com.equiduty

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import androidx.hilt.navigation.compose.hiltViewModel
import com.equiduty.data.repository.NotificationRepository
import com.equiduty.domain.repository.AuthState
import com.equiduty.service.NotificationChannelManager
import com.equiduty.ui.auth.AuthViewModel
import com.equiduty.ui.auth.EmailVerificationScreen
import com.equiduty.ui.auth.LoginScreen
import com.equiduty.ui.auth.SignUpScreen
import com.equiduty.ui.auth.SplashScreen
import com.equiduty.ui.navigation.AppNavGraph
import com.equiduty.ui.theme.EquiDutyTheme
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var notificationRepository: NotificationRepository

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        Timber.d("POST_NOTIFICATIONS permission granted: $isGranted")
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED -> {
                    // Permission already granted
                }
                else -> {
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        }
    }

    private fun handleGoogleSignIn(authViewModel: AuthViewModel) {
        val credentialManager = CredentialManager.create(this)

        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val result = credentialManager.getCredential(
                    request = request,
                    context = this@MainActivity,
                )

                val credential = result.credential
                when {
                    credential is CustomCredential &&
                        credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL -> {
                        try {
                            val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data)
                            authViewModel.signInWithGoogle(googleIdToken.idToken)
                        } catch (e: GoogleIdTokenParsingException) {
                            Timber.e(e, "Failed to parse Google ID token")
                            Toast.makeText(
                                this@MainActivity,
                                "Kunde inte tolka Google-inloggning",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                    else -> {
                        Timber.w("Unexpected credential type: ${credential.javaClass.simpleName}")
                        Toast.makeText(
                            this@MainActivity,
                            "Oväntad inloggningstyp: ${credential.javaClass.simpleName}",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            } catch (e: GetCredentialException) {
                val errorMsg = "Google Sign-In failed: ${e.javaClass.simpleName} - ${e.message}"
                Timber.e(e, errorMsg)
                Toast.makeText(
                    this@MainActivity,
                    errorMsg,
                    Toast.LENGTH_LONG
                ).show()
            } catch (e: Exception) {
                val errorMsg = "Error: ${e.javaClass.simpleName} - ${e.message}"
                Timber.e(e, "Unexpected error during Google Sign-In")
                Toast.makeText(
                    this@MainActivity,
                    errorMsg,
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        NotificationChannelManager.createChannels(this)
        requestNotificationPermission()
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
                                onSignUp = { email, password, firstName, lastName, orgType, orgName, contactEmail, phone ->
                                    authViewModel.signUp(email, password, firstName, lastName, orgType, orgName, contactEmail, phone)
                                },
                                onNavigateBack = { authViewModel.showSignUp.value = false },
                                onClearError = authViewModel::clearError
                            )
                        } else {
                            LoginScreen(
                                isLoading = isLoading,
                                error = error,
                                onSignIn = authViewModel::signIn,
                                onGoogleSignIn = { handleGoogleSignIn(authViewModel) },
                                onNavigateToSignUp = { authViewModel.showSignUp.value = true },
                                onForgotPassword = authViewModel::sendPasswordReset,
                                onClearError = authViewModel::clearError
                            )
                        }
                    }
                    is AuthState.SignedIn -> {
                        val isEmailVerified by authViewModel.isEmailVerified.collectAsState()

                        if (isEmailVerified) {
                            // Email verified OR OAuth user
                            LaunchedEffect(Unit) {
                                notificationRepository.registerFcmToken()
                            }
                            AppNavGraph(onSignOut = authViewModel::signOut)
                        } else {
                            // Email not verified - block with verification screen
                            EmailVerificationScreen(
                                isEmailVerified = isEmailVerified,
                                error = error,
                                onCheckVerification = authViewModel::checkEmailVerification,
                                onResendEmail = authViewModel::resendVerificationEmail,
                                onSignOut = authViewModel::signOut,
                                onClearError = authViewModel::clearError
                            )
                        }
                    }
                }
            }
        }
    }
}
