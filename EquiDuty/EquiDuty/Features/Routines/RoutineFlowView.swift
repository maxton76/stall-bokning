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
                    errorMessage = "No stable selected"
                    isLoading = false
                    return
                }

                // Fetch the routine instance
                guard let fetchedInstance = try await routineService.getRoutineInstance(
                    instanceId: instanceId
                ) else {
                    errorMessage = "Routine not found"
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
                print("Failed to update progress: \(error)")
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
                print("Failed to update progress: \(error)")
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
                print("Failed to complete routine: \(error)")
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
        VStack(spacing: 12) {
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
            HStack(spacing: 4) {
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
        .background(Color(.secondarySystemBackground))
    }

    private var progress: Double {
        guard template.steps.count > 0 else { return 0 }
        return Double(currentStepIndex) / Double(template.steps.count)
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
    let onComplete: () -> Void
    let onSkip: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
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
                    StepHorseListView(step: step, instance: instance)
                }

                // Action buttons
                VStack(spacing: 12) {
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

    @State private var horses: [Horse] = []

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(String(localized: "routine.step.horses"))
                .font(.headline)
                .padding(.horizontal)

            if horses.isEmpty {
                EmptyStateView(
                    icon: "pawprint",
                    title: String(localized: "routine.step.no_horses"),
                    message: String(localized: "routine.step.no_horses.message")
                )
            } else {
                ForEach(horses) { horse in
                    StepHorseRow(
                        horse: horse,
                        step: step,
                        showFeeding: step.showFeeding == true,
                        showMedication: step.showMedication == true,
                        showSpecialInstructions: step.showSpecialInstructions == true
                    )
                }
            }
        }
    }
}

// MARK: - Step Horse Row

struct StepHorseRow: View {
    let horse: Horse
    let step: RoutineStep
    let showFeeding: Bool
    let showMedication: Bool
    let showSpecialInstructions: Bool

    @State private var isCompleted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Button {
                    isCompleted.toggle()
                } label: {
                    Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                        .font(.title2)
                        .foregroundStyle(isCompleted ? .green : .secondary)
                }

                HorseAvatarView(horse: horse, size: 40)

                VStack(alignment: .leading) {
                    Text(horse.name)
                        .font(.headline)
                        .strikethrough(isCompleted)

                    if let group = horse.horseGroupName {
                        Text(group)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if horse.hasSpecialInstructions == true {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundStyle(.orange)
                }
            }

            // Special instructions
            if showSpecialInstructions, let instructions = horse.specialInstructions {
                Text(instructions)
                    .font(.caption)
                    .foregroundStyle(.orange)
                    .padding(.leading, 56)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
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
        .background(Color(.secondarySystemBackground))
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
                VStack(alignment: .leading, spacing: 20) {
                    if let notes = dailyNotes {
                        // Alerts
                        if !notes.alerts.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text(String(localized: "daily_notes.alerts"))
                                    .font(.headline)

                                ForEach(notes.alerts) { alert in
                                    AlertCard(alert: alert)
                                }
                            }
                        }

                        // General notes
                        if let generalNotes = notes.generalNotes, !generalNotes.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(String(localized: "daily_notes.general"))
                                    .font(.headline)

                                Text(generalNotes)
                                    .font(.body)
                            }
                        }

                        // Horse notes
                        if !notes.horseNotes.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text(String(localized: "daily_notes.horse_notes"))
                                    .font(.headline)

                                ForEach(notes.horseNotes) { note in
                                    HorseNoteCard(note: note)
                                }
                            }
                        }
                    } else {
                        EmptyStateView(
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
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: alert.priority.icon)
                .foregroundStyle(Color(alert.priority.color))

            VStack(alignment: .leading, spacing: 4) {
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
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Horse Note Card

struct HorseNoteCard: View {
    let note: HorseDailyNote

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: note.priority.icon)
                .foregroundStyle(Color(note.priority.color))

            VStack(alignment: .leading, spacing: 4) {
                Text(note.horseName)
                    .font(.headline)

                Text(note.note)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    NavigationStack {
        RoutineFlowView(instanceId: "test-instance-id")
    }
}
