//
//  NotificationCenterView.swift
//  EquiDuty
//
//  Notification center view displaying all user notifications
//

import SwiftUI

struct NotificationCenterView: View {
    @State private var viewModel = NotificationViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.notifications.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.notifications.isEmpty {
                    emptyStateView
                } else {
                    notificationListView
                }
            }
            .navigationTitle("Notiser")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Stäng") {
                        dismiss()
                    }
                }

                if !viewModel.notifications.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Menu {
                            Button {
                                Task { await viewModel.markAllAsRead() }
                            } label: {
                                Label("Markera alla lästa", systemImage: "checkmark.circle")
                            }

                            Button(role: .destructive) {
                                Task { await viewModel.clearRead() }
                            } label: {
                                Label("Rensa lästa", systemImage: "trash")
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
            }
            .refreshable {
                await viewModel.fetchNotifications()
            }
            .task {
                await viewModel.fetchNotifications()
            }
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bell.slash")
                .font(.system(size: 56))
                .foregroundStyle(.secondary)

            Text("Inga notiser")
                .font(.title3)
                .fontWeight(.semibold)

            Text("Du har inga notiser just nu.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Notification List

    private var notificationListView: some View {
        List {
            ForEach(viewModel.notifications) { notification in
                NotificationRowView(notification: notification)
                    .listRowBackground(notification.read ? Color.clear : Color.blue.opacity(0.05))
                    .contentShape(Rectangle())
                    .onTapGesture {
                        handleNotificationTap(notification)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            Task { await viewModel.deleteNotification(notification.id) }
                        } label: {
                            Label("Radera", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading, allowsFullSwipe: true) {
                        if !notification.read {
                            Button {
                                Task { await viewModel.markAsRead(notification.id) }
                            } label: {
                                Label("Läst", systemImage: "checkmark.circle")
                            }
                            .tint(.blue)
                        }
                    }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Notification Tap

    private func handleNotificationTap(_ notification: AppNotification) {
        // Mark as read
        if !notification.read {
            Task { await viewModel.markAsRead(notification.id) }
        }

        // Deep link if actionUrl is present
        if let actionUrl = notification.actionUrl, let url = URL(string: actionUrl) {
            dismiss()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                NavigationRouter.shared.handleDeepLink(url)
            }
        }
    }
}

// MARK: - Notification Row View

struct NotificationRowView: View {
    let notification: AppNotification

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Priority indicator + Icon
            ZStack {
                Circle()
                    .fill(notification.notificationType.iconColor.opacity(0.15))
                    .frame(width: 40, height: 40)

                Image(systemName: notification.notificationType.iconName)
                    .font(.system(size: 16))
                    .foregroundStyle(notification.notificationType.iconColor)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(notification.title)
                        .font(.subheadline)
                        .fontWeight(notification.read ? .regular : .semibold)
                        .lineLimit(1)

                    Spacer()

                    Text(timeAgo(from: notification.createdAt))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Text(notification.body)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)

                // Priority badge for high/urgent
                if notification.notificationPriority == .high || notification.notificationPriority == .urgent {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(notification.notificationPriority.color)
                            .frame(width: 6, height: 6)

                        Text(notification.notificationPriority == .urgent ? "Brådskande" : "Hög prioritet")
                            .font(.caption2)
                            .foregroundStyle(notification.notificationPriority.color)
                    }
                    .padding(.top, 2)
                }
            }

            // Unread indicator dot
            if !notification.read {
                Circle()
                    .fill(.blue)
                    .frame(width: 8, height: 8)
                    .padding(.top, 6)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Time Ago Helper

/// Returns a Swedish time-ago string from an ISO date string
func timeAgo(from dateString: String) -> String {
    let formatters: [ISO8601DateFormatter] = [
        {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return f
        }(),
        {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime]
            return f
        }()
    ]

    var date: Date?
    for formatter in formatters {
        if let d = formatter.date(from: dateString) {
            date = d
            break
        }
    }

    guard let date = date else { return "" }

    let now = Date()
    let interval = now.timeIntervalSince(date)

    if interval < 60 {
        return "Just nu"
    } else if interval < 3600 {
        let minutes = Int(interval / 60)
        return "\(minutes) min sedan"
    } else if interval < 86400 {
        let hours = Int(interval / 3600)
        return "\(hours) tim sedan"
    } else if interval < 172800 {
        return "Igår"
    } else if interval < 604800 {
        let days = Int(interval / 86400)
        return "\(days) dagar sedan"
    } else if interval < 2592000 {
        let weeks = Int(interval / 604800)
        return weeks == 1 ? "1 vecka sedan" : "\(weeks) veckor sedan"
    } else {
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        dateFormatter.locale = Locale(identifier: "sv_SE")
        return dateFormatter.string(from: date)
    }
}

// MARK: - Preview

#Preview {
    NotificationCenterView()
}
