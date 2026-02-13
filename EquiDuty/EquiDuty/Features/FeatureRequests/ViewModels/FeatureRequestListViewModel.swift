//
//  FeatureRequestListViewModel.swift
//  EquiDuty
//
//  ViewModel for feature request list with filters and pagination
//

import Foundation

@MainActor
@Observable
final class FeatureRequestListViewModel {
    // State
    var requests: [FeatureRequest] = []
    var isLoading = false
    var isLoadingMore = false
    var hasLoaded = false
    var errorMessage: String?
    var nextCursor: String?

    // Filters
    var selectedStatus: FeatureRequestStatus? = nil
    var selectedCategory: FeatureRequestCategory? = nil
    var sortBy: FeatureRequestSortBy = .votes
    var showMineOnly = false

    private let service = FeatureRequestService.shared
    private var loadTask: Task<Void, Never>?
    private var loadMoreTask: Task<Void, Never>?
    private var votingIds: Set<String> = []

    var isEmpty: Bool { requests.isEmpty }

    func loadData() {
        guard !isLoading else { return }
        loadTask?.cancel()
        loadTask = Task {
            isLoading = true
            errorMessage = nil
            do {
                let response = try await service.listFeatureRequests(
                    status: selectedStatus,
                    category: selectedCategory,
                    sort: sortBy,
                    mine: showMineOnly
                )
                guard !Task.isCancelled else { return }
                requests = response.items
                nextCursor = response.nextCursor
                hasLoaded = true
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    func loadMore() {
        guard !isLoadingMore, let cursor = nextCursor else { return }
        loadMoreTask?.cancel()
        loadMoreTask = Task {
            isLoadingMore = true
            do {
                let response = try await service.listFeatureRequests(
                    status: selectedStatus,
                    category: selectedCategory,
                    sort: sortBy,
                    mine: showMineOnly,
                    cursor: cursor
                )
                guard !Task.isCancelled else { return }
                requests.append(contentsOf: response.items)
                nextCursor = response.nextCursor
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
            isLoadingMore = false
        }
    }

    func refresh() async {
        errorMessage = nil
        do {
            let response = try await service.listFeatureRequests(
                status: selectedStatus,
                category: selectedCategory,
                sort: sortBy,
                mine: showMineOnly
            )
            requests = response.items
            nextCursor = response.nextCursor
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func reload() {
        requests = []
        nextCursor = nil
        hasLoaded = false
        loadData()
    }

    func toggleVote(requestId: String) {
        guard !votingIds.contains(requestId) else { return }
        guard let index = requests.firstIndex(where: { $0.id == requestId }) else { return }

        votingIds.insert(requestId)

        // Optimistic update
        let wasVoted = requests[index].hasVoted ?? false
        requests[index].hasVoted = !wasVoted
        requests[index].voteCount += wasVoted ? -1 : 1

        Task {
            defer { votingIds.remove(requestId) }
            do {
                let response = try await service.toggleVote(requestId: requestId)
                // Sync with server response
                if let idx = requests.firstIndex(where: { $0.id == requestId }) {
                    requests[idx].hasVoted = response.voted
                    requests[idx].voteCount = response.voteCount
                }
            } catch {
                // Revert on failure
                if let idx = requests.firstIndex(where: { $0.id == requestId }) {
                    requests[idx].hasVoted = wasVoted
                    requests[idx].voteCount += wasVoted ? 1 : -1
                }
            }
        }
    }

    func onFilterChange() {
        reload()
    }
}
