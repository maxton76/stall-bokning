//
//  TodayFilterSheet.swift
//  EquiDuty
//
//  Filter sheet for TodayView with group by, for me, and show finished options
//

import SwiftUI

/// Filter sheet for TodayView
struct TodayFilterSheet: View {
    @Binding var filters: TodayFilters
    let onApply: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var localFilters = TodayFilters()

    var body: some View {
        NavigationStack {
            Form {
                // Group By
                Section(String(localized: "today.filters.groupBy")) {
                    Picker(String(localized: "today.filters.groupBy"), selection: $localFilters.groupBy) {
                        ForEach(TodayGroupByOption.allCases) { option in
                            Label(option.displayName, systemImage: option.icon)
                                .tag(option)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }

                // User filters
                Section(String(localized: "today.filters.display")) {
                    Toggle(isOn: $localFilters.forMe) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(String(localized: "today.filters.forMe"))
                                Text(String(localized: "today.filters.forMe.description"))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "person.fill")
                        }
                    }

                    Toggle(isOn: $localFilters.showFinished) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(String(localized: "today.filters.showFinished"))
                                Text(String(localized: "today.filters.showFinished.description"))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "checkmark.circle.fill")
                        }
                    }
                }

                // Clear filters
                if localFilters.hasActiveFilters {
                    Section {
                        Button(role: .destructive) {
                            localFilters.clearAll()
                        } label: {
                            HStack {
                                Spacer()
                                Label(
                                    String(localized: "today.filters.clearAll"),
                                    systemImage: "xmark.circle"
                                )
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle(String(localized: "today.filters.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.apply")) {
                        filters = localFilters
                        onApply()
                        dismiss()
                    }
                }
            }
            .onAppear {
                localFilters = filters
            }
        }
    }
}

/// Filter button with badge showing active filter count
struct TodayFilterButton: View {
    let filters: TodayFilters
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: "line.3.horizontal.decrease.circle")
                    .font(.body)

                Text(String(localized: "today.filters.title"))
                    .font(.subheadline)

                if filters.activeFilterCount > 0 {
                    Text("\(filters.activeFilterCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.accentColor)
                        .clipShape(Capsule())
                }
            }
        }
        .buttonStyle(.bordered)
    }
}

#Preview("Filter Sheet") {
    TodayFilterSheet(filters: .constant(TodayFilters())) {
        print("Filters applied")
    }
}

#Preview("Filter Button - No Active") {
    TodayFilterButton(filters: TodayFilters()) {
        print("Show filters")
    }
    .padding()
}

#Preview("Filter Button - Active") {
    TodayFilterButton(filters: TodayFilters(groupBy: .horse, forMe: true)) {
        print("Show filters")
    }
    .padding()
}
