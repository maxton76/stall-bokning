//
//  HorseListView.swift
//  EquiDuty
//
//  Horse list with filtering and search
//

import SwiftUI

struct HorseListView: View {
    @State private var authService = AuthService.shared
    @State private var horseService = HorseService.shared
    @State private var horses: [Horse] = []
    @State private var searchText = ""
    @State private var selectedFilter: HorseFilter = .all
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showAddHorse = false

    @Environment(\.dismiss) private var dismiss

    enum HorseFilter: String, CaseIterable {
        case all
        case active
        case inactive

        var displayName: String {
            switch self {
            case .all: return String(localized: "filter.all")
            case .active: return String(localized: "filter.active")
            case .inactive: return String(localized: "filter.inactive")
            }
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let errorMessage {
                    ErrorView(message: errorMessage) {
                        loadHorses()
                    }
                } else if filteredHorses.isEmpty {
                    if searchText.isEmpty && selectedFilter == .all {
                        EmptyStateView(
                            icon: "pawprint.fill",
                            title: String(localized: "horses.empty.title"),
                            message: String(localized: "horses.empty.message"),
                            actionTitle: String(localized: "horses.add"),
                            action: { showAddHorse = true }
                        )
                    } else {
                        EmptyStateView(
                            icon: "magnifyingglass",
                            title: String(localized: "horses.no_results.title"),
                            message: String(localized: "horses.no_results.message")
                        )
                    }
                } else {
                    List {
                        ForEach(filteredHorses) { horse in
                            NavigationLink(value: AppDestination.horseDetail(horseId: horse.id)) {
                                HorseRowView(horse: horse)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(String(localized: "horses.title"))
            .searchable(text: $searchText, prompt: String(localized: "horses.search"))
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddHorse = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }

                ToolbarItem(placement: .secondaryAction) {
                    Menu {
                        ForEach(HorseFilter.allCases, id: \.self) { filter in
                            Button {
                                selectedFilter = filter
                            } label: {
                                if selectedFilter == filter {
                                    Label(filter.displayName, systemImage: "checkmark")
                                } else {
                                    Text(filter.displayName)
                                }
                            }
                        }
                    } label: {
                        Label(String(localized: "common.filter"), systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .refreshable {
                await refreshHorses()
            }
            .withAppNavigationDestinations()
            .sheet(isPresented: $showAddHorse) {
                HorseFormView(horseId: nil)
            }
            .onAppear {
                loadHorses()
            }
            .onChange(of: authService.selectedStable?.id) { _, _ in
                loadHorses()
            }
        }
    }

    // MARK: - Computed Properties

    private var filteredHorses: [Horse] {
        var result = horses

        // Apply filter
        switch selectedFilter {
        case .active:
            result = result.filter { $0.status == .active }
        case .inactive:
            result = result.filter { $0.status == .inactive }
        case .all:
            break
        }

        // Apply search
        if !searchText.isEmpty {
            result = result.filter { horse in
                horse.name.localizedCaseInsensitiveContains(searchText) ||
                (horse.breed?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (horse.ownerName?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return result
    }

    // MARK: - Data Loading

    private func loadHorses() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        print("🐴 HorseListView.loadHorses() - selectedStable: \(authService.selectedStable?.name ?? "nil")")

        Task {
            do {
                // If a stable is selected, get stable horses; otherwise get all accessible
                if let stableId = authService.selectedStable?.id {
                    print("🔄 Fetching horses for stable: \(stableId)")
                    horses = try await horseService.getStableHorses(stableId: stableId)
                    print("✅ Fetched \(horses.count) horses")
                } else {
                    print("🔄 Fetching all accessible horses")
                    horses = try await horseService.getAllAccessibleHorses()
                    print("✅ Fetched \(horses.count) horses")
                }
                isLoading = false
            } catch {
                print("❌ Error loading horses: \(error)")
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshHorses() async {
        do {
            if let stableId = authService.selectedStable?.id {
                horses = try await horseService.getStableHorses(stableId: stableId)
            } else {
                horses = try await horseService.getAllAccessibleHorses()
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Horse Row

struct HorseRowView: View {
    let horse: Horse

    var body: some View {
        HStack(spacing: 12) {
            // Horse avatar
            HorseAvatarView(horse: horse, size: 50)

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(horse.name)
                        .font(.headline)

                    if horse.hasSpecialInstructions == true {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }

                HStack(spacing: 8) {
                    if let breed = horse.breed {
                        Text(breed)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    if let gender = horse.gender {
                        Text("•")
                            .foregroundStyle(.secondary)
                        Text(gender.displayName)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                if let ownerName = horse.ownerName {
                    Text(ownerName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Status and vaccination
            VStack(alignment: .trailing, spacing: 4) {
                StatusBadge(
                    status: horse.status.displayName,
                    color: horse.status == .active ? .green : .gray
                )

                if let vaccStatus = horse.vaccinationStatus {
                    VaccinationBadge(status: vaccStatus)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Horse Avatar

struct HorseAvatarView: View {
    let horse: Horse
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .fill(colorForHorse.opacity(0.2))

            Image(systemName: "pawprint.fill")
                .font(.system(size: size * 0.4))
                .foregroundStyle(colorForHorse)
        }
        .frame(width: size, height: size)
    }

    private var colorForHorse: Color {
        // Generate consistent color based on horse color
        switch horse.color {
        case .black: return .gray
        case .brown, .bayBrown, .darkBrown: return .brown
        case .chestnut: return .orange
        case .grey: return .gray
        case .palomino, .cream: return .yellow
        default: return .accentColor
        }
    }
}

// MARK: - Vaccination Badge

struct VaccinationBadge: View {
    let status: VaccinationStatus

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: iconName)
                .font(.caption2)

            Text(status.displayName)
                .font(.caption2)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(color.opacity(0.15))
        .clipShape(Capsule())
    }

    private var iconName: String {
        switch status {
        case .current: return "checkmark.circle.fill"
        case .expiringSoon: return "clock.fill"
        case .expired: return "exclamationmark.triangle.fill"
        case .noRule, .noRecords: return "minus.circle.fill"
        }
    }

    private var color: Color {
        switch status {
        case .current: return .green
        case .expiringSoon: return .orange
        case .expired: return .red
        case .noRule, .noRecords: return .gray
        }
    }
}

#Preview {
    HorseListView()
}
