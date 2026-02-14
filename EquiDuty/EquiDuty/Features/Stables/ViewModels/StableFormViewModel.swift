//
//  StableFormViewModel.swift
//  EquiDuty
//
//  ViewModel for creating/editing a stable
//

import Foundation

@MainActor
@Observable
final class StableFormViewModel {
    // MARK: - Mode

    enum Mode {
        case create
        case settings
    }

    let mode: Mode

    // MARK: - Basic Info

    var name: String = ""
    var stableDescription: String = ""
    var address: String = ""
    var facilityNumber: String = ""

    // MARK: - Points System

    var resetPeriod: PointsSystemConfig.ResetPeriod = .monthly
    var memoryHorizonDays: Int = 90
    var holidayMultiplier: Double = 1.5

    // MARK: - Scheduling Config

    var scheduleHorizonDays: Int = 14
    var autoAssignment: Bool = false
    var allowSwaps: Bool = true
    var requireApproval: Bool = false

    // MARK: - Notification Config

    var emailNotifications: Bool = true
    var shiftReminders: Bool = true
    var schedulePublished: Bool = true
    var memberJoined: Bool = true
    var shiftSwapRequests: Bool = true

    // MARK: - UI State

    var isSubmitting = false
    var errorMessage: String?
    var didSave = false

    // MARK: - Dependencies

    private let service = StableService.shared
    private let authService = AuthService.shared
    private let editingStable: Stable?

    var isEditing: Bool { editingStable != nil }

    // MARK: - Init

    init(stable: Stable? = nil) {
        self.editingStable = stable
        self.mode = stable != nil ? .settings : .create

        if let stable {
            prefill(from: stable)
        }
    }

    private func prefill(from stable: Stable) {
        name = stable.name
        stableDescription = stable.description ?? ""
        address = stable.address ?? ""
        facilityNumber = stable.facilityNumber ?? ""

        // Points system
        if let points = stable.pointsSystem {
            resetPeriod = points.resetPeriod
            memoryHorizonDays = points.memoryHorizonDays
            holidayMultiplier = points.holidayMultiplier
        }

        // Scheduling config
        if let scheduling = stable.schedulingConfig {
            scheduleHorizonDays = scheduling.scheduleHorizonDays ?? 14
            autoAssignment = scheduling.autoAssignment ?? false
            allowSwaps = scheduling.allowSwaps ?? true
            requireApproval = scheduling.requireApproval ?? false
        }

        // Notification config
        if let notifications = stable.notificationConfig {
            emailNotifications = notifications.emailNotifications ?? true
            shiftReminders = notifications.shiftReminders ?? true
            schedulePublished = notifications.schedulePublished ?? true
            memberJoined = notifications.memberJoined ?? true
            shiftSwapRequests = notifications.shiftSwapRequests ?? true
        }
    }

    // MARK: - Validation

    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // MARK: - Save

    func save() async {
        guard isValid else { return }

        isSubmitting = true
        errorMessage = nil

        do {
            if let stable = editingStable {
                // Update existing stable
                let updates = UpdateStableRequest(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    description: stableDescription.isEmpty ? nil : stableDescription,
                    address: address.isEmpty ? nil : address,
                    facilityNumber: facilityNumber.isEmpty ? nil : facilityNumber,
                    pointsSystem: PointsSystemConfig(
                        resetPeriod: resetPeriod,
                        memoryHorizonDays: memoryHorizonDays,
                        holidayMultiplier: holidayMultiplier
                    ),
                    schedulingConfig: SchedulingConfig(
                        scheduleHorizonDays: scheduleHorizonDays,
                        autoAssignment: autoAssignment,
                        allowSwaps: allowSwaps,
                        requireApproval: requireApproval
                    ),
                    notificationConfig: NotificationConfig(
                        emailNotifications: emailNotifications,
                        shiftReminders: shiftReminders,
                        schedulePublished: schedulePublished,
                        memberJoined: memberJoined,
                        shiftSwapRequests: shiftSwapRequests
                    )
                )
                _ = try await service.updateStable(id: stable.id, updates: updates)
            } else {
                // Create new stable
                let request = CreateStableRequest(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    description: stableDescription.isEmpty ? nil : stableDescription,
                    address: address.isEmpty ? nil : address,
                    facilityNumber: facilityNumber.isEmpty ? nil : facilityNumber,
                    organizationId: authService.selectedOrganization?.id
                )
                _ = try await service.createStable(request)
            }

            didSave = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }
}
