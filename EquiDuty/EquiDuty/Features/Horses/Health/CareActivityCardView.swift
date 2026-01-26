//
//  CareActivityCardView.swift
//  EquiDuty
//
//  Card view displaying all care activity types in a grid
//

import SwiftUI

struct CareActivityCardView: View {
    let horse: Horse

    @State private var careService = CareActivityService.shared
    @State private var authService = AuthService.shared

    @State private var statuses: [CareActivityStatus] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    // Sheets
    @State private var showAddForm = false
    @State private var selectedType: CareActivityType?
    @State private var selectedStatus: CareActivityStatus?

    private let columns = [
        GridItem(.flexible(), spacing: 8),
        GridItem(.flexible(), spacing: 8)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with add button
            HStack {
                Text(String(localized: "horse.care_activities"))
                    .font(.headline)
                Spacer()
                Button {
                    selectedType = nil
                    showAddForm = true
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
            } else if let error = errorMessage {
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Button(String(localized: "common.retry")) {
                        loadData()
                    }
                    .font(.caption)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            } else {
                // 2-column grid of care types
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(statuses) { status in
                        CareActivityTypeCell(status: status) {
                            handleCellTap(status)
                        }
                        .background(Color(.tertiarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onAppear {
            loadData()
        }
        .sheet(isPresented: $showAddForm) {
            CareActivityFormSheet(
                horse: horse,
                preselectedType: selectedType,
                onSave: {
                    loadData()
                }
            )
        }
        .sheet(item: $selectedStatus) { status in
            CareActivityDetailSheet(
                horse: horse,
                status: status,
                onComplete: {
                    loadData()
                },
                onEdit: {
                    selectedType = status.type
                    selectedStatus = nil
                    showAddForm = true
                },
                onDelete: {
                    loadData()
                }
            )
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                statuses = try await careService.getCareActivityStatuses(horseId: horse.id)
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    // MARK: - Actions

    private func handleCellTap(_ status: CareActivityStatus) {
        if status.nextScheduledActivity != nil {
            // Show detail sheet for scheduled activity
            selectedStatus = status
        } else {
            // Show add form pre-selected with this type
            selectedType = status.type
            showAddForm = true
        }
    }
}

#Preview {
    ScrollView {
        CareActivityCardView(horse: Horse(
            id: "test",
            name: "Test Horse",
            color: .brown,
            ownerId: "owner1",
            status: .active,
            createdAt: Date(),
            updatedAt: Date()
        ))
        .padding()
    }
}
