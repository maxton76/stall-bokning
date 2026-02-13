//
//  CategoryBadge.swift
//  EquiDuty
//
//  Color-coded category badge for feature requests
//

import SwiftUI

struct FeatureRequestCategoryBadge: View {
    let category: FeatureRequestCategory

    private var color: Color {
        switch category {
        case .improvement: return .teal
        case .newFeature: return .indigo
        case .integration: return .mint
        case .bugFix: return .pink
        case .other: return .gray
        }
    }

    var body: some View {
        Text(category.displayName)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
