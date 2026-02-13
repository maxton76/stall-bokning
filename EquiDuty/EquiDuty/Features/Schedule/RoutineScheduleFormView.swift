//
//  RoutineScheduleFormView.swift
//  EquiDuty
//
//  Form for creating and editing routine schedules
//

import SwiftUI

enum ScheduleFormMode {
    case create
    case edit(RoutineSchedule)
}

struct RoutineScheduleFormView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared

    let mode: ScheduleFormMode
    let onSave: (RoutineSchedule) -> Void

    // Form state
    @State private var selectedTemplateId = ""
    @State private var templates: [RoutineTemplate] = []
    @State private var repeatPattern: RecurrencePattern = .daily
    @State private var repeatDays: Set<Int> = [] // 0=Sunday, 6=Saturday
    @State private var includeHolidays = false
    @State private var startTime = Date()
    @State private var startDate = Date()
    @State private var hasEndDate = false
    @State private var endDate = Date()
    @State private var assignmentMode: AssignmentMode = .auto
    @State private var isEnabled = true

    // UI state
    @State private var isSaving = false
    @State private var errorMessage: String?

    var isValid: Bool {
        !selectedTemplateId.isEmpty &&
        (repeatPattern != .custom || !repeatDays.isEmpty)
    }

    var body: some View {
        NavigationStack {
            Form {
                // Template Selection
                Section {
                    if templates.isEmpty {
                        Text("Laddar mallar...")
                            .foregroundStyle(.secondary)
                    } else {
                        Picker("Mall", selection: $selectedTemplateId) {
                            Text("Välj mall...").tag("")
                            ForEach(templates.filter { $0.isActive }) { template in
                                Text(template.name).tag(template.id)
                            }
                        }
                    }
                } header: {
                    Text("Mall")
                }

                // Pattern
                Section {
                    Picker("Återkommande", selection: $repeatPattern) {
                        ForEach(RecurrencePattern.allCases, id: \.self) { p in
                            Text(p.displayName).tag(p)
                        }
                    }

                    // Show day selector for custom pattern
                    if repeatPattern == .custom {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Välj dagar").font(.caption).foregroundStyle(.secondary)
                            HStack(spacing: 8) {
                                DayToggle(day: "S", dayOfWeek: 0, selectedDays: $repeatDays) // Sunday
                                DayToggle(day: "M", dayOfWeek: 1, selectedDays: $repeatDays) // Monday
                                DayToggle(day: "T", dayOfWeek: 2, selectedDays: $repeatDays) // Tuesday
                                DayToggle(day: "O", dayOfWeek: 3, selectedDays: $repeatDays) // Wednesday
                                DayToggle(day: "T", dayOfWeek: 4, selectedDays: $repeatDays) // Thursday
                                DayToggle(day: "F", dayOfWeek: 5, selectedDays: $repeatDays) // Friday
                                DayToggle(day: "L", dayOfWeek: 6, selectedDays: $repeatDays) // Saturday
                            }
                        }
                    }

                    // Show holiday toggle for relevant patterns
                    if repeatPattern == .weekdays || repeatPattern == .custom {
                        Toggle("Inkludera helgdagar", isOn: $includeHolidays)
                    }
                } header: {
                    Text("Återkommande mönster")
                }

                // Timing
                Section {
                    DatePicker("Starttid", selection: $startTime, displayedComponents: .hourAndMinute)
                    DatePicker("Startdatum", selection: $startDate, displayedComponents: .date)
                    Toggle("Slutdatum", isOn: $hasEndDate)
                    if hasEndDate {
                        DatePicker("Slutdatum", selection: $endDate, displayedComponents: .date)
                    }
                } header: {
                    Text("Tidsinställningar")
                }

                // Assignment
                Section {
                    Picker("Tilldelningsstrategi", selection: $assignmentMode) {
                        Text(AssignmentMode.auto.displayName).tag(AssignmentMode.auto)
                        Text(AssignmentMode.manual.displayName).tag(AssignmentMode.manual)
                        Text(AssignmentMode.selfBook.displayName).tag(AssignmentMode.selfBook)
                    }
                } header: {
                    Text("Tilldelning")
                }

                // Status
                Section {
                    Toggle("Aktiv", isOn: $isEnabled)
                } header: {
                    Text("Status")
                }
            }
            .navigationTitle(mode.isEditing ? "Redigera schema" : "Nytt schema")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Avbryt") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Spara") {
                        Task { await save() }
                    }
                    .disabled(!isValid || isSaving)
                }
            }
            .onAppear {
                loadTemplates()
                loadInitialData()
            }
        }
    }

    private func loadTemplates() {
        Task {
            do {
                if let orgId = authService.selectedOrganization?.id {
                    templates = try await routineService.getRoutineTemplates(organizationId: orgId)
                }
            } catch {}
        }
    }

    private func loadInitialData() {
        switch mode {
        case .create:
            break
        case .edit(let schedule):
            selectedTemplateId = schedule.templateId
            repeatPattern = schedule.repeatPattern
            repeatDays = Set(schedule.repeatDays ?? [])
            includeHolidays = schedule.includeHolidays ?? false
            startDate = schedule.startDate
            hasEndDate = schedule.endDate != nil
            endDate = schedule.endDate ?? Date()
            assignmentMode = schedule.assignmentMode
            isEnabled = schedule.isEnabled

            // Parse scheduledStartTime "HH:MM"
            let components = schedule.scheduledStartTime.split(separator: ":")
            if components.count == 2,
               let hour = Int(components[0]),
               let minute = Int(components[1]) {
                var dateComponents = DateComponents()
                dateComponents.hour = hour
                dateComponents.minute = minute
                if let date = Calendar.current.date(from: dateComponents) {
                    startTime = date
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        let timeString = timeFormatter.string(from: startTime)

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")

        do {
            guard let stableId = authService.selectedStable?.id,
                  let orgId = authService.selectedOrganization?.id else { return }

            // Convert Set<Int> to sorted [Int] for API
            let repeatDaysArray = repeatPattern == .custom ? Array(repeatDays).sorted() : nil

            // Format dates as YYYY-MM-DD strings
            let startDateString = dateFormatter.string(from: startDate)
            // endDate is required by backend; default to 3 months from start if not set
            let effectiveEndDate = hasEndDate ? endDate : Calendar.current.date(byAdding: .month, value: 3, to: startDate) ?? startDate
            let endDateString = dateFormatter.string(from: effectiveEndDate)

            switch mode {
            case .create:
                let create = RoutineScheduleCreate(
                    organizationId: orgId,
                    stableId: stableId,
                    templateId: selectedTemplateId,
                    name: nil,
                    startDate: startDateString,
                    endDate: endDateString,
                    repeatPattern: repeatPattern.rawValue,
                    repeatDays: repeatDaysArray,
                    includeHolidays: includeHolidays,
                    scheduledStartTime: timeString,
                    assignmentMode: assignmentMode.rawValue,
                    defaultAssignedTo: nil,
                    customAssignments: nil
                )
                let schedule = try await routineService.createRoutineSchedule(schedule: create)
                onSave(schedule)

            case .edit(let existing):
                let update = RoutineScheduleUpdate(
                    name: nil,
                    startDate: startDateString,
                    endDate: endDateString,
                    repeatPattern: repeatPattern.rawValue,
                    repeatDays: repeatDaysArray,
                    includeHolidays: includeHolidays,
                    scheduledStartTime: timeString,
                    assignmentMode: assignmentMode.rawValue,
                    defaultAssignedTo: nil,
                    isEnabled: isEnabled
                )
                let schedule = try await routineService.updateRoutineSchedule(scheduleId: existing.id, updates: update)
                onSave(schedule)
            }
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

struct DayToggle: View {
    let day: String
    let dayOfWeek: Int // 0=Sunday, 6=Saturday
    @Binding var selectedDays: Set<Int>

    var isSelected: Bool {
        selectedDays.contains(dayOfWeek)
    }

    var body: some View {
        Button {
            if isSelected {
                selectedDays.remove(dayOfWeek)
            } else {
                selectedDays.insert(dayOfWeek)
            }
        } label: {
            Text(day)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(isSelected ? .white : .primary)
                .frame(width: 32, height: 32)
                .background(isSelected ? Color.accentColor : Color(.systemGray6))
                .clipShape(Circle())
        }
    }
}

extension ScheduleFormMode {
    var isEditing: Bool {
        if case .edit = self { return true }
        return false
    }
}
