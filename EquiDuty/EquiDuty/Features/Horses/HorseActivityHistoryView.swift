//
//  HorseActivityHistoryView.swift
//  EquiDuty
//
//  Activity history tab for horse detail view showing routine completion records
//

import SwiftUI

// MARK: - Main History View

struct HorseActivityHistoryView: View {
    let horseId: String

    @State private var service = HorseActivityHistoryService.shared
    @State private var activities: [HorseActivityHistoryEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var hasMore = false
    @State private var nextCursor: String?
    @State private var isLoadingMore = false

    // Filters
    @State private var currentWeekStart: Date = {
        let cal = Calendar.current
        return cal.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
    }()
    @State private var selectedCategories: Set<RoutineCategory> = Set(RoutineCategory.allCases)

    private var weekEndDate: Date {
        Calendar.current.date(byAdding: .day, value: 7, to: currentWeekStart) ?? currentWeekStart
    }

    private var isCurrentWeek: Bool {
        let cal = Calendar.current
        let thisWeekStart = cal.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        return cal.isDate(currentWeekStart, inSameDayAs: thisWeekStart)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Week navigation + category filter
            WeekNavigationBar(
                currentWeekStart: $currentWeekStart,
                isCurrentWeek: isCurrentWeek,
                selectedCategories: $selectedCategories,
                onFilterChange: {
                    loadActivities(reset: true)
                }
            )

            Divider()

            // Content
            if isLoading && activities.isEmpty {
                Spacer()
                ProgressView()
                Spacer()
            } else if let errorMessage = errorMessage {
                Spacer()
                ErrorView(message: errorMessage) {
                    loadActivities(reset: true)
                }
                Spacer()
            } else if activities.isEmpty {
                Spacer()
                EmptyHistoryView()
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: EquiDutyDesign.Spacing.md) {
                        ForEach(activities) { activity in
                            ActivityHistoryRow(activity: activity)
                        }

                        // Load more button
                        if hasMore {
                            Button {
                                loadMoreActivities()
                            } label: {
                                if isLoadingMore {
                                    ProgressView()
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                } else {
                                    Text(String(localized: "horse.history.loadMore"))
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                }
                            }
                            .disabled(isLoadingMore)
                            .buttonStyle(.bordered)
                            .padding(.horizontal)
                            .padding(.bottom, 20)
                        }
                    }
                    .padding(.top, EquiDutyDesign.Spacing.md)
                    .padding(.bottom, 80)  // Add padding to prevent FAB from blocking last card
                }
            }
        }
        .onAppear {
            if activities.isEmpty {
                loadActivities(reset: true)
            }
        }
        .onChange(of: currentWeekStart) { _, _ in
            loadActivities(reset: true)
        }
        .onChange(of: selectedCategories) { _, _ in
            loadActivities(reset: true)
        }
    }

    private func loadActivities(reset: Bool) {
        if reset {
            activities = []
            nextCursor = nil
            hasMore = false
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                let response = try await service.getActivityHistory(
                    horseId: horseId,
                    categories: selectedCategories.isEmpty ? nil : selectedCategories,
                    startDate: currentWeekStart,
                    endDate: weekEndDate,
                    cursor: nil
                )
                activities = response.activities
                nextCursor = response.nextCursor
                hasMore = response.hasMore
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func loadMoreActivities() {
        guard let cursor = nextCursor, !isLoadingMore else { return }

        isLoadingMore = true

        Task {
            do {
                let response = try await service.getActivityHistory(
                    horseId: horseId,
                    categories: selectedCategories.isEmpty ? nil : selectedCategories,
                    startDate: currentWeekStart,
                    endDate: weekEndDate,
                    cursor: cursor
                )
                activities.append(contentsOf: response.activities)
                nextCursor = response.nextCursor
                hasMore = response.hasMore
                isLoadingMore = false
            } catch {
                isLoadingMore = false
            }
        }
    }
}

// MARK: - Week Navigation Bar

struct WeekNavigationBar: View {
    @Binding var currentWeekStart: Date
    let isCurrentWeek: Bool
    @Binding var selectedCategories: Set<RoutineCategory>
    var onFilterChange: () -> Void

    private var weekNumber: Int {
        Calendar.current.component(.weekOfYear, from: currentWeekStart)
    }

    private var year: Int {
        Calendar.current.component(.yearForWeekOfYear, from: currentWeekStart)
    }

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.sm) {
            HStack(spacing: EquiDutyDesign.Spacing.md) {
                // Week navigation
                HStack(spacing: EquiDutyDesign.Spacing.xs) {
                    Button {
                        withAnimation {
                            currentWeekStart = Calendar.current.date(byAdding: .weekOfYear, value: -1, to: currentWeekStart) ?? currentWeekStart
                        }
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.body.weight(.semibold))
                            .frame(width: 32, height: 32)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.scale)

                    Text("v.\(weekNumber), \(String(year))")
                        .font(.subheadline.weight(.medium))
                        .monospacedDigit()
                        .frame(minWidth: 80)

                    Button {
                        withAnimation {
                            currentWeekStart = Calendar.current.date(byAdding: .weekOfYear, value: 1, to: currentWeekStart) ?? currentWeekStart
                        }
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.body.weight(.semibold))
                            .frame(width: 32, height: 32)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.scale)
                    .disabled(isCurrentWeek)
                    .opacity(isCurrentWeek ? 0.3 : 1)
                }

                if !isCurrentWeek {
                    Button {
                        withAnimation {
                            currentWeekStart = Calendar.current.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
                        }
                    } label: {
                        Text(String(localized: "horse.history.today"))
                            .font(.subheadline)
                            .padding(.horizontal, EquiDutyDesign.Spacing.md)
                            .padding(.vertical, EquiDutyDesign.Spacing.xs)
                            .background(.ultraThinMaterial)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.scale)
                }

                Spacer()

                // Category filter
                CategoryFilterMenu(
                    selectedCategories: $selectedCategories,
                    onFilterChange: onFilterChange
                )
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
    }
}

// MARK: - Category Filter Menu

struct CategoryFilterMenu: View {
    @Binding var selectedCategories: Set<RoutineCategory>
    var onFilterChange: () -> Void

    private var filterLabel: String {
        if selectedCategories.count == RoutineCategory.allCases.count || selectedCategories.isEmpty {
            return String(localized: "horse.history.filter.allCategories")
        } else if selectedCategories.count == 1, let category = selectedCategories.first {
            return category.displayName
        } else {
            return String(localized: "horse.history.filter.categories \(selectedCategories.count)")
        }
    }

    var body: some View {
        Menu {
            // All categories toggle
            Button {
                if selectedCategories.count == RoutineCategory.allCases.count {
                    selectedCategories = []
                } else {
                    selectedCategories = Set(RoutineCategory.allCases)
                }
            } label: {
                HStack {
                    Text(String(localized: "horse.history.filter.allCategories"))
                    if selectedCategories.count == RoutineCategory.allCases.count {
                        Image(systemName: "checkmark")
                    }
                }
            }

            Divider()

            // Individual categories
            ForEach(RoutineCategory.allCases, id: \.self) { category in
                Button {
                    if selectedCategories.contains(category) {
                        selectedCategories.remove(category)
                    } else {
                        selectedCategories.insert(category)
                    }
                } label: {
                    HStack {
                        Image(systemName: category.icon)
                        Text(category.displayName)
                        if selectedCategories.contains(category) {
                            Spacer()
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                Text(filterLabel)
                    .font(.subheadline)
                    .lineLimit(1)
                Image(systemName: "chevron.down")
                    .font(.caption2)
            }
            .padding(.horizontal, EquiDutyDesign.Spacing.md)
            .padding(.vertical, EquiDutyDesign.Spacing.sm)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
        }
        .buttonStyle(.scale)
    }
}

// MARK: - Activity Row

struct ActivityHistoryRow: View {
    let activity: HorseActivityHistoryEntry

    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Main row content
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                    // Header: Step name + status
                    HStack {
                        Image(systemName: activity.category.icon)
                            .foregroundStyle(categoryColor)
                            .font(.title3)

                        Text(activity.stepName ?? activity.category.displayName)
                            .font(.headline)
                            .foregroundStyle(.primary)

                        // Photo/notes indicators
                        if let photoUrls = activity.photoUrls, !photoUrls.isEmpty {
                            Image(systemName: "camera.fill")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .accessibilityLabel(String(localized: "horse.history.hasPhotos"))
                        }
                        if let notes = activity.notes, !notes.isEmpty {
                            Image(systemName: "note.text")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .accessibilityLabel(String(localized: "horse.history.hasNotes"))
                        }

                        Spacer()

                        if let executionStatus = activity.executionStatus {
                            ModernStatusBadge(
                                status: executionStatus == .completed
                                    ? String(localized: "horse.history.status.completed")
                                    : String(localized: "horse.history.status.skipped"),
                                color: executionStatus == .completed ? .green : .orange,
                                icon: executionStatus == .completed ? "checkmark.circle.fill" : "arrow.uturn.left"
                            )
                        }
                    }

                    // Metadata row
                    HStack(spacing: EquiDutyDesign.Spacing.md) {
                        // Date/time
                        if let executedAt = activity.executedAt {
                            Label {
                                Text(executedAt.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption)
                            } icon: {
                                Image(systemName: "calendar")
                                    .font(.caption2)
                            }
                            .foregroundStyle(.secondary)
                        }

                        // Executed by
                        if let executedByName = activity.executedByName {
                            Label {
                                Text(executedByName)
                                    .font(.caption)
                            } icon: {
                                Image(systemName: "person")
                                    .font(.caption2)
                            }
                            .foregroundStyle(.secondary)
                        }

                        Spacer()

                        // Expand indicator
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    // Routine name
                    if let routineTemplateName = activity.routineTemplateName {
                        HStack(spacing: EquiDutyDesign.Spacing.xs) {
                            Image(systemName: "tag")
                                .font(.caption2)
                            Text(routineTemplateName)
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    }
                }
                .padding(EquiDutyDesign.Spacing.standard)
            }
            .buttonStyle(.scale)

            // Expanded content
            if isExpanded {
                Divider()
                    .padding(.horizontal)

                ActivityDetailSection(activity: activity)
                    .padding(EquiDutyDesign.Spacing.standard)
            }
        }
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous))
        .padding(.horizontal)
    }

    private var categoryColor: Color {
        switch activity.category {
        case .feeding: return .orange
        case .medication: return .pink
        case .blanket: return .blue
        case .turnout: return .yellow
        case .bringIn: return .green
        case .mucking: return .brown
        case .water: return .cyan
        case .healthCheck: return .red
        case .safety: return .purple
        case .preparation: return .gray
        case .cleaning: return .mint
        case .other: return .secondary
        }
    }
}

// MARK: - Activity Detail Section

struct ActivityDetailSection: View {
    let activity: HorseActivityHistoryEntry
    @State private var selectedPhotoIndex: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            // Skip reason
            if activity.executionStatus == .skipped, let skipReason = activity.skipReason, !skipReason.isEmpty {
                DetailRow(
                    label: String(localized: "horse.history.skipReason"),
                    value: skipReason,
                    icon: "exclamationmark.triangle"
                )
            }

            // Notes
            if let notes = activity.notes, !notes.isEmpty {
                DetailRow(
                    label: String(localized: "horse.history.notes"),
                    value: notes,
                    icon: "note.text"
                )
            }

            // Feeding snapshot
            if let feeding = activity.feedingSnapshot {
                FeedingSnapshotView(snapshot: feeding)
            }

            // Medication snapshot
            if let medication = activity.medicationSnapshot {
                MedicationSnapshotView(snapshot: medication)
            }

            // Blanket snapshot
            if let blanket = activity.blanketSnapshot {
                BlanketSnapshotView(snapshot: blanket)
            }

            // Photos
            if let photoUrls = activity.photoUrls, !photoUrls.isEmpty {
                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                    Label(String(localized: "horse.history.photos \(photoUrls.count)"), systemImage: "photo")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: EquiDutyDesign.Spacing.sm) {
                            ForEach(Array(photoUrls.enumerated()), id: \.offset) { index, url in
                                Button {
                                    selectedPhotoIndex = index
                                } label: {
                                    AsyncImage(url: URL(string: url)) { image in
                                        image
                                            .resizable()
                                            .scaledToFill()
                                    } placeholder: {
                                        Rectangle()
                                            .fill(.quaternary)
                                            .overlay {
                                                ProgressView()
                                            }
                                    }
                                    .frame(width: 80, height: 80)
                                    .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))
                                }
                            }
                        }
                    }
                }
            }

            // If no details at all
            if activity.skipReason == nil &&
               activity.notes == nil &&
               activity.feedingSnapshot == nil &&
               activity.medicationSnapshot == nil &&
               activity.blanketSnapshot == nil &&
               (activity.photoUrls == nil || activity.photoUrls?.isEmpty == true) {
                Text(String(localized: "horse.history.noDetails"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
            }
        }
        .fullScreenCover(item: Binding(
            get: { selectedPhotoIndex.map { FullScreenPhotoBinding(index: $0) } },
            set: { selectedPhotoIndex = $0?.index }
        )) { binding in
            if let photoUrls = activity.photoUrls {
                FullScreenPhotoViewer(
                    photoUrls: photoUrls,
                    selectedIndex: Binding(
                        get: { binding.index },
                        set: { selectedPhotoIndex = $0 }
                    )
                )
            }
        }
    }
}

private struct FullScreenPhotoBinding: Identifiable {
    let index: Int
    var id: Int { index }
}

// MARK: - Detail Row

struct DetailRow: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
            Label(label, systemImage: icon)
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(value)
                .font(.subheadline)
        }
    }
}

// MARK: - Snapshot Views

struct FeedingSnapshotView: View {
    let snapshot: FeedingSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            Label(String(localized: "horse.history.snapshot.feeding"), systemImage: "leaf.fill")
                .font(.caption)
                .foregroundStyle(.orange)

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(snapshot.instructions.feedTypeName)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("\(String(format: "%.1f", snapshot.instructions.quantity)) \(snapshot.instructions.quantityMeasure)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let instructions = snapshot.instructions.specialInstructions, !instructions.isEmpty {
                    Text(instructions)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .italic()
                }

                HStack {
                    Image(systemName: snapshot.confirmed ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundStyle(snapshot.confirmed ? .green : .red)
                    Text(snapshot.confirmed
                         ? String(localized: "horse.history.feeding.confirmed")
                         : String(localized: "horse.history.feeding.notConfirmed"))
                        .font(.caption)
                }
            }
            .padding(EquiDutyDesign.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))
        }
    }
}

struct MedicationSnapshotView: View {
    let snapshot: MedicationSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            Label(String(localized: "horse.history.snapshot.medication"), systemImage: "pills.fill")
                .font(.caption)
                .foregroundStyle(.pink)

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(snapshot.instructions.medicationName)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(snapshot.instructions.dosage)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(snapshot.instructions.administrationMethod)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if snapshot.given {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text(String(localized: "horse.history.medication.given"))
                            .font(.caption)
                    }
                } else if snapshot.skipped {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                        Text(String(localized: "horse.history.medication.skipped"))
                            .font(.caption)
                    }
                    if let reason = snapshot.skipReason, !reason.isEmpty {
                        Text(reason)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .italic()
                    }
                }
            }
            .padding(EquiDutyDesign.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))
        }
    }
}

struct BlanketSnapshotView: View {
    let snapshot: BlanketSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            Label(String(localized: "horse.history.snapshot.blanket"), systemImage: "cloud.snow.fill")
                .font(.caption)
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                if let current = snapshot.instructions.currentBlanket, !current.isEmpty {
                    Text("\(String(localized: "horse.history.blanket.current")): \(current)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let target = snapshot.instructions.targetBlanket, !target.isEmpty {
                    Text("\(String(localized: "horse.history.blanket.target")): \(target)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Image(systemName: actionIcon)
                        .foregroundStyle(actionColor)
                    Text(actionText)
                        .font(.caption)
                }
            }
            .padding(EquiDutyDesign.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))
        }
    }

    private var actionIcon: String {
        switch snapshot.action {
        case "on": return "plus.circle.fill"
        case "off": return "minus.circle.fill"
        default: return "equal.circle.fill"
        }
    }

    private var actionColor: Color {
        switch snapshot.action {
        case "on": return .green
        case "off": return .orange
        default: return .gray
        }
    }

    private var actionText: String {
        switch snapshot.action {
        case "on": return String(localized: "horse.history.blanket.putOn")
        case "off": return String(localized: "horse.history.blanket.takenOff")
        default: return String(localized: "horse.history.blanket.unchanged")
        }
    }
}

// MARK: - Empty View

struct EmptyHistoryView: View {
    var body: some View {
        ModernEmptyStateView(
            icon: "clock.arrow.circlepath",
            title: String(localized: "horse.history.empty"),
            message: String(localized: "horse.history.empty.description")
        )
    }
}

#Preview {
    NavigationStack {
        HorseActivityHistoryView(horseId: "test-horse")
    }
}
