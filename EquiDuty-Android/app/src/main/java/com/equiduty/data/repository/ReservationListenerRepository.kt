package com.equiduty.data.repository

import com.equiduty.domain.model.FacilityReservation
import com.equiduty.domain.model.FacilityType
import com.equiduty.domain.model.ReservationStatus
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.QuerySnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Real-time Firestore listener for facility reservations.
 *
 * Uses onSnapshot to push live updates via StateFlow so the calendar
 * reflects changes from other users within ~1 second.
 *
 * Writes still go through the REST API (validated, transactional).
 * This repository only reads — it supplements the API data with real-time deltas.
 */
@Singleton
class ReservationListenerRepository @Inject constructor() {

    private val firestore = FirebaseFirestore.getInstance()

    private val _liveReservations = MutableStateFlow<List<FacilityReservation>>(emptyList())
    /** Live reservations from Firestore listener */
    val liveReservations: StateFlow<List<FacilityReservation>> = _liveReservations.asStateFlow()

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    private val _listenerError = MutableStateFlow<String?>(null)
    val listenerError: StateFlow<String?> = _listenerError.asStateFlow()

    private var listener: ListenerRegistration? = null
    private var currentStableId: String? = null

    /**
     * Start listening for reservation changes for a specific stable.
     * Automatically stops any previous listener before attaching a new one.
     */
    fun startListening(stableId: String) {
        // Skip if already listening to the same stable
        if (currentStableId == stableId && listener != null) return

        stopListening()

        if (stableId.isBlank()) return

        // Query must include stableId filter (required by security rules)
        val query = firestore.collection("facilityReservations")
            .whereEqualTo("stableId", stableId)

        listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Timber.w(error, "Reservation listener error (falling back to API)")
                _listenerError.value = error.message
                // Don't clear reservations — keep stale data as fallback
                return@addSnapshotListener
            }

            if (snapshot != null) {
                _listenerError.value = null
                _liveReservations.value = parseSnapshot(snapshot)
            }
        }

        currentStableId = stableId
        _isListening.value = true
    }

    /**
     * Stop the current listener and clean up resources.
     */
    fun stopListening() {
        listener?.remove()
        listener = null
        currentStableId = null
        _isListening.value = false
    }

    private fun parseSnapshot(snapshot: QuerySnapshot): List<FacilityReservation> {
        return snapshot.documents.mapNotNull { doc ->
            try {
                val data = doc.data ?: return@mapNotNull null

                FacilityReservation(
                    id = doc.id,
                    facilityId = data["facilityId"] as? String ?: return@mapNotNull null,
                    facilityName = data["facilityName"] as? String ?: "",
                    facilityType = FacilityType.fromValue(data["facilityType"] as? String ?: ""),
                    stableId = data["stableId"] as? String ?: return@mapNotNull null,
                    stableName = data["stableName"] as? String ?: "",
                    userId = data["userId"] as? String ?: return@mapNotNull null,
                    userEmail = data["userEmail"] as? String ?: "",
                    userFullName = data["userFullName"] as? String ?: "",
                    horseId = data["horseId"] as? String,
                    horseName = data["horseName"] as? String,
                    horseIds = (data["horseIds"] as? List<*>)?.filterIsInstance<String>(),
                    horseNames = (data["horseNames"] as? List<*>)?.filterIsInstance<String>(),
                    startTime = timestampToIso(data["startTime"]),
                    endTime = timestampToIso(data["endTime"]),
                    purpose = data["purpose"] as? String,
                    notes = data["notes"] as? String,
                    status = ReservationStatus.fromValue(data["status"] as? String ?: "pending"),
                    createdAt = timestampToIso(data["createdAt"]),
                    updatedAt = timestampToIso(data["updatedAt"])
                )
            } catch (e: Exception) {
                Timber.w(e, "Failed to parse reservation document ${doc.id}")
                null
            }
        }
    }

    /**
     * Convert Firestore Timestamp to ISO 8601 string.
     */
    private fun timestampToIso(value: Any?): String {
        return when (value) {
            is com.google.firebase.Timestamp -> {
                val date = value.toDate()
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                    timeZone = java.util.TimeZone.getTimeZone("UTC")
                }.format(date)
            }
            is String -> value
            else -> ""
        }
    }
}
