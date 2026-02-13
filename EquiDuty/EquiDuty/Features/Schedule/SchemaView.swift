import SwiftUI

/// Available schema tabs
enum SchemaTab: String, CaseIterable, Identifiable {
    case selection = "schedule.selection"      // Rutinval
    case templates = "schedule.templates"      // Rutinmallar
    case schedules = "schedule.schedules"      // Rutinscheman

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .selection: return "list.bullet"
        case .templates: return "doc.text"
        case .schedules: return "repeat.circle"
        }
    }
}

/// Main schedule view with tab navigation
struct SchemaView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab: SchemaTab = .selection
    @State private var viewPeriod: TodayPeriodType = .week
    @State private var selectedDate = Date()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Conditional period selector (only for selection tab)
                if selectedTab == .selection {
                    TodayPeriodSelector(
                        selectedPeriod: $viewPeriod,
                        onChange: {
                            // Optional: handle period change
                        }
                    )
                    .padding(.horizontal)
                    .padding(.top, 8)
                    .padding(.bottom, 8)

                    Divider()
                }

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

                Divider()

                // Tab content
                TabView(selection: $selectedTab) {
                    // Selection tab: Week or Month view based on period
                    Group {
                        if viewPeriod == .week {
                            SchemaWeekView(
                                initialDate: selectedDate,
                                onSwitchToMonth: { date in
                                    selectedDate = date
                                    viewPeriod = .month
                                }
                            )
                        } else {
                            SchemaMonthView(onSwitchToWeek: { date in
                                selectedDate = date
                                viewPeriod = .week
                            })
                        }
                    }
                    .tag(SchemaTab.selection)

                    // Templates tab (static)
                    RoutineTemplatesView()
                        .tag(SchemaTab.templates)

                    // Schedules tab (static)
                    RoutineSchedulesView()
                        .tag(SchemaTab.schedules)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .withAppNavigationDestinations()
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
