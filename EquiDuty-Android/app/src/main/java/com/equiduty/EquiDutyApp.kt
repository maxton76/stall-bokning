package com.equiduty

import android.app.Application
import android.content.res.Configuration
import android.os.Build
import com.equiduty.data.repository.SettingsRepository
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Locale
import javax.inject.Inject

@HiltAndroidApp
class EquiDutyApp : Application() {

    @Inject
    lateinit var settingsRepository: SettingsRepository

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }

        // Apply saved language preference or fallback to Swedish
        applicationScope.launch {
            try {
                val savedLang = settingsRepository.preferences.first().language ?: "sv"
                setLocale(savedLang)
            } catch (e: Exception) {
                Timber.w(e, "Failed to load saved language, using Swedish")
                setLocale("sv")
            }
        }
    }

    /**
     * Updates the app locale and applies configuration changes.
     * Public so LanguageSettingsScreen can trigger immediate locale switch.
     */
    fun setLocale(languageCode: String) {
        val locale = Locale(languageCode)
        Locale.setDefault(locale)

        val config = Configuration(resources.configuration)
        config.setLocale(locale)

        @Suppress("DEPRECATION")
        resources.updateConfiguration(config, resources.displayMetrics)
    }
}
