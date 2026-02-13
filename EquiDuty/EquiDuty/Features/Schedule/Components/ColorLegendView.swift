import SwiftUI

/// Color legend showing status meanings in schedule views
struct ColorLegendView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "schedule.legend.title"))
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            HStack(spacing: 12) {
                LegendItem(color: .blue, label: String(localized: "schedule.legend.assigned"))
                LegendItem(color: .gray, label: String(localized: "schedule.legend.unassigned"))
                LegendItem(color: .orange, label: String(localized: "schedule.legend.inProgress"))
                LegendItem(color: .green, label: String(localized: "schedule.legend.completed"))
                LegendItem(color: .red, label: String(localized: "schedule.legend.missed"))
            }
            .font(.caption2)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }
}

/// Single legend item showing a color dot with label
private struct LegendItem: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)

            Text(label)
                .foregroundStyle(.primary)
        }
    }
}

#Preview {
    ColorLegendView()
        .padding()
}
