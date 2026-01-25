//
//  TeamMemberFormSheet.swift
//  EquiDuty
//
//  Form for adding/editing horse team members
//

import SwiftUI

struct TeamMemberFormSheet: View {
    let horseId: String
    var editingMember: HorseTeamMember?
    var editingIndex: Int?
    let onSave: (HorseTeamMember) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var horseService = HorseService.shared

    @State private var name = ""
    @State private var role: TeamMemberRole = .rider
    @State private var isPrimary = false
    @State private var email = ""
    @State private var phone = ""
    @State private var notes = ""

    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isEditing: Bool { editingMember != nil }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Info
                Section(String(localized: "horse.team.member")) {
                    TextField(String(localized: "horse.team.member.name"), text: $name)

                    Picker(String(localized: "horse.team.member.role"), selection: $role) {
                        ForEach(TeamMemberRole.allCases, id: \.self) { role in
                            Label(role.displayName, systemImage: role.icon)
                                .tag(role)
                        }
                    }

                    Toggle(String(localized: "horse.team.member.is_primary"), isOn: $isPrimary)
                }

                // Contact Info
                Section(String(localized: "horse.team.member.contact")) {
                    TextField(String(localized: "common.email"), text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    TextField(String(localized: "common.phone"), text: $phone)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }

                // Notes
                Section(String(localized: "horse.team.member.notes")) {
                    TextEditor(text: $notes)
                        .frame(minHeight: 60)
                }
            }
            .navigationTitle(isEditing
                ? String(localized: "horse.team.member.edit")
                : String(localized: "horse.team.member.add")
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
                    .disabled(isSaving || name.isEmpty)
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
        }
    }

    // MARK: - Data

    private func loadExistingData() {
        if let member = editingMember {
            name = member.name
            role = member.role
            isPrimary = member.isPrimary ?? false
            email = member.email ?? ""
            phone = member.phone ?? ""
            notes = member.notes ?? ""
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil

        let member = HorseTeamMember(
            name: name,
            role: role,
            isPrimary: isPrimary,
            email: email.isEmpty ? nil : email,
            phone: phone.isEmpty ? nil : phone,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            if let index = editingIndex {
                // Update existing
                try await horseService.updateTeamMember(
                    horseId: horseId,
                    index: index,
                    member: member
                )
            } else {
                // Create new
                try await horseService.addTeamMember(horseId: horseId, member: member)
            }

            onSave(member)
            isSaving = false
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

#Preview("Add") {
    TeamMemberFormSheet(
        horseId: "test-horse",
        onSave: { _ in }
    )
}

#Preview("Edit") {
    TeamMemberFormSheet(
        horseId: "test-horse",
        editingMember: HorseTeamMember(
            name: "Dr. Smith",
            role: .veterinarian,
            isPrimary: true,
            email: "smith@vet.com",
            phone: "555-1234",
            notes: "Available on weekends"
        ),
        editingIndex: 0,
        onSave: { _ in }
    )
}
