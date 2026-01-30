/**
 * Feature Request / Voting System types
 *
 * Global feature request board where users submit ideas,
 * vote, and comment. Admins manage status lifecycle.
 */

import type { FirestoreTimestamp } from "./common.js";

// =============================================================================
// Enums / Union Types
// =============================================================================

export type FeatureRequestStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "declined";

export type FeatureRequestCategory =
  | "improvement"
  | "new_feature"
  | "integration"
  | "bug_fix"
  | "other";

export type FeatureRequestPriority = "low" | "medium" | "high" | "critical";

export type FeatureRequestSortBy = "votes" | "newest" | "oldest";

// =============================================================================
// Core Types
// =============================================================================

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: FeatureRequestCategory;
  status: FeatureRequestStatus;
  priority: FeatureRequestPriority | null;
  authorId: string;
  authorDisplayName: string;
  voteCount: number;
  commentCount: number;
  adminResponse: string | null;
  adminResponseAuthorName: string | null;
  adminResponseAt: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  /** Enriched on the fly per request — true if the current user has voted */
  hasVoted?: boolean;
}

export interface FeatureRequestComment {
  id: string;
  body: string;
  authorId: string;
  authorDisplayName: string;
  isAdmin: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// =============================================================================
// Input Types
// =============================================================================

export interface CreateFeatureRequestInput {
  title: string;
  description: string;
  category: FeatureRequestCategory;
}

export interface UpdateFeatureRequestStatusInput {
  status: FeatureRequestStatus;
  adminResponse?: string;
}

export interface SetFeatureRequestPriorityInput {
  priority: FeatureRequestPriority | null;
}

export interface CreateFeatureRequestCommentInput {
  body: string;
}

// =============================================================================
// Response Types
// =============================================================================

export interface FeatureRequestListResponse {
  items: FeatureRequest[];
  nextCursor: string | null;
  totalCount?: number;
}

export interface FeatureRequestDetailResponse {
  request: FeatureRequest;
  comments: FeatureRequestComment[];
  commentsNextCursor: string | null;
}

export interface FeatureRequestVoteResponse {
  voted: boolean;
  voteCount: number;
}
