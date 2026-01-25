//
//  FeedingTodayView.swift
//  EquiDuty
//
//  Daily feeding tracking view
//

import SwiftUI

struct FeedingTodayView: View {
    @State private var authService = AuthService.shared
    @State private var feedingService = FeedingService.shared
    @State private var horseService = HorseService.shared
    @State private var selectedDate = Date()
    @State private var feedingData: [DailyFeedingData] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Date navigation
                    DateNavigationHeader(
                        selectedDate: $selectedDate,
                        onDateChanged: { loadFeedingData() }
                    )

                    // Overall progress
                    if !feedingData.isEmpty {
                        OverallFeedingProgress(feedingData: feedingData)
                    }

                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) {
                            loadFeedingData()
                        }
                    } else if feedingData.isEmpty {
                        EmptyStateView(
                            icon: "leaf.fill",
                            title: String(localized: "feeding.empty.title"),
                            message: String(localized: "feeding.empty.message")
                        )
                    } else {
                        // Feeding time sections
                        ForEach(feedingData) { data in
                            FeedingTimeSection(feedingData: data)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle(String(localized: "feeding.title"))
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink(value: AppDestination.feedingSchedule(stableId: authService.selectedStable?.id ?? "")) {
                        Image(systemName: "calendar")
                    }
                    .disabled(authService.selectedStable == nil)
                }
            }
            .refreshable {
                await refreshFeedingData()
            }
            .withAppNavigationDestinations()
            .onAppear {
                loadFeedingData()
            }
            .onChange(of: authService.selectedStable?.id) { _, _ in
                loadFeedingData()
            }
        }
    }

    // MARK: - Data Loading

    private func loadFeedingData() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                guard let stableId = authService.selectedStable?.id else {
                    feedingData = []
                    isLoading = false
                    return
                }

                // First fetch horses for the stable
                let horses = try await horseService.getStableHorses(stableId: stableId)

                // Then fetch feeding data
                feedingData = try await feedingService.getDailyFeedingData(
                    stableId: stableId,
                    date: selectedDate,
                    horses: horses
                )

                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshFeedingData() async {
        do {
            guard let stableId = authService.selectedStable?.id else {
                feedingData = []
                return
            }

            let horses = try await horseService.getStableHorses(stableId: stableId)
            feedingData = try await feedingService.getDailyFeedingData(
                stableId: stableId,
                date: selectedDate,
                horses: horses
            )
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Overall Progress

struct OverallFeedingProgress: View {
    let feedingData: [DailyFeedingData]

    var body: some View {
        let totalCompleted = feedingData.reduce(0) { $0 + $1.completedCount }
        let totalHorses = feedingData.reduce(0) { $0 + $1.totalCount }
        let progress = totalHorses > 0 ? Double(totalCompleted) / Double(totalHorses) : 0

        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 12)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(progressColor(progress), style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut, value: progress)

                VStack {
                    Text("\(Int(progress * 100))%")
                        .font(.title)
                        .fontWeight(.bold)

                    Text(String(localized: "feeding.completed"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 120, height: 120)

            Text("\(totalCompleted)/\(totalHorses) \(String(localized: "feeding.horses_fed"))")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func progressColor(_ progress: Double) -> Color {
        if progress >= 1.0 { return .green }
        if progress >= 0.5 { return .orange }
        return .accentColor
    }
}

// MARK: - Feeding Time Section

struct FeedingTimeSection: View {
    let feedingData: DailyFeedingData
    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            Button {
                withAnimation {
                    isExpanded.toggle()
                }
            } label: {
                HStack {
                    VStack(alignment: .leading) {
                        Text(feedingData.feedingTime.name)
                            .font(.headline)
                            .foregroundStyle(.primary)

                        Text(feedingData.feedingTime.time)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    // Progress
                    HStack(spacing: 8) {
                        Text("\(feedingData.completedCount)/\(feedingData.totalCount)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        if feedingData.isComplete {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        } else {
                            ProgressRing(progress: feedingData.progressPercent, size: 24)
                        }

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Horse list
            if isExpanded {
                VStack(spacing: 8) {
                    ForEach(feedingData.horses) { horseStatus in
                        FeedingHorseRow(horseStatus: horseStatus)
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Feeding Horse Row

struct FeedingHorseRow: View {
    let horseStatus: HorseFeedingStatus
    @State private var isCompleted: Bool

    init(horseStatus: HorseFeedingStatus) {
        self.horseStatus = horseStatus
        _isCompleted = State(initialValue: horseStatus.isCompleted)
    }

    var body: some View {
        HStack(spacing: 12) {
            // Checkbox
            Button {
                isCompleted.toggle()
                // TODO: Update via API
            } label: {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(isCompleted ? .green : .secondary)
            }

            // Horse info
            VStack(alignment: .leading, spacing: 2) {
                Text(horseStatus.horse.name)
                    .font(.body)
                    .strikethrough(isCompleted)
                    .foregroundStyle(isCompleted ? .secondary : .primary)

                Text(horseStatus.feedingInstructions)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Special instructions indicator
            if horseStatus.horse.hasSpecialInstructions == true {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundStyle(.orange)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Progress Ring

struct ProgressRing: View {
    let progress: Double
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.secondary.opacity(0.2), lineWidth: 3)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Placeholder Views

struct FeedingScheduleView: View {
    let stableId: String

    var body: some View {
        Text(String(localized: "feeding.schedule.title"))
            .navigationTitle(String(localized: "feeding.schedule.title"))
    }
}

struct FeedTypeListView: View {
    let stableId: String

    var body: some View {
        Text(String(localized: "feeding.feed_types.title"))
            .navigationTitle(String(localized: "feeding.feed_types.title"))
    }
}

#Preview {
    FeedingTodayView()
}
