//
//  WeeklyScheduleEditorView.swift
//  EquiDuty
//
//  Schedule and exception editors for facility management
//

import SwiftUI

// MARK: - Weekly Schedule Editor

struct WeeklyScheduleEditorView: View {
    @Bindable var viewModel: FacilityFormViewModel

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                Text(String(localized: "facilities.form.defaultHours"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                TimeBlockListEditor(blocks: $viewModel.defaultTimeBlocks)
            }
        } header: {
            Text(String(localized: "facilities.form.section.defaultHours"))
        }

        Section {
            ForEach(FacilityDayOfWeek.allCases) { day in
                DayScheduleRowView(
                    day: day,
                    schedule: Binding(
                        get: { viewModel.daySchedules[day] ?? EditableDaySchedule() },
                        set: { viewModel.daySchedules[day] = $0 }
                    )
                )
            }
        } header: {
            Text(String(localized: "facilities.form.section.perDay"))
        }
    }
}

// MARK: - Day Schedule Row

private struct DayScheduleRowView: View {
    let day: FacilityDayOfWeek
    @Binding var schedule: EditableDaySchedule

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            Toggle(day.displayName, isOn: $schedule.available)

            if schedule.available {
                Toggle(String(localized: "facilities.form.customHours"), isOn: $schedule.hasCustomHours)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if schedule.hasCustomHours {
                    TimeBlockListEditor(blocks: $schedule.timeBlocks)
                } else {
                    Text(String(localized: "facilities.form.usesDefaultHours"))
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
    }
}

// MARK: - Time Block List Editor

private struct TimeBlockListEditor: View {
    @Binding var blocks: [EditableTimeBlock]

    var body: some View {
        ForEach($blocks) { $block in
            HStack {
                DatePicker(
                    String(localized: "facilities.form.timeFrom"),
                    selection: $block.fromDate,
                    displayedComponents: .hourAndMinute
                )
                .labelsHidden()

                Text("–")
                    .foregroundStyle(.secondary)

                DatePicker(
                    String(localized: "facilities.form.timeTo"),
                    selection: $block.toDate,
                    displayedComponents: .hourAndMinute
                )
                .labelsHidden()

                if blocks.count > 1 {
                    Button(role: .destructive) {
                        blocks.removeAll { $0.id == block.id }
                    } label: {
                        Image(systemName: "minus.circle.fill")
                            .foregroundStyle(.red)
                    }
                    .buttonStyle(.plain)
                }
            }
        }

        if blocks.count < 5 {
            Button {
                blocks.append(EditableTimeBlock(from: "08:00", to: "12:00"))
            } label: {
                Label(String(localized: "facilities.form.addTimeBlock"), systemImage: "plus.circle")
                    .font(.subheadline)
            }
        }
    }
}

// MARK: - Schedule Exceptions Editor

struct ScheduleExceptionsEditorView: View {
    @Bindable var viewModel: FacilityFormViewModel
    @State private var showAddSheet = false

    var body: some View {
        Section {
            if viewModel.exceptions.isEmpty {
                Text(String(localized: "facilities.form.noExceptions"))
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
            } else {
                ForEach(Array(viewModel.exceptions.enumerated()), id: \.element.id) { index, exception in
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                        HStack {
                            Text(exception.date)
                                .font(.subheadline)
                                .fontWeight(.medium)

                            Text(exception.type == .closed
                                 ? String(localized: "facilities.form.exception.closed")
                                 : String(localized: "facilities.form.exception.modified"))
                                .font(.caption)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(exception.type == .closed ? Color.red.opacity(0.15) : Color.orange.opacity(0.15))
                                .foregroundStyle(exception.type == .closed ? .red : .orange)
                                .clipShape(Capsule())

                            Spacer()
                        }

                        if !exception.reason.isEmpty {
                            Text(exception.reason)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        if exception.type == .modified && !exception.timeBlocks.isEmpty {
                            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                                ForEach(exception.timeBlocks) { block in
                                    Text("\(block.from)–\(block.to)")
                                        .font(.caption2)
                                        .padding(.horizontal, 4)
                                        .padding(.vertical, 2)
                                        .background(Color.blue.opacity(0.1))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            viewModel.removeException(at: index)
                        } label: {
                            Label(String(localized: "common.delete"), systemImage: "trash")
                        }
                    }
                }
            }

            Button {
                showAddSheet = true
            } label: {
                Label(String(localized: "facilities.form.addException"), systemImage: "plus.circle")
                    .font(.subheadline)
            }
        } header: {
            Text(String(localized: "facilities.form.section.exceptions"))
        }
        .sheet(isPresented: $showAddSheet) {
            AddExceptionSheet { exception in
                viewModel.addException(exception)
            }
        }
    }
}

// MARK: - Add Exception Sheet

private struct AddExceptionSheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var date = Date()
    @State private var type: ScheduleExceptionType = .closed
    @State private var timeBlocks: [EditableTimeBlock] = [EditableTimeBlock(from: "08:00", to: "12:00")]
    @State private var reason = ""

    let onSave: (EditableException) -> Void

    private let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    var body: some View {
        NavigationStack {
            Form {
                DatePicker(
                    String(localized: "facilities.form.exception.date"),
                    selection: $date,
                    in: Date()...,
                    displayedComponents: .date
                )

                Picker(String(localized: "facilities.form.exception.type"), selection: $type) {
                    Text(String(localized: "facilities.form.exception.closed")).tag(ScheduleExceptionType.closed)
                    Text(String(localized: "facilities.form.exception.modified")).tag(ScheduleExceptionType.modified)
                }

                if type == .modified {
                    Section {
                        TimeBlockListEditor(blocks: $timeBlocks)
                    } header: {
                        Text(String(localized: "facilities.form.exception.customHours"))
                    }
                }

                TextField(
                    String(localized: "facilities.form.exception.reason"),
                    text: $reason,
                    axis: .vertical
                )
                .lineLimit(2...4)
            }
            .navigationTitle(String(localized: "facilities.form.addException"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.save")) {
                        let exception = EditableException(
                            date: dateFormatter.string(from: date),
                            type: type,
                            timeBlocks: type == .modified ? timeBlocks : [],
                            reason: reason
                        )
                        onSave(exception)
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
