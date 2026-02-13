//
//  CreateFeatureRequestViewModel.swift
//  EquiDuty
//
//  ViewModel for creating a feature request with AI refinement
//

import Foundation

@MainActor
@Observable
final class CreateFeatureRequestViewModel {
    // Form fields
    var title = ""
    var description = ""
    var selectedCategory: FeatureRequestCategory = .improvement

    // AI refinement
    var isRefining = false
    var isShowingRefined = false
    var originalTitle: String?
    var originalDescription: String?

    // Submission
    var isSubmitting = false
    var errorMessage: String?
    var didCreate = false

    private let service = FeatureRequestService.shared
    private var submitTask: Task<Void, Never>?
    private var refineTask: Task<Void, Never>?

    var isValid: Bool {
        title.trimmingCharacters(in: .whitespacesAndNewlines).count >= 5 &&
        description.trimmingCharacters(in: .whitespacesAndNewlines).count >= 20
    }

    func submit() {
        guard isValid, !isSubmitting else { return }
        submitTask?.cancel()
        submitTask = Task {
            isSubmitting = true
            errorMessage = nil
            do {
                _ = try await service.createFeatureRequest(
                    title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                    description: description.trimmingCharacters(in: .whitespacesAndNewlines),
                    category: selectedCategory
                )
                guard !Task.isCancelled else { return }
                didCreate = true
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
            isSubmitting = false
        }
    }

    func refine() {
        guard !isRefining else { return }

        // Store originals before first refine
        if !isShowingRefined {
            originalTitle = title
            originalDescription = description
        }

        let currentLanguage = Locale.current.language.languageCode?.identifier ?? "sv"
        let lang = currentLanguage == "en" ? "en" : "sv"

        refineTask?.cancel()
        refineTask = Task {
            isRefining = true
            errorMessage = nil
            do {
                let response = try await service.refineText(
                    title: title,
                    description: description,
                    language: lang
                )
                guard !Task.isCancelled else { return }
                title = response.title
                description = response.description
                isShowingRefined = true
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
            isRefining = false
        }
    }

    func revertToOriginal() {
        guard let origTitle = originalTitle, let origDesc = originalDescription else { return }
        title = origTitle
        description = origDesc
        isShowingRefined = false
        originalTitle = nil
        originalDescription = nil
    }
}
