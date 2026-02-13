//
//  ReservationDetailSheet.swift
//  EquiDuty
//
//  Read-only detail sheet for viewing another user's reservation
//

import SwiftUI

struct ReservationDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    let reservation: FacilityReservation

    var body: some View {
        NavigationStack {
            List {
                // Who
                Section {
                    LabeledContent(
                        String(localized: "reservation.bookedBy"),
                        value: reservation.userFullName ?? reservation.userEmail ?? "—"
                    )
                }

                // When
                Section {
                    LabeledContent(String(localized: "reservation.date"), value: dateLabel)
                    LabeledContent(String(localized: "reservation.startTime"), value: timeLabel(reservation.startTime))
                    LabeledContent(String(localized: "reservation.endTime"), value: timeLabel(reservation.endTime))
                }

                // Horse
                if let horseName = reservation.horseName, !horseName.isEmpty {
                    Section {
                        LabeledContent(String(localized: "reservation.horse"), value: horseName)
                    }
                }

                // Purpose & Notes
                if (reservation.purpose ?? "").isEmpty == false || (reservation.notes ?? "").isEmpty == false {
                    Section {
                        if let purpose = reservation.purpose, !purpose.isEmpty {
                            LabeledContent(String(localized: "reservation.purpose"), value: purpose)
                        }
                        if let notes = reservation.notes, !notes.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(String(localized: "reservation.notes"))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                Text(notes)
                                    .font(.body)
                            }
                        }
                    }
                }

                // Status
                Section {
                    HStack {
                        Text(String(localized: "reservation.status"))
                        Spacer()
                        statusBadge
                    }
                }
            }
            .navigationTitle(String(localized: "reservation.detail"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.done")) {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private var dateLabel: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: reservation.startTime)
    }

    private func timeLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }

    @ViewBuilder
    private var statusBadge: some View {
        let (label, color) = statusInfo(reservation.status)
        Text(label)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }

    private func statusInfo(_ status: ReservationStatus) -> (String, Color) {
        switch status {
        case .pending:
            return (String(localized: "reservation.status.pending"), .orange)
        case .confirmed:
            return (String(localized: "reservation.status.confirmed"), .green)
        case .cancelled:
            return (String(localized: "reservation.status.cancelled"), .gray)
        case .completed:
            return (String(localized: "reservation.status.completed"), .blue)
        case .noShow:
            return (String(localized: "reservation.status.noShow"), .red)
        case .rejected:
            return (String(localized: "reservation.status.rejected"), .red)
        }
    }
}
