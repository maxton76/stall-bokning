//
//  ActivityDetailView.swift
//  EquiDuty
//
//  Activity detail view with full information and action buttons
//

import SwiftUI

// MARK: - Activity Detail View

/// Full activity detail view showing all information with actions
struct ActivityDetailView: View {
    let activity: ActivityInstance

    @Environment(\.dismiss) private var dismiss
    @State private var activityService = ActivityService.shared
    @State private var isLoading = false
    @State private var showCompleteConfirmation = false
    @State private var showCancelConfirmation = false
    @State private var errorMessage: String?
    @State private var completionNotes = ""

    /// Actions available based on activity status
    private var canComplete: Bool {
        switch activity.status {
        case .pending, .inProgress, .overdue:
            return true
        case .completed, .cancelled:
            return false
        }
    }

    private var canCancel: Bool {
        switch activity.status {
        case .pending, .inProgress, .overdue:
            return true
        case .completed, .cancelled:
            return false
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: EquiDutyDesign.Spacing.standard) {
                // Header Card
                headerSection

                // Schedule Section
                scheduleSection

                // Horses Section
                if !activity.horseNames.isEmpty {
                    horsesSection
                }

                // Assignment Section
                assignmentSection

                // Contact Section (for external appointments)
                if activity.contactName != nil {
                    contactSection
                }

                // Notes Section
                if let notes = activity.notes, !notes.isEmpty {
                    notesSection(notes: notes)
                }

                // Photos Section
                if let photoUrls = activity.photoUrls, !photoUrls.isEmpty {
                    photosSection(photoUrls: photoUrls)
                }

                // Metadata Section
                metadataSection

                // Action Buttons
                if canComplete || canCancel {
                    actionButtonsSection
                }
            }
            .padding()
        }
        .navigationTitle(String(localized: "activity.detail.title"))
        .navigationBarTitleDisplayMode(.inline)
        .alert(String(localized: "activity.action.complete"), isPresented: $showCompleteConfirmation) {
            TextField(String(localized: "activity.detail.notes"), text: $completionNotes)
            Button(String(localized: "common.cancel"), role: .cancel) { }
            Button(String(localized: "activity.action.complete")) {
                Task { await completeActivity() }
            }
        } message: {
            Text(String(localized: "activity.action.complete.confirmation"))
        }
        .alert(String(localized: "activity.action.cancel"), isPresented: $showCancelConfirmation) {
            Button(String(localized: "common.cancel"), role: .cancel) { }
            Button(String(localized: "activity.action.cancel"), role: .destructive) {
                Task { await cancelActivity() }
            }
        } message: {
            Text(String(localized: "activity.action.cancel.confirmation"))
        }
        .alert(String(localized: "error.title"), isPresented: .init(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button(String(localized: "common.ok")) {
                errorMessage = nil
            }
        } message: {
            if let errorMessage {
                Text(errorMessage)
            }
        }
        .overlay {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.ultraThinMaterial)
            }
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        HStack {
            Image(systemName: activity.activityTypeCategory.icon)
                .font(.title2)
                .foregroundStyle(Color.accentColor)
                .frame(width: 44, height: 44)
                .background(Color.accentColor.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(activity.activityTypeName)
                    .font(.title3)
                    .fontWeight(.bold)

                Text(activity.activityTypeCategory.displayName)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            ModernStatusBadge(
                status: activity.status.displayName,
                color: Color(activity.status.color),
                icon: activity.status.icon
            )
        }
        .contentCard()
    }

    // MARK: - Schedule Section

    private var scheduleSection: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: String(localized: "activity.detail.schedule"))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                // Date
                Label {
                    Text(activity.scheduledDate.formatted(date: .complete, time: .omitted))
                } icon: {
                    Image(systemName: "calendar")
                        .foregroundStyle(.secondary)
                }

                // Time (if scheduled)
                if let time = activity.scheduledTime {
                    Label {
                        Text(time)
                    } icon: {
                        Image(systemName: "clock")
                            .foregroundStyle(.secondary)
                    }
                }

                // Duration (if set)
                if let duration = activity.duration {
                    Label {
                        Text(String(localized: "activity.detail.duration \(duration)"))
                    } icon: {
                        Image(systemName: "timer")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .font(.body)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentCard()
    }

    // MARK: - Horses Section

    private var horsesSection: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: String(localized: "activity.detail.horses"))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                ForEach(activity.horseNames, id: \.self) { horseName in
                    Label {
                        Text(horseName)
                    } icon: {
                        Image(systemName: "pawprint.fill")
                            .foregroundStyle(Color.accentColor)
                    }
                }
            }
            .font(.body)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentCard()
    }

    // MARK: - Assignment Section

    private var assignmentSection: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: String(localized: "activity.detail.assignment"))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                // Assigned to
                if let assignedName = activity.assignedToName {
                    HStack {
                        Text(String(localized: "activity.detail.assignedTo"))
                            .foregroundStyle(.secondary)
                        Spacer()
                        HStack(spacing: EquiDutyDesign.Spacing.sm) {
                            AvatarView(name: assignedName, size: 24)
                            Text(assignedName)
                        }
                    }
                }

                // Completed by (if completed)
                if activity.status == .completed {
                    if let completedByName = activity.completedByName {
                        HStack {
                            Text(String(localized: "activity.detail.completedBy"))
                                .foregroundStyle(.secondary)
                            Spacer()
                            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                                AvatarView(name: completedByName, size: 24, color: .green)
                                Text(completedByName)
                            }
                        }
                    }

                    if let completedAt = activity.completedAt {
                        HStack {
                            Text(String(localized: "activity.detail.completedAt"))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(completedAt.formatted(date: .abbreviated, time: .shortened))
                        }
                    }
                }
            }
            .font(.body)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentCard()
    }

    // MARK: - Contact Section

    private var contactSection: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: String(localized: "activity.detail.contact"))

            if let contactName = activity.contactName {
                Label {
                    Text(contactName)
                } icon: {
                    Image(systemName: "person.crop.circle")
                        .foregroundStyle(.secondary)
                }
                .font(.body)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentCard()
    }

    // MARK: - Notes Section

    private func notesSection(notes: String) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: String(localized: "activity.detail.notes"))

            Text(notes)
                .font(.body)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentCard()
    }

    // MARK: - Photos Section

    private func photosSection(photoUrls: [String]) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: String(localized: "activity.detail.photos"))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: EquiDutyDesign.Spacing.md) {
                    ForEach(photoUrls, id: \.self) { urlString in
                        AsyncImage(url: URL(string: urlString)) { phase in
                            switch phase {
                            case .empty:
                                ProgressView()
                                    .frame(width: 120, height: 120)
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 120, height: 120)
                                    .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))
                            case .failure:
                                Image(systemName: "photo")
                                    .font(.largeTitle)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 120, height: 120)
                                    .background(.ultraThinMaterial)
                                    .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))
                            @unknown default:
                                EmptyView()
                            }
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentCard()
    }

    // MARK: - Metadata Section

    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: String(localized: "activity.detail.metadata"))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                // Stable
                if let stableName = activity.stableName {
                    HStack {
                        Text(String(localized: "activity.detail.stable"))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text(stableName)
                    }
                }

                // Created at
                HStack {
                    Text(String(localized: "activity.detail.createdAt"))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(activity.createdAt.formatted(date: .abbreviated, time: .shortened))
                }

                // Updated at
                HStack {
                    Text(String(localized: "activity.detail.updatedAt"))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(activity.updatedAt.formatted(date: .abbreviated, time: .shortened))
                }
            }
            .font(.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentCard()
    }

    // MARK: - Action Buttons Section

    private var actionButtonsSection: some View {
        VStack(spacing: EquiDutyDesign.Spacing.md) {
            if canComplete {
                Button {
                    showCompleteConfirmation = true
                } label: {
                    Label(String(localized: "activity.action.complete"), systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .buttonStyle(.scale)
                .controlSize(.large)
            }

            HStack(spacing: EquiDutyDesign.Spacing.md) {
                // Edit button (placeholder - navigates to form when implemented)
                NavigationLink {
                    ActivityFormView(activityId: activity.id)
                } label: {
                    Label(String(localized: "activity.action.edit"), systemImage: "pencil")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)

                if canCancel {
                    Button(role: .destructive) {
                        showCancelConfirmation = true
                    } label: {
                        Label(String(localized: "activity.action.cancel"), systemImage: "xmark.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .buttonStyle(.scale)
                    .controlSize(.large)
                }
            }
        }
        .padding(.top, EquiDutyDesign.Spacing.sm)
    }

    // MARK: - Actions

    private func completeActivity() async {
        isLoading = true
        do {
            try await activityService.completeActivity(
                activityId: activity.id,
                notes: completionNotes.isEmpty ? nil : completionNotes
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func cancelActivity() async {
        isLoading = true
        do {
            try await activityService.cancelActivity(activityId: activity.id)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Legacy ID-based Detail View

/// Activity detail view that loads by ID (for deep linking)
struct ActivityDetailByIdView: View {
    let activityId: String

    @State private var activityService = ActivityService.shared
    @State private var activity: ActivityInstance?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ErrorView(message: errorMessage) {
                    Task { await loadActivity() }
                }
            } else if let activity {
                ActivityDetailView(activity: activity)
            }
        }
        .task {
            await loadActivity()
        }
    }

    private func loadActivity() async {
        isLoading = true
        errorMessage = nil

        do {
            if let loaded = try await activityService.getActivityInstance(activityId: activityId) {
                activity = loaded
            } else {
                errorMessage = String(localized: "activity.detail.notFound")
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview("Detail") {
    NavigationStack {
        ActivityDetailView(
            activity: ActivityInstance.preview
        )
    }
}

// MARK: - Preview Helper

extension ActivityInstance {
    static var preview: ActivityInstance {
        // Create a mock activity for previews
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        let json = """
        {
            "id": "preview-123",
            "organizationId": "org-1",
            "stableId": "stable-1",
            "stableName": "Sample Stable",
            "activityType": "dentist",
            "activityTypeConfigId": "type-1",
            "date": "\(ISO8601DateFormatter().string(from: Date()))",
            "scheduledTime": "10:00",
            "duration": 60,
            "horseId": "horse-1",
            "horseName": "Thunder",
            "assignedTo": "user-1",
            "assignedToName": "Anna Andersson",
            "status": "pending",
            "note": "Annual dental checkup. Horse has shown some sensitivity on the left side.",
            "contactName": "Dr. Smith",
            "createdAt": "\(ISO8601DateFormatter().string(from: Date().addingTimeInterval(-86400)))",
            "lastModifiedAt": "\(ISO8601DateFormatter().string(from: Date()))",
            "createdBy": "user-1"
        }
        """

        // swiftlint:disable:next force_try
        return try! decoder.decode(ActivityInstance.self, from: json.data(using: .utf8)!)
    }
}
