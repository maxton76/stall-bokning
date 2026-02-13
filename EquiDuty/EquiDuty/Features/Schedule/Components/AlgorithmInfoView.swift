//
//  AlgorithmInfoView.swift
//  EquiDuty
//
//  Info sheet explaining the 4 selection algorithms
//

import SwiftUI

struct AlgorithmInfoView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xl) {
                    ForEach(SelectionAlgorithm.allCases) { algorithm in
                        algorithmCard(algorithm)
                    }
                }
                .padding()
            }
            .navigationTitle(String(localized: "selectionProcess.algorithm.help.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("OK") { dismiss() }
                }
            }
        }
    }

    private func algorithmCard(_ algorithm: SelectionAlgorithm) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack {
                Image(systemName: algorithm.icon)
                    .font(.title3)
                    .foregroundStyle(Color.accentColor)
                Text(algorithm.displayName)
                    .font(.headline)
            }

            Text(algorithm.description)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text(algorithmDetailedDescription(algorithm))
                .font(.subheadline)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
    }

    private func algorithmDetailedDescription(_ algorithm: SelectionAlgorithm) -> String {
        switch algorithm {
        case .manual:
            return String(localized: "selectionProcess.algorithm.manual.detail")
        case .quotaBased:
            return String(localized: "selectionProcess.algorithm.quotaBased.detail")
        case .pointsBalance:
            return String(localized: "selectionProcess.algorithm.pointsBalance.detail")
        case .fairRotation:
            return String(localized: "selectionProcess.algorithm.fairRotation.detail")
        }
    }
}

#Preview {
    AlgorithmInfoView()
}
