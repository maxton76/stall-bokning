package com.equiduty.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.equiduty.util.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        Constants.TOKEN_MANAGER_PREFS,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(value) = prefs.edit().putString(KEY_USER_ID, value).apply()

    var selectedOrganizationId: String?
        get() = prefs.getString(KEY_SELECTED_ORG_ID, null)
        set(value) = prefs.edit().putString(KEY_SELECTED_ORG_ID, value).apply()

    var selectedStableId: String?
        get() = prefs.getString(KEY_SELECTED_STABLE_ID, null)
        set(value) = prefs.edit().putString(KEY_SELECTED_STABLE_ID, value).apply()

    fun clearAll() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_SELECTED_ORG_ID = "selected_org_id"
        private const val KEY_SELECTED_STABLE_ID = "selected_stable_id"
    }
}
