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
        case history

        var displayName: String {
            switch self {
            case .info: return String(localized: "horse.tab.info")
            case .health: return String(localized: "horse.tab.health")
            case .team: return String(localized: "horse.tab.team")
            case .history: return String(localized: "horse.tab.history")
            }
        }

        var icon: String {
            switch self {
            case .info: return "info.circle"
            case .health: return "heart.text.square"
            case .team: return "person.3"
            case .history: return "clock.arrow.circlepath"
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
                            HorseHealthTabView(horse: horse)
                        case .team:
                            HorseTeamTabView(horse: horse)
                        case .history:
                            HorseActivityHistoryView(horseId: horse.id)
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
        VStack(spacing: EquiDutyDesign.Spacing.md) {
            HorseAvatarView(horse: horse, size: 100)

            Text(horse.name)
                .font(.title)
                .fontWeight(.bold)

            HStack(spacing: EquiDutyDesign.Spacing.standard) {
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

            HStack(spacing: EquiDutyDesign.Spacing.md) {
                ModernStatusBadge(
                    status: horse.status.displayName,
                    color: horse.status == .active ? .green : .gray,
                    icon: horse.status == .active ? "checkmark.circle.fill" : "circle"
                )

                if let vaccStatus = horse.vaccinationStatus {
                    VaccinationBadge(status: vaccStatus)
                }
            }
        }
        .padding(EquiDutyDesign.Spacing.standard)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
    }
}

// MARK: - Info Section

struct HorseInfoSection: View {
    let horse: Horse

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            // Basic info
            InfoCard(title: String(localized: "horse.info.basic")) {
                InfoRow(label: String(localized: "horse.color"), value: horse.color.displayName)
                if let gender = horse.gender {
                    InfoRow(label: String(localized: "horse.gender"), value: gender.displayName)
                }
                if let age = horse.age {
                    InfoRow(label: String(localized: "horse.age"), value: "\(age) \(String(localized: "common.years"))")
                }
                if let dob = horse.dateOfBirth {
                    InfoRow(
                        label: String(localized: "horse.date_of_birth"),
                        value: dob.formatted(date: .abbreviated, time: .omitted)
                    )
                }
                if let height = horse.withersHeight {
                    InfoRow(label: String(localized: "horse.height"), value: "\(height) cm")
                }
                if let usage = horse.usage, !usage.isEmpty {
                    HStack {
                        Text(String(localized: "horse.usage"))
                            .foregroundStyle(.secondary)
                        Spacer()
                        HStack(spacing: EquiDutyDesign.Spacing.xs) {
                            ForEach(usage, id: \.self) { u in
                                UsageBadge(usage: u)
                            }
                        }
                    }
                    .font(.body)
                }
            }

            // Identification
            IdentificationCard(horse: horse)

            // Pedigree (if any data available)
            if horse.sire != nil || horse.dam != nil || horse.breeder != nil {
                PedigreeCard(horse: horse)
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

// MARK: - Usage Badge

struct UsageBadge: View {
    let usage: HorseUsage

    var body: some View {
        Text(usage.displayName)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, EquiDutyDesign.Spacing.sm)
            .padding(.vertical, EquiDutyDesign.Spacing.xs)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }

    private var color: Color {
        switch usage {
        case .care: return .green
        case .sport: return .blue
        case .breeding: return .purple
        }
    }
}

// MARK: - Identification Card

struct IdentificationCard: View {
    let horse: Horse

    var body: some View {
        InfoCard(title: String(localized: "horse.info.identification")) {
            if let ueln = horse.ueln, !ueln.isEmpty {
                CopyableInfoRow(label: "UELN", value: ueln)
            }
            if let chip = horse.chipNumber, !chip.isEmpty {
                CopyableInfoRow(label: String(localized: "horse.chip"), value: chip)
            }
            if let federation = horse.federationNumber, !federation.isEmpty {
                CopyableInfoRow(label: String(localized: "horse.federation_number"), value: federation)
            }
            if let fei = horse.feiPassNumber, !fei.isEmpty {
                HStack {
                    CopyableInfoRow(label: String(localized: "horse.fei_pass"), value: fei)
                }
                if let expiryDate = horse.feiExpiryDate {
                    HStack {
                        Spacer()
                        FEIExpiryBadge(expiryDate: expiryDate)
                    }
                }
            }

            // Show empty state if no identification
            if horse.ueln == nil && horse.chipNumber == nil &&
               horse.federationNumber == nil && horse.feiPassNumber == nil {
                Text(String(localized: "horse.identification.empty"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Copyable Info Row

struct CopyableInfoRow: View {
    let label: String
    let value: String

    @State private var showCopied = false

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.body.monospaced())

            Button {
                UIPasteboard.general.string = value
                showCopied = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    showCopied = false
                }
            } label: {
                Image(systemName: showCopied ? "checkmark" : "doc.on.doc")
                    .font(.caption)
                    .foregroundStyle(showCopied ? .green : .secondary)
            }
            .buttonStyle(.plain)
        }
        .font(.body)
    }
}

// MARK: - FEI Expiry Badge

struct FEIExpiryBadge: View {
    let expiryDate: Date

    private var daysUntilExpiry: Int {
        Calendar.current.dateComponents([.day], from: Date(), to: expiryDate).day ?? 0
    }

    private var status: ExpiryStatus {
        if daysUntilExpiry < 0 {
            return .expired
        } else if daysUntilExpiry <= 30 {
            return .expiringSoon
        } else {
            return .valid
        }
    }

    enum ExpiryStatus {
        case valid, expiringSoon, expired
    }

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.xs) {
            Image(systemName: status == .valid ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .font(.caption2)

            switch status {
            case .expired:
                Text(String(localized: "horse.fei.expired"))
            case .expiringSoon:
                Text(String(localized: "horse.fei.expires_soon \(expiryDate.formatted(date: .abbreviated, time: .omitted))"))
            case .valid:
                Text(String(localized: "horse.fei.valid_until \(expiryDate.formatted(date: .abbreviated, time: .omitted))"))
            }
        }
        .font(.caption)
        .fontWeight(.medium)
        .foregroundStyle(statusColor)
        .padding(.horizontal, EquiDutyDesign.Spacing.sm)
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
        .background(statusColor.opacity(0.15))
        .clipShape(Capsule())
    }

    private var statusColor: Color {
        switch status {
        case .valid: return .green
        case .expiringSoon: return .orange
        case .expired: return .red
        }
    }
}

// MARK: - Pedigree Card

struct PedigreeCard: View {
    let horse: Horse

    var body: some View {
        InfoCard(title: String(localized: "horse.pedigree")) {
            if let sire = horse.sire, !sire.isEmpty {
                InfoRow(label: String(localized: "horse.pedigree.sire"), value: sire)
            }
            if let dam = horse.dam, !dam.isEmpty {
                InfoRow(label: String(localized: "horse.pedigree.dam"), value: dam)
            }
            if let damsire = horse.damsire, !damsire.isEmpty {
                InfoRow(label: String(localized: "horse.pedigree.damsire"), value: damsire)
            }
            if let breeder = horse.breeder, !breeder.isEmpty {
                InfoRow(label: String(localized: "horse.pedigree.breeder"), value: breeder)
            }
            if let studbook = horse.studbook, !studbook.isEmpty {
                InfoRow(label: String(localized: "horse.pedigree.studbook"), value: studbook)
            }
        }
    }
}


// MARK: - Info Card

struct InfoCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Text(title)
                .font(.headline)

            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentCard()
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
