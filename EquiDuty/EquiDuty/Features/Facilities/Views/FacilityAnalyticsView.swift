//
//  FacilityAnalyticsView.swift
//  EquiDuty
//
//  Analytics dashboard for facility reservations (manager-only)
//

import SwiftUI

struct FacilityAnalyticsView: View {
    @State private var viewModel = FacilityAnalyticsViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.analytics == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.analytics == nil {
                ErrorView(message: error) {
                    Task { await viewModel.loadData() }
                }
            } else {
                ScrollView {
                    VStack(spacing: EquiDutyDesign.Spacing.lg) {
                        // Date range picker
                        Picker(String(localized: "analytics.dateRange"), selection: $viewModel.selectedPreset) {
                            ForEach(AnalyticsDateRangePreset.allCases, id: \.self) { preset in
                                Text(preset.label).tag(preset)
                            }
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal)
                        .onChange(of: viewModel.selectedPreset) { _, newPreset in
                            Task { await viewModel.changePreset(newPreset) }
                        }

                        // Metric cards
                        if let metrics = viewModel.metrics {
                            LazyVGrid(columns: [
                                GridItem(.flexible()),
                                GridItem(.flexible())
                            ], spacing: EquiDutyDesign.Spacing.md) {
                                MetricCard(
                                    title: String(localized: "analytics.totalBookings"),
                                    value: "\(metrics.totalBookings)",
                                    icon: "calendar.badge.plus",
                                    color: .blue
                                )

                                MetricCard(
                                    title: String(localized: "analytics.utilization"),
                                    value: String(format: "%.0f%%", metrics.averageDuration),
                                    icon: "chart.bar.fill",
                                    color: .green
                                )

                                MetricCard(
                                    title: String(localized: "analytics.peakHour"),
                                    value: viewModel.peakHourFormatted ?? "-",
                                    icon: "clock.fill",
                                    color: .orange
                                )

                                MetricCard(
                                    title: String(localized: "analytics.noShowRate"),
                                    value: viewModel.noShowRateFormatted,
                                    icon: "person.slash",
                                    color: .red
                                )
                            }
                            .padding(.horizontal)
                        }

                        // Facility utilization
                        if !viewModel.utilization.isEmpty {
                            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                                Text(String(localized: "analytics.utilization"))
                                    .font(.headline)
                                    .padding(.horizontal)

                                ForEach(viewModel.utilization) { facility in
                                    UtilizationRow(facility: facility, maxBookings: viewModel.utilization.map(\.bookings).max() ?? 1)
                                }
                                .padding(.horizontal)
                            }
                        }

                        // Top users
                        if !viewModel.topUsers.isEmpty {
                            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                                Text(String(localized: "analytics.topUsers"))
                                    .font(.headline)
                                    .padding(.horizontal)

                                ForEach(viewModel.topUsers) { user in
                                    HStack {
                                        Text(user.userName ?? user.userEmail)
                                            .font(.subheadline)

                                        Spacer()

                                        Text("\(user.bookingCount)")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                            .foregroundStyle(.tint)
                                    }
                                    .padding(.horizontal)
                                }
                            }
                        }
                    }
                    .padding(.vertical)
                }
            }
        }
        .task {
            await viewModel.loadData()
        }
    }
}

// MARK: - Metric Card

private struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(.primary)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
        .shadow(color: .black.opacity(0.06), radius: 4, y: 1)
    }
}

// MARK: - Utilization Row

private struct UtilizationRow: View {
    let facility: FacilityUtilization
    let maxBookings: Int

    var progress: Double {
        guard maxBookings > 0 else { return 0 }
        return Double(facility.bookings) / Double(maxBookings)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
            HStack {
                Text(facility.facilityName)
                    .font(.subheadline)
                Spacer()
                Text("\(facility.bookings)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.tint)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(.tint)
                        .frame(width: geometry.size.width * progress, height: 8)
                }
            }
            .frame(height: 8)
        }
    }
}
