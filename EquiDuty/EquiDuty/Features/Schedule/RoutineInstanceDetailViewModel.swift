//
//  RoutineInstanceDetailViewModel.swift
//  EquiDuty
//
//  Business logic for routine instance detail modal
//

import Foundation
import Observation

@MainActor
@Observable
final class RoutineInstanceDetailViewModel {
    // MARK: - State
    private(set) var instance: RoutineInstance?
    private(set) var availableMembers: [OrganizationMember] = []
    private(set) var isLoading = true
    private(set) var isMutating = false
    private(set) var errorMessage: String?

    // MARK: - Dependencies
    private let instanceId: String
    private let routineService: RoutineService
    private let permissionService: PermissionService
    private let authService: AuthService

    init(
        instanceId: String,
        routineService: RoutineService = .shared,
        permissionService: PermissionService = .shared,
        authService: AuthService = .shared
    ) {
        self.instanceId = instanceId
        self.routineService = routineService
        self.permissionService = permissionService
        self.authService = authService
    }

    // MARK: - Computed Properties

    var canReassign: Bool {
        guard let instance else { return false }
        return permissionService.hasPermission(.manageSchedules) && instance.canBeReassigned
    }

    var canCancel: Bool {
        guard let instance else { return false }
        let isManager = permissionService.hasPermission(.manageSchedules)
        let isAssignee = instance.assignedTo == currentUserId
        return (isManager || isAssignee) && instance.canBeCancelled
    }

    var canDelete: Bool {
        guard let instance else { return false }
        return permissionService.hasPermission(.manageSchedules) && instance.canBeDeleted
    }

    var canStartContinue: Bool {
        guard let instance else { return false }
        return ![.completed, .missed, .cancelled].contains(instance.status)
    }

    private var currentUserId: String {
        authService.currentUser?.uid ?? ""
    }

    // MARK: - Actions

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            // Load instance details
            guard let loadedInstance = try await routineService.getRoutineInstance(instanceId: instanceId) else {
                errorMessage = String(localized: "routineDetails.error.notFound")
                isLoading = false
                return
            }
            instance = loadedInstance

            // Load available members if user can reassign
            if canReassign, let stableId = instance?.stableId {
                availableMembers = try await loadStableMembers(stableId: stableId)
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func assignToMember(memberId: String, memberName: String) async throws {
        guard let instance else { return }

        isMutating = true
        defer { isMutating = false }

        do {
            let updated = try await routineService.assignRoutineInstance(
                instanceId: instance.id,
                assignedTo: memberId,
                assignedToName: memberName
            )
            self.instance = updated
        } catch {
            errorMessage = String(localized: "routineDetails.error.assignFailed")
            throw error
        }
    }

    func cancelInstance() async throws {
        guard let instance else { return }

        isMutating = true
        defer { isMutating = false }

        do {
            let updated = try await routineService.cancelRoutineInstance(instanceId: instance.id)
            self.instance = updated
        } catch {
            errorMessage = String(localized: "routineDetails.error.cancelFailed")
            throw error
        }
    }

    func deleteInstance() async throws {
        guard let instance else { return }

        isMutating = true
        defer { isMutating = false }

        do {
            try await routineService.deleteRoutineInstance(instanceId: instance.id)
            // Instance is deleted, mark as nil
            self.instance = nil
        } catch {
            errorMessage = String(localized: "routineDetails.error.deleteFailed")
            throw error
        }
    }

    // MARK: - Private Helpers

    private func loadStableMembers(stableId: String) async throws -> [OrganizationMember] {
        let apiClient = APIClient.shared
        struct Response: Codable {
            let members: [OrganizationMember]
        }
        let response: Response = try await apiClient.get(
            APIEndpoints.stableMembers(stableId)
        )
        return response.members.filter { $0.status == .active }
    }
}
