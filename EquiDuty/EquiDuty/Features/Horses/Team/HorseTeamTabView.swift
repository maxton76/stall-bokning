//
//  HorseTeamTabView.swift
//  EquiDuty
//
//  Team tab view for horse details showing ownership and care team
//

import SwiftUI

struct HorseTeamTabView: View {
    let horse: Horse

    @State private var ownershipService = OwnershipService.shared
    @State private var horseService = HorseService.shared

    @State private var ownerships: [HorseOwnership] = []
    @State private var teamMembers: [HorseTeamMember] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    @State private var showAddOwnership = false
    @State private var editingOwnership: HorseOwnership?
    @State private var ownershipToDelete: HorseOwnership?
    @State private var showDeleteOwnershipConfirmation = false

    @State private var showAddTeamMember = false
    @State private var editingTeamMember: (member: HorseTeamMember, index: Int)?
    @State private var teamMemberToDelete: (member: HorseTeamMember, index: Int)?
    @State private var showDeleteTeamMemberConfirmation = false

    var body: some View {
        VStack(spacing: 16) {
            // Ownership Section
            OwnershipCard(
                ownerships: ownerships,
                isLoading: isLoading,
                onAdd: { showAddOwnership = true },
                onEdit: { ownership in editingOwnership = ownership },
                onDelete: { ownership in
                    ownershipToDelete = ownership
                    showDeleteOwnershipConfirmation = true
                }
            )

            // Stable Info
            StableInfoCard(horse: horse)

            // Team Members Section
            TeamMembersCard(
                members: teamMembers,
                isLoading: isLoading,
                onAdd: { showAddTeamMember = true },
                onEdit: { member, index in editingTeamMember = (member, index) },
                onDelete: { member, index in
                    teamMemberToDelete = (member, index)
                    showDeleteTeamMemberConfirmation = true
                }
            )
        }
        .padding(.horizontal)
        .onAppear {
            loadData()
        }
        .refreshable {
            await refreshData()
        }
        // Ownership sheets
        .sheet(isPresented: $showAddOwnership) {
            OwnershipFormSheet(
                horseId: horse.id,
                onSave: { _ in loadData() }
            )
        }
        .sheet(item: $editingOwnership) { ownership in
            OwnershipFormSheet(
                horseId: horse.id,
                editingOwnership: ownership,
                onSave: { _ in loadData() }
            )
        }
        .confirmationDialog(
            String(localized: "horse.ownership.delete.title"),
            isPresented: $showDeleteOwnershipConfirmation,
            titleVisibility: .visible
        ) {
            Button(String(localized: "common.delete"), role: .destructive) {
                if let ownership = ownershipToDelete {
                    deleteOwnership(ownership)
                }
            }
            Button(String(localized: "common.cancel"), role: .cancel) {
                ownershipToDelete = nil
            }
        } message: {
            Text(String(localized: "horse.ownership.delete.message"))
        }
        // Team member sheets
        .sheet(isPresented: $showAddTeamMember) {
            TeamMemberFormSheet(
                horseId: horse.id,
                onSave: { _ in loadData() }
            )
        }
        .sheet(item: Binding(
            get: { editingTeamMember.map { EditingTeamMember(member: $0.member, index: $0.index) } },
            set: { editingTeamMember = $0.map { ($0.member, $0.index) } }
        )) { editing in
            TeamMemberFormSheet(
                horseId: horse.id,
                editingMember: editing.member,
                editingIndex: editing.index,
                onSave: { _ in loadData() }
            )
        }
        .confirmationDialog(
            String(localized: "horse.team.delete.title"),
            isPresented: $showDeleteTeamMemberConfirmation,
            titleVisibility: .visible
        ) {
            Button(String(localized: "common.delete"), role: .destructive) {
                if let toDelete = teamMemberToDelete {
                    deleteTeamMember(at: toDelete.index)
                }
            }
            Button(String(localized: "common.cancel"), role: .cancel) {
                teamMemberToDelete = nil
            }
        } message: {
            Text(String(localized: "horse.team.delete.message"))
        }
        .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
            Button(String(localized: "common.ok")) {
                errorMessage = nil
            }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        // Use embedded team data immediately (already in horse object)
        // The API endpoint returns a different structure, so we use embedded data
        teamMembers = horse.team ?? []

        Task {
            do {
                // Only fetch ownership from API (team comes from horse object)
                ownerships = try await ownershipService.getOwnership(horseId: horse.id)
                isLoading = false
            } catch {
                // Ownership API might fail, but that's separate from team
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshData() async {
        // Use embedded team data (already in horse object)
        teamMembers = horse.team ?? []

        do {
            ownerships = try await ownershipService.getOwnership(horseId: horse.id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteOwnership(_ ownership: HorseOwnership) {
        Task {
            do {
                try await ownershipService.deleteOwnership(ownershipId: ownership.id)
                ownerships.removeAll { $0.id == ownership.id }
                ownershipToDelete = nil
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func deleteTeamMember(at index: Int) {
        Task {
            do {
                try await horseService.deleteTeamMember(horseId: horse.id, index: index)
                if index < teamMembers.count {
                    teamMembers.remove(at: index)
                }
                teamMemberToDelete = nil
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Helper for sheet item binding

struct EditingTeamMember: Identifiable {
    let member: HorseTeamMember
    let index: Int
    var id: String { "\(index)-\(member.name)" }
}

// MARK: - Ownership Card

struct OwnershipCard: View {
    let ownerships: [HorseOwnership]
    let isLoading: Bool
    let onAdd: () -> Void
    let onEdit: (HorseOwnership) -> Void
    let onDelete: (HorseOwnership) -> Void

    private var totalPercentage: Double {
        ownerships.reduce(0) { $0 + $1.percentage }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with add button
            HStack {
                Text(String(localized: "horse.ownership"))
                    .font(.headline)
                Spacer()
                Button {
                    onAdd()
                } label: {
                    Label(String(localized: "common.add"), systemImage: "plus.circle.fill")
                        .font(.subheadline)
                }
            }

            // Total ownership progress
            if !ownerships.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(String(localized: "horse.ownership.total"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(Int(totalPercentage))%")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    ProgressView(value: min(totalPercentage, 100), total: 100)
                        .tint(totalPercentage == 100 ? .green : (totalPercentage > 100 ? .red : .blue))
                }
            }

            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical)
            } else if ownerships.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "person.2.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text(String(localized: "horse.ownership.empty"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button {
                        onAdd()
                    } label: {
                        Text(String(localized: "horse.ownership.add_first"))
                            .font(.subheadline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            } else {
                ForEach(ownerships) { ownership in
                    OwnershipRow(
                        ownership: ownership,
                        onEdit: { onEdit(ownership) },
                        onDelete: { onDelete(ownership) }
                    )
                    if ownership.id != ownerships.last?.id {
                        Divider()
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Ownership Row

struct OwnershipRow: View {
    let ownership: HorseOwnership
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(ownership.ownerName)
                        .font(.body)
                        .fontWeight(.medium)

                    OwnershipRoleBadge(role: ownership.role)
                }

                HStack(spacing: 8) {
                    Text("\(Int(ownership.percentage))%")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Text("•")
                        .foregroundStyle(.secondary)

                    Text(String(localized: "horse.ownership.since \(ownership.startDate.formatted(date: .abbreviated, time: .omitted))"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let email = ownership.email, !email.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "envelope.fill")
                            .font(.caption2)
                        Text(email)
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }

                if let phone = ownership.phone, !phone.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "phone.fill")
                            .font(.caption2)
                        Text(phone)
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Menu {
                Button {
                    onEdit()
                } label: {
                    Label(String(localized: "common.edit"), systemImage: "pencil")
                }
                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Label(String(localized: "common.delete"), systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Ownership Role Badge

struct OwnershipRoleBadge: View {
    let role: OwnershipRole

    var body: some View {
        Text(role.displayName)
            .font(.caption2)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }

    private var color: Color {
        switch role {
        case .primary: return .blue
        case .coOwner: return .purple
        case .syndicate: return .orange
        case .leaseholder: return .green
        }
    }
}

// MARK: - Stable Info Card

struct StableInfoCard: View {
    let horse: Horse

    var body: some View {
        if horse.currentStableName != nil || horse.externalLocation != nil {
            InfoCard(title: String(localized: "horse.location")) {
                VStack(alignment: .leading, spacing: 8) {
                    // Current stable
                    if let stableName = horse.currentStableName {
                        HStack {
                            Image(systemName: "building.2.fill")
                                .foregroundStyle(.secondary)
                            VStack(alignment: .leading) {
                                Text(stableName)
                                    .font(.body)
                                if let assignedAt = horse.assignedAt {
                                    Text(String(localized: "horse.stable.since \(assignedAt.formatted(date: .abbreviated, time: .omitted))"))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                        }
                    }

                    // External location (if horse is away)
                    if let externalLocation = horse.externalLocation, !externalLocation.isEmpty {
                        Divider()
                        HStack {
                            Image(systemName: "location.fill")
                                .foregroundStyle(.orange)
                            VStack(alignment: .leading) {
                                Text(String(localized: "horse.location.external"))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(externalLocation)
                                    .font(.body)
                                if let moveType = horse.externalMoveType {
                                    Text(moveType)
                                        .font(.caption)
                                        .foregroundStyle(.orange)
                                }
                            }
                            Spacer()
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Team Members Card

struct TeamMembersCard: View {
    let members: [HorseTeamMember]
    let isLoading: Bool
    let onAdd: () -> Void
    let onEdit: (HorseTeamMember, Int) -> Void
    let onDelete: (HorseTeamMember, Int) -> Void

    // Group members by role
    private var groupedMembers: [(role: TeamMemberRole, members: [(member: HorseTeamMember, index: Int)])] {
        var groups: [TeamMemberRole: [(HorseTeamMember, Int)]] = [:]

        for (index, member) in members.enumerated() {
            groups[member.role, default: []].append((member, index))
        }

        return TeamMemberRole.allCases.compactMap { role in
            guard let roleMembers = groups[role], !roleMembers.isEmpty else { return nil }
            return (role: role, members: roleMembers)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with add button
            HStack {
                Text(String(localized: "horse.team"))
                    .font(.headline)
                Spacer()
                Button {
                    onAdd()
                } label: {
                    Label(String(localized: "common.add"), systemImage: "plus.circle.fill")
                        .font(.subheadline)
                }
            }

            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical)
            } else if members.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "person.3.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text(String(localized: "horse.team.empty"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button {
                        onAdd()
                    } label: {
                        Text(String(localized: "horse.team.add_first"))
                            .font(.subheadline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            } else {
                ForEach(groupedMembers, id: \.role) { group in
                    VStack(alignment: .leading, spacing: 8) {
                        // Role header
                        HStack(spacing: 6) {
                            Image(systemName: group.role.icon)
                                .font(.caption)
                            Text(group.role.displayName)
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .foregroundStyle(colorForRole(group.role))

                        // Members in this role
                        ForEach(group.members, id: \.member.id) { item in
                            TeamMemberRow(
                                member: item.member,
                                onEdit: { onEdit(item.member, item.index) },
                                onDelete: { onDelete(item.member, item.index) }
                            )
                        }
                    }

                    if group.role != groupedMembers.last?.role {
                        Divider()
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func colorForRole(_ role: TeamMemberRole) -> Color {
        switch role {
        case .rider: return .blue
        case .groom: return .green
        case .farrier: return .orange
        case .veterinarian: return .red
        case .trainer: return .purple
        case .dentist: return .cyan
        case .physiotherapist: return .pink
        case .saddler: return .yellow
        case .other: return .gray
        }
    }
}

// MARK: - Team Member Row

struct TeamMemberRow: View {
    let member: HorseTeamMember
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(member.name)
                        .font(.body)
                        .fontWeight(.medium)

                    if member.isPrimary == true {
                        Text(String(localized: "horse.team.primary"))
                            .font(.caption2)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.blue)
                            .clipShape(Capsule())
                    }
                }

                if let email = member.email, !email.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "envelope.fill")
                            .font(.caption2)
                        Text(email)
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }

                if let phone = member.phone, !phone.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "phone.fill")
                            .font(.caption2)
                        Text(phone)
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }

                if let notes = member.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            Menu {
                Button {
                    onEdit()
                } label: {
                    Label(String(localized: "common.edit"), systemImage: "pencil")
                }
                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Label(String(localized: "common.delete"), systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.leading, 20)
    }
}

#Preview {
    ScrollView {
        HorseTeamTabView(horse: Horse(
            id: "test",
            name: "Test Horse",
            color: .brown,
            ownerId: "owner1",
            ownerName: "John Owner",
            ownerEmail: "john@example.com",
            currentStableName: "Happy Stables",
            assignedAt: Date().addingTimeInterval(-60 * 60 * 24 * 90),
            status: .active,
            team: [
                HorseTeamMember(name: "Dr. Smith", role: .veterinarian, isPrimary: true, email: "smith@vet.com", phone: "555-1234"),
                HorseTeamMember(name: "Jane Rider", role: .rider, isPrimary: true, email: "jane@riding.com")
            ],
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}
