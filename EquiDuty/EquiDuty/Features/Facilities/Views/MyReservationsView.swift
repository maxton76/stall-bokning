//
//  MyReservationsView.swift
//  EquiDuty
//
//  List of the user's facility reservations
//

import SwiftUI

struct MyReservationsView: View {
    @State private var viewModel = MyReservationsViewModel()
    @State private var showCancelConfirmation = false
    @State private var reservationToCancel: String?

    var body: some View {
        Group {
            if viewModel.isLoading && !viewModel.hasLoaded {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.isEmpty && viewModel.hasLoaded {
                ModernEmptyStateView(
                    icon: "calendar.badge.minus",
                    title: String(localized: "facilities.noBookings"),
                    message: String(localized: "facilities.noBookingsMessage")
                )
            } else {
                List {
                    // Segment picker
                    Picker(String(localized: "facilities.myBookings"), selection: $viewModel.selectedSegment) {
                        Text(String(localized: "reservation.upcoming")).tag(ReservationSegment.upcoming)
                        Text(String(localized: "reservation.past")).tag(ReservationSegment.past)
                    }
                    .pickerStyle(.segmented)
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)

                    ForEach(viewModel.groupedReservations, id: \.date) { group in
                        Section {
                            ForEach(group.reservations) { reservation in
                                NavigationLink(value: AppDestination.facilityReservationDetail(reservationId: reservation.id)) {
                                    ReservationRowView(
                                        reservation: reservation,
                                        isStartingSoon: viewModel.isStartingSoon(reservation)
                                    )
                                }
                                .swipeActions(edge: .trailing) {
                                    if reservation.status == .pending || reservation.status == .confirmed {
                                        Button(role: .destructive) {
                                            reservationToCancel = reservation.id
                                            showCancelConfirmation = true
                                        } label: {
                                            Label(String(localized: "reservation.cancel"), systemImage: "xmark.circle")
                                        }
                                    }
                                }
                            }
                        } header: {
                            Text(group.date, style: .date)
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable {
                    await viewModel.refresh()
                }
            }
        }
        .onAppear {
            viewModel.loadData(force: true)
        }
        .confirmationDialog(
            String(localized: "reservation.cancelConfirm"),
            isPresented: $showCancelConfirmation,
            titleVisibility: .visible
        ) {
            Button(String(localized: "reservation.cancel"), role: .destructive) {
                if let id = reservationToCancel {
                    Task {
                        _ = await viewModel.cancelReservation(id: id)
                    }
                }
            }
        }
    }
}

// MARK: - Reservation Row

private struct ReservationRowView: View {
    let reservation: FacilityReservation
    let isStartingSoon: Bool

    private var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
            HStack {
                Text(reservation.facilityName ?? String(localized: "facilities.title"))
                    .font(.headline)

                Spacer()

                ReservationStatusBadge(status: reservation.status)
            }

            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Label(
                    "\(timeFormatter.string(from: reservation.startTime)) - \(timeFormatter.string(from: reservation.endTime))",
                    systemImage: "clock"
                )
                .font(.subheadline)
                .foregroundStyle(.secondary)

                if isStartingSoon {
                    Text(String(localized: "reservation.startingSoon"))
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.orange.opacity(0.15))
                        .foregroundStyle(.orange)
                        .clipShape(Capsule())
                }
            }

            if !reservation.horseDisplayText.isEmpty {
                Label(reservation.horseDisplayText, systemImage: "figure.equestrian.sports")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
    }
}

// MARK: - Status Badge

struct ReservationStatusBadge: View {
    let status: ReservationStatus

    var body: some View {
        Text(statusLabel)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(statusColor.opacity(0.15))
            .foregroundStyle(statusColor)
            .clipShape(Capsule())
    }

    private var statusLabel: String {
        switch status {
        case .pending: String(localized: "reservation.status.pending")
        case .confirmed: String(localized: "reservation.status.confirmed")
        case .cancelled: String(localized: "reservation.status.cancelled")
        case .completed: String(localized: "reservation.status.completed")
        case .noShow: String(localized: "reservation.status.noShow")
        case .rejected: String(localized: "reservation.status.rejected")
        }
    }

    private var statusColor: Color {
        switch status {
        case .pending: .orange
        case .confirmed: .green
        case .cancelled: .gray
        case .completed: .blue
        case .noShow: .red
        case .rejected: .red
        }
    }
}
