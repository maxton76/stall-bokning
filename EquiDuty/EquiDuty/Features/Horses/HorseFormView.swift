//
//  HorseFormView.swift
//  EquiDuty
//
//  Horse create/edit form with full field coverage

import SwiftUI

struct HorseFormView: View {
    let horseId: String?

    @Environment(\.dismiss) private var dismiss

    @State private var horseService = HorseService.shared
    @State private var authService = AuthService.shared

    // Basic info
    @State private var name = ""
    @State private var breed = ""
    @State private var color: HorseColor = .brown
    @State private var gender: HorseGender?
    @State private var dateOfBirth: Date?
    @State private var withersHeight: String = ""
    @State private var boxName = ""
    @State private var paddockName = ""
    @State private var specialInstructions = ""
    @State private var notes = ""

    // Identification
    @State private var ueln = ""
    @State private var chipNumber = ""
    @State private var federationNumber = ""
    @State private var feiPassNumber = ""
    @State private var feiExpiryDate: Date?

    // Pedigree
    @State private var sire = ""
    @State private var dam = ""
    @State private var damsire = ""
    @State private var breeder = ""
    @State private var studbook = ""

    // Management
    @State private var status: HorseStatus = .active
    @State private var usage: Set<HorseUsage> = []
    @State private var horseGroupId: String?
    @State private var dateOfArrival: Date?

    // Equipment
    @State private var equipment: [EquipmentItem] = []
    @State private var showAddEquipment = false
    @State private var editingEquipmentIndex: Int?

    // UI state
    @State private var isLoading = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showDatePicker = false
    @State private var showFeiDatePicker = false
    @State private var showArrivalDatePicker = false

    // Photo state
    @State private var existingHorse: Horse?
    @State private var coverImage: UIImage?
    @State private var avatarImage: UIImage?
    @State private var showCoverPhotoPicker = false
    @State private var showAvatarPhotoPicker = false
    @State private var coverPhotoRemoved = false
    @State private var avatarPhotoRemoved = false
    @State private var isUploadingPhotos = false

    // Horse groups
    @State private var horseGroups: [HorseGroup] = []

    private var isEditing: Bool { horseId != nil }

    var body: some View {
        NavigationStack {
            Form {
                photosSection
                basicInfoSection
                physicalSection
                placementSection
                managementSection
                identificationSection
                pedigreeSection
                equipmentSection
                instructionsSection
                notesSection
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
                    },
                    requiresCrop: true
                )
            }
            .sheet(isPresented: $showAddEquipment) {
                EquipmentFormSheet(onSave: { item in
                    equipment.append(item)
                })
            }
            .sheet(item: Binding<EquipmentEditItem?>(
                get: { editingEquipmentIndex.map { EquipmentEditItem(index: $0, item: equipment[$0]) } },
                set: { editingEquipmentIndex = $0?.index }
            )) { editItem in
                EquipmentFormSheet(
                    editingItem: editItem.item,
                    onSave: { updated in
                        equipment[editItem.index] = updated
                    }
                )
            }
            .onAppear {
                if isEditing {
                    loadHorse()
                }
                loadHorseGroups()
            }
        }
    }

    // MARK: - Sections

    private var photosSection: some View {
        Section(String(localized: "horse.form.photos")) {
            PhotoSlotView(
                image: coverImage,
                remoteURL: existingHorse?.coverPhotoLargeURL ?? existingHorse?.coverPhotoURL,
                blurhash: existingHorse?.coverPhotoBlurhash,
                placeholder: "photo.fill",
                aspectRatio: 16/9,
                label: String(localized: "horse.photo.cover")
            )
            .frame(height: 200)
            .onTapGesture { showCoverPhotoPicker = true }

            HStack {
                Spacer()
                PhotoSlotView(
                    image: avatarImage,
                    remoteURL: existingHorse?.avatarPhotoMediumURL ?? existingHorse?.avatarPhotoURL,
                    blurhash: existingHorse?.avatarPhotoBlurhash,
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
    }

    private var basicInfoSection: some View {
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
    }

    private var physicalSection: some View {
        Section(String(localized: "horse.form.physical")) {
            // Date of birth
            DatePickerRow(
                label: String(localized: "horse.date_of_birth"),
                date: $dateOfBirth,
                isExpanded: $showDatePicker
            )

            HStack {
                TextField(String(localized: "horse.height"), text: $withersHeight)
                    .keyboardType(.numberPad)
                Text(String(localized: "common.unit.cm"))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var placementSection: some View {
        Section(String(localized: "horse.form.placement")) {
            TextField(String(localized: "horse.form.box"), text: $boxName)
                .textContentType(.none)
                .autocapitalization(.none)

            TextField(String(localized: "horse.form.paddock"), text: $paddockName)
                .textContentType(.none)
                .autocapitalization(.none)
        }
    }

    private var managementSection: some View {
        Section(String(localized: "horse.form.management")) {
            // Status
            Picker(String(localized: "horse.status"), selection: $status) {
                ForEach(HorseStatus.allCases, id: \.self) { s in
                    Text(s.displayName).tag(s)
                }
            }

            // Usage types (multi-select)
            NavigationLink {
                UsageMultiSelectView(selection: $usage)
            } label: {
                HStack {
                    Text(String(localized: "horse.usage"))
                    Spacer()
                    if usage.isEmpty {
                        Text(String(localized: "common.not_specified"))
                            .foregroundStyle(.secondary)
                    } else {
                        Text(usage.map(\.displayName).joined(separator: ", "))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
            }

            // Horse group
            if !horseGroups.isEmpty {
                Picker(String(localized: "horse.form.group"), selection: $horseGroupId) {
                    Text(String(localized: "common.none")).tag(nil as String?)
                    ForEach(horseGroups) { group in
                        Text(group.name).tag(group.id as String?)
                    }
                }
            }

            // Date of arrival
            DatePickerRow(
                label: String(localized: "horse.form.date_of_arrival"),
                date: $dateOfArrival,
                isExpanded: $showArrivalDatePicker
            )
        }
    }

    private var identificationSection: some View {
        Section(String(localized: "horse.form.identification")) {
            TextField("UELN", text: $ueln)
                .textContentType(.none)
                .autocapitalization(.allCharacters)

            TextField(String(localized: "horse.chip"), text: $chipNumber)
                .textContentType(.none)

            TextField(String(localized: "horse.federation_number"), text: $federationNumber)
                .textContentType(.none)

            TextField(String(localized: "horse.fei_pass"), text: $feiPassNumber)
                .textContentType(.none)

            if !feiPassNumber.isEmpty {
                DatePickerRow(
                    label: String(localized: "horse.fei_expiry"),
                    date: $feiExpiryDate,
                    isExpanded: $showFeiDatePicker
                )
            }
        }
    }

    private var pedigreeSection: some View {
        Section(String(localized: "horse.pedigree")) {
            TextField(String(localized: "horse.pedigree.sire"), text: $sire)
            TextField(String(localized: "horse.pedigree.dam"), text: $dam)
            TextField(String(localized: "horse.pedigree.damsire"), text: $damsire)
            TextField(String(localized: "horse.pedigree.breeder"), text: $breeder)
            TextField(String(localized: "horse.pedigree.studbook"), text: $studbook)
        }
    }

    private var equipmentSection: some View {
        Section {
            ForEach(Array(equipment.enumerated()), id: \.element.id) { index, item in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.body)
                        if let location = item.location, !location.isEmpty {
                            Text(location)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    Button {
                        editingEquipmentIndex = index
                    } label: {
                        Image(systemName: "pencil")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .onDelete { indexSet in
                equipment.remove(atOffsets: indexSet)
            }

            Button {
                showAddEquipment = true
            } label: {
                Label(String(localized: "horse.equipment.add"), systemImage: "plus.circle.fill")
            }
        } header: {
            Text(String(localized: "horse.equipment"))
        }
    }

    private var instructionsSection: some View {
        Section(String(localized: "horse.special_instructions")) {
            TextEditor(text: $specialInstructions)
                .frame(minHeight: 100)
        }
    }

    private var notesSection: some View {
        Section(String(localized: "horse.notes")) {
            TextEditor(text: $notes)
                .frame(minHeight: 80)
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
                    boxName = horse.boxName ?? ""
                    paddockName = horse.paddockName ?? ""
                    ueln = horse.ueln ?? ""
                    chipNumber = horse.chipNumber ?? ""
                    specialInstructions = horse.specialInstructions ?? ""
                    notes = horse.notes ?? ""
                    // Identification
                    federationNumber = horse.federationNumber ?? ""
                    feiPassNumber = horse.feiPassNumber ?? ""
                    feiExpiryDate = horse.feiExpiryDate
                    // Pedigree
                    sire = horse.sire ?? ""
                    dam = horse.dam ?? ""
                    damsire = horse.damsire ?? ""
                    breeder = horse.breeder ?? ""
                    studbook = horse.studbook ?? ""
                    // Management
                    status = horse.status
                    usage = Set(horse.usage ?? [])
                    horseGroupId = horse.horseGroupId
                    dateOfArrival = horse.assignedAt
                    // Equipment
                    equipment = horse.equipment ?? []
                }
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func loadHorseGroups() {
        guard let orgId = authService.selectedOrganization?.id else { return }

        Task {
            do {
                let response: HorseGroupsResponse = try await APIClient.shared.get(
                    APIEndpoints.horseGroups(orgId)
                )
                horseGroups = response.groups
            } catch {
                // Non-critical - just means group picker won't show
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil

        do {
            let targetId: String
            let usageArray = usage.isEmpty ? nil : Array(usage)

            if let horseId = horseId {
                let updates = UpdateHorseRequest(
                    name: name,
                    color: color,
                    gender: gender,
                    breed: breed.isEmpty ? nil : breed,
                    age: nil,
                    status: status,
                    currentStableId: nil,
                    boxName: boxName.isEmpty ? nil : boxName,
                    paddockName: paddockName.isEmpty ? nil : paddockName,
                    notes: notes.isEmpty ? nil : notes,
                    specialInstructions: specialInstructions.isEmpty ? nil : specialInstructions,
                    equipment: equipment.isEmpty ? nil : equipment,
                    horseGroupId: horseGroupId,
                    dateOfBirth: dateOfBirth,
                    withersHeight: Int(withersHeight),
                    ueln: ueln.isEmpty ? nil : ueln,
                    chipNumber: chipNumber.isEmpty ? nil : chipNumber,
                    federationNumber: federationNumber.isEmpty ? nil : federationNumber,
                    feiPassNumber: feiPassNumber.isEmpty ? nil : feiPassNumber,
                    feiExpiryDate: feiExpiryDate,
                    sire: sire.isEmpty ? nil : sire,
                    dam: dam.isEmpty ? nil : dam,
                    damsire: damsire.isEmpty ? nil : damsire,
                    breeder: breeder.isEmpty ? nil : breeder,
                    studbook: studbook.isEmpty ? nil : studbook,
                    usage: usageArray,
                    assignedAt: dateOfArrival
                )
                try await horseService.updateHorse(id: horseId, updates: updates)
                targetId = horseId
            } else {
                var newHorse = CreateHorseRequest(
                    name: name,
                    color: color,
                    gender: gender,
                    breed: breed.isEmpty ? nil : breed,
                    age: nil,
                    status: status,
                    currentStableId: authService.selectedStable?.id,
                    boxName: boxName.isEmpty ? nil : boxName,
                    paddockName: paddockName.isEmpty ? nil : paddockName,
                    notes: notes.isEmpty ? nil : notes,
                    specialInstructions: specialInstructions.isEmpty ? nil : specialInstructions,
                    equipment: equipment.isEmpty ? nil : equipment,
                    horseGroupId: horseGroupId,
                    dateOfBirth: dateOfBirth,
                    withersHeight: Int(withersHeight),
                    ueln: ueln.isEmpty ? nil : ueln,
                    chipNumber: chipNumber.isEmpty ? nil : chipNumber,
                    isExternal: false
                )
                newHorse.federationNumber = federationNumber.isEmpty ? nil : federationNumber
                newHorse.feiPassNumber = feiPassNumber.isEmpty ? nil : feiPassNumber
                newHorse.feiExpiryDate = feiExpiryDate
                newHorse.sire = sire.isEmpty ? nil : sire
                newHorse.dam = dam.isEmpty ? nil : dam
                newHorse.damsire = damsire.isEmpty ? nil : damsire
                newHorse.breeder = breeder.isEmpty ? nil : breeder
                newHorse.studbook = studbook.isEmpty ? nil : studbook
                newHorse.usage = usageArray
                targetId = try await horseService.createHorse(newHorse)
            }

            // Upload photos if changed
            if coverImage != nil || avatarImage != nil || coverPhotoRemoved || avatarPhotoRemoved {
                isUploadingPhotos = true
                let uploadService = ImageUploadService.shared

                if let coverImage = coverImage {
                    _ = try await uploadService.uploadHorsePhoto(horseId: targetId, image: coverImage, purpose: .cover)
                }
                if let avatarImage = avatarImage {
                    _ = try await uploadService.uploadHorsePhoto(horseId: targetId, image: avatarImage, purpose: .avatar)
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

// MARK: - Horse Groups Response

struct HorseGroupsResponse: Codable {
    let groups: [HorseGroup]
}

// MARK: - Date Picker Row (Reusable)

struct DatePickerRow: View {
    let label: String
    @Binding var date: Date?
    @Binding var isExpanded: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack {
                Text(label)
                Spacer()
                if let d = date {
                    Text(d.formatted(date: .long, time: .omitted))
                        .foregroundStyle(.secondary)
                } else {
                    Text(String(localized: "common.not_specified"))
                        .foregroundStyle(.secondary)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                withAnimation {
                    isExpanded.toggle()
                    if isExpanded && date == nil {
                        date = Date()
                    }
                }
            }

            if isExpanded {
                DatePicker(
                    label,
                    selection: Binding(
                        get: { date ?? Date() },
                        set: { date = $0 }
                    ),
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)

                Button(String(localized: "common.clear"), role: .destructive) {
                    date = nil
                    withAnimation { isExpanded = false }
                }
                .font(.caption)
            }
        }
    }
}

// MARK: - Usage Multi-Select View

struct UsageMultiSelectView: View {
    @Binding var selection: Set<HorseUsage>
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            ForEach(HorseUsage.allCases, id: \.self) { (usageType: HorseUsage) in
                Button {
                    if selection.contains(usageType) {
                        selection.remove(usageType)
                    } else {
                        selection.insert(usageType)
                    }
                } label: {
                    HStack {
                        Text(usageType.displayName)
                            .foregroundStyle(.primary)
                        Spacer()
                        if selection.contains(usageType) {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.tint)
                        }
                    }
                }
            }
        }
        .navigationTitle(String(localized: "horse.usage"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Equipment Form Sheet

struct EquipmentEditItem: Identifiable {
    let index: Int
    let item: EquipmentItem
    var id: Int { index }
}

struct EquipmentFormSheet: View {
    var editingItem: EquipmentItem?
    let onSave: (EquipmentItem) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var location = ""
    @State private var notes = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField(String(localized: "horse.equipment.name"), text: $name)
                TextField(String(localized: "horse.equipment.location"), text: $location)
                TextField(String(localized: "horse.equipment.notes"), text: $notes)
            }
            .navigationTitle(editingItem != nil ? String(localized: "horse.equipment.edit") : String(localized: "horse.equipment.add"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.save")) {
                        let item = EquipmentItem(
                            id: editingItem?.id ?? UUID().uuidString,
                            name: name,
                            location: location.isEmpty ? nil : location,
                            notes: notes.isEmpty ? nil : notes
                        )
                        onSave(item)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
            .onAppear {
                if let item = editingItem {
                    name = item.name
                    location = item.location ?? ""
                    notes = item.notes ?? ""
                }
            }
        }
    }
}

#Preview("Create") {
    HorseFormView(horseId: nil)
}

#Preview("Edit") {
    HorseFormView(horseId: "test-horse-id")
}
