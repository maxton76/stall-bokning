//
//  CreateSelectionProcessView.swift
//  EquiDuty
//
//  4-step wizard for creating a new selection process
//

import SwiftUI

struct CreateSelectionProcessView: View {
    let stableId: String
    let organizationId: String
    let onCreated: () -> Void

    @State private var viewModel: CreateSelectionProcessViewModel
    @Environment(\.dismiss) private var dismiss

    init(stableId: String, organizationId: String, onCreated: @escaping () -> Void) {
        self.stableId = stableId
        self.organizationId = organizationId
        self.onCreated = onCreated
        _viewModel = State(initialValue: CreateSelectionProcessViewModel(stableId: stableId, organizationId: organizationId))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Step indicator
                stepIndicator

                // Step content
                TabView(selection: $viewModel.currentStep) {
                    detailsStep.tag(CreateProcessStep.details)
                    membersStep.tag(CreateProcessStep.members)
                    algorithmStep.tag(CreateProcessStep.algorithm)
                    reviewStep.tag(CreateProcessStep.review)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: viewModel.currentStep)

                // Error
                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                // Navigation buttons
                navigationButtons
            }
            .navigationTitle(String(localized: "selectionProcess.titles.create"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "selectionProcess.buttons.cancel")) {
                        dismiss()
                    }
                }
            }
            .onAppear {
                viewModel.loadMembers()
            }
        }
    }

    // MARK: - Step Indicator

    private var stepIndicator: some View {
        HStack(spacing: 0) {
            ForEach(CreateProcessStep.allCases, id: \.rawValue) { step in
                VStack(spacing: 4) {
                    Circle()
                        .fill(step.rawValue <= viewModel.currentStep.rawValue ? Color.accentColor : Color.secondary.opacity(0.3))
                        .frame(width: 28, height: 28)
                        .overlay {
                            if step.rawValue < viewModel.currentStep.rawValue {
                                Image(systemName: "checkmark")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)
                            } else {
                                Text("\(step.rawValue + 1)")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(step.rawValue <= viewModel.currentStep.rawValue ? .white : .secondary)
                            }
                        }

                    Text(step.title)
                        .font(.caption2)
                        .foregroundStyle(step == viewModel.currentStep ? .primary : .secondary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)

                if step.rawValue < CreateProcessStep.allCases.count - 1 {
                    Rectangle()
                        .fill(step.rawValue < viewModel.currentStep.rawValue ? Color.accentColor : Color.secondary.opacity(0.3))
                        .frame(height: 2)
                        .frame(maxWidth: 30)
                        .padding(.bottom, 16)
                }
            }
        }
        .padding()
    }

    // MARK: - Step 1: Details

    private var detailsStep: some View {
        Form {
            Section {
                TextField(String(localized: "selectionProcess.form.namePlaceholder"), text: $viewModel.name)
            } header: {
                Text(String(localized: "selectionProcess.form.name"))
            }

            Section {
                TextField(String(localized: "selectionProcess.form.descriptionPlaceholder"), text: $viewModel.description, axis: .vertical)
                    .lineLimit(3...6)
            } header: {
                Text(String(localized: "selectionProcess.form.description"))
            }

            Section {
                DatePicker(
                    String(localized: "selectionProcess.labels.startDate"),
                    selection: $viewModel.startDate,
                    displayedComponents: .date
                )
                DatePicker(
                    String(localized: "selectionProcess.labels.endDate"),
                    selection: $viewModel.endDate,
                    displayedComponents: .date
                )
            }

            if viewModel.startDate >= viewModel.endDate {
                Section {
                    Label(
                        String(localized: "selectionProcess.validation.invalidDateRange"),
                        systemImage: "exclamationmark.triangle"
                    )
                    .foregroundStyle(.red)
                    .font(.caption)
                }
            }
        }
    }

    // MARK: - Step 2: Members

    private var membersStep: some View {
        Group {
            if viewModel.isMembersLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    Section {
                        HStack {
                            Button(String(localized: "selectionProcess.form.selectAllMembers")) {
                                viewModel.selectAllMembers()
                            }
                            Spacer()
                            Button(String(localized: "selectionProcess.form.deselectAllMembers")) {
                                viewModel.deselectAllMembers()
                            }
                            .foregroundStyle(.secondary)
                        }
                        .font(.subheadline)
                    }

                    Section {
                        ForEach(viewModel.availableMembers) { member in
                            Button {
                                viewModel.toggleMember(member.userId)
                            } label: {
                                HStack {
                                    Image(systemName: viewModel.selectedMemberIds.contains(member.userId) ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(viewModel.selectedMemberIds.contains(member.userId) ? Color.accentColor : Color.secondary)
                                    VStack(alignment: .leading) {
                                        Text(member.effectiveDisplayName)
                                        if let email = member.email, member.displayName != nil {
                                            Text(email)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    Spacer()
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    } header: {
                        Text("\(viewModel.selectedMemberIds.count) \(String(localized: "selectionProcess.labels.members").lowercased())")
                    }

                    if viewModel.selectedMemberIds.count < 2 {
                        Section {
                            Label(
                                String(localized: "selectionProcess.validation.invalidMemberCount"),
                                systemImage: "exclamationmark.triangle"
                            )
                            .foregroundStyle(.red)
                            .font(.caption)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Step 3: Algorithm

    private var algorithmStep: some View {
        List {
            Section {
                Text(String(localized: "selectionProcess.algorithm.chooseDescription"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Section {
                ForEach(SelectionAlgorithm.allCases) { algorithm in
                    Button {
                        viewModel.selectedAlgorithm = algorithm
                    } label: {
                        HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.md) {
                            Image(systemName: viewModel.selectedAlgorithm == algorithm ? "largecircle.fill.circle" : "circle")
                                .foregroundStyle(viewModel.selectedAlgorithm == algorithm ? Color.accentColor : Color.secondary)
                                .padding(.top, 2)

                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Image(systemName: algorithm.icon)
                                    Text(algorithm.displayName)
                                        .fontWeight(.medium)
                                }
                                Text(algorithm.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Step 4: Review

    private var reviewStep: some View {
        Group {
            if viewModel.isComputingOrder {
                VStack(spacing: EquiDutyDesign.Spacing.md) {
                    ProgressView()
                    Text(String(localized: "selectionProcess.algorithm.computingOrder"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    // Summary
                    Section {
                        LabeledContent(String(localized: "selectionProcess.form.name"), value: viewModel.name)
                        LabeledContent(String(localized: "selectionProcess.labels.algorithm"), value: viewModel.selectedAlgorithm.displayName)
                        LabeledContent(String(localized: "selectionProcess.labels.participantCount"), value: "\(viewModel.selectedMemberIds.count)")
                    }

                    // Metadata
                    if let metadata = viewModel.computedOrder?.metadata {
                        Section {
                            if let quota = metadata.quotaPerMember, let total = metadata.totalAvailablePoints {
                                Text(String(localized: "selectionProcess.algorithm.quotaBased.quotaInfo \(quota) \(total)"))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            if let prevName = metadata.previousProcessName {
                                Text(String(localized: "selectionProcess.algorithm.fairRotation.rotatedFrom \(prevName)"))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    // Turn order
                    Section {
                        if viewModel.selectedAlgorithm == .manual {
                            ForEach(viewModel.displayOrder) { member in
                                HStack {
                                    Text("\(member.order).")
                                        .font(.headline)
                                        .foregroundStyle(.secondary)
                                        .frame(width: 30)
                                    Text(member.userName)
                                }
                            }
                            .onMove { viewModel.moveMember(from: $0, to: $1) }
                        } else {
                            ForEach(viewModel.displayOrder) { member in
                                HStack {
                                    Text("\(member.order).")
                                        .font(.headline)
                                        .foregroundStyle(.secondary)
                                        .frame(width: 30)
                                    Text(member.userName)
                                }
                            }
                        }
                    } header: {
                        Text(String(localized: "selectionProcess.labels.turnOrder"))
                    }
                }
                .environment(\.editMode, viewModel.selectedAlgorithm == .manual ? .constant(.active) : .constant(.inactive))
            }
        }
    }

    // MARK: - Navigation Buttons

    private var navigationButtons: some View {
        HStack(spacing: EquiDutyDesign.Spacing.md) {
            if viewModel.currentStep != .details {
                Button {
                    viewModel.previousStep()
                } label: {
                    Label(String(localized: "selectionProcess.buttons.back"), systemImage: "chevron.left")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }

            if viewModel.currentStep == .review {
                Button {
                    Task {
                        let success = await viewModel.createProcess()
                        if success {
                            onCreated()
                            dismiss()
                        }
                    }
                } label: {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Label(String(localized: "selectionProcess.buttons.create"), systemImage: "checkmark")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isLoading || viewModel.isComputingOrder)
            } else {
                Button {
                    viewModel.nextStep()
                } label: {
                    HStack {
                        Text(viewModel.currentStep.title)
                        Image(systemName: "chevron.right")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(!canProceedFromCurrentStep)
            }
        }
        .padding()
    }

    private var canProceedFromCurrentStep: Bool {
        switch viewModel.currentStep {
        case .details: return viewModel.canProceedFromDetails
        case .members: return viewModel.canProceedFromMembers
        case .algorithm: return true
        case .review: return true
        }
    }
}

#Preview {
    CreateSelectionProcessView(stableId: "preview", organizationId: "preview") {}
}
