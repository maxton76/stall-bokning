package com.equiduty.domain.repository

import com.equiduty.domain.model.Organization
import com.equiduty.domain.model.Stable
import com.equiduty.domain.model.User
import kotlinx.coroutines.flow.StateFlow

sealed class AuthState {
    data object Unknown : AuthState()
    data object SignedOut : AuthState()
    data class SignedIn(val user: User) : AuthState()
}

interface IAuthRepository {
    val authState: StateFlow<AuthState>
    val currentUser: StateFlow<User?>
    val organizations: StateFlow<List<Organization>>
    val selectedOrganization: StateFlow<Organization?>
    val selectedStable: StateFlow<Stable?>
    val isLoading: StateFlow<Boolean>

    suspend fun signIn(email: String, password: String)
    suspend fun signUp(email: String, password: String, firstName: String, lastName: String)
    suspend fun signInWithGoogle(idToken: String)
    suspend fun signOut()
    suspend fun sendPasswordReset(email: String)
    fun selectOrganization(organization: Organization)
    fun selectStable(stable: Stable)
    suspend fun refreshUserData()
}
