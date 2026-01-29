//
//  RoutineListView.swift
//  EquiDuty
//
//  List of available routines
//
//  NAVIGATION PATTERN:
//  - Uses NavigationLink(value: AppDestination.xxx) for standard navigation
//  - Uses withAppNavigationDestinations() for ID-based deep linking support
//  - See NavigationRouter.swift for available destinations
//

import SwiftUI

struct RoutineListView: View {
    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared
    @State private var router = NavigationRouter.shared
    @State private var selectedDate = Date()
    @State private var instances: [RoutineInstance] = []
    @State private var templates: [RoutineTemplate] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack(path: $router.routinesPath) {
            ScrollView {
                VStack(spacing: EquiDutyDesign.Spacing.lg) {
                    // Date navigation
                    DateNavigationHeader(
                        selectedDate: $selectedDate,
                        onDateChanged: { loadData() }
                    )

                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) {
                            loadData()
                        }
                    } else if instances.isEmpty {
                        ModernEmptyStateView(
                            icon: "checklist",
                            title: String(localized: "routines.empty.title"),
                            message: String(localized: "routines.empty.message")
                        )
                    } else {
                        // Today's routines
                        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                            Text(String(localized: "routines.today"))
                                .font(.headline)
                                .padding(.horizontal)

                            ForEach(instances) { instance in
                                RoutineInstanceCard(instance: instance)
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle(String(localized: "routines.title"))
            .refreshable {
                await refreshData()
            }
            .withAppNavigationDestinations()
            .onAppear {
                loadData()
            }
            .onChange(of: authService.selectedStable?.id) { _, _ in
                loadData()
            }
            .onChange(of: authService.selectedOrganization?.id) { _, _ in
                loadData()
            }
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                // Fetch routine instances for the selected date
                if let stableId = authService.selectedStable?.id {
                    instances = try await routineService.getRoutineInstances(
                        stableId: stableId,
                        date: selectedDate
                    )
                    // Sort by scheduled time
                    instances.sort { $0.scheduledStartTime < $1.scheduledStartTime }
                } else {
                    instances = []
                }

                // Fetch templates for the organization
                if let orgId = authService.selectedOrganization?.id {
                    templates = try await routineService.getRoutineTemplates(
                        organizationId: orgId
                    )
                } else {
                    templates = []
                }

                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshData() async {
        do {
            if let stableId = authService.selectedStable?.id {
                instances = try await routineService.getRoutineInstances(
                    stableId: stableId,
                    date: selectedDate
                )
                instances.sort { $0.scheduledStartTime < $1.scheduledStartTime }
            } else {
                instances = []
            }

            if let orgId = authService.selectedOrganization?.id {
                templates = try await routineService.getRoutineTemplates(
                    organizationId: orgId
                )
            } else {
                templates = []
            }

            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Routine Instance Card

/// Routine instance card using NavigationLink for standard navigation pattern
struct RoutineInstanceCard: View {
    let instance: RoutineInstance

    var body: some View {
        NavigationLink(value: AppDestination.routineFlow(instanceId: instance.id)) {
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                // Header
                HStack {
                    // Type icon
                    ZStack {
                        Circle()
                            .fill(typeColor.opacity(0.15))
                            .frame(width: 44, height: 44)

                        Image(systemName: typeIcon)
                            .font(.title3)
                            .foregroundStyle(typeColor)
                    }

                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs / 2) {
                        Text(instance.templateName)
                            .font(.headline)
                            .foregroundStyle(.primary)

                        HStack(spacing: EquiDutyDesign.Spacing.xs) {
                            Image(systemName: "clock")
                                .font(.caption)
                            Text(instance.scheduledStartTime)
                                .font(.subheadline)
                        }
                        .foregroundStyle(.secondary)
                    }

                    Spacer()

                    ModernStatusBadge(
                        status: instance.status.displayName,
                        color: Color(instance.status.color),
                        icon: typeIcon,
                        isAnimating: instance.status == .inProgress || instance.status == .started
                    )
                }

                // Progress
                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                    ModernProgressView(value: instance.progress.percentComplete, total: 100, tint: progressColor)

                    HStack {
                        Text("\(instance.progress.stepsCompleted)/\(instance.progress.stepsTotal) \(String(localized: "routine.steps"))")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Spacer()

                        if let assignedName = instance.assignedToName {
                            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                                Image(systemName: "person.fill")
                                    .font(.caption2)
                                Text(assignedName)
                                    .font(.caption)
                            }
                            .foregroundStyle(.secondary)
                        }
                    }
                }

                // Action button
                if instance.status == .scheduled || instance.status == .inProgress || instance.status == .started {
                    HStack {
                        Spacer()
                        Text(actionButtonText)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.accentColor)
                            .clipShape(Capsule())
                    }
                }
            }
            .contentCard()
        }
        .buttonStyle(.scale)
    }

    private var typeIcon: String {
        switch instance.status {
        case .scheduled: return "clock"
        case .started, .inProgress: return "play.fill"
        case .completed: return "checkmark.circle.fill"
        case .missed: return "exclamationmark.triangle.fill"
        case .cancelled: return "xmark.circle.fill"
        }
    }

    private var typeColor: Color {
        Color(instance.status.color)
    }

    private var progressColor: Color {
        if instance.progress.isComplete { return .green }
        return .accentColor
    }

    private var actionButtonText: String {
        switch instance.status {
        case .scheduled:
            return String(localized: "routine.start")
        case .started, .inProgress:
            return String(localized: "routine.continue")
        default:
            return String(localized: "routine.view")
        }
    }
}

// MARK: - Placeholder Views

struct RoutineDetailView: View {
    let templateId: String

    var body: some View {
        Text(String(localized: "routine.template.detail"))
            .navigationTitle(String(localized: "routine.template"))
    }
}

#Preview {
    RoutineListView()
}
