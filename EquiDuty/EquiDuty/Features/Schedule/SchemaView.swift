import SwiftUI

/// Available schema tabs
enum SchemaTab: String, CaseIterable, Identifiable {
    case week = "schedule.week"
    case selection = "schedule.selection"      // Rutinval
    case templates = "schedule.templates"      // Rutinmallar
    case schedules = "schedule.schedules"      // Rutinscheman

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .week: return "calendar.badge.clock"
        case .selection: return "list.bullet"
        case .templates: return "doc.text"
        case .schedules: return "repeat.circle"
        }
    }
}

/// Main schedule view with tab navigation
struct SchemaView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab: SchemaTab = .week

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segmented picker for tab switching
                Picker("", selection: $selectedTab) {
                    ForEach(SchemaTab.allCases) { tab in
                        Label(String(localized: String.LocalizationValue(tab.rawValue)),
                              systemImage: tab.icon)
                            .tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                // Tab content
                TabView(selection: $selectedTab) {
                    SchemaWeekView()
                        .tag(SchemaTab.week)

                    RoutineSelectionView()
                        .tag(SchemaTab.selection)

                    RoutineTemplatesView()
                        .tag(SchemaTab.templates)

                    RoutineSchedulesView()
                        .tag(SchemaTab.schedules)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle(String(localized: "schedule.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

#Preview {
    SchemaView()
}
