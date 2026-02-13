//
//  CreateFeatureRequestView.swift
//  EquiDuty
//
//  Sheet for creating a feature request with AI text refinement
//

import SwiftUI

struct CreateFeatureRequestView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = CreateFeatureRequestViewModel()
    let onCreated: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                // Title
                Section {
                    TextField(String(localized: "featureRequests.create.titlePlaceholder"), text: $viewModel.title)
                    if viewModel.title.count > 0 && viewModel.title.count < 5 {
                        Text(String(localized: "featureRequests.create.titleMinLength"))
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                } header: {
                    Text(String(localized: "featureRequests.create.titleLabel"))
                }

                // Description
                Section {
                    TextEditor(text: $viewModel.description)
                        .frame(minHeight: 120)
                    if viewModel.description.count > 0 && viewModel.description.count < 20 {
                        Text(String(localized: "featureRequests.create.descriptionMinLength"))
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                } header: {
                    Text(String(localized: "featureRequests.create.descriptionLabel"))
                }

                // Category
                Section {
                    Picker(String(localized: "featureRequests.create.categoryLabel"), selection: $viewModel.selectedCategory) {
                        ForEach(FeatureRequestCategory.allCases, id: \.self) { category in
                            Text(category.displayName).tag(category)
                        }
                    }
                }

                // AI Refinement
                Section {
                    if viewModel.isRefining {
                        HStack {
                            ProgressView()
                            Text(String(localized: "featureRequests.create.refining"))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Button {
                            viewModel.refine()
                        } label: {
                            Label(String(localized: "featureRequests.create.improveWithAI"), systemImage: "sparkles")
                        }
                        .disabled(viewModel.title.isEmpty || viewModel.description.isEmpty)
                    }

                    if viewModel.isShowingRefined {
                        Button {
                            viewModel.revertToOriginal()
                        } label: {
                            Label(String(localized: "featureRequests.create.revertOriginal"), systemImage: "arrow.uturn.backward")
                        }
                        .foregroundStyle(.secondary)
                    }
                } footer: {
                    Text(String(localized: "featureRequests.create.aiHint"))
                }

                // Error
                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(String(localized: "featureRequests.create.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "cancel")) {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        viewModel.submit()
                    } label: {
                        if viewModel.isSubmitting {
                            ProgressView()
                        } else {
                            Text(String(localized: "featureRequests.create.submit"))
                        }
                    }
                    .disabled(!viewModel.isValid || viewModel.isSubmitting)
                }
            }
            .onChange(of: viewModel.didCreate) { _, created in
                if created {
                    onCreated()
                    dismiss()
                }
            }
        }
    }
}
