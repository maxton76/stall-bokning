//
//  TransportInstructionsFormSheet.swift
//  EquiDuty
//
//  Create/edit transport instructions form

import SwiftUI

struct TransportInstructionsFormSheet: View {
    let horseId: String
    var existingInstructions: TransportInstructions?
    let onSave: (TransportInstructions) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var service = TransportService.shared

    // Loading
    @State private var loadingBehavior: LoadingBehavior = .unknown
    @State private var loadingNotes = ""

    // Position
    @State private var positionPreference: TransportPosition = .any
    @State private var needsCompanion = false
    @State private var preferredCompanion = ""

    // Travel
    @State private var travelAnxiety = false
    @State private var travelAnxietyNotes = ""
    @State private var sedationRequired = false
    @State private var sedationNotes = ""

    // Feeding
    @State private var feedDuringTransport = false
    @State private var feedingInstructions = ""
    @State private var hayNetRequired = false
    @State private var waterInstructions = ""

    // Equipment
    @State private var travelBoots = false
    @State private var travelBlanket = false
    @State private var headProtection = false
    @State private var tailGuard = false
    @State private var pollGuard = false

    // Health
    @State private var motionSickness = false
    @State private var ventilationNeeds = ""
    @State private var temperaturePreference: TemperaturePreference = .normal

    // Rest
    @State private var maxTravelTime = ""
    @State private var restBreakFrequency = ""
    @State private var unloadForRest = false

    // Emergency contacts
    @State private var emergencyContacts: [TransportEmergencyContact] = []
    @State private var showAddContact = false

    // Insurance
    @State private var insuranceProvider = ""
    @State private var insurancePolicyNumber = ""

    // Notes
    @State private var notes = ""

    // State
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                // Loading behavior
                Section(String(localized: "transport.section.loading")) {
                    Picker(String(localized: "transport.loading_behavior"), selection: $loadingBehavior) {
                        ForEach(LoadingBehavior.allCases) { b in
                            Text(b.displayName).tag(b)
                        }
                    }
                    TextField(String(localized: "transport.loading_notes"), text: $loadingNotes, axis: .vertical)
                        .lineLimit(2...4)
                }

                // Position & companion
                Section(String(localized: "transport.section.position")) {
                    Picker(String(localized: "transport.position"), selection: $positionPreference) {
                        ForEach(TransportPosition.allCases) { p in
                            Text(p.displayName).tag(p)
                        }
                    }
                    Toggle(String(localized: "transport.needs_companion"), isOn: $needsCompanion)
                    if needsCompanion {
                        TextField(String(localized: "transport.preferred_companion"), text: $preferredCompanion)
                    }
                }

                // Travel requirements
                Section(String(localized: "transport.section.travel")) {
                    Toggle(String(localized: "transport.travel_anxiety"), isOn: $travelAnxiety)
                    if travelAnxiety {
                        TextField(String(localized: "transport.anxiety_notes"), text: $travelAnxietyNotes, axis: .vertical)
                            .lineLimit(2...4)
                    }
                    Toggle(String(localized: "transport.sedation_required"), isOn: $sedationRequired)
                    if sedationRequired {
                        TextField(String(localized: "transport.sedation_notes"), text: $sedationNotes, axis: .vertical)
                            .lineLimit(2...4)
                    }
                }

                // Feeding
                Section(String(localized: "transport.section.feeding")) {
                    Toggle(String(localized: "transport.feed_during"), isOn: $feedDuringTransport)
                    if feedDuringTransport {
                        TextField(String(localized: "transport.feeding_instructions"), text: $feedingInstructions, axis: .vertical)
                            .lineLimit(2...4)
                    }
                    Toggle(String(localized: "transport.hay_net"), isOn: $hayNetRequired)
                    TextField(String(localized: "transport.water_instructions"), text: $waterInstructions, axis: .vertical)
                        .lineLimit(2...4)
                }

                // Equipment
                Section(String(localized: "transport.section.equipment")) {
                    Toggle(String(localized: "transport.travel_boots"), isOn: $travelBoots)
                    Toggle(String(localized: "transport.travel_blanket"), isOn: $travelBlanket)
                    Toggle(String(localized: "transport.head_protection"), isOn: $headProtection)
                    Toggle(String(localized: "transport.tail_guard"), isOn: $tailGuard)
                    Toggle(String(localized: "transport.poll_guard"), isOn: $pollGuard)
                }

                // Health & environment
                Section(String(localized: "transport.section.health")) {
                    Toggle(String(localized: "transport.motion_sickness"), isOn: $motionSickness)
                    Picker(String(localized: "transport.temperature"), selection: $temperaturePreference) {
                        ForEach(TemperaturePreference.allCases) { t in
                            Text(t.displayName).tag(t)
                        }
                    }
                    TextField(String(localized: "transport.ventilation"), text: $ventilationNeeds)
                }

                // Rest requirements
                Section(String(localized: "transport.section.rest")) {
                    HStack {
                        TextField(String(localized: "transport.max_travel_time"), text: $maxTravelTime)
                            .keyboardType(.decimalPad)
                        Text(String(localized: "common.unit.hours"))
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        TextField(String(localized: "transport.rest_frequency"), text: $restBreakFrequency)
                            .keyboardType(.decimalPad)
                        Text(String(localized: "common.unit.hours"))
                            .foregroundStyle(.secondary)
                    }
                    Toggle(String(localized: "transport.unload_for_rest"), isOn: $unloadForRest)
                }

                // Emergency contacts
                Section(String(localized: "transport.section.emergency")) {
                    ForEach(Array(emergencyContacts.enumerated()), id: \.offset) { index, contact in
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(contact.name)
                                    .fontWeight(.medium)
                                if contact.isPrimary == true {
                                    Text(String(localized: "transport.primary"))
                                        .font(.caption2)
                                        .foregroundStyle(.blue)
                                }
                                Spacer()
                                Button(role: .destructive) {
                                    emergencyContacts.remove(at: index)
                                } label: {
                                    Image(systemName: "trash")
                                        .font(.caption)
                                }
                                .buttonStyle(.plain)
                            }
                            Text(contact.phone)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Button {
                        showAddContact = true
                    } label: {
                        Label(String(localized: "transport.add_contact"), systemImage: "plus.circle.fill")
                    }
                }

                // Insurance
                Section(String(localized: "transport.section.insurance")) {
                    TextField(String(localized: "transport.insurance_provider"), text: $insuranceProvider)
                    TextField(String(localized: "transport.policy_number"), text: $insurancePolicyNumber)
                }

                // Notes
                Section(String(localized: "transport.section.notes")) {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }
            }
            .navigationTitle(existingInstructions != nil ? String(localized: "transport.edit") : String(localized: "transport.add"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving { ProgressView() } else { Text(String(localized: "common.save")) }
                    }
                    .disabled(isSaving)
                }
            }
            .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
                Button(String(localized: "common.ok")) { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
            .sheet(isPresented: $showAddContact) {
                EmergencyContactFormSheet { contact in
                    emergencyContacts.append(contact)
                }
            }
            .onAppear { populateFromExisting() }
        }
    }

    // MARK: - Data

    private func populateFromExisting() {
        guard let t = existingInstructions else { return }
        loadingBehavior = t.loadingBehavior ?? .unknown
        loadingNotes = t.loadingNotes ?? ""
        positionPreference = t.positionPreference ?? .any
        needsCompanion = t.needsCompanion ?? false
        preferredCompanion = t.preferredCompanion ?? ""
        travelAnxiety = t.travelAnxiety ?? false
        travelAnxietyNotes = t.travelAnxietyNotes ?? ""
        sedationRequired = t.sedationRequired ?? false
        sedationNotes = t.sedationNotes ?? ""
        feedDuringTransport = t.feedDuringTransport ?? false
        feedingInstructions = t.feedingInstructions ?? ""
        hayNetRequired = t.hayNetRequired ?? false
        waterInstructions = t.waterInstructions ?? ""
        travelBoots = t.travelBoots ?? false
        travelBlanket = t.travelBlanket ?? false
        headProtection = t.headProtection ?? false
        tailGuard = t.tailGuard ?? false
        pollGuard = t.pollGuard ?? false
        motionSickness = t.motionSickness ?? false
        ventilationNeeds = t.ventilationNeeds ?? ""
        temperaturePreference = t.temperaturePreference ?? .normal
        maxTravelTime = t.maxTravelTime.map { String($0) } ?? ""
        restBreakFrequency = t.restBreakFrequency.map { String($0) } ?? ""
        unloadForRest = t.unloadForRest ?? false
        emergencyContacts = t.emergencyContacts ?? []
        insuranceProvider = t.insuranceProvider ?? ""
        insurancePolicyNumber = t.insurancePolicyNumber ?? ""
        notes = t.notes ?? ""
    }

    private func save() async {
        isSaving = true
        errorMessage = nil

        // Validate numeric fields
        if !maxTravelTime.isEmpty, Double(maxTravelTime) == nil {
            errorMessage = String(localized: "transport.error.invalid_travel_time")
            isSaving = false
            return
        }
        if !restBreakFrequency.isEmpty, Double(restBreakFrequency) == nil {
            errorMessage = String(localized: "transport.error.invalid_rest_frequency")
            isSaving = false
            return
        }

        let instructions = TransportInstructions(
            loadingBehavior: loadingBehavior,
            loadingNotes: loadingNotes.isEmpty ? nil : loadingNotes,
            positionPreference: positionPreference,
            needsCompanion: needsCompanion,
            preferredCompanion: needsCompanion && !preferredCompanion.isEmpty ? preferredCompanion : nil,
            travelAnxiety: travelAnxiety,
            travelAnxietyNotes: travelAnxiety && !travelAnxietyNotes.isEmpty ? travelAnxietyNotes : nil,
            sedationRequired: sedationRequired,
            sedationNotes: sedationRequired && !sedationNotes.isEmpty ? sedationNotes : nil,
            feedDuringTransport: feedDuringTransport,
            feedingInstructions: feedDuringTransport && !feedingInstructions.isEmpty ? feedingInstructions : nil,
            hayNetRequired: hayNetRequired,
            waterInstructions: waterInstructions.isEmpty ? nil : waterInstructions,
            travelBoots: travelBoots,
            travelBlanket: travelBlanket,
            headProtection: headProtection,
            tailGuard: tailGuard,
            pollGuard: pollGuard,
            motionSickness: motionSickness,
            ventilationNeeds: ventilationNeeds.isEmpty ? nil : ventilationNeeds,
            temperaturePreference: temperaturePreference,
            maxTravelTime: Double(maxTravelTime),
            restBreakFrequency: Double(restBreakFrequency),
            unloadForRest: unloadForRest,
            emergencyContacts: emergencyContacts.isEmpty ? nil : emergencyContacts,
            insuranceProvider: insuranceProvider.isEmpty ? nil : insuranceProvider,
            insurancePolicyNumber: insurancePolicyNumber.isEmpty ? nil : insurancePolicyNumber,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            try await service.updateTransportInstructions(horseId: horseId, instructions: instructions)
            isSaving = false
            onSave(instructions)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

// MARK: - Emergency Contact Form

struct EmergencyContactFormSheet: View {
    let onSave: (TransportEmergencyContact) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var phone = ""
    @State private var relationship = ""
    @State private var isPrimary = false

    private var isPhoneValid: Bool {
        let digits = phone.filter { $0.isNumber }
        return digits.count >= 3
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField(String(localized: "transport.contact.name"), text: $name)
                TextField(String(localized: "transport.contact.phone"), text: $phone)
                    .keyboardType(.phonePad)
                TextField(String(localized: "transport.contact.relationship"), text: $relationship)
                Toggle(String(localized: "transport.contact.primary"), isOn: $isPrimary)
            }
            .navigationTitle(String(localized: "transport.add_contact"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.save")) {
                        let contact = TransportEmergencyContact(
                            name: name,
                            phone: phone,
                            relationship: relationship.isEmpty ? nil : relationship,
                            isPrimary: isPrimary
                        )
                        onSave(contact)
                        dismiss()
                    }
                    .disabled(name.isEmpty || !isPhoneValid)
                }
            }
        }
    }
}
