//
//  FacilityFormViewModel.swift
//  EquiDuty
//
//  ViewModel for creating/editing a facility
//

import Foundation

@MainActor
@Observable
final class FacilityFormViewModel {
    // MARK: - Form State

    var name: String = ""
    var type: FacilityType = .indoorArena
    var facilityDescription: String = ""
    var status: FacilityStatus = .active

    // Booking rules
    var planningWindowOpens: Int = 14
    var planningWindowCloses: Int = 1
    var maxHorsesPerReservation: Int = 1
    var minTimeSlotDuration: TimeSlotDuration = .thirty
    var maxHoursPerReservation: Int = 2
    var maxDurationUnit: DurationUnit = .hours

    // Schedule
    var defaultTimeBlocks: [EditableTimeBlock] = [EditableTimeBlock(from: "08:00", to: "20:00")]
    var daySchedules: [FacilityDayOfWeek: EditableDaySchedule] = {
        var schedules: [FacilityDayOfWeek: EditableDaySchedule] = [:]
        for day in FacilityDayOfWeek.allCases {
            schedules[day] = EditableDaySchedule()
        }
        return schedules
    }()

    // Exceptions
    var exceptions: [EditableException] = []

    // MARK: - UI State

    var isSubmitting = false
    var errorMessage: String?
    var didSave = false

    // MARK: - Dependencies

    private let service = FacilityService.shared
    private let authService = AuthService.shared
    private let editingFacility: Facility?

    var isEditing: Bool { editingFacility != nil }

    // MARK: - Init

    init(facility: Facility? = nil) {
        self.editingFacility = facility
        if let facility {
            prefill(from: facility)
        }
    }

    private func prefill(from facility: Facility) {
        name = facility.name
        type = facility.facilityType
        facilityDescription = facility.description ?? ""
        status = facility.status

        // Booking rules
        planningWindowOpens = facility.planningWindowOpens ?? 14
        planningWindowCloses = facility.planningWindowCloses ?? 1
        maxHorsesPerReservation = facility.maxHorsesPerReservation ?? 1
        if let minSlot = facility.minTimeSlotDuration,
           let duration = TimeSlotDuration(rawValue: minSlot) {
            minTimeSlotDuration = duration
        }
        if let maxHours = facility.maxHoursPerReservation {
            if maxHours >= 24 && maxHours % 24 == 0 {
                maxHoursPerReservation = maxHours / 24
                maxDurationUnit = .days
            } else {
                maxHoursPerReservation = maxHours
                maxDurationUnit = .hours
            }
        }

        // Schedule
        if let schedule = facility.availabilitySchedule?.weeklySchedule {
            if let blocks = schedule.defaultTimeBlocks, !blocks.isEmpty {
                defaultTimeBlocks = blocks.map { EditableTimeBlock(from: $0.from, to: $0.to) }
            }
            if let days = schedule.days {
                for day in FacilityDayOfWeek.allCases {
                    if let dayConfig = days[day.rawValue] {
                        var editable = EditableDaySchedule()
                        editable.available = dayConfig.available ?? true
                        if let blocks = dayConfig.timeBlocks, !blocks.isEmpty {
                            editable.hasCustomHours = true
                            editable.timeBlocks = blocks.map { EditableTimeBlock(from: $0.from, to: $0.to) }
                        }
                        daySchedules[day] = editable
                    }
                }
            }
        }

        // Exceptions
        if let excs = facility.availabilitySchedule?.exceptions {
            exceptions = excs.map { exc in
                EditableException(
                    date: exc.date,
                    type: exc.type,
                    timeBlocks: exc.timeBlocks?.map { EditableTimeBlock(from: $0.from, to: $0.to) } ?? [],
                    reason: exc.reason ?? ""
                )
            }
        }
    }

    // MARK: - Validation

    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // MARK: - Save

    func save() async {
        guard isValid else { return }
        guard let stableId = authService.selectedStable?.id else {
            errorMessage = String(localized: "facilities.manage.error.noStable")
            return
        }

        isSubmitting = true
        errorMessage = nil

        let schedule = buildAvailabilitySchedule()
        let maxHours = maxDurationUnit == .days ? maxHoursPerReservation * 24 : maxHoursPerReservation

        do {
            if let facility = editingFacility {
                // Update
                let updates = UpdateFacilityRequest(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    type: type.rawValue,
                    description: facilityDescription.isEmpty ? nil : facilityDescription,
                    status: status.rawValue,
                    planningWindowOpens: planningWindowOpens,
                    planningWindowCloses: planningWindowCloses,
                    maxHorsesPerReservation: maxHorsesPerReservation,
                    minTimeSlotDuration: minTimeSlotDuration.rawValue,
                    maxHoursPerReservation: maxHours,
                    availabilitySchedule: schedule
                )
                _ = try await service.updateFacility(id: facility.id, updates: updates)
            } else {
                // Create
                let request = CreateFacilityRequest(
                    stableId: stableId,
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    type: type.rawValue,
                    description: facilityDescription.isEmpty ? nil : facilityDescription,
                    status: status.rawValue,
                    planningWindowOpens: planningWindowOpens,
                    planningWindowCloses: planningWindowCloses,
                    maxHorsesPerReservation: maxHorsesPerReservation,
                    minTimeSlotDuration: minTimeSlotDuration.rawValue,
                    maxHoursPerReservation: maxHours,
                    availabilitySchedule: schedule
                )
                _ = try await service.createFacility(request)
            }

            didSave = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }

    // MARK: - Schedule Builders

    private func buildAvailabilitySchedule() -> EncodableAvailabilitySchedule {
        let encodableDefaultBlocks = defaultTimeBlocks.map { EncodableTimeBlock(from: $0.from, to: $0.to) }

        var encodableDays: [String: EncodableDaySchedule] = [:]
        for day in FacilityDayOfWeek.allCases {
            if let schedule = daySchedules[day] {
                let blocks: [EncodableTimeBlock]? = schedule.hasCustomHours
                    ? schedule.timeBlocks.map { EncodableTimeBlock(from: $0.from, to: $0.to) }
                    : nil
                encodableDays[day.rawValue] = EncodableDaySchedule(
                    available: schedule.available,
                    timeBlocks: blocks
                )
            }
        }

        let encodableExceptions = exceptions.map { exc in
            EncodableException(
                date: exc.date,
                type: exc.type.rawValue,
                timeBlocks: exc.type == .modified
                    ? exc.timeBlocks.map { EncodableTimeBlock(from: $0.from, to: $0.to) }
                    : nil,
                reason: exc.reason.isEmpty ? nil : exc.reason
            )
        }

        return EncodableAvailabilitySchedule(
            weeklySchedule: EncodableWeeklySchedule(
                defaultTimeBlocks: encodableDefaultBlocks,
                days: encodableDays
            ),
            exceptions: encodableExceptions.isEmpty ? nil : encodableExceptions
        )
    }

    // MARK: - Exception Management

    func addException(_ exception: EditableException) {
        exceptions.append(exception)
    }

    func removeException(at index: Int) {
        guard exceptions.indices.contains(index) else { return }
        exceptions.remove(at: index)
    }
}

// MARK: - Editable Models

/// Mutable time block for form editing
struct EditableTimeBlock: Identifiable {
    let id = UUID()
    var from: String
    var to: String

    var fromDate: Date {
        get { timeStringToDate(from) }
        set { from = dateToTimeString(newValue) }
    }

    var toDate: Date {
        get { timeStringToDate(to) }
        set { to = dateToTimeString(newValue) }
    }
}

/// Mutable day schedule for form editing
struct EditableDaySchedule {
    var available: Bool = true
    var hasCustomHours: Bool = false
    var timeBlocks: [EditableTimeBlock] = [EditableTimeBlock(from: "08:00", to: "20:00")]
}

/// Mutable exception for form editing
struct EditableException: Identifiable {
    let id = UUID()
    var date: String
    var type: ScheduleExceptionType
    var timeBlocks: [EditableTimeBlock]
    var reason: String
}

// MARK: - Time Helpers

private func timeStringToDate(_ time: String) -> Date {
    let parts = time.split(separator: ":").compactMap { Int($0) }
    let hour = parts.count > 0 ? parts[0] : 8
    let minute = parts.count > 1 ? parts[1] : 0

    var components = DateComponents()
    components.hour = hour
    components.minute = minute
    return Calendar.current.date(from: components) ?? Date()
}

private func dateToTimeString(_ date: Date) -> String {
    let components = Calendar.current.dateComponents([.hour, .minute], from: date)
    return String(format: "%02d:%02d", components.hour ?? 0, components.minute ?? 0)
}
