//
//  ReservationDetailView.swift
//  EquiDuty
//
//  Full detail view for a single facility reservation
//

import SwiftUI

struct ReservationDetailView: View {
    let reservationId: String
    @State private var reservation: FacilityReservation?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showCancelConfirmation = false
    @State private var actionInProgress = false
    @Environment(\.dismiss) private var dismiss

    private let service = FacilityReservationService.shared
    private let authService = AuthService.shared
    private let permissionService = PermissionService.shared

    private var isOwnReservation: Bool {
        reservation?.userId == authService.firebaseUid
    }

    private var isManager: Bool {
        permissionService.hasPermission(.manageSchedules) || permissionService.isOrgOwner
    }

    private var canCancel: Bool {
        guard let reservation, isOwnReservation else { return false }
        return reservation.status == .pending || reservation.status == .confirmed
    }

    private var canApproveReject: Bool {
        guard let reservation, isManager else { return false }
        return reservation.status == .pending
    }

    var body: some View {
        Group {
            if isLoading && reservation == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage, reservation == nil {
                ErrorView(message: error) {
                    Task { await loadData() }
                }
            } else if let reservation {
                ScrollView {
                    VStack(spacing: EquiDutyDesign.Spacing.lg) {
                        // Status header
                        ReservationStatusBadge(status: reservation.status)
                            .scaleEffect(1.2)
                            .padding(.top)

                        // Details card
                        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                            DetailRow(
                                label: String(localized: "facilities.title"),
                                value: reservation.facilityName ?? "-",
                                icon: "building.2"
                            )

                            DetailRow(
                                label: String(localized: "reservation.date"),
                                value: reservation.startTime.formatted(date: .long, time: .omitted),
                                icon: "calendar"
                            )

                            DetailRow(
                                label: String(localized: "reservation.startTime"),
                                value: reservation.startTime.formatted(date: .omitted, time: .shortened),
                                icon: "clock"
                            )

                            DetailRow(
                                label: String(localized: "reservation.endTime"),
                                value: reservation.endTime.formatted(date: .omitted, time: .shortened),
                                icon: "clock.fill"
                            )

                            let horseNames = reservation.allHorseNames
                            if !horseNames.isEmpty {
                                DetailRow(
                                    label: String(localized: horseNames.count == 1 ? "reservation.horse" : "reservation.horses"),
                                    value: horseNames.joined(separator: ", "),
                                    icon: "figure.equestrian.sports"
                                )
                            }

                            if let purpose = reservation.purpose, !purpose.isEmpty {
                                DetailRow(
                                    label: String(localized: "reservation.purpose"),
                                    value: purpose,
                                    icon: "text.alignleft"
                                )
                            }

                            if let notes = reservation.notes, !notes.isEmpty {
                                DetailRow(
                                    label: String(localized: "reservation.notes"),
                                    value: notes,
                                    icon: "note.text"
                                )
                            }

                            if let userName = reservation.userFullName ?? reservation.userEmail {
                                DetailRow(
                                    label: String(localized: "common.user"),
                                    value: userName,
                                    icon: "person"
                                )
                            }
                        }
                        .padding()
                        .background(.background)
                        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
                        .shadow(color: .black.opacity(0.06), radius: 4, y: 1)
                        .padding(.horizontal)

                        // Actions
                        VStack(spacing: EquiDutyDesign.Spacing.md) {
                            if canCancel {
                                Button(role: .destructive) {
                                    showCancelConfirmation = true
                                } label: {
                                    Label(String(localized: "reservation.cancel"), systemImage: "xmark.circle")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.bordered)
                                .disabled(actionInProgress)
                            }

                            if canApproveReject {
                                HStack(spacing: EquiDutyDesign.Spacing.md) {
                                    Button {
                                        Task { await approveReservation() }
                                    } label: {
                                        Label(String(localized: "reservation.approve"), systemImage: "checkmark.circle")
                                            .frame(maxWidth: .infinity)
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(.green)
                                    .disabled(actionInProgress)

                                    Button(role: .destructive) {
                                        Task { await rejectReservation() }
                                    } label: {
                                        Label(String(localized: "reservation.reject"), systemImage: "xmark.circle")
                                            .frame(maxWidth: .infinity)
                                    }
                                    .buttonStyle(.bordered)
                                    .disabled(actionInProgress)
                                }
                            }
                        }
                        .padding(.horizontal)

                        // Timestamps
                        if let createdAt = reservation.createdAt {
                            Text("\(String(localized: "common.created")): \(createdAt.formatted())")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .padding(.vertical)
                }
            }
        }
        .navigationTitle(String(localized: "reservation.detail"))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadData()
        }
        .confirmationDialog(
            String(localized: "reservation.cancelConfirm"),
            isPresented: $showCancelConfirmation,
            titleVisibility: .visible
        ) {
            Button(String(localized: "reservation.cancel"), role: .destructive) {
                Task { await cancelReservation() }
            }
        }
    }

    // MARK: - Actions

    private func loadData() async {
        isLoading = true
        errorMessage = nil
        do {
            // Load all reservations and find ours
            // The API doesn't have a GET /facility-reservations/:id endpoint that returns a single object,
            // so we use the general endpoint. In a production app, you'd add that endpoint.
            // For now, use the facility reservation ID to get the detail.
            let allReservations: FacilityReservation = try await APIClient.shared.get(
                APIEndpoints.facilityReservation(reservationId)
            )
            reservation = allReservations
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    private func cancelReservation() async {
        actionInProgress = true
        do {
            try await service.cancelReservation(id: reservationId)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        actionInProgress = false
    }

    private func approveReservation() async {
        actionInProgress = true
        do {
            try await service.approveReservation(id: reservationId)
            await loadData()
        } catch {
            errorMessage = error.localizedDescription
        }
        actionInProgress = false
    }

    private func rejectReservation() async {
        actionInProgress = true
        do {
            try await service.rejectReservation(id: reservationId)
            await loadData()
        } catch {
            errorMessage = error.localizedDescription
        }
        actionInProgress = false
    }
}

// Uses shared DetailRow from HorseActivityHistoryView
