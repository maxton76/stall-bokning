/**
 * Feature Request Service
 *
 * Frontend service for the feature request / voting system.
 */

import { apiClient } from "@/lib/apiClient";
import type {
  FeatureRequest,
  FeatureRequestListResponse,
  FeatureRequestDetailResponse,
  FeatureRequestVoteResponse,
  FeatureRequestComment,
  CreateFeatureRequestInput,
  UpdateFeatureRequestStatusInput,
  SetFeatureRequestPriorityInput,
  CreateFeatureRequestCommentInput,
} from "@equiduty/shared";

interface ListParams {
  status?: string;
  category?: string;
  sort?: string;
  mine?: boolean;
  cursor?: string;
  limit?: number;
}

/**
 * List feature requests with optional filters and pagination
 */
export async function listFeatureRequests(
  params: ListParams = {},
): Promise<FeatureRequestListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    status: params.status,
    category: params.category,
    sort: params.sort || "votes",
    mine: params.mine ? "true" : undefined,
    cursor: params.cursor,
    limit: params.limit || 20,
  };
  return apiClient.get<FeatureRequestListResponse>(
    "/feature-requests",
    queryParams,
  );
}

/**
 * Get a single feature request with its comments
 */
export async function getFeatureRequest(
  id: string,
): Promise<FeatureRequestDetailResponse> {
  return apiClient.get<FeatureRequestDetailResponse>(`/feature-requests/${id}`);
}

/**
 * Create a new feature request
 */
export async function createFeatureRequest(
  input: CreateFeatureRequestInput,
): Promise<FeatureRequest> {
  return apiClient.post<FeatureRequest>("/feature-requests", input);
}

/**
 * Toggle vote on a feature request (vote or unvote)
 */
export async function toggleVote(
  id: string,
): Promise<FeatureRequestVoteResponse> {
  return apiClient.post<FeatureRequestVoteResponse>(
    `/feature-requests/${id}/vote`,
  );
}

/**
 * Get comments for a feature request with optional cursor pagination
 */
export async function getComments(
  id: string,
  cursor?: string,
): Promise<{ comments: FeatureRequestComment[]; nextCursor: string | null }> {
  return apiClient.get(`/feature-requests/${id}/comments`, { cursor });
}

/**
 * Add a comment to a feature request
 */
export async function addComment(
  id: string,
  input: CreateFeatureRequestCommentInput,
): Promise<FeatureRequestComment> {
  return apiClient.post<FeatureRequestComment>(
    `/feature-requests/${id}/comments`,
    input,
  );
}

/**
 * Refine feature request text using AI
 */
export async function refineFeatureRequestText(
  title: string,
  description: string,
  language: string = "sv",
): Promise<{ title: string; description: string }> {
  return apiClient.post<{ title: string; description: string }>(
    "/feature-requests/refine",
    { title, description, language },
  );
}

/**
 * Update the status of a feature request (admin only)
 */
export async function updateFeatureRequestStatus(
  id: string,
  input: UpdateFeatureRequestStatusInput,
): Promise<FeatureRequest> {
  return apiClient.put<FeatureRequest>(`/feature-requests/${id}/status`, input);
}

/**
 * Set the priority of a feature request (admin only)
 */
export async function setFeatureRequestPriority(
  id: string,
  input: SetFeatureRequestPriorityInput,
): Promise<FeatureRequest> {
  return apiClient.put<FeatureRequest>(
    `/feature-requests/${id}/priority`,
    input,
  );
}

/**
 * Delete a feature request and all its data (admin only)
 */
export async function deleteFeatureRequest(id: string): Promise<void> {
  return apiClient.delete(`/feature-requests/${id}`);
}
