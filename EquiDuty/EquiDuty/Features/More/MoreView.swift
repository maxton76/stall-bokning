//
//  MoreView.swift
//  EquiDuty
//
//  Main menu view for "More" tab
//

import SwiftUI

/// More menu view showing additional app sections
struct MoreView: View {
    /// Navigation router for programmatic navigation
    @State private var router = NavigationRouter.shared

    /// Presentation states
    @State private var showFeeding = false
    @State private var showSchema = false
    @State private var showSettings = false

    var body: some View {
        NavigationStack(path: $router.morePath) {
            List {
                // Feeding
                Button {
                    showFeeding = true
                } label: {
                    Label {
                        Text(String(localized: "feeding.title"))
                    } icon: {
                        Image(systemName: "leaf.fill")
                            .foregroundStyle(.green)
                    }
                }
                .foregroundStyle(.primary)

                // Schema
                Button {
                    showSchema = true
                } label: {
                    Label {
                        Text(String(localized: "schedule.title"))
                    } icon: {
                        Image(systemName: "calendar.badge.clock")
                            .foregroundStyle(.blue)
                    }
                }
                .foregroundStyle(.primary)

                // Connected Accounts
                NavigationLink {
                    ConnectedAccountsView()
                } label: {
                    Label {
                        Text(String(localized: "connected_accounts.title"))
                    } icon: {
                        Image(systemName: "person.badge.key.fill")
                            .foregroundStyle(.purple)
                    }
                }

                // Settings
                Button {
                    showSettings = true
                } label: {
                    Label {
                        Text(String(localized: "settings.title"))
                    } icon: {
                        Image(systemName: "gearshape.fill")
                            .foregroundStyle(.gray)
                    }
                }
                .foregroundStyle(.primary)
            }
            .navigationTitle(String(localized: "common.more"))
            .withAppNavigationDestinations()
            .fullScreenCover(isPresented: $showFeeding) {
                DismissableView {
                    FeedingTodayView()
                }
            }
            .fullScreenCover(isPresented: $showSchema) {
                SchemaView()
            }
            .fullScreenCover(isPresented: $showSettings) {
                DismissableView {
                    SettingsView()
                }
            }
        }
    }
}

/// Wrapper that adds dismiss capability to views with their own NavigationStack
private struct DismissableView<Content: View>: View {
    @Environment(\.dismiss) private var dismiss
    @ViewBuilder let content: () -> Content

    var body: some View {
        ZStack(alignment: .topTrailing) {
            content()

            // Floating close button
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.secondary)
                    .background(
                        Circle()
                            .fill(.ultraThinMaterial)
                            .frame(width: 32, height: 32)
                    )
            }
            .padding()
            .padding(.top, 50) // Account for status bar
        }
    }
}

#Preview {
    MoreView()
}
