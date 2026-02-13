import SwiftUI

/// Compact routine card for calendar grid views (week/month)
struct RoutineCardView: View {
    let routine: RoutineInstance
    var compact: Bool = false

    private var statusColor: Color {
        switch routine.status {
        case .completed:
            return .green
        case .missed:
            return .red
        case .cancelled:
            return .gray
        case .started, .inProgress:
            return .orange
        case .scheduled:
            if routine.assignedTo == nil {
                return .gray
            }
            return .blue
        }
    }

    private var isCancelled: Bool {
        routine.status == .cancelled
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            // Routine name
            Text(routine.templateName)
                .font(.caption2)
                .fontWeight(.semibold)
                .lineLimit(1)
                .strikethrough(isCancelled)

            if !compact {
                // Time
                Text(routine.scheduledStartTime)
                    .font(.system(size: 9))
                    .opacity(0.75)

                // Assignee
                if let name = routine.assignedToName {
                    Text(name)
                        .font(.system(size: 9))
                        .fontWeight(.bold)
                        .lineLimit(1)
                } else {
                    Text(String(localized: "schedule.card.unassigned"))
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(statusColor.opacity(0.15))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .strokeBorder(statusColor.opacity(0.3), lineWidth: 0.5)
        )
        .foregroundStyle(statusColor.opacity(isCancelled ? 0.5 : 1.0))
    }
}

#Preview {
    VStack(spacing: 8) {
        RoutineCardView(routine: RoutineInstance(
            id: "1", templateId: "t1", templateName: "Morgonrutin",
            organizationId: "o1", stableId: "s1",
            scheduledDate: Date(), scheduledStartTime: "07:00",
            estimatedDuration: 60, assignedTo: "u1", assignedToName: "Anna",
            assignmentType: .manual, status: .scheduled,
            progress: RoutineProgress(stepsCompleted: 0, stepsTotal: 5, percentComplete: 0, stepProgress: [:]),
            pointsValue: 10, dailyNotesAcknowledged: false,
            createdAt: Date(), createdBy: "sys", updatedAt: Date()
        ))

        RoutineCardView(routine: RoutineInstance(
            id: "2", templateId: "t2", templateName: "Kvällsrutin",
            organizationId: "o1", stableId: "s1",
            scheduledDate: Date(), scheduledStartTime: "18:00",
            estimatedDuration: 45, assignmentType: .unassigned, status: .scheduled,
            progress: RoutineProgress(stepsCompleted: 0, stepsTotal: 3, percentComplete: 0, stepProgress: [:]),
            pointsValue: 8, dailyNotesAcknowledged: false,
            createdAt: Date(), createdBy: "sys", updatedAt: Date()
        ))
    }
    .padding()
}
