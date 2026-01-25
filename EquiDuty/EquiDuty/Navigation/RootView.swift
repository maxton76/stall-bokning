//
//  RootView.swift
//  EquiDuty
//
//  Root view that handles authentication state and navigation
//

import SwiftUI

/// Root view that switches between auth and main content
struct RootView: View {
    @State private var authService = AuthService.shared

    var body: some View {
        Group {
            switch authService.authState {
            case .unknown:
                SplashView()
            case .signedOut:
                AuthenticationView()
            case .signedIn:
                MainTabView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authService.authState)
    }
}

/// Splash screen while checking auth state
struct SplashView: View {
    var body: some View {
        ZStack {
            Color.accentColor
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Image(systemName: "pawprint.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(.white)

                Text("EquiDuty")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.2)
            }
        }
    }
}

/// Authentication flow container
struct AuthenticationView: View {
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            if showSignUp {
                SignUpView(showSignUp: $showSignUp)
            } else {
                LoginView(showSignUp: $showSignUp)
            }
        }
    }
}

#Preview("Root - Unknown") {
    RootView()
}

#Preview("Splash") {
    SplashView()
}
