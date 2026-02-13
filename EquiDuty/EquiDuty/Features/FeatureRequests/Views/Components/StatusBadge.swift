//
//  StatusBadge.swift
//  EquiDuty
//
//  Color-coded status badge for feature requests
//

import SwiftUI

struct FeatureRequestStatusBadge: View {
    let status: FeatureRequestStatus

    private var color: Color {
        switch status {
        case .open: return .blue
        case .underReview: return .yellow
        case .planned: return .purple
        case .inProgress: return .orange
        case .completed: return .green
        case .declined: return .red
        }
    }

    var body: some View {
        Text(status.displayName)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
