//
//  FeatureRequestCard.swift
//  EquiDuty
//
//  Card component for feature request list items
//

import SwiftUI

struct FeatureRequestCard: View {
    let request: FeatureRequest
    let onVote: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.md) {
            // Vote button
            VoteButton(
                count: request.voteCount,
                hasVoted: request.hasVoted ?? false,
                action: onVote
            )

            // Content
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(request.title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .lineLimit(2)

                Text(request.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)

                HStack(spacing: EquiDutyDesign.Spacing.sm) {
                    FeatureRequestStatusBadge(status: request.status)
                    FeatureRequestCategoryBadge(category: request.category)
                    Spacer()
                    // Comment count
                    HStack(spacing: 2) {
                        Image(systemName: "bubble.left")
                            .font(.caption2)
                        Text("\(request.commentCount)")
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                }

                HStack(spacing: EquiDutyDesign.Spacing.xs) {
                    Text(request.authorDisplayName)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Text(request.createdAt.relativeTime())
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
        .shadow(color: .black.opacity(0.06), radius: 4, y: 1)
    }
}

// MARK: - Vote Button

private struct VoteButton: View {
    let count: Int
    let hasVoted: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: hasVoted ? "arrowtriangle.up.fill" : "arrowtriangle.up")
                    .font(.system(size: 16))
                Text("\(count)")
                    .font(.caption)
                    .fontWeight(.semibold)
            }
            .foregroundStyle(hasVoted ? .tint : .secondary)
            .frame(width: 44)
        }
        .buttonStyle(.plain)
    }
}

