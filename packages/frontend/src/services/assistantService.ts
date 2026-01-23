import { apiClient } from "@/lib/apiClient";
import type {
  AssistantQuery,
  AssistantResponse,
  AssistantConversation,
} from "@stall-bokning/shared";

/**
 * Query the AI assistant
 */
export async function queryAssistant(
  organizationId: string,
  query: AssistantQuery,
): Promise<AssistantResponse & { conversationId: string }> {
  return apiClient.post<AssistantResponse & { conversationId: string }>(
    `/organizations/${organizationId}/assistant/query`,
    query,
  );
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  organizationId: string,
  conversationId: string,
): Promise<AssistantConversation> {
  return apiClient.get<AssistantConversation>(
    `/organizations/${organizationId}/assistant/conversations/${conversationId}`,
  );
}

/**
 * List user's conversations
 */
export async function listConversations(
  organizationId: string,
  limit?: number,
): Promise<{
  conversations: {
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
  }[];
}> {
  const params: Record<string, string> = {};
  if (limit) params.limit = limit.toString();

  return apiClient.get<{
    conversations: {
      id: string;
      title: string;
      updatedAt: string;
      messageCount: number;
    }[];
  }>(
    `/organizations/${organizationId}/assistant/conversations`,
    Object.keys(params).length > 0 ? params : undefined,
  );
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  organizationId: string,
  conversationId: string,
): Promise<void> {
  await apiClient.delete(
    `/organizations/${organizationId}/assistant/conversations/${conversationId}`,
  );
}

/**
 * Get quick actions for the assistant
 */
export async function getQuickActions(
  organizationId: string,
  language: "sv" | "en" = "sv",
): Promise<{
  quickActions: {
    id: string;
    label: string;
    icon: string;
    query: string;
    category: string;
  }[];
}> {
  return apiClient.get<{
    quickActions: {
      id: string;
      label: string;
      icon: string;
      query: string;
      category: string;
    }[];
  }>(`/organizations/${organizationId}/assistant/quick-actions`, { language });
}
