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
    @State private var showDatePicker = false

    // Photo state
    @State private var existingHorse: Horse?
    @State private var coverImage: UIImage?
    @State private var avatarImage: UIImage?
    @State private var showCoverPhotoPicker = false
    @State private var showAvatarPhotoPicker = false
    @State private var coverPhotoRemoved = false
    @State private var avatarPhotoRemoved = false
    @State private var isUploadingPhotos = false

    private var isEditing: Bool { horseId != nil }

    var body: some View {
        NavigationStack {
            Form {
                // Photos Section
                Section(String(localized: "horse.form.photos")) {
                    // Cover photo slot (wide rectangle, 16:9 aspect)
                    PhotoSlotView(
                        image: coverImage,
                        remoteURL: existingHorse?.coverPhotoLargeURL ?? existingHorse?.coverPhotoURL,
                        placeholder: "photo.fill",
                        aspectRatio: 16/9,
                        label: String(localized: "horse.photo.cover")
                    )
                    .frame(height: 200)
                    .onTapGesture { showCoverPhotoPicker = true }

                    // Avatar photo slot (square, shown as circle)
                    HStack {
                        Spacer()
                        PhotoSlotView(
                            image: avatarImage,
                            remoteURL: existingHorse?.avatarPhotoMediumURL ?? existingHorse?.avatarPhotoURL,
                            placeholder: "person.crop.circle.fill",
                            aspectRatio: 1,
                            label: String(localized: "horse.photo.avatar")
                        )
                        .frame(width: 120, height: 120)
                        .clipShape(Circle())
                        .onTapGesture { showAvatarPhotoPicker = true }
                        Spacer()
                    }
                    .padding(.vertical, EquiDutyDesign.Spacing.sm)
                }

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
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                        HStack {
                            Text(String(localized: "horse.date_of_birth"))
                            Spacer()
                            if let dob = dateOfBirth {
                                Text(dob.formatted(date: .long, time: .omitted))
                                    .foregroundStyle(.secondary)
                            } else {
                                Text(String(localized: "common.not_specified"))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            withAnimation {
                                showDatePicker.toggle()
                                if showDatePicker && dateOfBirth == nil {
                                    dateOfBirth = Date()
                                }
                            }
                        }

                        if showDatePicker {
                            DatePicker(
                                String(localized: "horse.date_of_birth"),
                                selection: Binding(
                                    get: { dateOfBirth ?? Date() },
                                    set: { dateOfBirth = $0 }
                                ),
                                displayedComponents: .date
                            )
                            .datePickerStyle(.graphical)

                            Button(String(localized: "horse.date_of_birth.clear"), role: .destructive) {
                                dateOfBirth = nil
                                withAnimation { showDatePicker = false }
                            }
                            .font(.caption)
                        }
                    }

                    HStack {
                        TextField(String(localized: "horse.height"), text: $withersHeight)
                            .keyboardType(.numberPad)
                        Text(String(localized: "common.unit.cm"))
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
                        if isSaving || isUploadingPhotos {
                            ProgressView()
                        } else {
                            Text(String(localized: "common.save"))
                        }
                    }
                    .disabled(isSaving || isUploadingPhotos || name.isEmpty)
                }
            }
            .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
                Button(String(localized: "common.ok")) {
                    errorMessage = nil
                }
            } message: {
                Text(errorMessage ?? "")
            }
            .sheet(isPresented: $showCoverPhotoPicker) {
                PhotoSourceSheet(
                    title: String(localized: "horse.photo.cover"),
                    hasExistingPhoto: coverImage != nil || existingHorse?.coverPhotoURL != nil,
                    selectedImage: $coverImage,
                    onRemove: {
                        coverImage = nil
                        coverPhotoRemoved = true
                    }
                )
            }
            .sheet(isPresented: $showAvatarPhotoPicker) {
                PhotoSourceSheet(
                    title: String(localized: "horse.photo.avatar"),
                    hasExistingPhoto: avatarImage != nil || existingHorse?.avatarPhotoURL != nil,
                    selectedImage: $avatarImage,
                    onRemove: {
                        avatarImage = nil
                        avatarPhotoRemoved = true
                    }
                )
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
                    existingHorse = horse
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
            let targetId: String

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
                targetId = horseId
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
                targetId = try await horseService.createHorse(newHorse)
            }

            // Upload photos if changed
            if coverImage != nil || avatarImage != nil || coverPhotoRemoved || avatarPhotoRemoved {
                isUploadingPhotos = true
                let uploadService = ImageUploadService.shared

                if let coverImage = coverImage {
                    try await uploadService.uploadHorsePhoto(horseId: targetId, image: coverImage, purpose: .cover)
                }
                if let avatarImage = avatarImage {
                    try await uploadService.uploadHorsePhoto(horseId: targetId, image: avatarImage, purpose: .avatar)
                }
                if coverPhotoRemoved {
                    try await uploadService.removeHorsePhoto(horseId: targetId, purpose: .cover)
                }
                if avatarPhotoRemoved {
                    try await uploadService.removeHorsePhoto(horseId: targetId, purpose: .avatar)
                }

                isUploadingPhotos = false
            }

            isSaving = false
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
            isUploadingPhotos = false
        }
    }
}

#Preview("Create") {
    HorseFormView(horseId: nil)
}

#Preview("Edit") {
    HorseFormView(horseId: "test-horse-id")
}
