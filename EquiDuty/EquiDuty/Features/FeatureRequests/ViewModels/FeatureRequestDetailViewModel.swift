//
//  FeatureRequestDetailViewModel.swift
//  EquiDuty
//
//  ViewModel for feature request detail with comments
//

import Foundation

@MainActor
@Observable
final class FeatureRequestDetailViewModel {
    let requestId: String

    // State
    var request: FeatureRequest?
    var comments: [FeatureRequestComment] = []
    var commentsNextCursor: String?
    var isLoading = false
    var isLoadingMoreComments = false
    var errorMessage: String?

    // Comment input
    var newCommentText = ""
    var isSendingComment = false

    private let service = FeatureRequestService.shared
    private var loadTask: Task<Void, Never>?
    private var loadMoreTask: Task<Void, Never>?
    private var isVoting = false

    init(requestId: String) {
        self.requestId = requestId
    }

    func loadData() {
        guard !isLoading else { return }
        loadTask?.cancel()
        loadTask = Task {
            isLoading = true
            errorMessage = nil
            do {
                let response = try await service.getFeatureRequest(id: requestId)
                guard !Task.isCancelled else { return }
                request = response.request
                comments = response.comments
                commentsNextCursor = response.commentsNextCursor
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    func loadMoreComments() {
        guard !isLoadingMoreComments, let cursor = commentsNextCursor else { return }
        loadMoreTask?.cancel()
        loadMoreTask = Task {
            isLoadingMoreComments = true
            do {
                let response = try await service.getComments(requestId: requestId, cursor: cursor)
                guard !Task.isCancelled else { return }
                comments.append(contentsOf: response.comments)
                commentsNextCursor = response.nextCursor
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
            isLoadingMoreComments = false
        }
    }

    func toggleVote() {
        guard !isVoting else { return }
        guard var req = request else { return }

        isVoting = true

        // Optimistic update
        let wasVoted = req.hasVoted ?? false
        req.hasVoted = !wasVoted
        req.voteCount += wasVoted ? -1 : 1
        request = req

        Task {
            defer { isVoting = false }
            do {
                let response = try await service.toggleVote(requestId: requestId)
                request?.hasVoted = response.voted
                request?.voteCount = response.voteCount
            } catch {
                // Revert
                request?.hasVoted = wasVoted
                request?.voteCount += wasVoted ? 1 : -1
            }
        }
    }

    func sendComment() {
        let text = newCommentText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSendingComment else { return }

        Task {
            isSendingComment = true
            do {
                let comment = try await service.addComment(requestId: requestId, body: text)
                comments.append(comment)
                newCommentText = ""
            } catch {
                // Show error via errorMessage
                errorMessage = error.localizedDescription
            }
            isSendingComment = false
        }
    }
}
