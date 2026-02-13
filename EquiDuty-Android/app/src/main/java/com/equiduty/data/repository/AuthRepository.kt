package com.equiduty.data.repository

import com.equiduty.data.local.TokenManager
import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.OrganizationDto
import com.equiduty.data.remote.dto.StableDto
import com.equiduty.data.remote.dto.UserDto
import com.equiduty.domain.model.*
import com.equiduty.domain.repository.AuthState
import com.equiduty.domain.repository.IAuthRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.userProfileChangeRequest
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val firebaseAuth: FirebaseAuth,
    private val api: EquiDutyApi,
    private val tokenManager: TokenManager,
    private val permissionRepository: PermissionRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val featureToggleRepository: FeatureToggleRepository
) : IAuthRepository {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Unknown)
    override val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _currentUser = MutableStateFlow<User?>(null)
    override val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _organizations = MutableStateFlow<List<Organization>>(emptyList())
    override val organizations: StateFlow<List<Organization>> = _organizations.asStateFlow()

    private val _selectedOrganization = MutableStateFlow<Organization?>(null)
    override val selectedOrganization: StateFlow<Organization?> = _selectedOrganization.asStateFlow()

    private val _selectedStable = MutableStateFlow<Stable?>(null)
    override val selectedStable: StateFlow<Stable?> = _selectedStable.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    override val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    // Email verification state (defaults to true for OAuth bypass)
    private val _isEmailVerified = MutableStateFlow(true)
    val isEmailVerified: StateFlow<Boolean> = _isEmailVerified.asStateFlow()

    private var _stables = MutableStateFlow<List<Stable>>(emptyList())
    val stables: StateFlow<List<Stable>> = _stables.asStateFlow()

    init {
        firebaseAuth.addAuthStateListener { auth ->
            val firebaseUser = auth.currentUser
            if (firebaseUser != null) {
                // Will be handled by checkAuthState called from ViewModel
            } else {
                handleSignedOut()
            }
        }
    }

    suspend fun checkAuthState() {
        val firebaseUser = firebaseAuth.currentUser
        if (firebaseUser != null) {
            handleSignedIn()
        } else {
            _authState.value = AuthState.SignedOut
        }
    }

    override suspend fun signIn(email: String, password: String) {
        _isLoading.value = true
        try {
            firebaseAuth.signInWithEmailAndPassword(email, password).await()
            handleSignedIn()
        } catch (e: Exception) {
            _isLoading.value = false
            throw e
        }
    }

    override suspend fun signUp(email: String, password: String, firstName: String, lastName: String) {
        signUp(email, password, firstName, lastName, null, null, null, null)
    }

    suspend fun signUp(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        organizationType: String?,
        organizationName: String?,
        contactEmail: String?,
        phoneNumber: String?
    ) {
        _isLoading.value = true
        try {
            val result = firebaseAuth.createUserWithEmailAndPassword(email, password).await()
            result.user?.updateProfile(
                userProfileChangeRequest { displayName = "$firstName $lastName" }
            )?.await()

            // Send email verification
            result.user?.sendEmailVerification()?.await()
            Timber.d("📧 Email verification sent to: $email")

            // Call signup endpoint with organization details
            try {
                val signupRequest = com.equiduty.data.remote.dto.SignupRequestDto(
                    email = email,
                    firstName = firstName,
                    lastName = lastName,
                    organizationType = organizationType,
                    organizationName = organizationName,
                    contactEmail = contactEmail,
                    phoneNumber = phoneNumber
                )
                api.signup(signupRequest)
                Timber.d("✅ Signup API call successful")
            } catch (e: Exception) {
                Timber.w(e, "Signup API call failed, will fall back to auto-creation via /auth/me")
            }

            handleSignedIn()
        } catch (e: Exception) {
            _isLoading.value = false
            throw e
        }
    }

    override suspend fun signInWithGoogle(idToken: String) {
        _isLoading.value = true
        try {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            firebaseAuth.signInWithCredential(credential).await()
            handleSignedIn()
        } catch (e: Exception) {
            _isLoading.value = false
            throw e
        }
    }

    override suspend fun signOut() {
        firebaseAuth.signOut()
        handleSignedOut()
    }

    override suspend fun sendPasswordReset(email: String) {
        firebaseAuth.sendPasswordResetEmail(email).await()
    }

    suspend fun sendEmailVerification() {
        val firebaseUser = firebaseAuth.currentUser
            ?: throw IllegalStateException("No signed-in user")

        try {
            firebaseUser.sendEmailVerification().await()
            Timber.d("📧 Verification email resent")
        } catch (e: Exception) {
            Timber.e(e, "Failed to send verification email")
            throw e
        }
    }

    suspend fun checkEmailVerification(): Boolean {
        val firebaseUser = firebaseAuth.currentUser ?: return false

        try {
            firebaseUser.reload().await()
            val isVerified = firebaseUser.isEmailVerified

            if (isVerified) {
                _isEmailVerified.value = true
                firebaseUser.getIdToken(true).await()  // Force token refresh
                Timber.d("✅ Email verified - token refreshed")
            }

            return isVerified
        } catch (e: Exception) {
            Timber.e(e, "Failed to check email verification")
            return false
        }
    }

    override fun selectOrganization(organization: Organization) {
        _selectedOrganization.value = organization
        _selectedStable.value = null
        tokenManager.selectedOrganizationId = organization.id
        tokenManager.selectedStableId = null
    }

    override fun selectStable(stable: Stable) {
        _selectedStable.value = stable
        tokenManager.selectedStableId = stable.id
    }

    suspend fun selectOrganization(orgId: String) {
        val org = _organizations.value.find { it.id == orgId } ?: return
        selectOrganization(org)
        loadOrgDependencies(orgId)
    }

    fun selectStable(stableId: String) {
        val stable = _stables.value.find { it.id == stableId } ?: return
        selectStable(stable)
    }

    override suspend fun refreshUserData() {
        handleSignedIn()
    }

    /** Load stables, permissions, subscription, and feature toggles in parallel. */
    private suspend fun loadOrgDependencies(orgId: String) = coroutineScope {
        val stablesJob = async { loadStablesForOrganization(orgId) }
        val permissionsJob = async {
            try { permissionRepository.fetchPermissions(orgId) }
            catch (e: Exception) { Timber.w(e, "Failed to load permissions") }
        }
        val subscriptionJob = async {
            try { subscriptionRepository.fetchSubscription(orgId) }
            catch (e: Exception) { Timber.w(e, "Failed to load subscription") }
        }
        val togglesJob = async {
            try { featureToggleRepository.fetchToggles() }
            catch (e: Exception) { Timber.w(e, "Failed to load feature toggles") }
        }
        stablesJob.await()
        permissionsJob.await()
        subscriptionJob.await()
        togglesJob.await()
    }

    suspend fun loadStablesForOrganization(orgId: String) {
        try {
            val response = api.getStables(orgId)
            val stables = response.stables.map { it.toDomain() }
            _stables.value = stables

            // Restore saved stable or select first
            val savedStableId = tokenManager.selectedStableId
            val stable = stables.find { it.id == savedStableId } ?: stables.firstOrNull()
            if (stable != null) {
                _selectedStable.value = stable
                tokenManager.selectedStableId = stable.id
            }
            Timber.d("Loaded ${stables.size} stables for org $orgId")
        } catch (e: Exception) {
            Timber.w(e, "Failed to load stables")
        }
    }

    private suspend fun handleSignedIn() {
        try {
            _isLoading.value = true

            val firebaseUser = firebaseAuth.currentUser
            tokenManager.userId = firebaseUser?.uid

            // Check email verification for password users
            val isPasswordUser = firebaseUser?.providerData?.firstOrNull()?.providerId == "password"
            if (isPasswordUser && firebaseUser?.isEmailVerified == false) {
                _isEmailVerified.value = false
                Timber.d("⚠️ Email not verified - showing verification screen")
            } else {
                _isEmailVerified.value = true
                Timber.d("✅ Email verified or OAuth user - proceeding to app")
            }

            // Fetch user profile
            val userDto = api.getAuthMe()
            val user = userDto.toDomain()
            _currentUser.value = user
            _authState.value = AuthState.SignedIn(user)

            // Fetch organizations
            try {
                val orgsResponse = api.getOrganizations()
                val orgs = orgsResponse.organizations.map { it.toDomain() }
                _organizations.value = orgs
                Timber.d("Loaded ${orgs.size} organizations")

                // Restore selected organization
                val savedOrgId = tokenManager.selectedOrganizationId
                val org = orgs.find { it.id == savedOrgId } ?: orgs.firstOrNull()
                if (org != null) {
                    _selectedOrganization.value = org
                    tokenManager.selectedOrganizationId = org.id

                    // Load stables, permissions, subscription in parallel
                    loadOrgDependencies(org.id)
                }
            } catch (e: Exception) {
                Timber.w(e, "Failed to load organizations")
                _organizations.value = emptyList()
            }

            _isLoading.value = false
        } catch (e: Exception) {
            Timber.w(e, "Failed to fetch user profile")
            _isLoading.value = false

            // Fall back to basic info from Firebase
            val firebaseUser = firebaseAuth.currentUser
            if (firebaseUser != null) {
                val nameParts = (firebaseUser.displayName ?: "").split(" ", limit = 2)
                val basicUser = User(
                    uid = firebaseUser.uid,
                    email = firebaseUser.email ?: "",
                    firstName = nameParts.getOrElse(0) { "" },
                    lastName = nameParts.getOrElse(1) { "" },
                    systemRole = SystemRole.MEMBER,
                    createdAt = "",
                    updatedAt = ""
                )
                _currentUser.value = basicUser
                _authState.value = AuthState.SignedIn(basicUser)
            }
        }
    }

    private fun handleSignedOut() {
        _currentUser.value = null
        _organizations.value = emptyList()
        _selectedOrganization.value = null
        _selectedStable.value = null
        _stables.value = emptyList()
        _authState.value = AuthState.SignedOut
        _isEmailVerified.value = true  // Reset to default
        tokenManager.clearAll()
        permissionRepository.clear()
        subscriptionRepository.clear()
        featureToggleRepository.clear()
        Timber.d("Cleared all auth state")
    }
}

// ── DTO → Domain Mappers ─────────────────────────────────────────

fun UserDto.toDomain(): User = User(
    uid = resolvedUid,
    email = email,
    firstName = firstName,
    lastName = lastName,
    systemRole = SystemRole.fromValue(systemRole),
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun OrganizationDto.toDomain(): Organization = Organization(
    id = id,
    name = name,
    description = description,
    organizationType = OrganizationType.fromValue(organizationType),
    ownerId = ownerId,
    ownerName = ownerName,
    ownerEmail = ownerEmail,
    subscriptionTier = subscriptionTier,
    implicitStableId = implicitStableId,
    stableCount = stats?.stableCount,
    totalMemberCount = stats?.totalMemberCount,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun StableDto.toDomain(): Stable = Stable(
    id = id,
    name = name,
    description = description,
    address = address,
    facilityNumber = facilityNumber,
    ownerId = ownerId,
    ownerEmail = ownerEmail,
    organizationId = organizationId,
    createdAt = createdAt,
    updatedAt = updatedAt
)
