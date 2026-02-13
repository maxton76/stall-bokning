//
//  CreateSelectionProcessViewModel.swift
//  EquiDuty
//
//  ViewModel for the create selection process wizard
//

import SwiftUI

enum CreateProcessStep: Int, CaseIterable {
    case details = 0
    case members = 1
    case algorithm = 2
    case review = 3

    var title: String {
        switch self {
        case .details: return String(localized: "selectionProcess.form.name")
        case .members: return String(localized: "selectionProcess.labels.members")
        case .algorithm: return String(localized: "selectionProcess.labels.algorithm")
        case .review: return String(localized: "selectionProcess.labels.turnOrder")
        }
    }
}

@MainActor
@Observable
final class CreateSelectionProcessViewModel {
    // MARK: - State

    var currentStep: CreateProcessStep = .details
    var isLoading = false
    var isComputingOrder = false
    var errorMessage: String?

    // Step 1: Details
    var name = ""
    var description = ""
    var startDate = Date()
    var endDate = Calendar.current.date(byAdding: .month, value: 1, to: Date()) ?? Date()

    // Step 2: Members
    var availableMembers: [StableMemberInfo] = []
    var selectedMemberIds: Set<String> = []
    var isMembersLoading = false

    // Step 3: Algorithm
    var selectedAlgorithm: SelectionAlgorithm = .manual

    // Step 4: Review
    var computedOrder: ComputedTurnOrder?
    var manualOrder: [StableMemberInfo] = []

    let stableId: String
    let organizationId: String

    // MARK: - Dependencies

    private let service = SelectionProcessService.shared

    // MARK: - Init

    init(stableId: String, organizationId: String) {
        self.stableId = stableId
        self.organizationId = organizationId
    }

    // MARK: - Computed

    var canProceedFromDetails: Bool {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        return !trimmedName.isEmpty && trimmedName.count <= 100 && description.count <= 500 && startDate < endDate
    }

    var canProceedFromMembers: Bool {
        selectedMemberIds.count >= 2
    }

    var selectedMembers: [StableMemberInfo] {
        availableMembers.filter { selectedMemberIds.contains($0.userId) }
    }

    var displayOrder: [DisplayTurnMember] {
        if selectedAlgorithm == .manual {
            return manualOrder.enumerated().map { index, m in
                DisplayTurnMember(userId: m.userId, userName: m.effectiveDisplayName, order: index + 1)
            }
        } else if let computed = computedOrder {
            return computed.turns.enumerated().map { index, m in
                DisplayTurnMember(userId: m.userId, userName: m.userName, order: index + 1)
            }
        }
        return selectedMembers.enumerated().map { index, m in
            DisplayTurnMember(userId: m.userId, userName: m.effectiveDisplayName, order: index + 1)
        }
    }

    // MARK: - Actions

    func loadMembers() {
        isMembersLoading = true
        Task {
            do {
                availableMembers = try await service.getStableMembers(
                    stableId: stableId
                )
                isMembersLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isMembersLoading = false
            }
        }
    }

    func toggleMember(_ memberId: String) {
        if selectedMemberIds.contains(memberId) {
            selectedMemberIds.remove(memberId)
        } else {
            selectedMemberIds.insert(memberId)
        }
    }

    func selectAllMembers() {
        selectedMemberIds = Set(availableMembers.map(\.userId))
    }

    func deselectAllMembers() {
        selectedMemberIds.removeAll()
    }

    func goToStep(_ step: CreateProcessStep) {
        currentStep = step
        if step == .members && availableMembers.isEmpty {
            loadMembers()
        }
        if step == .review {
            prepareReview()
        }
    }

    func nextStep() {
        guard let next = CreateProcessStep(rawValue: currentStep.rawValue + 1) else { return }
        goToStep(next)
    }

    func previousStep() {
        guard let prev = CreateProcessStep(rawValue: currentStep.rawValue - 1) else { return }
        currentStep = prev
    }

    private func prepareReview() {
        if selectedAlgorithm == .manual {
            manualOrder = selectedMembers
        } else {
            computeOrder()
        }
    }

    func computeOrder() {
        isComputingOrder = true
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let input = ComputeTurnOrderInput(
            stableId: stableId,
            algorithm: selectedAlgorithm,
            memberIds: Array(selectedMemberIds),
            selectionStartDate: formatter.string(from: startDate),
            selectionEndDate: formatter.string(from: endDate)
        )

        Task {
            do {
                computedOrder = try await service.computeTurnOrder(input: input)
                isComputingOrder = false
            } catch {
                errorMessage = error.localizedDescription
                isComputingOrder = false
            }
        }
    }

    func moveMember(from source: IndexSet, to destination: Int) {
        manualOrder.move(fromOffsets: source, toOffset: destination)
    }

    func createProcess() async -> Bool {
        isLoading = true
        errorMessage = nil

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let members: [CreateSelectionProcessMember]
        if selectedAlgorithm == .manual {
            members = manualOrder.map {
                CreateSelectionProcessMember(userId: $0.userId, userName: $0.effectiveDisplayName, userEmail: $0.email ?? "")
            }
        } else if let computed = computedOrder {
            members = computed.turns.map {
                CreateSelectionProcessMember(userId: $0.userId, userName: $0.userName, userEmail: $0.userEmail)
            }
        } else {
            members = selectedMembers.map {
                CreateSelectionProcessMember(userId: $0.userId, userName: $0.effectiveDisplayName, userEmail: $0.email ?? "")
            }
        }

        let input = CreateSelectionProcessInput(
            organizationId: organizationId,
            stableId: stableId,
            name: name.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            selectionStartDate: formatter.string(from: startDate),
            selectionEndDate: formatter.string(from: endDate),
            algorithm: selectedAlgorithm,
            memberOrder: members
        )

        do {
            _ = try await service.createProcess(input: input)
            isLoading = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }
}

// MARK: - Display Types

struct DisplayTurnMember: Identifiable {
    let userId: String
    let userName: String
    let order: Int

    var id: String { userId }
}
