//
//  NotificationBellToolbarModifier.swift
//  EquiDuty
//
//  Reusable toolbar modifier that adds a notification bell to any tab's navigation bar.
//  SwiftUI automatically hides toolbar items when search is active.
//

import SwiftUI

struct NotificationBellToolbarModifier: ViewModifier {
    @Bindable var viewModel: NotificationViewModel
    @Binding var showNotificationCenter: Bool

    func body(content: Content) -> some View {
        content
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNotificationCenter = true
                    } label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "bell.fill")
                                .font(.system(size: 18))
                                .foregroundStyle(.primary)
                                .frame(width: 36, height: 36)

                            if viewModel.unreadCount > 0 {
                                Text(viewModel.unreadCount > 99 ? "99+" : "\(viewModel.unreadCount)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 2)
                                    .background(Color.red)
                                    .clipShape(Capsule())
                                    .offset(x: 6, y: -4)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .sheet(isPresented: $showNotificationCenter) {
                NotificationCenterView()
            }
    }
}

extension View {
    func notificationBellToolbar(
        viewModel: NotificationViewModel,
        showNotificationCenter: Binding<Bool>
    ) -> some View {
        modifier(NotificationBellToolbarModifier(
            viewModel: viewModel,
            showNotificationCenter: showNotificationCenter
        ))
    }
}
