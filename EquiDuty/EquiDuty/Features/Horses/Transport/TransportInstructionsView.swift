//
//  TransportInstructionsView.swift
//  EquiDuty
//
//  Display transport instructions for a horse

import SwiftUI

struct TransportInstructionsView: View {
    let horse: Horse

    @State private var service = TransportService.shared
    @State private var instructions: TransportInstructions?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showEditSheet = false
    @State private var showDeleteConfirmation = false
    @State private var isDeleting = false

    private var canEdit: Bool {
        RBACFilterService.shared.canEditHorse(horse)
    }

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            if isLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .padding(.vertical)
            } else if let instructions, !instructions.isEmpty {
                transportContent(instructions)
            } else {
                emptyState
            }
        }
        .padding(.horizontal)
        .task { await loadData() }
        .sheet(isPresented: $showEditSheet) {
            TransportInstructionsFormSheet(
                horseId: horse.id,
                existingInstructions: instructions,
                onSave: { updated in
                    self.instructions = updated
                }
            )
        }
        .confirmationDialog(
            String(localized: "transport.delete.title"),
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button(String(localized: "common.delete"), role: .destructive) {
                deleteInstructions()
            }
            Button(String(localized: "common.cancel"), role: .cancel) {}
        } message: {
            Text(String(localized: "transport.delete.message"))
        }
        .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
            Button(String(localized: "common.ok")) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    // MARK: - Empty state

    private var emptyState: some View {
        InfoCard(title: String(localized: "transport.title")) {
            VStack(spacing: EquiDutyDesign.Spacing.md) {
                Image(systemName: "car.rear.and.tire.marks")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
                Text(String(localized: "transport.empty"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                if canEdit {
                    Button {
                        showEditSheet = true
                    } label: {
                        Text(String(localized: "transport.add"))
                            .font(.subheadline)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, EquiDutyDesign.Spacing.sm)
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func transportContent(_ t: TransportInstructions) -> some View {
        // Header with edit/delete
        InfoCard(title: String(localized: "transport.title")) {
            if canEdit {
                HStack {
                    Spacer()
                    Button { showEditSheet = true } label: {
                        Label(String(localized: "common.edit"), systemImage: "pencil")
                            .font(.subheadline)
                    }
                    Menu {
                        Button(role: .destructive) {
                            showDeleteConfirmation = true
                        } label: {
                            Label(String(localized: "common.delete"), systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Loading behavior
            if let behavior = t.loadingBehavior {
                TransportRow(label: String(localized: "transport.loading_behavior"), value: behavior.displayName, color: behavior.color)
            }
            if let notes = t.loadingNotes, !notes.isEmpty {
                TransportNoteRow(label: String(localized: "transport.loading_notes"), value: notes)
            }

            // Position
            if let pos = t.positionPreference {
                TransportRow(label: String(localized: "transport.position"), value: pos.displayName)
            }

            // Companion
            if t.needsCompanion == true {
                TransportBoolRow(label: String(localized: "transport.needs_companion"), value: true)
                if let name = t.preferredCompanion, !name.isEmpty {
                    TransportRow(label: String(localized: "transport.preferred_companion"), value: name)
                }
            }

            // Anxiety / Sedation
            if t.travelAnxiety == true {
                TransportBoolRow(label: String(localized: "transport.travel_anxiety"), value: true, color: .orange)
                if let notes = t.travelAnxietyNotes, !notes.isEmpty {
                    TransportNoteRow(label: String(localized: "transport.anxiety_notes"), value: notes)
                }
            }
            if t.sedationRequired == true {
                TransportBoolRow(label: String(localized: "transport.sedation_required"), value: true, color: .red)
                if let notes = t.sedationNotes, !notes.isEmpty {
                    TransportNoteRow(label: String(localized: "transport.sedation_notes"), value: notes)
                }
            }
        }

        // Equipment
        let hasEquipment = t.travelBoots == true || t.travelBlanket == true || t.headProtection == true || t.tailGuard == true || t.pollGuard == true
        if hasEquipment {
            InfoCard(title: String(localized: "transport.equipment")) {
                if t.travelBoots == true { TransportBoolRow(label: String(localized: "transport.travel_boots"), value: true) }
                if t.travelBlanket == true { TransportBoolRow(label: String(localized: "transport.travel_blanket"), value: true) }
                if t.headProtection == true { TransportBoolRow(label: String(localized: "transport.head_protection"), value: true) }
                if t.tailGuard == true { TransportBoolRow(label: String(localized: "transport.tail_guard"), value: true) }
                if t.pollGuard == true { TransportBoolRow(label: String(localized: "transport.poll_guard"), value: true) }
            }
        }

        // Feeding
        if t.feedDuringTransport == true || t.hayNetRequired == true {
            InfoCard(title: String(localized: "transport.feeding")) {
                if t.feedDuringTransport == true {
                    TransportBoolRow(label: String(localized: "transport.feed_during"), value: true)
                    if let inst = t.feedingInstructions, !inst.isEmpty {
                        TransportNoteRow(label: String(localized: "transport.feeding_instructions"), value: inst)
                    }
                }
                if t.hayNetRequired == true { TransportBoolRow(label: String(localized: "transport.hay_net"), value: true) }
                if let water = t.waterInstructions, !water.isEmpty {
                    TransportNoteRow(label: String(localized: "transport.water_instructions"), value: water)
                }
            }
        }

        // Health & Rest
        let hasHealthRest = t.motionSickness == true || t.temperaturePreference != nil || t.maxTravelTime != nil
        if hasHealthRest {
            InfoCard(title: String(localized: "transport.health_rest")) {
                if t.motionSickness == true { TransportBoolRow(label: String(localized: "transport.motion_sickness"), value: true, color: .orange) }
                if let temp = t.temperaturePreference { TransportRow(label: String(localized: "transport.temperature"), value: temp.displayName) }
                if let vent = t.ventilationNeeds, !vent.isEmpty { TransportRow(label: String(localized: "transport.ventilation"), value: vent) }
                if let max = t.maxTravelTime { TransportRow(label: String(localized: "transport.max_travel_time"), value: String(localized: "transport.hours \(Int(max))")) }
                if let freq = t.restBreakFrequency { TransportRow(label: String(localized: "transport.rest_frequency"), value: String(localized: "transport.hours \(Int(freq))")) }
                if t.unloadForRest == true { TransportBoolRow(label: String(localized: "transport.unload_for_rest"), value: true) }
            }
        }

        // Emergency contacts
        if let contacts = t.emergencyContacts, !contacts.isEmpty {
            InfoCard(title: String(localized: "transport.emergency_contacts")) {
                ForEach(contacts) { contact in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(contact.name)
                                    .fontWeight(.medium)
                                if contact.isPrimary == true {
                                    Text(String(localized: "transport.primary"))
                                        .font(.caption2)
                                        .foregroundStyle(.blue)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(.blue.opacity(0.1))
                                        .clipShape(Capsule())
                                }
                            }
                            Text(contact.phone)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            if let rel = contact.relationship, !rel.isEmpty {
                                Text(rel)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if let sanitized = contact.phone.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
                           let url = URL(string: "tel:\(sanitized)") {
                            Link(destination: url) {
                                Image(systemName: "phone.fill")
                                    .foregroundStyle(.green)
                            }
                        }
                    }
                }
            }
        }

        // Insurance
        if let insurance = t.insuranceProvider, !insurance.isEmpty {
            InfoCard(title: String(localized: "transport.insurance")) {
                TransportRow(label: String(localized: "transport.insurance_provider"), value: insurance)
                if let policy = t.insurancePolicyNumber, !policy.isEmpty {
                    TransportRow(label: String(localized: "transport.policy_number"), value: policy)
                }
            }
        }

        // General notes
        if let notes = t.notes, !notes.isEmpty {
            InfoCard(title: String(localized: "transport.notes")) {
                Text(notes)
                    .font(.body)
            }
        }
    }

    // MARK: - Data

    private func loadData() async {
        isLoading = true
        defer { isLoading = false }
        do {
            instructions = try await service.getTransportInstructions(horseId: horse.id)
        } catch {
            // No transport data is fine
            instructions = nil
        }
    }

    private func deleteInstructions() {
        guard !isDeleting else { return }
        isDeleting = true
        Task {
            do {
                try await service.deleteTransportInstructions(horseId: horse.id)
                instructions = nil
            } catch {
                errorMessage = error.localizedDescription
            }
            isDeleting = false
        }
    }
}

// MARK: - Transport Display Rows

struct TransportRow: View {
    let label: String
    let value: String
    var color: Color = .primary

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .foregroundStyle(color)
        }
        .font(.body)
    }
}

struct TransportBoolRow: View {
    let label: String
    let value: Bool
    var color: Color = .green

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Image(systemName: value ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(value ? color : .secondary)
        }
        .font(.body)
    }
}

struct TransportNoteRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.body)
        }
    }
}
