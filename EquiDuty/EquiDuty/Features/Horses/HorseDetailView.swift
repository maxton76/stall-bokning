//
//  HorseDetailView.swift
//  EquiDuty
//
//  Horse detail view with tabs for info, health, and team
//

import SwiftUI

struct HorseDetailView: View {
    let horseId: String

    @State private var horseService = HorseService.shared
    @State private var horse: Horse?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedTab: Tab = .info
    @State private var showEditSheet = false

    enum Tab: String, CaseIterable {
        case info
        case health
        case team

        var displayName: String {
            switch self {
            case .info: return String(localized: "horse.tab.info")
            case .health: return String(localized: "horse.tab.health")
            case .team: return String(localized: "horse.tab.team")
            }
        }

        var icon: String {
            switch self {
            case .info: return "info.circle"
            case .health: return "heart.text.square"
            case .team: return "person.3"
            }
        }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ErrorView(message: errorMessage) {
                    loadHorse()
                }
            } else if let horse {
                ScrollView {
                    VStack(spacing: 20) {
                        // Header
                        HorseDetailHeader(horse: horse)

                        // Tab selector
                        Picker("", selection: $selectedTab) {
                            ForEach(Tab.allCases, id: \.self) { tab in
                                Label(tab.displayName, systemImage: tab.icon)
                                    .tag(tab)
                            }
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal)

                        // Tab content
                        switch selectedTab {
                        case .info:
                            HorseInfoSection(horse: horse)
                        case .health:
                            HorseHealthSection(horse: horse)
                        case .team:
                            HorseTeamSection(horse: horse)
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
        }
        .navigationTitle(horse?.name ?? String(localized: "horse.loading"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if horse != nil {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showEditSheet = true
                    } label: {
                        Text(String(localized: "common.edit"))
                    }
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            if let horse {
                HorseFormView(horseId: horse.id)
            }
        }
        .onAppear {
            loadHorse()
        }
    }

    private func loadHorse() {
        guard !isLoading || horse == nil else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                horse = try await horseService.getHorse(id: horseId)
                if horse == nil {
                    errorMessage = String(localized: "error.horse.not_found")
                }
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
}

// MARK: - Header

struct HorseDetailHeader: View {
    let horse: Horse

    var body: some View {
        VStack(spacing: 12) {
            HorseAvatarView(horse: horse, size: 100)

            Text(horse.name)
                .font(.title)
                .fontWeight(.bold)

            HStack(spacing: 16) {
                if let breed = horse.breed {
                    Label(breed, systemImage: "tag")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let gender = horse.gender {
                    Label(gender.displayName, systemImage: "figure.stand")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 12) {
                StatusBadge(
                    status: horse.status.displayName,
                    color: horse.status == .active ? .green : .gray
                )

                if let vaccStatus = horse.vaccinationStatus {
                    VaccinationBadge(status: vaccStatus)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
    }
}

// MARK: - Info Section

struct HorseInfoSection: View {
    let horse: Horse

    var body: some View {
        VStack(spacing: 16) {
            // Basic info
            InfoCard(title: String(localized: "horse.info.basic")) {
                InfoRow(label: String(localized: "horse.color"), value: horse.color.displayName)
                if let gender = horse.gender {
                    InfoRow(label: String(localized: "horse.gender"), value: gender.displayName)
                }
                if let age = horse.age {
                    InfoRow(label: String(localized: "horse.age"), value: "\(age) \(String(localized: "common.years"))")
                }
                if let height = horse.withersHeight {
                    InfoRow(label: String(localized: "horse.height"), value: "\(height) cm")
                }
            }

            // Identification
            InfoCard(title: String(localized: "horse.info.identification")) {
                if let ueln = horse.ueln {
                    InfoRow(label: "UELN", value: ueln)
                }
                if let chip = horse.chipNumber {
                    InfoRow(label: String(localized: "horse.chip"), value: chip)
                }
            }

            // Special instructions
            if let instructions = horse.specialInstructions, !instructions.isEmpty {
                InfoCard(title: String(localized: "horse.special_instructions")) {
                    Text(instructions)
                        .font(.body)
                }
            }

            // Equipment
            if let equipment = horse.equipment, !equipment.isEmpty {
                InfoCard(title: String(localized: "horse.equipment")) {
                    ForEach(equipment) { item in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(item.name)
                                    .font(.body)
                                if let location = item.location {
                                    Text(location)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                        }
                    }
                }
            }

            // Notes
            if let notes = horse.notes, !notes.isEmpty {
                InfoCard(title: String(localized: "horse.notes")) {
                    Text(notes)
                        .font(.body)
                }
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Health Section

struct HorseHealthSection: View {
    let horse: Horse

    var body: some View {
        VStack(spacing: 16) {
            // Vaccination status
            InfoCard(title: String(localized: "horse.vaccination")) {
                if let status = horse.vaccinationStatus {
                    HStack {
                        VaccinationBadge(status: status)
                        Spacer()
                    }
                }

                if let lastDate = horse.lastVaccinationDate {
                    InfoRow(
                        label: String(localized: "horse.vaccination.last"),
                        value: lastDate.formatted(date: .abbreviated, time: .omitted)
                    )
                }

                if let nextDate = horse.nextVaccinationDue {
                    InfoRow(
                        label: String(localized: "horse.vaccination.next"),
                        value: nextDate.formatted(date: .abbreviated, time: .omitted)
                    )
                }
            }

            // Placeholder for health records
            InfoCard(title: String(localized: "horse.health_records")) {
                EmptyStateView(
                    icon: "heart.text.square",
                    title: String(localized: "horse.health_records.empty"),
                    message: String(localized: "horse.health_records.empty.message")
                )
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Team Section

struct HorseTeamSection: View {
    let horse: Horse

    var body: some View {
        VStack(spacing: 16) {
            // Owner
            InfoCard(title: String(localized: "horse.owner")) {
                HStack {
                    Image(systemName: "person.fill")
                        .foregroundStyle(.secondary)

                    VStack(alignment: .leading) {
                        Text(horse.ownerName ?? String(localized: "common.unknown"))
                            .font(.body)
                        if let email = horse.ownerEmail {
                            Text(email)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()
                }
            }

            // Stable
            if let stableName = horse.currentStableName {
                InfoCard(title: String(localized: "horse.stable")) {
                    HStack {
                        Image(systemName: "building.2.fill")
                            .foregroundStyle(.secondary)
                        Text(stableName)
                        Spacer()
                    }
                }
            }

            // Team members placeholder
            InfoCard(title: String(localized: "horse.team")) {
                EmptyStateView(
                    icon: "person.3",
                    title: String(localized: "horse.team.empty"),
                    message: String(localized: "horse.team.empty.message")
                )
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Info Card

struct InfoCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Info Row

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
        }
        .font(.body)
    }
}

#Preview {
    NavigationStack {
        HorseDetailView(horseId: "test-horse-id")
    }
}
