//
//  RoutineFlowView.swift
//  EquiDuty
//
//  Step-by-step routine execution view
//

import SwiftUI

struct RoutineFlowView: View {
    let instanceId: String

    @Environment(\.dismiss) private var dismiss

    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared

    @State private var instance: RoutineInstance?
    @State private var template: RoutineTemplate?
    @State private var dailyNotes: DailyNotes?
    @State private var currentStepIndex = 0
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showDailyNotesAcknowledgment = false
    @State private var showCompletionDialog = false
    @State private var stepErrorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ErrorView(message: errorMessage) {
                    loadData()
                }
            } else if let instance, let template {
                VStack(spacing: 0) {
                    // Progress header
                    RoutineProgressHeader(
                        instance: instance,
                        template: template,
                        currentStepIndex: currentStepIndex
                    )

                    // Step content
                    if currentStepIndex < template.steps.count {
                        let step = template.steps[currentStepIndex]
                        RoutineStepView(
                            step: step,
                            instance: instance,
                            dailyNotes: dailyNotes,
                            onComplete: { completeCurrentStep() },
                            onSkip: { skipCurrentStep() }
                        )
                    }

                    // Navigation footer
                    RoutineNavigationFooter(
                        currentStepIndex: currentStepIndex,
                        totalSteps: template.steps.count,
                        canGoBack: currentStepIndex > 0,
                        canGoForward: currentStepIndex < template.steps.count - 1,
                        onBack: { goToPreviousStep() },
                        onForward: { goToNextStep() },
                        onComplete: { showCompletionDialog = true }
                    )
                }
            }
        }
        .navigationTitle(instance?.templateName ?? String(localized: "routine.flow"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(String(localized: "common.close")) {
                    dismiss()
                }
            }
        }
        .sheet(isPresented: $showDailyNotesAcknowledgment) {
            DailyNotesAcknowledgmentView(
                dailyNotes: dailyNotes,
                onAcknowledge: {
                    acknowledgeDailyNotes()
                    showDailyNotesAcknowledgment = false
                }
            )
        }
        .alert(String(localized: "routine.complete.title"), isPresented: $showCompletionDialog) {
            Button(String(localized: "routine.complete.confirm")) {
                completeRoutine()
            }
            Button(String(localized: "common.cancel"), role: .cancel) {}
        } message: {
            Text(String(localized: "routine.complete.message"))
        }
        .alert(String(localized: "routine.step.error.title"), isPresented: .init(
            get: { stepErrorMessage != nil },
            set: { if !$0 { stepErrorMessage = nil } }
        )) {
            Button(String(localized: "common.ok"), role: .cancel) {
                stepErrorMessage = nil
            }
        } message: {
            Text(stepErrorMessage ?? "")
        }
        .onAppear {
            loadData()
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                guard let stableId = authService.selectedStable?.id,
                      let orgId = authService.selectedOrganization?.id else {
                    errorMessage = String(localized: "error.no_stable_selected")
                    isLoading = false
                    return
                }

                // Fetch the routine instance
                guard let fetchedInstance = try await routineService.getRoutineInstance(
                    instanceId: instanceId
                ) else {
                    errorMessage = String(localized: "error.routine_not_found")
                    isLoading = false
                    return
                }

                instance = fetchedInstance

                // Fetch templates to get the full step definitions
                let templates = try await routineService.getRoutineTemplates(organizationId: orgId)
                template = templates.first { $0.id == fetchedInstance.templateId }

                // Set current step index based on progress
                if let currentOrder = fetchedInstance.currentStepOrder {
                    currentStepIndex = max(0, currentOrder - 1)
                }

                // Fetch daily notes if not acknowledged
                if !fetchedInstance.dailyNotesAcknowledged {
                    dailyNotes = try await routineService.getDailyNotes(
                        stableId: stableId,
                        date: fetchedInstance.scheduledDate
                    )
                    // Show daily notes acknowledgment if there are notes
                    if dailyNotes != nil {
                        showDailyNotesAcknowledgment = true
                    }
                }

                // If routine hasn't started yet, start it
                if fetchedInstance.status == .scheduled {
                    try await routineService.startRoutineInstance(
                        instanceId: instanceId,
                        dailyNotesAcknowledged: dailyNotes == nil
                    )
                    // Refresh instance to get updated status
                    instance = try await routineService.getRoutineInstance(
                        instanceId: instanceId
                    )
                }

                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    // MARK: - Actions

    private func acknowledgeDailyNotes() {
        // Daily notes acknowledgment is handled server-side when starting routine
        // This is just UI state
    }

    private func completeCurrentStep() {
        guard let template,
              currentStepIndex < template.steps.count else { return }

        let step = template.steps[currentStepIndex]

        Task {
            do {
                try await routineService.updateRoutineProgress(
                    instanceId: instanceId,
                    stepId: step.id,
                    status: "completed",
                    generalNotes: nil,
                    photoUrls: nil,
                    horseUpdates: nil
                )
                goToNextStep()
            } catch {
                #if DEBUG
                print("Failed to update progress: \(error)")
                #endif
                stepErrorMessage = error.localizedDescription
                // Don't auto-advance on error - let user retry
            }
        }
    }

    private func skipCurrentStep() {
        guard let template,
              currentStepIndex < template.steps.count else { return }

        let step = template.steps[currentStepIndex]

        Task {
            do {
                try await routineService.updateRoutineProgress(
                    instanceId: instanceId,
                    stepId: step.id,
                    status: "skipped",
                    generalNotes: nil,
                    photoUrls: nil,
                    horseUpdates: nil
                )
                goToNextStep()
            } catch {
                #if DEBUG
                print("Failed to update progress: \(error)")
                #endif
                stepErrorMessage = error.localizedDescription
                // Don't auto-advance on error - let user retry
            }
        }
    }

    private func goToNextStep() {
        guard let template, currentStepIndex < template.steps.count - 1 else { return }
        withAnimation {
            currentStepIndex += 1
        }
    }

    private func goToPreviousStep() {
        guard currentStepIndex > 0 else { return }
        withAnimation {
            currentStepIndex -= 1
        }
    }

    private func completeRoutine() {
        Task {
            do {
                try await routineService.completeRoutineInstance(
                    instanceId: instanceId,
                    notes: nil
                )
                dismiss()
            } catch {
                #if DEBUG
                print("Failed to complete routine: \(error)")
                #endif
                stepErrorMessage = error.localizedDescription
                // Don't dismiss on error - let user retry
            }
        }
    }
}

// MARK: - Progress Header

struct RoutineProgressHeader: View {
    let instance: RoutineInstance
    let template: RoutineTemplate
    let currentStepIndex: Int

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.md) {
            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.secondary.opacity(0.2))

                    Rectangle()
                        .fill(Color.accentColor)
                        .frame(width: geometry.size.width * progress)
                }
            }
            .frame(height: 4)

            // Step indicators
            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                ForEach(0..<template.steps.count, id: \.self) { index in
                    Circle()
                        .fill(stepColor(for: index))
                        .frame(width: 8, height: 8)
                }
            }

            // Current step info
            if currentStepIndex < template.steps.count {
                let step = template.steps[currentStepIndex]
                Text(String(localized: "routine.step_of \(currentStepIndex + 1) \(template.steps.count)"))
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(step.name)
                    .font(.headline)
            }
        }
        .padding()
        .glassNavigation()
    }

    private var progress: Double {
        guard template.steps.count > 0 else { return 0 }
        return Double(currentStepIndex + 1) / Double(template.steps.count)
    }

    private func stepColor(for index: Int) -> Color {
        if index < currentStepIndex {
            return .green
        } else if index == currentStepIndex {
            return .accentColor
        }
        return .secondary.opacity(0.3)
    }
}

// MARK: - Step View

struct RoutineStepView: View {
    let step: RoutineStep
    let instance: RoutineInstance
    let dailyNotes: DailyNotes?
    let onComplete: () -> Void
    let onSkip: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.lg) {
                // Step description
                if let description = step.description {
                    Text(description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal)
                }

                // Category icon
                HStack {
                    Spacer()
                    Image(systemName: step.displayIcon)
                        .font(.system(size: 60))
                        .foregroundStyle(Color.accentColor.opacity(0.5))
                    Spacer()
                }
                .padding()

                // Horse list (if applicable)
                if step.horseContext != .none {
                    StepHorseListView(step: step, instance: instance, dailyNotes: dailyNotes)
                }

                // Action buttons
                VStack(spacing: EquiDutyDesign.Spacing.md) {
                    Button(action: onComplete) {
                        Text(String(localized: "routine.step.complete"))
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                    }
                    .buttonStyle(.borderedProminent)

                    if step.requiresConfirmation == false {
                        Button(action: onSkip) {
                            Text(String(localized: "routine.step.skip"))
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding()
            }
        }
    }
}

// MARK: - Step Horse List

struct StepHorseListView: View {
    let step: RoutineStep
    let instance: RoutineInstance
    let dailyNotes: DailyNotes?

    @State private var routineService = RoutineService.shared

    @State private var horses: [Horse] = []
    @State private var feedingInfoMap: [String: FeedingInfoForCard] = [:]
    @State private var horseProgressMap: [String: HorseStepProgress] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Text(String(localized: "routine.step.horses"))
                .font(.headline)
                .padding(.horizontal)

            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let error = errorMessage {
                VStack(spacing: EquiDutyDesign.Spacing.sm) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.title)
                        .foregroundStyle(.red)
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else if horses.isEmpty {
                ModernEmptyStateView(
                    icon: "pawprint",
                    title: String(localized: "routine.step.no_horses"),
                    message: String(localized: "routine.step.no_horses.message")
                )
            } else {
                ForEach(horses) { horse in
                    let progress = horseProgressMap[horse.id]
                    StepHorseRow(
                        horse: horse,
                        step: step,
                        feedingInfo: feedingInfoMap[horse.id],
                        medicationInfo: nil, // TODO: Load from horse data when available
                        blanketInfo: nil, // TODO: Load from horse data when available
                        categoryNotes: categorySpecificNotes(for: horse.id),
                        generalNotes: generalNotes(for: horse.id),
                        horseAlerts: horseAlerts(for: horse.id),
                        isCompleted: progress?.completed ?? false,
                        isSkipped: progress?.skipped ?? false,
                        savedNotes: progress?.notes,
                        skipReason: progress?.skipReason,
                        onMarkDone: { notes in
                            Task {
                                await handleMarkDone(
                                    horseId: horse.id,
                                    horseName: horse.name,
                                    notes: notes
                                )
                            }
                        },
                        onSkip: { reason in
                            Task {
                                await handleSkip(
                                    horseId: horse.id,
                                    horseName: horse.name,
                                    reason: reason
                                )
                            }
                        },
                        onMedicationConfirm: { given, skipReason in
                            Task {
                                await handleMedicationConfirm(
                                    horseId: horse.id,
                                    horseName: horse.name,
                                    given: given,
                                    skipReason: skipReason
                                )
                            }
                        },
                        onBlanketAction: { action in
                            Task {
                                await handleBlanketAction(
                                    horseId: horse.id,
                                    horseName: horse.name,
                                    action: action
                                )
                            }
                        }
                    )
                }
            }
        }
        .task {
            await loadData()
        }
        .onChange(of: step.id) { _, _ in
            // Reload data when navigating to a different step
            Task {
                isLoading = true
                errorMessage = nil
                feedingInfoMap = [:]
                horseProgressMap = [:]
                await loadData()
            }
        }
    }

    // MARK: - Data Loading

    private func loadData() async {
        // Skip loading for steps with no horse context
        guard step.horseContext != .none else {
            isLoading = false
            return
        }

        let stableId = instance.stableId

        do {
            // Load horses first
            horses = try await resolveStepHorses(step: step, stableId: stableId)

            // Load feeding data if this step shows feeding info
            if step.showFeeding == true {
                await loadFeedingData(stableId: stableId)
            }

            // Load horse progress from instance progress
            loadHorseProgress()

            isLoading = false
        } catch {
            #if DEBUG
            print("Failed to load data for step '\(step.name)': \(error)")
            #endif
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    private func loadHorseProgress() {
        // Get step progress from instance
        if let stepProgress = instance.progress.stepProgress[step.id],
           let horseProgress = stepProgress.horseProgress {
            horseProgressMap = horseProgress
        } else {
            horseProgressMap = [:]
        }
    }

    private func loadFeedingData(stableId: String) async {
        do {
            let feedings = try await FeedingService.shared.getHorseFeedings(
                stableId: stableId,
                feedingTimeId: step.feedingTimeId,
                forDate: instance.scheduledDate
            )
            feedingInfoMap = transformHorseFeedingsToMap(feedings)
        } catch {
            #if DEBUG
            print("Failed to load feeding data: \(error)")
            #endif
            // Don't fail the whole view if feeding data fails to load
        }
    }

    // MARK: - Context Helpers

    /// Get ALL horse-specific notes from daily notes
    private func allHorseNotes(for horseId: String) -> [HorseDailyNote] {
        dailyNotes?.horseNotes.filter { $0.horseId == horseId } ?? []
    }

    /// Get notes that match the current step's category
    private func categorySpecificNotes(for horseId: String) -> [HorseDailyNote] {
        let notes = allHorseNotes(for: horseId)
        guard let noteCategory = step.category.dailyNoteCategory else { return [] }
        return notes.filter { $0.noteCategory == noteCategory }
    }

    /// Get notes that don't match the current step's category (general/other notes)
    private func generalNotes(for horseId: String) -> [HorseDailyNote] {
        let notes = allHorseNotes(for: horseId)

        // If step has no associated note category, show all notes
        guard let noteCategory = step.category.dailyNoteCategory else {
            return notes
        }

        // Otherwise, show notes that DON'T match the step category (they'll be shown in their own section)
        return notes.filter { $0.noteCategory != noteCategory }
    }

    /// Get alerts that affect this horse
    private func horseAlerts(for horseId: String) -> [DailyAlert] {
        guard let alerts = dailyNotes?.alerts else { return [] }
        return alerts.filter { alert in
            // Include alert if it has no specific horses (general alert) or includes this horse
            guard let affectedIds = alert.affectedHorseIds else { return true }
            return affectedIds.contains(horseId)
        }
    }

    // MARK: - Action Handlers

    private func handleMarkDone(
        horseId: String,
        horseName: String,
        notes: String?
    ) async {
        #if DEBUG
        print("📝 handleMarkDone called - horseId: \(horseId), notes: \(notes ?? "nil")")
        #endif
        do {
            try await routineService.updateRoutineProgress(
                instanceId: instance.id,
                stepId: step.id,
                status: nil,
                generalNotes: nil,
                photoUrls: nil,
                horseUpdates: [
                    HorseProgressUpdate(
                        horseId: horseId,
                        horseName: horseName,
                        completed: true,
                        skipped: nil,
                        skipReason: nil,
                        notes: notes,
                        feedingConfirmed: step.showFeeding == true ? true : nil,
                        medicationGiven: nil,
                        medicationSkipped: nil,
                        blanketAction: nil,
                        photoUrls: nil
                    )
                ]
            )
            // Update local state
            var progress = horseProgressMap[horseId] ?? HorseStepProgress(
                horseId: horseId,
                horseName: horseName,
                completed: false,
                skipped: false,
                skipReason: nil,
                notes: nil,
                photoUrls: nil,
                feedingConfirmed: nil,
                medicationGiven: nil,
                medicationSkipped: nil,
                blanketAction: nil,
                completedAt: nil,
                completedBy: nil
            )
            progress.completed = true
            progress.notes = notes
            progress.completedAt = Date()
            horseProgressMap[horseId] = progress
        } catch {
            #if DEBUG
            print("Failed to mark horse as done: \(error)")
            #endif
        }
    }

    private func handleSkip(
        horseId: String,
        horseName: String,
        reason: String
    ) async {
        do {
            try await routineService.updateRoutineProgress(
                instanceId: instance.id,
                stepId: step.id,
                status: nil,
                generalNotes: nil,
                photoUrls: nil,
                horseUpdates: [
                    HorseProgressUpdate(
                        horseId: horseId,
                        horseName: horseName,
                        completed: nil,
                        skipped: true,
                        skipReason: reason,
                        notes: nil,
                        feedingConfirmed: nil,
                        medicationGiven: nil,
                        medicationSkipped: nil,
                        blanketAction: nil,
                        photoUrls: nil
                    )
                ]
            )
            // Update local state
            var progress = horseProgressMap[horseId] ?? HorseStepProgress(
                horseId: horseId,
                horseName: horseName,
                completed: false,
                skipped: false,
                skipReason: nil,
                notes: nil,
                photoUrls: nil,
                feedingConfirmed: nil,
                medicationGiven: nil,
                medicationSkipped: nil,
                blanketAction: nil,
                completedAt: nil,
                completedBy: nil
            )
            progress.skipped = true
            progress.skipReason = reason
            horseProgressMap[horseId] = progress
        } catch {
            #if DEBUG
            print("Failed to skip horse: \(error)")
            #endif
        }
    }

    private func handleMedicationConfirm(
        horseId: String,
        horseName: String,
        given: Bool,
        skipReason: String?
    ) async {
        do {
            try await routineService.updateRoutineProgress(
                instanceId: instance.id,
                stepId: step.id,
                status: nil,
                generalNotes: nil,
                photoUrls: nil,
                horseUpdates: [
                    HorseProgressUpdate(
                        horseId: horseId,
                        horseName: horseName,
                        completed: nil,
                        skipped: nil,
                        skipReason: nil,
                        notes: nil,
                        feedingConfirmed: nil,
                        medicationGiven: given ? true : nil,
                        medicationSkipped: given ? nil : true,
                        blanketAction: nil,
                        photoUrls: nil
                    )
                ]
            )
        } catch {
            #if DEBUG
            print("Failed to update medication status: \(error)")
            #endif
        }
    }

    private func handleBlanketAction(
        horseId: String,
        horseName: String,
        action: BlanketAction
    ) async {
        do {
            try await routineService.updateRoutineProgress(
                instanceId: instance.id,
                stepId: step.id,
                status: nil,
                generalNotes: nil,
                photoUrls: nil,
                horseUpdates: [
                    HorseProgressUpdate(
                        horseId: horseId,
                        horseName: horseName,
                        completed: nil,
                        skipped: nil,
                        skipReason: nil,
                        notes: nil,
                        feedingConfirmed: nil,
                        medicationGiven: nil,
                        medicationSkipped: nil,
                        blanketAction: action,
                        photoUrls: nil
                    )
                ]
            )
        } catch {
            #if DEBUG
            print("Failed to update blanket action: \(error)")
            #endif
        }
    }
}

// MARK: - Step Horse Row

struct StepHorseRow: View {
    let horse: Horse
    let step: RoutineStep

    // Context data
    let feedingInfo: FeedingInfoForCard?
    let medicationInfo: HorseMedicationContext?
    let blanketInfo: HorseBlanketContext?
    let categoryNotes: [HorseDailyNote]  // Notes matching step category (e.g., feeding notes for feeding step)
    let generalNotes: [HorseDailyNote]   // Notes NOT matching step category
    let horseAlerts: [DailyAlert]

    // Completion status from progress
    let isCompleted: Bool
    let isSkipped: Bool
    let savedNotes: String?
    let skipReason: String?

    // Action callbacks
    var onMarkDone: ((String?) -> Void)?  // (notes) -> mark as done
    var onSkip: ((String) -> Void)?        // (reason) -> skip
    var onMedicationConfirm: ((Bool, String?) -> Void)?
    var onBlanketAction: ((BlanketAction) -> Void)?

    @State private var isExpanded = false
    @State private var showSkipReasonSheet = false
    @State private var showMedicationSkipSheet = false
    @State private var noteText = ""
    @State private var skipReasonText = ""

    /// Check if we have any notes to show
    private var hasAnyNotes: Bool {
        !categoryNotes.isEmpty || !generalNotes.isEmpty
    }

    /// Get highest priority from all notes
    private var highestNotePriority: NotePriority {
        let allNotes = categoryNotes + generalNotes
        if allNotes.contains(where: { $0.priority == .critical }) { return .critical }
        if allNotes.contains(where: { $0.priority == .warning }) { return .warning }
        return .info
    }

    /// Whether this horse is done (either completed or skipped)
    private var isDone: Bool {
        isCompleted || isSkipped
    }

    /// Check if there's any expandable content
    private var hasExpandableContent: Bool {
        hasAnyNotes ||
        (step.showFeeding == true && (feedingInfo != nil || !categoryNotes.filter { $0.noteCategory == .feeding }.isEmpty)) ||
        (step.showMedication == true && (medicationInfo != nil || !categoryNotes.filter { $0.noteCategory == .medication }.isEmpty)) ||
        (step.showBlanketStatus == true && (blanketInfo != nil || !categoryNotes.filter { $0.noteCategory == .blanket }.isEmpty)) ||
        (step.category == .healthCheck && !categoryNotes.filter { $0.noteCategory == .health }.isEmpty) ||
        (step.showSpecialInstructions == true && horse.specialInstructions != nil)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header row - always visible
            HStack {
                // Status indicator circle
                statusIndicator

                HorseAvatarView(horse: horse, size: 40)

                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs / 2) {
                    HStack(spacing: EquiDutyDesign.Spacing.xs) {
                        Text(horse.name)
                            .font(.headline)
                            .strikethrough(isDone)
                            .foregroundStyle(isDone ? .secondary : .primary)

                        // Alert badge
                        if !horseAlerts.isEmpty {
                            HorseAlertBadge(alerts: horseAlerts)
                        }

                        // Notes indicator badge
                        if hasAnyNotes {
                            HorseNotesBadge(priority: highestNotePriority, count: categoryNotes.count + generalNotes.count)
                        }
                    }

                    // Show skip reason or saved notes when collapsed
                    if isSkipped, let reason = skipReason, !reason.isEmpty {
                        Text("\(String(localized: "routine.horse.skipReason")): \(reason)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else if isCompleted, let notes = savedNotes, !notes.isEmpty {
                        Text(notes)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    } else if let group = horse.horseGroupName {
                        Text(group)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Expand/collapse button
                if hasExpandableContent || !isDone {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            isExpanded.toggle()
                        }
                    } label: {
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 32, height: 32)
                    }
                }
            }
            .padding()
            .contentShape(Rectangle())
            .onTapGesture {
                if hasExpandableContent || !isDone {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                }
            }

            // Collapsed action buttons (shown when NOT expanded and NOT done)
            if !isExpanded && !isDone {
                collapsedActionButtons
            }

            // Expanded content
            if isExpanded {
                expandedContent
            }
        }
        .background(cardBackground)
        .continuousCorners(EquiDutyDesign.CornerRadius.card)
        .overlay(
            RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card, style: .continuous)
                .stroke(cardBorderColor, lineWidth: isDone ? 0 : 1)
        )
        .shadow(
            color: EquiDutyDesign.Shadow.standard.color,
            radius: EquiDutyDesign.Shadow.standard.radius,
            y: EquiDutyDesign.Shadow.standard.y
        )
        .padding(.horizontal)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(horse.name), \(isDone ? (isCompleted ? String(localized: "routine.status.completed") : String(localized: "routine.status.skipped")) : String(localized: "routine.status.pending"))")
        .sheet(isPresented: $showSkipReasonSheet) {
            HorseSkipReasonSheet(
                horseName: horse.name,
                skipReason: $skipReasonText,
                onConfirm: {
                    onSkip?(skipReasonText.isEmpty ? String(localized: "routine.horse.noReason") : skipReasonText)
                    skipReasonText = ""
                    showSkipReasonSheet = false
                },
                onCancel: {
                    skipReasonText = ""
                    showSkipReasonSheet = false
                }
            )
        }
        .sheet(isPresented: $showMedicationSkipSheet) {
            MedicationSkipReasonSheet(
                skipReason: $skipReasonText,
                onConfirm: {
                    onMedicationConfirm?(false, skipReasonText.isEmpty ? nil : skipReasonText)
                    skipReasonText = ""
                    showMedicationSkipSheet = false
                },
                onCancel: {
                    skipReasonText = ""
                    showMedicationSkipSheet = false
                }
            )
        }
    }

    // MARK: - Status Indicator

    @ViewBuilder
    private var statusIndicator: some View {
        ZStack {
            Circle()
                .fill(statusBackgroundColor)
                .frame(width: 36, height: 36)

            if isCompleted {
                Image(systemName: "checkmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.green)
            } else if isSkipped {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.gray)
            } else {
                Text(String(horse.name.prefix(1)))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.blue)
            }
        }
    }

    private var statusBackgroundColor: Color {
        if isCompleted {
            return Color.green.opacity(0.15)
        } else if isSkipped {
            return Color.gray.opacity(0.15)
        }
        return Color.blue.opacity(0.15)
    }

    private var cardBackground: some ShapeStyle {
        if isCompleted {
            return AnyShapeStyle(Color.green.opacity(0.05))
        } else if isSkipped {
            return AnyShapeStyle(Color.gray.opacity(0.05))
        }
        return AnyShapeStyle(.ultraThinMaterial)
    }

    private var cardBorderColor: Color {
        if !horseAlerts.isEmpty {
            if horseAlerts.contains(where: { $0.priority == .critical }) {
                return .red.opacity(0.5)
            } else if horseAlerts.contains(where: { $0.priority == .warning }) {
                return .yellow.opacity(0.5)
            }
        }
        return .clear
    }

    // MARK: - Collapsed Action Buttons

    @ViewBuilder
    private var collapsedActionButtons: some View {
        HorseActionButtonsRow(
            isExpanded: false,
            onDone: {
                onMarkDone?(noteText.isEmpty ? nil : noteText)
                noteText = ""
            },
            onSkip: {
                showSkipReasonSheet = true
            }
        )
        .padding(.horizontal)
        .padding(.bottom, EquiDutyDesign.Spacing.md)
    }

    // MARK: - Expanded Content

    @ViewBuilder
    private var expandedContent: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Divider()
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                // General notes section (notes NOT matching the step category)
                if !generalNotes.isEmpty {
                    HorseGeneralNotesSection(notes: generalNotes)
                }

                // Feeding info section with category-specific notes
                if step.showFeeding == true {
                    let feedingNotes = categoryNotes.filter { $0.noteCategory == .feeding }
                    if let feeding = feedingInfo {
                        HorseFeedingInfoSection(feedingInfo: feeding, categoryNotes: feedingNotes)
                    } else if !feedingNotes.isEmpty {
                        HorseCategoryNotesSection(category: .feeding, notes: feedingNotes)
                    }
                }

                // Medication section with category-specific notes
                if step.showMedication == true {
                    let medicationNotes = categoryNotes.filter { $0.noteCategory == .medication }
                    if let medication = medicationInfo {
                        HorseMedicationSection(
                            medicationInfo: medication,
                            categoryNotes: medicationNotes,
                            onGiven: { onMedicationConfirm?(true, nil) },
                            onSkip: { showMedicationSkipSheet = true }
                        )
                    } else if !medicationNotes.isEmpty {
                        HorseCategoryNotesSection(category: .medication, notes: medicationNotes)
                    }
                }

                // Blanket section with category-specific notes
                if step.showBlanketStatus == true {
                    let blanketNotes = categoryNotes.filter { $0.noteCategory == .blanket }
                    if let blanket = blanketInfo {
                        HorseBlanketSection(
                            blanketInfo: blanket,
                            categoryNotes: blanketNotes,
                            onAction: { action in onBlanketAction?(action) }
                        )
                    } else if !blanketNotes.isEmpty {
                        HorseCategoryNotesSection(category: .blanket, notes: blanketNotes)
                    }
                }

                // Health notes for health check steps
                if step.category == .healthCheck {
                    let healthNotes = categoryNotes.filter { $0.noteCategory == .health }
                    if !healthNotes.isEmpty {
                        HorseCategoryNotesSection(category: .health, notes: healthNotes)
                    }
                }

                // Special instructions
                if step.showSpecialInstructions == true, let instructions = horse.specialInstructions {
                    HorseSpecialInstructionsSection(instructions: instructions)
                }

                // Saved notes display (when completed)
                if isDone, let notes = savedNotes, !notes.isEmpty {
                    HorseSavedNotesSection(notes: notes)
                }

                // Notes input and action buttons (when not done)
                if !isDone {
                    VStack(spacing: EquiDutyDesign.Spacing.md) {
                        // Notes input
                        TextField(String(localized: "routine.horse.addNote"), text: $noteText)
                            .textFieldStyle(.roundedBorder)

                        // Action buttons
                        HorseActionButtonsRow(
                            isExpanded: true,
                            onDone: {
                                onMarkDone?(noteText.isEmpty ? nil : noteText)
                                noteText = ""
                            },
                            onSkip: {
                                showSkipReasonSheet = true
                            }
                        )
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, EquiDutyDesign.Spacing.standard)
        }
    }
}

// MARK: - Horse Saved Notes Section

struct HorseSavedNotesSection: View {
    let notes: String

    var body: some View {
        HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.sm) {
            Image(systemName: "note.text")
                .font(.caption)
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs / 2) {
                Text(String(localized: "routine.horse.note"))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.blue)

                Text(notes)
                    .font(.caption)
                    .foregroundStyle(.primary)
            }
        }
        .padding(EquiDutyDesign.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.blue.opacity(0.1))
        .continuousCorners(EquiDutyDesign.CornerRadius.small)
    }
}

// MARK: - Horse Skip Reason Sheet

struct HorseSkipReasonSheet: View {
    let horseName: String
    @Binding var skipReason: String
    let onConfirm: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: EquiDutyDesign.Spacing.lg) {
                Text(String(localized: "routine.horse.skipReasonPrompt"))
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                TextField(String(localized: "routine.horse.skipReason"), text: $skipReason)
                    .textFieldStyle(.roundedBorder)

                Spacer()
            }
            .padding()
            .navigationTitle("\(String(localized: "routine.horse.skip")) - \(horseName)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel"), action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "routine.horse.skip"), action: onConfirm)
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Horse Alert Badge

struct HorseAlertBadge: View {
    let alerts: [DailyAlert]

    private var highestPriority: NotePriority {
        if alerts.contains(where: { $0.priority == .critical }) { return .critical }
        if alerts.contains(where: { $0.priority == .warning }) { return .warning }
        return .info
    }

    var body: some View {
        Image(systemName: "exclamationmark.triangle.fill")
            .font(.caption)
            .foregroundStyle(Color(highestPriority.color))
    }
}

// MARK: - Horse Notes Badge

struct HorseNotesBadge: View {
    let priority: NotePriority
    let count: Int

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.xs / 2) {
            Image(systemName: "note.text")
                .font(.caption2)
            if count > 1 {
                Text("\(count)")
                    .font(.caption2)
            }
        }
        .foregroundStyle(Color(priority.color))
    }
}

// MARK: - Horse General Notes Section

/// Displays notes that don't match the current step's category
struct HorseGeneralNotesSection: View {
    let notes: [HorseDailyNote]

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            ForEach(notes) { note in
                HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.sm) {
                    Image(systemName: note.noteCategory.icon)
                        .font(.caption)
                        .foregroundStyle(Color(note.priority.color))

                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs / 2) {
                        Text(note.noteCategory.displayName)
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundStyle(Color(note.priority.color))

                        Text(note.note)
                            .font(.caption)
                            .foregroundStyle(.primary)
                    }
                }
                .padding(EquiDutyDesign.Spacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(note.priority.color).opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous)
                        .stroke(Color(note.priority.color).opacity(0.3), lineWidth: 1)
                )
                .continuousCorners(EquiDutyDesign.CornerRadius.small)
            }
        }
    }
}

// MARK: - Horse Category Notes Section

/// Displays notes for a specific category (used when the section data isn't available)
struct HorseCategoryNotesSection: View {
    let category: DailyNoteCategory
    let notes: [HorseDailyNote]

    private var categoryColor: Color {
        switch category {
        case .feeding: return .orange
        case .medication: return .pink
        case .blanket: return .blue
        case .health: return .red
        case .behavior: return .yellow
        case .other: return .gray
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Image(systemName: category.icon)
                    .font(.caption)
                    .foregroundStyle(categoryColor)

                Text(category.displayName)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(categoryColor)
            }

            ForEach(notes) { note in
                HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.sm) {
                    Image(systemName: note.priority.icon)
                        .font(.caption2)
                        .foregroundStyle(Color(note.priority.color))

                    Text(note.note)
                        .font(.caption)
                        .foregroundStyle(.primary)
                }
            }
        }
        .padding(EquiDutyDesign.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(categoryColor.opacity(0.1))
        .continuousCorners(EquiDutyDesign.CornerRadius.small)
    }
}

// MARK: - Horse Feeding Info Section

struct HorseFeedingInfoSection: View {
    let feedingInfo: FeedingInfoForCard
    var categoryNotes: [HorseDailyNote] = []

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Image(systemName: "leaf.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)

                Text(String(localized: "routine.horse.feeding"))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.orange)
            }

            // Primary feed
            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                Text(feedingInfo.feedType)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("•")
                    .foregroundStyle(.secondary)

                Text(feedingInfo.quantity)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Supplements
            if let supplements = feedingInfo.supplements, !supplements.isEmpty {
                HStack(spacing: EquiDutyDesign.Spacing.xs) {
                    Text("+ " + String(localized: "routine.horse.supplements") + ":")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(supplements.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Category-specific notes (feeding notes)
            if !categoryNotes.isEmpty {
                Divider()
                    .padding(.vertical, 2)

                ForEach(categoryNotes) { note in
                    HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.sm) {
                        Image(systemName: note.priority.icon)
                            .font(.caption2)
                            .foregroundStyle(Color(note.priority.color))

                        Text(note.note)
                            .font(.caption)
                            .foregroundStyle(.primary)
                    }
                }
            }
        }
        .padding(EquiDutyDesign.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.1))
        .continuousCorners(EquiDutyDesign.CornerRadius.small)
    }
}

// MARK: - Horse Medication Section

struct HorseMedicationSection: View {
    let medicationInfo: HorseMedicationContext
    var categoryNotes: [HorseDailyNote] = []
    let onGiven: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Image(systemName: "pills.fill")
                    .font(.caption)
                    .foregroundStyle(.pink)

                Text(String(localized: "routine.horse.medication"))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.pink)

                if medicationInfo.isRequired {
                    Text(String(localized: "routine.horse.medication.required"))
                        .font(.caption2)
                        .fontWeight(.medium)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.red.opacity(0.2))
                        .foregroundStyle(.red)
                        .clipShape(Capsule())
                }
            }

            // Medication details
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs / 2) {
                Text("\(medicationInfo.medicationName) - \(medicationInfo.dosage)")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(medicationInfo.administrationMethod)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let notes = medicationInfo.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .italic()
                }
            }

            // Category-specific notes (medication notes)
            if !categoryNotes.isEmpty {
                Divider()
                    .padding(.vertical, 2)

                ForEach(categoryNotes) { note in
                    HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.sm) {
                        Image(systemName: note.priority.icon)
                            .font(.caption2)
                            .foregroundStyle(Color(note.priority.color))

                        Text(note.note)
                            .font(.caption)
                            .foregroundStyle(.primary)
                    }
                }
            }

            // Action buttons
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Button(action: onGiven) {
                    HStack(spacing: EquiDutyDesign.Spacing.xs) {
                        Image(systemName: "checkmark")
                        Text(String(localized: "routine.horse.medication.given"))
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, EquiDutyDesign.Spacing.md)
                    .padding(.vertical, EquiDutyDesign.Spacing.sm)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)

                Button(action: onSkip) {
                    HStack(spacing: EquiDutyDesign.Spacing.xs) {
                        Image(systemName: "xmark")
                        Text(String(localized: "routine.horse.medication.skip"))
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, EquiDutyDesign.Spacing.md)
                    .padding(.vertical, EquiDutyDesign.Spacing.sm)
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(EquiDutyDesign.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.pink.opacity(0.1))
        .continuousCorners(EquiDutyDesign.CornerRadius.small)
    }
}

// MARK: - Medication Skip Reason Sheet

struct MedicationSkipReasonSheet: View {
    @Binding var skipReason: String
    let onConfirm: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: EquiDutyDesign.Spacing.lg) {
                Text(String(localized: "routine.horse.medication.skipReason"))
                    .font(.headline)

                TextField(String(localized: "routine.horse.medication.skipReason"), text: $skipReason)
                    .textFieldStyle(.roundedBorder)

                Spacer()
            }
            .padding()
            .navigationTitle(String(localized: "routine.horse.medication.skip"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel"), action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.confirm"), action: onConfirm)
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Horse Blanket Section

struct HorseBlanketSection: View {
    let blanketInfo: HorseBlanketContext
    var categoryNotes: [HorseDailyNote] = []
    let onAction: (BlanketAction) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Image(systemName: "cloud.snow.fill")
                    .font(.caption)
                    .foregroundStyle(.blue)

                Text(String(localized: "routine.horse.blanket"))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.blue)
            }

            // Current status
            if let current = blanketInfo.currentBlanket {
                HStack(spacing: EquiDutyDesign.Spacing.xs) {
                    Text(String(localized: "routine.horse.blanket.current") + ":")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(current)
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }

            // Recommended action
            if let target = blanketInfo.targetBlanket {
                HStack(spacing: EquiDutyDesign.Spacing.xs) {
                    Text("→")
                        .foregroundStyle(.secondary)

                    Text(target)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            if let reason = blanketInfo.reason {
                Text(reason)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
            }

            // Category-specific notes (blanket notes)
            if !categoryNotes.isEmpty {
                Divider()
                    .padding(.vertical, 2)

                ForEach(categoryNotes) { note in
                    HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.sm) {
                        Image(systemName: note.priority.icon)
                            .font(.caption2)
                            .foregroundStyle(Color(note.priority.color))

                        Text(note.note)
                            .font(.caption)
                            .foregroundStyle(.primary)
                    }
                }
            }

            // Action buttons
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Button {
                    onAction(.on)
                } label: {
                    Text(String(localized: "routine.horse.blanket.on"))
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, EquiDutyDesign.Spacing.md)
                        .padding(.vertical, EquiDutyDesign.Spacing.sm)
                }
                .buttonStyle(.bordered)

                Button {
                    onAction(.off)
                } label: {
                    Text(String(localized: "routine.horse.blanket.off"))
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, EquiDutyDesign.Spacing.md)
                        .padding(.vertical, EquiDutyDesign.Spacing.sm)
                }
                .buttonStyle(.bordered)

                Button {
                    onAction(.unchanged)
                } label: {
                    Text(String(localized: "routine.horse.blanket.unchanged"))
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, EquiDutyDesign.Spacing.md)
                        .padding(.vertical, EquiDutyDesign.Spacing.sm)
                }
                .buttonStyle(.bordered)
                .tint(.secondary)
            }
        }
        .padding(EquiDutyDesign.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.blue.opacity(0.1))
        .continuousCorners(EquiDutyDesign.CornerRadius.small)
    }
}

// MARK: - Horse Special Instructions Section

struct HorseSpecialInstructionsSection: View {
    let instructions: String

    var body: some View {
        HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.sm) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.orange)

            Text(instructions)
                .font(.caption)
                .foregroundStyle(.orange)
        }
        .padding(EquiDutyDesign.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.05))
        .continuousCorners(EquiDutyDesign.CornerRadius.small)
    }
}

// MARK: - Navigation Footer

struct RoutineNavigationFooter: View {
    let currentStepIndex: Int
    let totalSteps: Int
    let canGoBack: Bool
    let canGoForward: Bool
    let onBack: () -> Void
    let onForward: () -> Void
    let onComplete: () -> Void

    var body: some View {
        HStack {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.title2)
            }
            .disabled(!canGoBack)
            .opacity(canGoBack ? 1 : 0.3)

            Spacer()

            if currentStepIndex == totalSteps - 1 {
                Button(String(localized: "routine.finish"), action: onComplete)
                    .buttonStyle(.borderedProminent)
            } else {
                Button(action: onForward) {
                    Image(systemName: "chevron.right")
                        .font(.title2)
                }
                .disabled(!canGoForward)
                .opacity(canGoForward ? 1 : 0.3)
            }
        }
        .padding()
        .glassNavigation()
    }
}

// MARK: - Daily Notes Acknowledgment

struct DailyNotesAcknowledgmentView: View {
    let dailyNotes: DailyNotes?
    let onAcknowledge: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.lg) {
                    if let notes = dailyNotes {
                        // Alerts
                        if !notes.alerts.isEmpty {
                            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                                Text(String(localized: "daily_notes.alerts"))
                                    .font(.headline)

                                ForEach(notes.alerts) { alert in
                                    AlertCard(alert: alert)
                                }
                            }
                        }

                        // General notes
                        if let generalNotes = notes.generalNotes, !generalNotes.isEmpty {
                            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                                Text(String(localized: "daily_notes.general"))
                                    .font(.headline)

                                Text(generalNotes)
                                    .font(.body)
                            }
                        }

                        // Horse notes
                        if !notes.horseNotes.isEmpty {
                            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                                Text(String(localized: "daily_notes.horse_notes"))
                                    .font(.headline)

                                ForEach(notes.horseNotes) { note in
                                    HorseNoteCard(note: note)
                                }
                            }
                        }
                    } else {
                        ModernEmptyStateView(
                            icon: "note.text",
                            title: String(localized: "daily_notes.empty"),
                            message: String(localized: "daily_notes.empty.message")
                        )
                    }
                }
                .padding()
            }
            .navigationTitle(String(localized: "daily_notes.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.close")) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "daily_notes.acknowledge")) {
                        onAcknowledge()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

// MARK: - Alert Card

struct AlertCard: View {
    let alert: DailyAlert

    var body: some View {
        HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.md) {
            Image(systemName: alert.priority.icon)
                .foregroundStyle(Color(alert.priority.color))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(alert.title)
                    .font(.headline)

                Text(alert.message)
                    .font(.body)
                    .foregroundStyle(.secondary)

                if let horses = alert.affectedHorseNames, !horses.isEmpty {
                    Text(horses.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(alert.priority.color).opacity(0.1))
        .continuousCorners(EquiDutyDesign.CornerRadius.card)
        .shadow(
            color: EquiDutyDesign.Shadow.subtle.color,
            radius: EquiDutyDesign.Shadow.subtle.radius,
            y: EquiDutyDesign.Shadow.subtle.y
        )
    }
}

// MARK: - Horse Note Card

struct HorseNoteCard: View {
    let note: HorseDailyNote

    var body: some View {
        HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.md) {
            Image(systemName: note.priority.icon)
                .foregroundStyle(Color(note.priority.color))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(note.horseName)
                    .font(.headline)

                Text(note.note)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
        }
        .contentCard()
    }
}

#Preview {
    NavigationStack {
        RoutineFlowView(instanceId: "test-instance-id")
    }
}
