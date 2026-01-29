//
//  CareActivityTypeCell.swift
//  EquiDuty
//
//  Cell displaying a single care activity type status
//

import SwiftUI

struct CareActivityTypeCell: View {
    let status: CareActivityStatus
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: EquiDutyDesign.Spacing.sm) {
                // Icon with type color
                Image(systemName: status.type.icon)
                    .font(.title2)
                    .foregroundStyle(status.type.color)

                // Type name
                Text(status.type.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                // Status badges
                VStack(spacing: EquiDutyDesign.Spacing.xs) {
                    // Last completed badge (blue)
                    if let lastDate = status.lastCompletedDate {
                        HStack(spacing: EquiDutyDesign.Spacing.xs) {
                            Image(systemName: "checkmark")
                                .font(.caption2)
                            Text(lastDate.formatted(date: .abbreviated, time: .omitted))
                                .font(.caption2)
                        }
                        .fontWeight(.medium)
                        .foregroundStyle(.blue)
                        .padding(.horizontal, EquiDutyDesign.Spacing.sm)
                        .padding(.vertical, EquiDutyDesign.Spacing.xs)
                        .background(Color.blue.opacity(0.1))
                        .clipShape(Capsule())
                    }

                    // Next scheduled or overdue badge
                    if let nextDate = status.nextScheduledDate {
                        if status.isOverdue {
                            // Overdue badge (red)
                            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                                Image(systemName: "exclamationmark.circle")
                                    .font(.caption2)
                                Text(String(localized: "care.status.overdue"))
                                    .font(.caption2)
                            }
                            .fontWeight(.medium)
                            .foregroundStyle(.white)
                            .padding(.horizontal, EquiDutyDesign.Spacing.sm)
                            .padding(.vertical, EquiDutyDesign.Spacing.xs)
                            .background(Color.red)
                            .clipShape(Capsule())
                        } else {
                            // Next scheduled badge (green)
                            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                                Image(systemName: "calendar")
                                    .font(.caption2)
                                Text(nextDate.formatted(date: .abbreviated, time: .omitted))
                                    .font(.caption2)
                            }
                            .fontWeight(.medium)
                            .foregroundStyle(.green)
                            .padding(.horizontal, EquiDutyDesign.Spacing.sm)
                            .padding(.vertical, EquiDutyDesign.Spacing.xs)
                            .background(Color.green.opacity(0.1))
                            .clipShape(Capsule())
                        }
                    } else if status.lastCompletedDate == nil {
                        // No history - show schedule button
                        HStack(spacing: EquiDutyDesign.Spacing.xs) {
                            Image(systemName: "plus")
                                .font(.caption2)
                            Text(String(localized: "care.action.schedule"))
                                .font(.caption2)
                        }
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, EquiDutyDesign.Spacing.sm)
                        .padding(.vertical, EquiDutyDesign.Spacing.xs)
                        .background(.quaternary)
                        .clipShape(Capsule())
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, EquiDutyDesign.Spacing.sm)
            .contentShape(Rectangle())
        }
        .buttonStyle(.scale)
    }
}

#Preview {
    VStack {
        // With completed activity
        CareActivityTypeCell(
            status: CareActivityStatus(
                type: .dentist,
                lastCompletedDate: Date().addingTimeInterval(-60 * 60 * 24 * 90),
                lastCompletedActivity: nil,
                nextScheduledDate: Date().addingTimeInterval(60 * 60 * 24 * 30),
                nextScheduledActivity: nil
            ),
            onTap: {}
        )

        // Overdue
        CareActivityTypeCell(
            status: CareActivityStatus(
                type: .farrier,
                lastCompletedDate: Date().addingTimeInterval(-60 * 60 * 24 * 60),
                lastCompletedActivity: nil,
                nextScheduledDate: Date().addingTimeInterval(-60 * 60 * 24 * 7),
                nextScheduledActivity: nil
            ),
            onTap: {}
        )

        // No history
        CareActivityTypeCell(
            status: CareActivityStatus(
                type: .vet,
                lastCompletedDate: nil,
                lastCompletedActivity: nil,
                nextScheduledDate: nil,
                nextScheduledActivity: nil
            ),
            onTap: {}
        )
    }
    .padding()
}
