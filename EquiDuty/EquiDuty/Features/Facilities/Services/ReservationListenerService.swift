import Foundation
import FirebaseFirestore

/// Real-time Firestore listener for facility reservations.
///
/// Attaches an `onSnapshot` listener filtered by `stableId` so the calendar
/// updates within ~1 second when other users create/modify/cancel bookings.
///
/// Writes still go through the REST API — this service only reads.
@Observable
final class ReservationListenerService {

    /// Live reservations from the Firestore listener
    private(set) var reservations: [FacilityReservation] = []

    /// Whether the listener is actively connected
    private(set) var isListening = false

    /// Last error from the listener (nil if healthy)
    private(set) var listenerError: String?

    private var listener: ListenerRegistration?
    private let firestore = Firestore.firestore()

    deinit {
        stopListening()
    }

    /// Start listening for reservation changes for a specific stable.
    /// Automatically stops any previous listener before attaching a new one.
    func startListening(stableId: String) {
        // Stop existing listener if any
        stopListening()

        guard !stableId.isEmpty else { return }

        // Query must include stableId filter (required by security rules)
        let query = firestore.collection("facilityReservations")
            .whereField("stableId", isEqualTo: stableId)

        listener = query.addSnapshotListener { [weak self] snapshot, error in
            guard let self else { return }

            if let error {
                self.listenerError = error.localizedDescription
                // Don't clear reservations — keep stale data as fallback
                return
            }

            guard let snapshot else { return }

            self.listenerError = nil
            self.reservations = snapshot.documents.compactMap { doc in
                self.parseReservation(doc)
            }
        }

        isListening = true
    }

    /// Stop the current listener and clean up resources.
    func stopListening() {
        listener?.remove()
        listener = nil
        isListening = false
    }

    // MARK: - Parsing

    private func parseReservation(_ doc: QueryDocumentSnapshot) -> FacilityReservation? {
        let data = doc.data()

        guard let facilityId = data["facilityId"] as? String,
              let facilityName = data["facilityName"] as? String,
              let stableId = data["stableId"] as? String,
              let userId = data["userId"] as? String,
              let userEmail = data["userEmail"] as? String,
              let statusStr = data["status"] as? String,
              let startTimestamp = data["startTime"] as? Timestamp,
              let endTimestamp = data["endTime"] as? Timestamp,
              let createdAt = data["createdAt"] as? Timestamp,
              let updatedAt = data["updatedAt"] as? Timestamp,
              let createdBy = data["createdBy"] as? String,
              let lastModifiedBy = data["lastModifiedBy"] as? String
        else {
            return nil
        }

        let status = ReservationStatus(rawValue: statusStr) ?? .pending

        return FacilityReservation(
            id: doc.documentID,
            facilityId: facilityId,
            facilityName: facilityName,
            facilityType: data["facilityType"] as? String,
            stableId: stableId,
            stableName: data["stableName"] as? String,
            userId: userId,
            userEmail: userEmail,
            userFullName: data["userFullName"] as? String,
            horseId: data["horseId"] as? String,
            horseName: data["horseName"] as? String,
            horseIds: data["horseIds"] as? [String],
            horseNames: data["horseNames"] as? [String],
            externalHorseCount: data["externalHorseCount"] as? Int,
            startTime: startTimestamp.dateValue(),
            endTime: endTimestamp.dateValue(),
            purpose: data["purpose"] as? String,
            notes: data["notes"] as? String,
            status: status,
            createdAt: createdAt.dateValue(),
            updatedAt: updatedAt.dateValue(),
            createdBy: createdBy,
            lastModifiedBy: lastModifiedBy
        )
    }
}
