//
//  OwnershipFormSheet.swift
//  EquiDuty
//
//  Form for adding/editing horse ownership records
//

import SwiftUI

struct OwnershipFormSheet: View {
    let horseId: String
    var editingOwnership: HorseOwnership?
    let onSave: (HorseOwnership) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var ownershipService = OwnershipService.shared

    @State private var ownerName = ""
    @State private var role: OwnershipRole = .primary
    @State private var percentage: Double = 100
    @State private var startDate = Date()
    @State private var endDate: Date?
    @State private var hasEndDate = false
    @State private var email = ""
    @State private var phone = ""
    @State private var notes = ""

    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isEditing: Bool { editingOwnership != nil }

    var body: some View {
        NavigationStack {
            Form {
                // Owner Info
                Section(String(localized: "horse.ownership.owner")) {
                    TextField(String(localized: "horse.ownership.name"), text: $ownerName)

                    Picker(String(localized: "horse.ownership.role"), selection: $role) {
                        ForEach(OwnershipRole.allCases, id: \.self) { role in
                            Text(role.displayName).tag(role)
                        }
                    }
                }

                // Ownership Details
                Section(String(localized: "horse.ownership.details")) {
                    HStack {
                        Text(String(localized: "horse.ownership.percentage"))
                        Spacer()
                        TextField("", value: $percentage, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                        Text("%")
                            .foregroundStyle(.secondary)
                    }

                    Slider(value: $percentage, in: 0...100, step: 1)

                    DatePicker(
                        String(localized: "horse.ownership.start_date"),
                        selection: $startDate,
                        displayedComponents: .date
                    )

                    Toggle(String(localized: "horse.ownership.has_end_date"), isOn: $hasEndDate)

                    if hasEndDate {
                        DatePicker(
                            String(localized: "horse.ownership.end_date"),
                            selection: Binding(
                                get: { endDate ?? Date() },
                                set: { endDate = $0 }
                            ),
                            in: startDate...,
                            displayedComponents: .date
                        )
                    }
                }

                // Contact Info
                Section(String(localized: "horse.ownership.contact")) {
                    TextField(String(localized: "common.email"), text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    TextField(String(localized: "common.phone"), text: $phone)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }

                // Notes
                Section(String(localized: "horse.ownership.notes")) {
                    TextEditor(text: $notes)
                        .frame(minHeight: 60)
                }
            }
            .navigationTitle(isEditing
                ? String(localized: "horse.ownership.edit")
                : String(localized: "horse.ownership.add")
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(String(localized: "common.save"))
                        }
                    }
                    .disabled(isSaving || ownerName.isEmpty || percentage <= 0)
                }
            }
            .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
                Button(String(localized: "common.ok")) {
                    errorMessage = nil
                }
            } message: {
                Text(errorMessage ?? "")
            }
            .onAppear {
                loadExistingData()
            }
            .onChange(of: hasEndDate) { _, newValue in
                if !newValue {
                    endDate = nil
                }
            }
        }
    }

    // MARK: - Data

    private func loadExistingData() {
        if let ownership = editingOwnership {
            ownerName = ownership.ownerName
            role = ownership.role
            percentage = ownership.percentage
            startDate = ownership.startDate
            endDate = ownership.endDate
            hasEndDate = ownership.endDate != nil
            email = ownership.email ?? ""
            phone = ownership.phone ?? ""
            notes = ownership.notes ?? ""
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil

        do {
            if let ownership = editingOwnership {
                // Update existing
                let updates = UpdateOwnershipRequest(
                    ownerName: ownerName,
                    role: role,
                    percentage: percentage,
                    startDate: startDate,
                    endDate: hasEndDate ? endDate : nil,
                    email: email.isEmpty ? nil : email,
                    phone: phone.isEmpty ? nil : phone,
                    notes: notes.isEmpty ? nil : notes
                )
                try await ownershipService.updateOwnership(
                    ownershipId: ownership.id,
                    updates: updates
                )

                // Create updated ownership for callback
                var updatedOwnership = ownership
                updatedOwnership.ownerName = ownerName
                updatedOwnership.role = role
                updatedOwnership.percentage = percentage
                updatedOwnership.startDate = startDate
                updatedOwnership.endDate = hasEndDate ? endDate : nil
                updatedOwnership.email = email.isEmpty ? nil : email
                updatedOwnership.phone = phone.isEmpty ? nil : phone
                updatedOwnership.notes = notes.isEmpty ? nil : notes
                onSave(updatedOwnership)
            } else {
                // Create new
                let request = CreateOwnershipRequest(
                    horseId: horseId,
                    ownerId: nil,
                    ownerName: ownerName,
                    role: role,
                    percentage: percentage,
                    startDate: startDate,
                    endDate: hasEndDate ? endDate : nil,
                    email: email.isEmpty ? nil : email,
                    phone: phone.isEmpty ? nil : phone,
                    notes: notes.isEmpty ? nil : notes
                )
                let newOwnership = try await ownershipService.addOwnership(ownership: request)
                onSave(newOwnership)
            }

            isSaving = false
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

#Preview("Add") {
    OwnershipFormSheet(
        horseId: "test-horse",
        onSave: { _ in }
    )
}

#Preview("Edit") {
    OwnershipFormSheet(
        horseId: "test-horse",
        editingOwnership: HorseOwnership(
            id: "ownership1",
            horseId: "test-horse",
            ownerId: "user1",
            ownerName: "John Doe",
            role: .primary,
            percentage: 50,
            startDate: Date().addingTimeInterval(-60 * 60 * 24 * 365),
            email: "john@example.com",
            phone: "555-1234",
            createdAt: Date(),
            updatedAt: Date()
        ),
        onSave: { _ in }
    )
}
