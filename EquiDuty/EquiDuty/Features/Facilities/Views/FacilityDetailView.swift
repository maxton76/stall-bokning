//
//  FacilityDetailView.swift
//  EquiDuty
//
//  Detail view for a single facility with day schedule
//

import SwiftUI

struct FacilityDetailView: View {
    let facilityId: String
    @State private var viewModel: FacilityDetailViewModel
    @State private var showBookingSheet = false
    @State private var selectedStartTime: String?
    @State private var selectedEndTime: String?
    @State private var selectedReservation: FacilityReservation?
    @State private var showDetailSheet = false

    init(facilityId: String) {
        self.facilityId = facilityId
        _viewModel = State(initialValue: FacilityDetailViewModel(facilityId: facilityId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.facility == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.facility == nil {
                ErrorView(message: error) {
                    Task { await viewModel.loadData() }
                }
            } else {
                ScrollView {
                    VStack(spacing: EquiDutyDesign.Spacing.lg) {
                        // Facility header
                        if let facility = viewModel.facility {
                            FacilityHeaderView(facility: facility)
                        }

                        // Date navigation
                        HStack {
                            Button {
                                Task { await viewModel.goToPreviousDay() }
                            } label: {
                                Image(systemName: "chevron.left")
                                    .font(.title3)
                            }

                            Spacer()

                            DatePicker(
                                "",
                                selection: $viewModel.selectedDate,
                                displayedComponents: .date
                            )
                            .labelsHidden()
                            .onChange(of: viewModel.selectedDate) { _, newDate in
                                Task { await viewModel.changeDate(newDate) }
                            }

                            Spacer()

                            Button {
                                Task { await viewModel.goToNextDay() }
                            } label: {
                                Image(systemName: "chevron.right")
                                    .font(.title3)
                            }
                        }
                        .padding(.horizontal)

                        // Day schedule (uses live data from Firestore listener when available)
                        FacilityDayScheduleView(
                            availableSlots: viewModel.availableSlots,
                            reservations: viewModel.liveReservations,
                            onSlotTapped: { startTime, endTime in
                                selectedStartTime = startTime
                                selectedEndTime = endTime
                                selectedReservation = nil
                                showBookingSheet = true
                            },
                            onReservationTapped: { reservation in
                                handleReservationTap(reservation)
                            }
                        )

                        // Booking rules
                        if let rules = viewModel.facility?.bookingRules {
                            BookingRulesView(rules: rules)
                        }
                    }
                    .padding(.vertical)
                }
            }
        }
        .navigationTitle(viewModel.facilityName)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    selectedReservation = nil
                    showBookingSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                }
            }
        }
        .sheet(isPresented: $showBookingSheet) {
            // Refresh data after booking and reset selected times
            selectedStartTime = nil
            selectedEndTime = nil
            selectedReservation = nil
            Task { await viewModel.loadData() }
        } content: {
            if let reservation = selectedReservation {
                ReservationFormSheet(
                    facilityId: facilityId,
                    facilityName: viewModel.facilityName,
                    date: viewModel.selectedDate,
                    existingReservation: reservation
                )
            } else {
                ReservationFormSheet(
                    facilityId: facilityId,
                    facilityName: viewModel.facilityName,
                    date: viewModel.selectedDate,
                    startTime: selectedStartTime,
                    endTime: selectedEndTime
                )
            }
        }
        .sheet(isPresented: $showDetailSheet) {
            Task { await viewModel.loadData() }
        } content: {
            if let reservation = selectedReservation {
                ReservationDetailSheet(reservation: reservation)
            }
        }
        .task {
            await viewModel.loadData()
        }
        .onDisappear {
            viewModel.stopRealtimeUpdates()
        }
    }

    // MARK: - Private

    private func handleReservationTap(_ reservation: FacilityReservation) {
        selectedReservation = reservation
        let currentUserId = AuthService.shared.firebaseUid
        if reservation.userId == currentUserId {
            // Own reservation → edit form
            showBookingSheet = true
        } else {
            // Other's reservation → read-only detail
            showDetailSheet = true
        }
    }
}

// MARK: - Facility Header

private struct FacilityHeaderView: View {
    let facility: Facility

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Image(systemName: facilityTypeIcon(facility.type))
                    .font(.title2)
                    .foregroundStyle(.tint)

                Text(facilityTypeLabel(facility.type))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let capacity = facility.capacity {
                    Spacer()
                    Label("\(capacity)", systemImage: "person.2")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            if let description = facility.description, !description.isEmpty {
                Text(description)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Booking Rules

private struct BookingRulesView: View {
    let rules: BookingRules

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            Text(String(localized: "facilities.bookingRules"))
                .font(.headline)

            if let minDuration = rules.minDuration {
                Label(String(localized: "facilities.rules.minDuration \(minDuration)"), systemImage: "clock")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let maxDuration = rules.maxDuration {
                Label(String(localized: "facilities.rules.maxDuration \(maxDuration)"), systemImage: "clock.fill")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let advanceDays = rules.advanceBookingDays {
                Label(String(localized: "facilities.rules.advanceBooking \(advanceDays)"), systemImage: "calendar")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if rules.requiresApproval == true {
                Label(String(localized: "facilities.rules.requiresApproval"), systemImage: "checkmark.shield")
                    .font(.subheadline)
                    .foregroundStyle(.orange)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
        .shadow(color: .black.opacity(0.06), radius: 4, y: 1)
        .padding(.horizontal)
    }
}
