//
//  FeatureRequestService.swift
//  EquiDuty
//
//  Service for feature request API operations
//

import Foundation

@MainActor
final class FeatureRequestService {
    static let shared = FeatureRequestService()

    private let apiClient = APIClient.shared

    private init() {}

    func listFeatureRequests(
        status: FeatureRequestStatus? = nil,
        category: FeatureRequestCategory? = nil,
        sort: FeatureRequestSortBy = .votes,
        mine: Bool = false,
        cursor: String? = nil,
        limit: Int = 20
    ) async throws -> FeatureRequestListResponse {
        var params: [String: String] = [
            "sort": sort.rawValue,
            "limit": "\(limit)"
        ]
        if let status { params["status"] = status.rawValue }
        if let category { params["category"] = category.rawValue }
        if mine { params["mine"] = "true" }
        if let cursor { params["cursor"] = cursor }

        return try await apiClient.get(APIEndpoints.featureRequests, params: params)
    }

    func getFeatureRequest(id: String) async throws -> FeatureRequestDetailResponse {
        return try await apiClient.get(APIEndpoints.featureRequest(id))
    }

    func createFeatureRequest(title: String, description: String, category: FeatureRequestCategory) async throws -> FeatureRequest {
        let input = CreateFeatureRequestInput(
            title: title,
            description: description,
            category: category.rawValue
        )
        return try await apiClient.post(APIEndpoints.featureRequests, body: input)
    }

    func refineText(title: String, description: String, language: String = "sv") async throws -> RefineTextResponse {
        let input = RefineTextInput(title: title, description: description, language: language)
        return try await apiClient.post(APIEndpoints.featureRequestRefine, body: input)
    }

    func toggleVote(requestId: String) async throws -> FeatureRequestVoteResponse {
        return try await apiClient.post(APIEndpoints.featureRequestVote(requestId))
    }

    func getComments(requestId: String, cursor: String? = nil, limit: Int = 20) async throws -> CommentsResponse {
        var params: [String: String] = ["limit": "\(limit)"]
        if let cursor { params["cursor"] = cursor }
        return try await apiClient.get(APIEndpoints.featureRequestComments(requestId), params: params)
    }

    func addComment(requestId: String, body: String) async throws -> FeatureRequestComment {
        let input = CreateCommentInput(body: body)
        return try await apiClient.post(APIEndpoints.featureRequestComments(requestId), body: input)
    }
}
