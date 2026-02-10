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
    @State private var permissionService = PermissionService.shared
    @State private var horses: [Horse] = []
    @State private var horseGroups: [HorseGroup] = []
    @State private var searchText = ""
    @State private var filters = HorseFilters()
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showAddHorse = false
    @State private var showFilterSheet = false
    @State private var debouncedSearchText = ""
    @State private var searchDebounceTask: Task<Void, Never>?
    @State private var showOwnedOnly = UserDefaults.standard.horsesShowOwnedOnly

    @Environment(\.dismiss) private var dismiss
    @Environment(NotificationViewModel.self) private var notificationViewModel
    @State private var showNotificationCenter = false

    /// Whether the current user can toggle between "All" and "Mine" horse views
    /// Only privileged roles (administrator, stable_manager, groom) can see all stable horses
    private var canToggleHorseScope: Bool {
        guard authService.selectedOrganization != nil else {
            return false
        }

        // Check if user has any of the privileged roles
        let privilegedRoles: [OrganizationRole] = [.administrator, .stableManager, .groom]
        return permissionService.hasAnyRole(privilegedRoles)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Scope selector (only show when stable is selected and user has privileged role)
                if authService.selectedStable != nil && canToggleHorseScope {
                    Picker(String(localized: "horses.scope"), selection: $showOwnedOnly) {
                        Text(String(localized: "horses.scope.all")).tag(false)
                        Text(String(localized: "horses.scope.owned")).tag(true)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, EquiDutyDesign.Spacing.md)
                    .padding(.vertical, EquiDutyDesign.Spacing.sm)
                    .background(Color(.systemGroupedBackground))
                }
                
                // Main content
                Group {
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) {
                            loadHorses()
                        }
                    } else if filteredHorses.isEmpty {
                        if searchText.isEmpty && !filters.hasActiveFilters {
                            ModernEmptyStateView(
                                icon: "pawprint.fill",
                                title: String(localized: "horses.empty.title"),
                                message: String(localized: "horses.empty.message"),
                                actionTitle: String(localized: "horses.add"),
                                action: { showAddHorse = true }
                            )
                        } else {
                            ModernEmptyStateView(
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
                    Button {
                        showFilterSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                            if filters.activeFilterCount > 0 {
                                Text("\(filters.activeFilterCount)")
                                    .font(.caption2)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(.blue)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }

                ToolbarItem(placement: .secondaryAction) {
                    Menu {
                        ForEach(HorseFilters.SortOption.allCases, id: \.self) { option in
                            Button {
                                if filters.sortBy == option {
                                    filters.sortAscending.toggle()
                                } else {
                                    filters.sortBy = option
                                    filters.sortAscending = true
                                }
                            } label: {
                                HStack {
                                    Text(option.displayName)
                                    if filters.sortBy == option {
                                        Image(systemName: filters.sortAscending ? "chevron.up" : "chevron.down")
                                    }
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
            }
            .notificationBellToolbar(viewModel: notificationViewModel, showNotificationCenter: $showNotificationCenter)
            .sheet(isPresented: $showFilterSheet) {
                HorseFilterSheet(
                    filters: $filters,
                    horseGroups: horseGroups,
                    onApply: {}
                )
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
            .onChange(of: showOwnedOnly) { _, newValue in
                // Save preference to UserDefaults
                UserDefaults.standard.horsesShowOwnedOnly = newValue
                loadHorses()
            }
            .onChange(of: searchText) { _, newValue in
                searchDebounceTask?.cancel()
                searchDebounceTask = Task {
                    try? await Task.sleep(nanoseconds: 300_000_000)
                    guard !Task.isCancelled else { return }
                    debouncedSearchText = newValue
                }
            }
        }
    }

    // MARK: - Computed Properties

    private var filteredHorses: [Horse] {
        var result = horses

        // Apply status filter
        if let status = filters.status {
            result = result.filter { $0.status == status }
        }

        // Apply gender filter
        if !filters.genders.isEmpty {
            result = result.filter { horse in
                guard let gender = horse.gender else { return false }
                return filters.genders.contains(gender)
            }
        }

        // Apply usage filter
        if !filters.usages.isEmpty {
            result = result.filter { horse in
                guard let usages = horse.usage else { return false }
                return !filters.usages.isDisjoint(with: Set(usages))
            }
        }

        // Apply age filter
        if let minAge = filters.minAge {
            result = result.filter { ($0.age ?? 0) >= minAge }
        }
        if let maxAge = filters.maxAge {
            result = result.filter { ($0.age ?? 100) <= maxAge }
        }

        // Apply group filter
        if let groupId = filters.horseGroupId {
            result = result.filter { $0.horseGroupId == groupId }
        }

        // Apply search (debounced)
        if !debouncedSearchText.isEmpty {
            result = result.filter { horse in
                horse.name.localizedCaseInsensitiveContains(debouncedSearchText) ||
                (horse.breed?.localizedCaseInsensitiveContains(debouncedSearchText) ?? false) ||
                (horse.ownerName?.localizedCaseInsensitiveContains(debouncedSearchText) ?? false)
            }
        }

        // Apply sorting
        result.sort { a, b in
            let comparison: Bool
            switch filters.sortBy {
            case .name:
                comparison = a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
            case .age:
                comparison = (a.age ?? 0) < (b.age ?? 0)
            case .recentActivity:
                comparison = a.updatedAt > b.updatedAt
            }
            return filters.sortAscending ? comparison : !comparison
        }

        return result
    }

    // MARK: - Data Loading

    private func loadHorses() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        #if DEBUG
        print("🐴 HorseListView.loadHorses() - selectedStable: \(authService.selectedStable?.name ?? "nil")")
        #endif

        Task {
            do {
                // If a stable is selected, get stable horses or user's horses; otherwise get all accessible
                if let stableId = authService.selectedStable?.id {
                    // Force "Mine" scope for non-privileged users
                    let effectiveShowOwnedOnly = canToggleHorseScope ? showOwnedOnly : true

                    #if DEBUG
                    print("🔄 Fetching horses for stable: \(stableId), ownedOnly: \(effectiveShowOwnedOnly), canToggle: \(canToggleHorseScope)")
                    #endif
                    if effectiveShowOwnedOnly {
                        horses = try await horseService.getMyHorses(stableId: stableId)
                    } else {
                        horses = try await horseService.getStableHorses(stableId: stableId)
                    }
                    #if DEBUG
                    print("✅ Fetched \(horses.count) horses")
                    #endif
                } else {
                    #if DEBUG
                    print("🔄 Fetching all accessible horses")
                    #endif
                    horses = try await horseService.getAllAccessibleHorses()
                    #if DEBUG
                    print("✅ Fetched \(horses.count) horses")
                    #endif
                }

                // Prefetch avatar images for visible horses
                prefetchAvatarImages()

                isLoading = false
            } catch {
                #if DEBUG
                print("❌ Error loading horses: \(error)")
                #endif
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func prefetchAvatarImages() {
        let urls = horses.compactMap { $0.bestAvatarThumbURL }
        ImageCacheService.shared.prefetchImages(urls: urls)
    }

    private func refreshHorses() async {
        do {
            if let stableId = authService.selectedStable?.id {
                // Force "Mine" scope for non-privileged users
                let effectiveShowOwnedOnly = canToggleHorseScope ? showOwnedOnly : true

                if effectiveShowOwnedOnly {
                    horses = try await horseService.getMyHorses(stableId: stableId)
                } else {
                    horses = try await horseService.getStableHorses(stableId: stableId)
                }
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
        HStack(spacing: EquiDutyDesign.Spacing.md) {
            // Horse avatar
            HorseAvatarView(horse: horse, size: 50)

            // Info
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                HStack {
                    Text(horse.name)
                        .font(.headline)

                    if horse.hasSpecialInstructions == true {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }

                HStack(spacing: EquiDutyDesign.Spacing.sm) {
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

                    if let age = horse.age {
                        Text("•")
                            .foregroundStyle(.secondary)
                        Text("\(age) \(String(localized: "common.years.short"))")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                // Usage badges and group
                HStack(spacing: EquiDutyDesign.Spacing.xs) {
                    if let usages = horse.usage, !usages.isEmpty {
                        ForEach(usages.prefix(2), id: \.self) { usage in
                            HorseRowUsageBadge(usage: usage)
                        }
                        if usages.count > 2 {
                            Text("+\(usages.count - 2)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }

                    if let groupName = horse.horseGroupName {
                        HorseRowGroupBadge(name: groupName)
                    }

                    if horse.usage == nil && horse.horseGroupName == nil {
                        if let ownerName = horse.ownerName {
                            Text(ownerName)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Spacer()

            // Status and vaccination
            VStack(alignment: .trailing, spacing: EquiDutyDesign.Spacing.xs) {
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
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
    }
}

// MARK: - Horse Row Usage Badge

struct HorseRowUsageBadge: View {
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

// MARK: - Horse Row Group Badge

struct HorseRowGroupBadge: View {
    let name: String

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.xs) {
            Image(systemName: "folder.fill")
                .font(.system(size: 8))
            Text(name)
        }
        .font(.caption2)
        .fontWeight(.medium)
        .foregroundStyle(.secondary)
        .padding(.horizontal, EquiDutyDesign.Spacing.sm)
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
        .background(.quaternary)
        .clipShape(Capsule())
    }
}

// MARK: - Horse Avatar (Legacy - use HorseCachedAvatar instead)

struct HorseAvatarView: View {
    let horse: Horse
    let size: CGFloat

    var body: some View {
        // Use cached version
        HorseCachedAvatar(horse: horse, size: size)
    }
}

// MARK: - Vaccination Badge

struct VaccinationBadge: View {
    let status: VaccinationStatus

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.xs) {
            Image(systemName: iconName)
                .font(.caption2)

            Text(status.displayName)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .foregroundStyle(color)
        .padding(.horizontal, EquiDutyDesign.Spacing.sm)
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
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
