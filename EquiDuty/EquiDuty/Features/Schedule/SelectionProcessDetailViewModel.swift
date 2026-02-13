//
//  SelectionProcessDetailViewModel.swift
//  EquiDuty
//
//  ViewModel for selection process detail view
//

import Foundation

@MainActor
@Observable
final class SelectionProcessDetailViewModel {
    // MARK: - State

    var process: SelectionProcessWithContext?
    var weekRoutines: [RoutineInstance] = []
    var isLoading = false
    var isActionLoading = false
    var errorMessage: String?
    var actionError: String?
    var successMessage: String?

    // Week navigation
    var currentWeekStart: Date = {
        let cal = Calendar.current
        let components = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date())
        return cal.date(from: components) ?? Date()
    }()

    // Confirmation dialogs
    var showStartConfirm = false
    var showCompleteTurnConfirm = false
    var showCancelConfirm = false
    var showDeleteConfirm = false
    var showEditDates = false
    var shouldDismiss = false

    // Edit dates
    var editStartDate = Date()
    var editEndDate = Date()

    let processId: String

    // MARK: - Dependencies

    private let service = SelectionProcessService.shared
    private let routineService = RoutineService.shared
    private let authService = AuthService.shared

    // MARK: - Init

    init(processId: String) {
        self.processId = processId
    }

    // MARK: - Computed

    var currentUserId: String? {
        authService.firebaseUid
    }

    var weekEnd: Date {
        Calendar.current.date(byAdding: .day, value: 6, to: currentWeekStart) ?? currentWeekStart
    }

    var weekDays: [Date] {
        (0..<7).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: currentWeekStart) }
    }

    var canSelectRoutines: Bool {
        guard let process, process.status == .active, process.isCurrentTurn else { return false }
        return true
    }

    // MARK: - Actions

    func loadData() {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                process = try await service.getProcess(processId: processId)
                if let process, process.status == .active {
                    await loadWeekRoutines()
                }
                isLoading = false
            } catch {
                errorMessage = userFriendlyError(error)
                isLoading = false
            }
        }
    }

    func refresh() async {
        do {
            process = try await service.getProcess(processId: processId)
            if let process, process.status == .active {
                await loadWeekRoutines()
            }
            errorMessage = nil
        } catch {
            errorMessage = userFriendlyError(error)
        }
    }

    func loadWeekRoutines() async {
        guard let process else { return }
        do {
            weekRoutines = try await routineService.getRoutineInstancesForDateRange(
                stableId: process.stableId,
                startDate: currentWeekStart,
                endDate: weekEnd
            )
        } catch {
            // Non-critical, just show empty week
            weekRoutines = []
        }
    }

    func navigateWeek(by offset: Int) {
        guard let newStart = Calendar.current.date(byAdding: .weekOfYear, value: offset, to: currentWeekStart) else { return }
        currentWeekStart = newStart
        Task { await loadWeekRoutines() }
    }

    func goToToday() {
        currentWeekStart = Self.startOfWeek(Date())
        Task { await loadWeekRoutines() }
    }

    // MARK: - Admin Actions

    func startProcess() {
        performAction(successMsg: String(localized: "selectionProcess.messages.successfully.started"), requiresAdmin: true) {
            _ = try await self.service.startProcess(processId: self.processId)
        }
    }

    func completeTurn() {
        performAction(successMsg: String(localized: "selectionProcess.messages.turnCompleted")) {
            let result = try await self.service.completeTurn(processId: self.processId)
            if result.processCompleted {
                self.successMessage = String(localized: "selectionProcess.status.completed")
            }
        }
    }

    func cancelProcess() {
        performAction(successMsg: String(localized: "selectionProcess.messages.successfully.cancelled"), requiresAdmin: true) {
            _ = try await self.service.cancelProcess(processId: self.processId)
        }
    }

    func deleteProcess() {
        performAction(successMsg: String(localized: "selectionProcess.messages.successfully.deleted"), requiresAdmin: true) {
            try await self.service.deleteProcess(processId: self.processId)
            await MainActor.run { self.shouldDismiss = true }
        }
    }

    func saveDates() {
        guard editStartDate < editEndDate else { return }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let start = formatter.string(from: editStartDate)
        let end = formatter.string(from: editEndDate)

        performAction(successMsg: String(localized: "selectionProcess.messages.datesUpdated"), requiresAdmin: true) {
            _ = try await self.service.updateDates(processId: self.processId, startDate: start, endDate: end)
        }
    }

    func assignRoutineToSelf(instanceId: String) {
        guard let userId = currentUserId,
              let user = authService.currentUser else { return }
        let userName = "\(user.firstName) \(user.lastName)"

        performAction(successMsg: String(localized: "selectionProcess.messages.routineSelected")) {
            // Use the routine instance assign endpoint
            let body = AssignRoutineBody(userId: userId, userName: userName)
            let _: AssignRoutineResponse = try await APIClient.shared.post(
                "/routines/instances/\(instanceId)/assign",
                body: body
            )
        }
    }

    // MARK: - Helpers

    private func performAction(successMsg: String, requiresAdmin: Bool = false, action: @escaping () async throws -> Void) {
        if requiresAdmin && process?.canManage != true { return }

        isActionLoading = true
        actionError = nil
        successMessage = nil

        Task {
            do {
                try await action()
                successMessage = successMsg
                isActionLoading = false
                // Reload data
                await refresh()
            } catch {
                actionError = self.userFriendlyError(error)
                isActionLoading = false
            }
        }
    }

    private func userFriendlyError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            switch apiError {
            case .unauthorized:
                return String(localized: "selectionProcess.messages.errors.loadFailed")
            case .forbidden:
                return String(localized: "selectionProcess.messages.errors.loadFailed")
            default:
                return String(localized: "selectionProcess.messages.errors.loadFailed")
            }
        }
        return String(localized: "selectionProcess.messages.errors.loadFailed")
    }

    static func startOfWeek(_ date: Date) -> Date {
        let cal = Calendar.current
        let components = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return cal.date(from: components) ?? date
    }
}

// MARK: - Assign Body/Response

private struct AssignRoutineBody: Codable {
    let userId: String
    let userName: String
}

private struct AssignRoutineResponse: Codable {
    let success: Bool?
    let message: String?
}
