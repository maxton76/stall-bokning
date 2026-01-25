//
//  HorseFormView.swift
//  EquiDuty
//
//  Horse create/edit form
//

import SwiftUI

struct HorseFormView: View {
    let horseId: String?

    @Environment(\.dismiss) private var dismiss

    @State private var horseService = HorseService.shared
    @State private var authService = AuthService.shared

    @State private var name = ""
    @State private var breed = ""
    @State private var color: HorseColor = .brown
    @State private var gender: HorseGender?
    @State private var dateOfBirth: Date?
    @State private var withersHeight: String = ""
    @State private var ueln = ""
    @State private var chipNumber = ""
    @State private var specialInstructions = ""
    @State private var notes = ""

    @State private var isLoading = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isEditing: Bool { horseId != nil }

    var body: some View {
        NavigationStack {
            Form {
                // Basic info
                Section(String(localized: "horse.form.basic")) {
                    TextField(String(localized: "horse.name"), text: $name)

                    TextField(String(localized: "horse.breed"), text: $breed)

                    Picker(String(localized: "horse.color"), selection: $color) {
                        ForEach(HorseColor.allCases, id: \.self) { color in
                            Text(color.displayName).tag(color)
                        }
                    }

                    Picker(String(localized: "horse.gender"), selection: $gender) {
                        Text(String(localized: "common.not_specified")).tag(nil as HorseGender?)
                        ForEach(HorseGender.allCases, id: \.self) { gender in
                            Text(gender.displayName).tag(gender as HorseGender?)
                        }
                    }
                }

                // Physical details
                Section(String(localized: "horse.form.physical")) {
                    DatePicker(
                        String(localized: "horse.date_of_birth"),
                        selection: Binding(
                            get: { dateOfBirth ?? Date() },
                            set: { dateOfBirth = $0 }
                        ),
                        displayedComponents: .date
                    )

                    HStack {
                        TextField(String(localized: "horse.height"), text: $withersHeight)
                            .keyboardType(.numberPad)
                        Text("cm")
                            .foregroundStyle(.secondary)
                    }
                }

                // Identification
                Section(String(localized: "horse.form.identification")) {
                    TextField("UELN", text: $ueln)
                        .textContentType(.none)
                        .autocapitalization(.allCharacters)

                    TextField(String(localized: "horse.chip"), text: $chipNumber)
                        .textContentType(.none)
                }

                // Special instructions
                Section(String(localized: "horse.special_instructions")) {
                    TextEditor(text: $specialInstructions)
                        .frame(minHeight: 100)
                }

                // Notes
                Section(String(localized: "horse.notes")) {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }
            }
            .navigationTitle(isEditing ? String(localized: "horse.edit") : String(localized: "horse.add"))
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
                if isEditing {
                    loadHorse()
                }
            }
        }
    }

    // MARK: - Data

    private func loadHorse() {
        guard let horseId = horseId else { return }

        isLoading = true

        Task {
            do {
                if let horse = try await horseService.getHorse(id: horseId) {
                    name = horse.name
                    breed = horse.breed ?? ""
                    color = horse.color
                    gender = horse.gender
                    dateOfBirth = horse.dateOfBirth
                    withersHeight = horse.withersHeight.map { String($0) } ?? ""
                    ueln = horse.ueln ?? ""
                    chipNumber = horse.chipNumber ?? ""
                    specialInstructions = horse.specialInstructions ?? ""
                    notes = horse.notes ?? ""
                }
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil

        do {
            if let horseId = horseId {
                // Update existing horse
                let updates = UpdateHorseRequest(
                    name: name,
                    color: color,
                    gender: gender,
                    breed: breed.isEmpty ? nil : breed,
                    age: nil,
                    status: nil,
                    currentStableId: nil,
                    notes: notes.isEmpty ? nil : notes,
                    specialInstructions: specialInstructions.isEmpty ? nil : specialInstructions,
                    equipment: nil,
                    horseGroupId: nil,
                    dateOfBirth: dateOfBirth,
                    withersHeight: Int(withersHeight),
                    ueln: ueln.isEmpty ? nil : ueln,
                    chipNumber: chipNumber.isEmpty ? nil : chipNumber
                )
                try await horseService.updateHorse(id: horseId, updates: updates)
            } else {
                // Create new horse
                let newHorse = CreateHorseRequest(
                    name: name,
                    color: color,
                    gender: gender,
                    breed: breed.isEmpty ? nil : breed,
                    age: nil,
                    status: .active,
                    currentStableId: authService.selectedStable?.id,
                    notes: notes.isEmpty ? nil : notes,
                    specialInstructions: specialInstructions.isEmpty ? nil : specialInstructions,
                    equipment: nil,
                    horseGroupId: nil,
                    dateOfBirth: dateOfBirth,
                    withersHeight: Int(withersHeight),
                    ueln: ueln.isEmpty ? nil : ueln,
                    chipNumber: chipNumber.isEmpty ? nil : chipNumber,
                    isExternal: false
                )
                _ = try await horseService.createHorse(newHorse)
            }

            isSaving = false
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

#Preview("Create") {
    HorseFormView(horseId: nil)
}

#Preview("Edit") {
    HorseFormView(horseId: "test-horse-id")
}
