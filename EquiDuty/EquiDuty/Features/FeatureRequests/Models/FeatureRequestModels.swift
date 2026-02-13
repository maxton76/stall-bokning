//
//  FeatureRequestModels.swift
//  EquiDuty
//
//  Feature request data models matching API responses
//

import Foundation

// MARK: - Enums

enum FeatureRequestStatus: String, Codable, CaseIterable {
    case open
    case underReview = "under_review"
    case planned
    case inProgress = "in_progress"
    case completed
    case declined

    var displayName: String {
        switch self {
        case .open: return String(localized: "featureRequests.status.open")
        case .underReview: return String(localized: "featureRequests.status.underReview")
        case .planned: return String(localized: "featureRequests.status.planned")
        case .inProgress: return String(localized: "featureRequests.status.inProgress")
        case .completed: return String(localized: "featureRequests.status.completed")
        case .declined: return String(localized: "featureRequests.status.declined")
        }
    }
}

enum FeatureRequestCategory: String, Codable, CaseIterable {
    case improvement
    case newFeature = "new_feature"
    case integration
    case bugFix = "bug_fix"
    case other

    var displayName: String {
        switch self {
        case .improvement: return String(localized: "featureRequests.category.improvement")
        case .newFeature: return String(localized: "featureRequests.category.newFeature")
        case .integration: return String(localized: "featureRequests.category.integration")
        case .bugFix: return String(localized: "featureRequests.category.bugFix")
        case .other: return String(localized: "featureRequests.category.other")
        }
    }
}

enum FeatureRequestPriority: String, Codable {
    case low, medium, high, critical
}

enum FeatureRequestSortBy: String, CaseIterable {
    case votes, newest, oldest

    var displayName: String {
        switch self {
        case .votes: return String(localized: "featureRequests.sort.votes")
        case .newest: return String(localized: "featureRequests.sort.newest")
        case .oldest: return String(localized: "featureRequests.sort.oldest")
        }
    }
}

// MARK: - Core Types

struct FeatureRequest: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let category: FeatureRequestCategory
    let status: FeatureRequestStatus
    let priority: FeatureRequestPriority?
    let authorId: String
    let authorDisplayName: String
    var voteCount: Int
    let commentCount: Int
    let adminResponse: String?
    let adminResponseAuthorName: String?
    let adminResponseAt: String?
    let createdAt: String
    let updatedAt: String
    var hasVoted: Bool?
}

struct FeatureRequestComment: Codable, Identifiable {
    let id: String
    let body: String
    let authorId: String
    let authorDisplayName: String
    let isAdmin: Bool
    let createdAt: String
    let updatedAt: String
}

// MARK: - Input Types

struct CreateFeatureRequestInput: Codable {
    let title: String
    let description: String
    let category: String
}

struct RefineTextInput: Codable {
    let title: String
    let description: String
    let language: String
}

struct RefineTextResponse: Codable {
    let title: String
    let description: String
}

struct CreateCommentInput: Codable {
    let body: String
}

// MARK: - Response Types

struct FeatureRequestListResponse: Codable {
    let items: [FeatureRequest]
    let nextCursor: String?
}

struct FeatureRequestDetailResponse: Codable {
    let request: FeatureRequest
    let comments: [FeatureRequestComment]
    let commentsNextCursor: String?
}

struct FeatureRequestVoteResponse: Codable {
    let voted: Bool
    let voteCount: Int
}

struct CommentsResponse: Codable {
    let comments: [FeatureRequestComment]
    let nextCursor: String?
}
