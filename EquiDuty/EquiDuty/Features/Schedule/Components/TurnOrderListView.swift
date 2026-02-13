//
//  TurnOrderListView.swift
//  EquiDuty
//
//  Reusable turn order list for selection processes
//

import SwiftUI

struct TurnOrderListView: View {
    let turns: [SelectionProcessTurn]
    let currentUserId: String?

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.sm) {
            ForEach(turns) { turn in
                HStack(spacing: EquiDutyDesign.Spacing.md) {
                    // Order number
                    Text("\(turn.order)")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                        .frame(width: 28, alignment: .trailing)

                    // Status icon
                    turnStatusIcon(turn.status)

                    // Name
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Text(turn.userName)
                                .fontWeight(turn.userId == currentUserId ? .semibold : .regular)
                            if turn.userId == currentUserId {
                                Text(String(localized: "selectionProcess.labels.you"))
                                    .font(.caption)
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    }

                    Spacer()

                    // Selections count
                    if turn.selectionsCount > 0 {
                        Text("\(turn.selectionsCount)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.accentColor.opacity(0.12), in: Capsule())
                    }
                }
                .padding(.vertical, 6)
                .padding(.horizontal, EquiDutyDesign.Spacing.md)
                .background(
                    turn.userId == currentUserId
                        ? Color.accentColor.opacity(0.06)
                        : Color.clear,
                    in: RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small)
                )
            }
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
    }

    @ViewBuilder
    private func turnStatusIcon(_ status: SelectionTurnStatus) -> some View {
        switch status {
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case .active:
            Image(systemName: "play.circle.fill")
                .foregroundStyle(.blue)
        case .pending:
            Image(systemName: "clock")
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    TurnOrderListView(
        turns: [
            SelectionProcessTurn(userId: "1", userName: "Anna", userEmail: nil, order: 1, status: .completed, completedAt: nil, selectionsCount: 3),
            SelectionProcessTurn(userId: "2", userName: "Erik", userEmail: nil, order: 2, status: .active, completedAt: nil, selectionsCount: 1),
            SelectionProcessTurn(userId: "3", userName: "Sara", userEmail: nil, order: 3, status: .pending, completedAt: nil, selectionsCount: 0),
        ],
        currentUserId: "2"
    )
    .padding()
}
