//
//  FeatureRequestDetailView.swift
//  EquiDuty
//
//  Detail view for a feature request with comments
//

import SwiftUI

struct FeatureRequestDetailView: View {
    let requestId: String
    @State private var viewModel: FeatureRequestDetailViewModel

    init(requestId: String) {
        self.requestId = requestId
        self._viewModel = State(initialValue: FeatureRequestDetailViewModel(requestId: requestId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.request == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.request == nil {
                ErrorView(message: error) {
                    viewModel.loadData()
                }
            } else if let request = viewModel.request {
                VStack(spacing: 0) {
                    ScrollView {
                        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.lg) {
                            // Header
                            requestHeader(request)

                            // Admin response
                            if let adminResponse = request.adminResponse, !adminResponse.isEmpty {
                                adminResponseCard(adminResponse, authorName: request.adminResponseAuthorName)
                            }

                            Divider()

                            // Comments section
                            commentsSection
                        }
                        .padding()
                    }

                    // Comment input
                    commentInputBar
                }
            }
        }
        .navigationTitle(String(localized: "featureRequests.detail.title"))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadData()
        }
    }

    // MARK: - Request Header

    private func requestHeader(_ request: FeatureRequest) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Text(request.title)
                .font(.title2)
                .fontWeight(.bold)

            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                FeatureRequestStatusBadge(status: request.status)
                FeatureRequestCategoryBadge(category: request.category)
                if let priority = request.priority {
                    Text(priority.rawValue.capitalized)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.orange.opacity(0.15))
                        .foregroundStyle(.orange)
                        .clipShape(Capsule())
                }
            }

            Text(request.description)
                .font(.body)
                .foregroundStyle(.primary)

            HStack {
                // Vote button
                Button {
                    viewModel.toggleVote()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: request.hasVoted == true ? "hand.thumbsup.fill" : "hand.thumbsup")
                        Text("\(request.voteCount)")
                            .fontWeight(.semibold)
                    }
                    .font(.subheadline)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(request.hasVoted == true ? Color.accentColor.opacity(0.15) : Color(.systemGray6))
                    .foregroundStyle(request.hasVoted == true ? .tint : .primary)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(request.authorDisplayName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(request.createdAt.relativeTime())
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
    }

    // MARK: - Admin Response

    private func adminResponseCard(_ response: String, authorName: String?) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack {
                Image(systemName: "shield.checkered")
                    .foregroundStyle(.tint)
                Text(String(localized: "featureRequests.detail.adminResponse"))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                if let name = authorName {
                    Text("– \(name)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Text(response)
                .font(.subheadline)
                .foregroundStyle(.primary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.accentColor.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium))
    }

    // MARK: - Comments Section

    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Text(String(localized: "featureRequests.comments.title"))
                .font(.headline)

            if viewModel.comments.isEmpty {
                Text(String(localized: "featureRequests.comments.empty"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical)
            } else {
                ForEach(viewModel.comments) { comment in
                    CommentRow(comment: comment)
                }

                if viewModel.commentsNextCursor != nil {
                    Button {
                        viewModel.loadMoreComments()
                    } label: {
                        if viewModel.isLoadingMoreComments {
                            ProgressView()
                        } else {
                            Text(String(localized: "featureRequests.comments.loadMore"))
                                .font(.subheadline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }

    // MARK: - Comment Input

    private var commentInputBar: some View {
        HStack(spacing: EquiDutyDesign.Spacing.sm) {
            TextField(String(localized: "featureRequests.comments.placeholder"), text: $viewModel.newCommentText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...4)

            Button {
                viewModel.sendComment()
            } label: {
                if viewModel.isSendingComment {
                    ProgressView()
                        .frame(width: 24, height: 24)
                } else {
                    Image(systemName: "paperplane.fill")
                        .font(.title3)
                }
            }
            .disabled(viewModel.newCommentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isSendingComment)
        }
        .padding()
        .background(.ultraThinMaterial)
    }
}

// MARK: - Comment Row

private struct CommentRow: View {
    let comment: FeatureRequestComment

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
            HStack {
                Text(comment.authorDisplayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                if comment.isAdmin {
                    Text("Admin")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.accentColor.opacity(0.15))
                        .foregroundStyle(.tint)
                        .clipShape(Capsule())
                }
                Spacer()
                Text(comment.createdAt.relativeTime())
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            Text(comment.body)
                .font(.subheadline)
                .foregroundStyle(.primary)
        }
        .padding()
        .background(Color(.systemGray6).opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium))
    }
}

