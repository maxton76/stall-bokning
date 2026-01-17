import { authFetch } from "@/utils/authFetch";
import type {
  AssistantQuery,
  AssistantResponse,
  AssistantConversation,
} from "@stall-bokning/shared";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

/**
 * Query the AI assistant
 */
export async function queryAssistant(
  organizationId: string,
  query: AssistantQuery,
): Promise<AssistantResponse & { conversationId: string }> {
  const response = await authFetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/assistant/query`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to query assistant");
  }

  return response.json();
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  organizationId: string,
  conversationId: string,
): Promise<AssistantConversation> {
  const response = await authFetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/assistant/conversations/${conversationId}`,
  );

  if (!response.ok) {
    throw new Error("Failed to get conversation");
  }

  return response.json();
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
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await authFetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/assistant/conversations?${params}`,
  );

  if (!response.ok) {
    throw new Error("Failed to list conversations");
  }

  return response.json();
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  organizationId: string,
  conversationId: string,
): Promise<void> {
  const response = await authFetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/assistant/conversations/${conversationId}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error("Failed to delete conversation");
  }
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
  const response = await authFetch(
    `${API_BASE}/api/v1/organizations/${organizationId}/assistant/quick-actions?language=${language}`,
  );

  if (!response.ok) {
    throw new Error("Failed to get quick actions");
  }

  return response.json();
}
