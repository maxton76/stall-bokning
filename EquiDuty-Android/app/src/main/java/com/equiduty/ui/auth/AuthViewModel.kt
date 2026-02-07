package com.equiduty.ui.auth

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.AuthRepository
import com.equiduty.domain.repository.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    val authState = authRepository.authState
    val currentUser = authRepository.currentUser
    val isLoading = authRepository.isLoading
    val organizations = authRepository.organizations
    val selectedOrganization = authRepository.selectedOrganization
    val selectedStable = authRepository.selectedStable

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val showSignUp = mutableStateOf(false)

    init {
        viewModelScope.launch {
            authRepository.checkAuthState()
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _error.value = null
            try {
                authRepository.signIn(email, password)
            } catch (e: Exception) {
                Timber.e(e, "Sign in failed")
                _error.value = e.localizedMessage ?: "Inloggning misslyckades"
            }
        }
    }

    fun signUp(email: String, password: String, firstName: String, lastName: String) {
        viewModelScope.launch {
            _error.value = null
            try {
                authRepository.signUp(email, password, firstName, lastName)
            } catch (e: Exception) {
                Timber.e(e, "Sign up failed")
                _error.value = e.localizedMessage ?: "Registrering misslyckades"
            }
        }
    }

    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _error.value = null
            try {
                authRepository.signInWithGoogle(idToken)
            } catch (e: Exception) {
                Timber.e(e, "Google sign in failed")
                _error.value = e.localizedMessage ?: "Google-inloggning misslyckades"
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            try {
                authRepository.signOut()
            } catch (e: Exception) {
                Timber.e(e, "Sign out failed")
            }
        }
    }

    fun sendPasswordReset(email: String) {
        viewModelScope.launch {
            _error.value = null
            try {
                authRepository.sendPasswordReset(email)
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Kunde inte skicka återställningslänk"
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
