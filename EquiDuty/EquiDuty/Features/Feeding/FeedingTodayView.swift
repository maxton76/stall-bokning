//
//  FeedingTodayView.swift
//  EquiDuty
//
//  Daily feeding tracking view - uses routine instances as source of truth
//

import SwiftUI

// MARK: - Feeding Session View Model

/// Represents a feeding session extracted from a routine instance step
struct FeedingSession: Identifiable {
    let id: String  // Unique: "\(instanceId)-\(stepId)"
    let instanceId: String
    let stepId: String
    let name: String
    let time: String
    let routineName: String
    var horsesTotal: Int
    var horsesCompleted: Int
    var horseProgress: [String: HorseStepProgress]
    let feedingTimeId: String?
    let routineStatus: RoutineInstanceStatus  // Track routine status for auto-start

    var progressPercent: Double {
        guard horsesTotal > 0 else { return 0 }
        return Double(horsesCompleted) / Double(horsesTotal)
    }

    var isComplete: Bool {
        horsesTotal > 0 && horsesCompleted >= horsesTotal
    }

    /// Whether this session can be edited (routine is in an active state)
    /// Note: For feeding, we allow editing even for "missed" routines since users
    /// should be able to record feedings even if they're running late
    var isEditable: Bool {
        switch routineStatus {
        case .scheduled, .started, .inProgress, .missed:
            return true
        case .completed, .cancelled:
            return false
        }
    }
}

struct FeedingTodayView: View {
    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared
    @State private var horseService = HorseService.shared
    @State private var feedingService = FeedingService.shared
    @State private var selectedDate = Date()
    @State private var feedingSessions: [FeedingSession] = []
    @State private var horses: [Horse] = []
    @State private var horseFeedings: [String: [HorseFeeding]] = [:]  // keyed by horseId
    @State private var routineInstances: [RoutineInstance] = []  // Store for status lookup
    @State private var isLoading = false
    @State private var errorMessage: String?
    @Environment(NotificationViewModel.self) private var notificationViewModel
    @State private var showNotificationCenter = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: EquiDutyDesign.Spacing.lg) {
                    // Date navigation
                    DateNavigationHeader(
                        selectedDate: $selectedDate,
                        onDateChanged: { loadFeedingData() }
                    )

                    // Overall progress
                    if !feedingSessions.isEmpty {
                        OverallFeedingProgress(sessions: feedingSessions)
                    }

                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) {
                            loadFeedingData()
                        }
                    } else if feedingSessions.isEmpty {
                        ModernEmptyStateView(
                            icon: "leaf.fill",
                            title: String(localized: "feeding.empty.title"),
                            message: String(localized: "feeding.empty.message")
                        )
                    } else {
                        // Feeding sessions
                        ForEach(feedingSessions) { session in
                            FeedingSessionSection(
                                session: session,
                                horses: horses,
                                horseFeedings: horseFeedings,
                                onHorseToggled: { horseId, horseName, completed in
                                    await toggleHorseFeeding(
                                        session: session,
                                        horseId: horseId,
                                        horseName: horseName,
                                        completed: completed
                                    )
                                },
                                onRefresh: { loadFeedingData() }
                            )
                        }
                    }
                }
                .padding(EquiDutyDesign.Spacing.standard)
            }
            .navigationTitle(String(localized: "feeding.title"))
            .notificationBellToolbar(viewModel: notificationViewModel, showNotificationCenter: $showNotificationCenter)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink(value: AppDestination.feedingSchedule(stableId: authService.selectedStable?.id ?? "")) {
                        Image(systemName: "calendar")
                    }
                    .disabled(authService.selectedStable == nil)
                }
            }
            .refreshable {
                await refreshFeedingData()
            }
            .withAppNavigationDestinations()
            .onAppear {
                loadFeedingData()
            }
            .onChange(of: authService.selectedStable?.id) { _, _ in
                loadFeedingData()
            }
        }
    }

    // MARK: - Data Loading

    private func loadFeedingData() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                guard let stableId = authService.selectedStable?.id else {
                    feedingSessions = []
                    isLoading = false
                    return
                }

                // Fetch routine instances, horses, and feedings in parallel
                async let instancesFetch = routineService.getRoutineInstances(
                    stableId: stableId,
                    date: selectedDate
                )
                async let horsesFetch = horseService.getStableHorses(stableId: stableId)
                async let feedingsFetch = feedingService.getHorseFeedings(stableId: stableId, forDate: selectedDate)

                let (instances, fetchedHorses, fetchedFeedings) = try await (instancesFetch, horsesFetch, feedingsFetch)

                horses = fetchedHorses
                routineInstances = instances  // Store for status lookup

                // Group feedings by horseId for quick lookup
                horseFeedings = Dictionary(grouping: fetchedFeedings, by: { $0.horseId })

                // Extract feeding sessions from routine instances
                feedingSessions = extractFeedingSessions(from: instances)
                    .sorted { parseTimeToMinutes($0.time) < parseTimeToMinutes($1.time) }

                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshFeedingData() async {
        do {
            guard let stableId = authService.selectedStable?.id else {
                feedingSessions = []
                return
            }

            async let instancesFetch = routineService.getRoutineInstances(
                stableId: stableId,
                date: selectedDate
            )
            async let horsesFetch = horseService.getStableHorses(stableId: stableId)
            async let feedingsFetch = feedingService.getHorseFeedings(stableId: stableId, forDate: selectedDate)

            let (instances, fetchedHorses, fetchedFeedings) = try await (instancesFetch, horsesFetch, feedingsFetch)

            horses = fetchedHorses
            routineInstances = instances  // Store for status lookup
            horseFeedings = Dictionary(grouping: fetchedFeedings, by: { $0.horseId })
            feedingSessions = extractFeedingSessions(from: instances)
                .sorted { parseTimeToMinutes($0.time) < parseTimeToMinutes($1.time) }

            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Feeding Session Extraction

    private func extractFeedingSessions(from instances: [RoutineInstance]) -> [FeedingSession] {
        var sessions: [FeedingSession] = []

        for instance in instances {
            guard let template = instance.template else { continue }

            for step in template.steps {
                // Only include feeding steps
                guard step.category == .feeding else { continue }

                let stepProgress = instance.progress.stepProgress[step.id]
                let horseProgress = stepProgress?.horseProgress ?? [:]

                let session = FeedingSession(
                    id: "\(instance.id)-\(step.id)",
                    instanceId: instance.id,
                    stepId: step.id,
                    name: step.name,
                    time: instance.scheduledStartTime,
                    routineName: instance.templateName,
                    horsesTotal: horses.count,
                    horsesCompleted: horseProgress.values.filter { $0.completed }.count,
                    horseProgress: horseProgress,
                    feedingTimeId: step.feedingTimeId,
                    routineStatus: instance.status
                )

                sessions.append(session)
            }
        }

        return sessions
    }

    // MARK: - Toggle Horse Feeding

    private func toggleHorseFeeding(
        session: FeedingSession,
        horseId: String,
        horseName: String,
        completed: Bool
    ) async {
        // Check if routine is in a state that allows progress updates
        switch session.routineStatus {
        case .completed:
            #if DEBUG
            print("⚠️ Routine is already completed, cannot update progress")
            #endif
            errorMessage = String(localized: "feeding.error.routine_completed")
            return
        case .cancelled:
            #if DEBUG
            print("⚠️ Routine was cancelled, cannot update progress")
            #endif
            errorMessage = String(localized: "feeding.error.routine_cancelled")
            return
        case .scheduled, .started, .inProgress, .missed:
            break  // These statuses allow updates (missed allowed for late feeding recording)
        }

        do {
            // Auto-start routine if still in scheduled or missed status
            // The API requires routine to be "started" or "in_progress" before accepting progress updates
            if session.routineStatus == .scheduled || session.routineStatus == .missed {
                #if DEBUG
                print("📋 Starting routine instance \(session.instanceId) before updating progress")
                #endif
                try await routineService.startRoutineInstance(
                    instanceId: session.instanceId,
                    dailyNotesAcknowledged: true
                )
            }

            // Now update progress
            try await routineService.updateRoutineProgress(
                instanceId: session.instanceId,
                stepId: session.stepId,
                horseUpdates: [HorseProgressUpdate(
                    horseId: horseId,
                    horseName: horseName,
                    completed: completed,
                    skipped: nil,
                    skipReason: nil,
                    notes: nil,
                    feedingConfirmed: completed,
                    medicationGiven: nil,
                    medicationSkipped: nil,
                    blanketAction: nil,
                    photoUrls: nil
                )]
            )

            // Refresh data to get updated progress
            await refreshFeedingData()
        } catch {
            #if DEBUG
            print("❌ Failed to update feeding status: \(error)")
            #endif
            // Show user-visible error
            errorMessage = "Failed to save: \(error.localizedDescription)"
        }
    }

    // MARK: - Helpers

    private func parseTimeToMinutes(_ time: String) -> Int {
        let parts = time.split(separator: ":")
        guard parts.count >= 2,
              let hours = Int(parts[0]),
              let minutes = Int(parts[1]) else {
            return 0
        }
        return hours * 60 + minutes
    }
}

// MARK: - Overall Progress

struct OverallFeedingProgress: View {
    let sessions: [FeedingSession]

    var body: some View {
        let totalCompleted = sessions.reduce(0) { $0 + $1.horsesCompleted }
        let totalHorses = sessions.reduce(0) { $0 + $1.horsesTotal }
        let progress = totalHorses > 0 ? Double(totalCompleted) / Double(totalHorses) : 0

        VStack(spacing: EquiDutyDesign.Spacing.md) {
            ZStack {
                Circle()
                    .stroke(.quaternary, lineWidth: 12)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(progressColor(progress), style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.smooth(duration: EquiDutyDesign.Animation.smooth), value: progress)

                VStack(spacing: EquiDutyDesign.Spacing.xs) {
                    Text("\(Int(progress * 100))%")
                        .font(.title)
                        .fontWeight(.bold)
                        .contentTransition(.numericText())

                    Text(String(localized: "feeding.completed"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 120, height: 120)

            Text("\(totalCompleted)/\(totalHorses) \(String(localized: "feeding.horses_fed"))")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity)
        .contentCard()
    }

    private func progressColor(_ progress: Double) -> Color {
        if progress >= 1.0 { return .green }
        if progress >= 0.5 { return .orange }
        return .accentColor
    }
}

// MARK: - Feeding Session Section

struct FeedingSessionSection: View {
    let session: FeedingSession
    let horses: [Horse]
    let horseFeedings: [String: [HorseFeeding]]
    let onHorseToggled: (String, String, Bool) async -> Void
    let onRefresh: () -> Void

    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            // Header
            Button {
                withAnimation(.smooth(duration: EquiDutyDesign.Animation.standard)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                        Text(session.name)
                            .font(.headline)
                            .foregroundStyle(.primary)

                        HStack(spacing: EquiDutyDesign.Spacing.xs) {
                            Text(session.time)
                            Text("•")
                            Text(session.routineName)
                        }
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    }

                    Spacer()

                    // Progress
                    HStack(spacing: EquiDutyDesign.Spacing.sm) {
                        Text("\(session.horsesCompleted)/\(session.horsesTotal)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .contentTransition(.numericText())

                        if session.isComplete {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                                .symbolEffect(.bounce, value: session.isComplete)
                        } else {
                            ProgressRing(progress: session.progressPercent, size: 24)
                        }

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .buttonStyle(.scale)

            // Horse list - always show all horses, using progress data where available
            if isExpanded {
                VStack(spacing: EquiDutyDesign.Spacing.sm) {
                    ForEach(horses) { horse in
                        // Get all feedings for this horse and filter by the session's feeding time
                        let allFeedings = horseFeedings[horse.id] ?? []
                        let feedings = session.feedingTimeId != nil
                            ? allFeedings.filter { $0.feedingTimeId == session.feedingTimeId }
                            : allFeedings
                        let progress = session.horseProgress[horse.id]
                        let isCompleted = progress?.completed ?? false

                        FeedingHorseRow(
                            horseId: horse.id,
                            horseName: horse.name,
                            isCompleted: isCompleted,
                            isEditable: session.isEditable,
                            feedingInstructions: formatFeedingInstructions(feedings),
                            hasSpecialInstructions: horse.hasSpecialInstructions ?? false,
                            onToggle: { completed in
                                Task {
                                    await onHorseToggled(horse.id, horse.name, completed)
                                }
                            }
                        )
                    }
                }
            }
        }
        .contentCard()
    }

    private func formatFeedingInstructions(_ feedings: [HorseFeeding]) -> String {
        guard !feedings.isEmpty else {
            return String(localized: "feeding.no_instructions")
        }
        return feedings.map { "\($0.feedTypeName): \($0.formattedQuantity)" }.joined(separator: ", ")
    }
}

// MARK: - Feeding Horse Row

struct FeedingHorseRow: View {
    let horseId: String
    let horseName: String
    let isCompleted: Bool
    let isEditable: Bool
    let feedingInstructions: String
    let hasSpecialInstructions: Bool
    let onToggle: (Bool) -> Void

    @State private var localCompleted: Bool
    @State private var isUpdating = false

    init(
        horseId: String,
        horseName: String,
        isCompleted: Bool,
        isEditable: Bool = true,
        feedingInstructions: String,
        hasSpecialInstructions: Bool,
        onToggle: @escaping (Bool) -> Void
    ) {
        self.horseId = horseId
        self.horseName = horseName
        self.isCompleted = isCompleted
        self.isEditable = isEditable
        self.feedingInstructions = feedingInstructions
        self.hasSpecialInstructions = hasSpecialInstructions
        self.onToggle = onToggle
        _localCompleted = State(initialValue: isCompleted)
    }

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.md) {
            // Checkbox (disabled if routine is not editable)
            Button {
                guard !isUpdating && isEditable else { return }
                isUpdating = true
                let newStatus = !localCompleted
                localCompleted = newStatus  // Optimistic update
                onToggle(newStatus)
                // Reset updating state after a delay (actual refresh will update the value)
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    isUpdating = false
                }
            } label: {
                Image(systemName: localCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(localCompleted ? .green : (isEditable ? .secondary : .secondary.opacity(0.5)))
                    .symbolEffect(.bounce, value: localCompleted)
            }
            .buttonStyle(.scale)
            .disabled(isUpdating || !isEditable)

            // Horse info
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(horseName)
                    .font(.body)
                    .strikethrough(localCompleted)
                    .foregroundStyle(localCompleted ? .secondary : .primary)

                Text(feedingInstructions)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Special instructions indicator
            if hasSpecialInstructions {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundStyle(.orange)
                    .symbolEffect(.pulse, options: .repeating)
            }

            // Loading indicator
            if isUpdating {
                ProgressView()
                    .scaleEffect(0.8)
            }
        }
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
        .onChange(of: isCompleted) { _, newValue in
            // Sync with parent state when refreshed
            localCompleted = newValue
        }
    }
}

// MARK: - Progress Ring

struct ProgressRing: View {
    let progress: Double
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(.quaternary, lineWidth: 3)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.smooth(duration: EquiDutyDesign.Animation.smooth), value: progress)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Placeholder Views

struct FeedingScheduleView: View {
    let stableId: String

    var body: some View {
        Text(String(localized: "feeding.schedule.title"))
            .navigationTitle(String(localized: "feeding.schedule.title"))
    }
}

struct FeedTypeListView: View {
    let stableId: String

    var body: some View {
        Text(String(localized: "feeding.feed_types.title"))
            .navigationTitle(String(localized: "feeding.feed_types.title"))
    }
}

#Preview {
    FeedingTodayView()
}
