//
//  PublishScheduleSheet.swift
//  EquiDuty
//
//  Sheet for publishing schedule instances
//

import SwiftUI

struct PublishScheduleSheet: View {
    @Environment(\.dismiss) private var dismiss

    let schedule: RoutineSchedule
    let onPublish: (Date, Date) -> Void

    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(30 * 24 * 60 * 60)  // 30 days

    var dateRange: Int {
        Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 0
    }

    var isValid: Bool {
        endDate > startDate && dateRange <= 90
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(schedule.templateName)
                        .font(.headline)
                    Label(schedule.repeatPattern.displayName, systemImage: "repeat")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("Schema")
                }

                Section {
                    DatePicker("Från", selection: $startDate, displayedComponents: .date)
                    DatePicker("Till", selection: $endDate, displayedComponents: .date)

                    if dateRange > 0 {
                        Text("\(dateRange) dagar")
                            .font(.caption)
                            .foregroundStyle(dateRange > 90 ? .red : .secondary)
                    }

                    if dateRange > 90 {
                        Text("Maximalt 90 dagar per publicering")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                } header: {
                    Text("Datumintervall")
                }
            }
            .navigationTitle("Publicera schema")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Avbryt") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Publicera") {
                        onPublish(startDate, endDate)
                        dismiss()
                    }
                    .disabled(!isValid)
                }
            }
        }
    }
}
