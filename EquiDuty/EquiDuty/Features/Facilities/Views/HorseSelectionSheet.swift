//
//  HorseSelectionSheet.swift
//  EquiDuty
//
//  Dedicated sheet for selecting horses in a reservation
//

import SwiftUI

struct HorseSelectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    var viewModel: ReservationFormViewModel

    var body: some View {
        NavigationStack {
            List {
                capacitySection
                horseListSection
            }
            .navigationTitle(String(localized: "reservation.selectHorses"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.done")) {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    @ViewBuilder
    private var capacitySection: some View {
        if let message = viewModel.capacityMessage {
            Section {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if !viewModel.canAddMoreHorses && !viewModel.selectedHorseIds.isEmpty {
                    Label(
                        String(localized: "reservation.capacity.full"),
                        systemImage: "exclamationmark.triangle.fill"
                    )
                    .foregroundStyle(.orange)
                    .font(.subheadline)
                }
            }
        }
    }

    private var horseListSection: some View {
        Section {
            ForEach(viewModel.availableHorses) { horse in
                let isSelected = viewModel.selectedHorseIds.contains(horse.id)
                let isDisabled = !isSelected && !viewModel.canAddMoreHorses
                Button {
                    viewModel.toggleHorse(horse.id)
                } label: {
                    HStack {
                        Text(horse.name)
                            .foregroundStyle(isDisabled ? .tertiary : .primary)
                        Spacer()
                        if isSelected {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Color.accentColor)
                        } else {
                            Image(systemName: "circle")
                                .foregroundStyle(isDisabled ? .tertiary : .secondary)
                        }
                    }
                }
                .disabled(isDisabled)
            }
        }
    }
}
