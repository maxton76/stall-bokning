/**
 * ZenDesk Support Service
 *
 * Handles ZenDesk API integration for support ticket management.
 * Uses Secret Manager for secure API token storage.
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import crypto from "crypto";

// ZenDesk configuration from environment
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN || "equiduty";
const ZENDESK_EMAIL =
  process.env.ZENDESK_EMAIL || "support@equiduty.zendesk.com";

// Custom field IDs (update after creating fields in ZenDesk Admin)
const ZENDESK_FIELD_ORG_NAME = process.env.ZENDESK_FIELD_ORG_NAME;
const ZENDESK_FIELD_USER_ROLE = process.env.ZENDESK_FIELD_USER_ROLE;
const ZENDESK_FIELD_PLAN_TYPE = process.env.ZENDESK_FIELD_PLAN_TYPE;
const ZENDESK_FIELD_USER_ID = process.env.ZENDESK_FIELD_USER_ID;
const ZENDESK_FIELD_ORG_ID = process.env.ZENDESK_FIELD_ORG_ID;

const GCP_PROJECT = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

// Secret Manager client (singleton)
let secretManagerClient: SecretManagerServiceClient | null = null;

function getSecretManagerClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    secretManagerClient = new SecretManagerServiceClient();
  }
  return secretManagerClient;
}

// Cached secrets
let cachedApiToken: string | null = null;
let cachedWebhookSecret: string | null = null;

/**
 * Get ZenDesk API token from Secret Manager
 */
async function getZendeskApiToken(): Promise<string> {
  if (cachedApiToken) {
    return cachedApiToken;
  }

  // For local development, use environment variable
  if (process.env.ZENDESK_API_TOKEN) {
    cachedApiToken = process.env.ZENDESK_API_TOKEN;
    return cachedApiToken;
  }

  if (!GCP_PROJECT) {
    throw new Error("GCP_PROJECT environment variable not set");
  }

  const client = getSecretManagerClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/${GCP_PROJECT}/secrets/zendesk-api-token/versions/latest`,
  });

  const token = version.payload?.data?.toString().trim() || "";
  cachedApiToken = token;
  return token;
}

/**
 * Get ZenDesk webhook secret from Secret Manager
 */
async function getZendeskWebhookSecret(): Promise<string> {
  if (cachedWebhookSecret) {
    return cachedWebhookSecret;
  }

  // For local development, use environment variable
  if (process.env.ZENDESK_WEBHOOK_SECRET) {
    cachedWebhookSecret = process.env.ZENDESK_WEBHOOK_SECRET;
    return cachedWebhookSecret;
  }

  if (!GCP_PROJECT) {
    throw new Error("GCP_PROJECT environment variable not set");
  }

  const client = getSecretManagerClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/${GCP_PROJECT}/secrets/zendesk-webhook-secret/versions/latest`,
  });

  const secret = version.payload?.data?.toString().trim() || "";
  cachedWebhookSecret = secret;
  return secret;
}

/**
 * ZenDesk API base URL
 */
function getZendeskApiUrl(): string {
  return `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2`;
}

/**
 * Get authorization header for ZenDesk API
 */
async function getAuthHeader(): Promise<string> {
  const apiToken = await getZendeskApiToken();
  const credentials = `${ZENDESK_EMAIL}/token:${apiToken}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

/**
 * Parameters for creating a ZenDesk ticket
 */
export interface CreateTicketParams {
  userEmail: string;
  userName: string;
  userId: string;
  organizationName: string;
  organizationId: string;
  userRole: string;
  planType: string;
  subject: string;
  body: string;
  locale: "sv" | "en";
  category?: string;
  zendeskUserId?: number;
}

/**
 * ZenDesk ticket response
 */
export interface ZendeskTicketResponse {
  ticket: {
    id: number;
    url: string;
    status: string;
    subject: string;
    requester_id: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create a support ticket in ZenDesk
 */
export async function createTicket(
  params: CreateTicketParams,
): Promise<ZendeskTicketResponse> {
  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  // Build custom fields array
  const customFields: Array<{ id: number; value: string }> = [];

  if (ZENDESK_FIELD_ORG_NAME) {
    customFields.push({
      id: parseInt(ZENDESK_FIELD_ORG_NAME, 10),
      value: params.organizationName,
    });
  }
  if (ZENDESK_FIELD_USER_ROLE) {
    customFields.push({
      id: parseInt(ZENDESK_FIELD_USER_ROLE, 10),
      value: params.userRole,
    });
  }
  if (ZENDESK_FIELD_PLAN_TYPE) {
    customFields.push({
      id: parseInt(ZENDESK_FIELD_PLAN_TYPE, 10),
      value: params.planType,
    });
  }
  if (ZENDESK_FIELD_USER_ID) {
    customFields.push({
      id: parseInt(ZENDESK_FIELD_USER_ID, 10),
      value: params.userId,
    });
  }
  if (ZENDESK_FIELD_ORG_ID) {
    customFields.push({
      id: parseInt(ZENDESK_FIELD_ORG_ID, 10),
      value: params.organizationId,
    });
  }

  // Build ticket tags based on category and plan
  const tags = ["equicare", params.planType];
  if (params.category) {
    tags.push(params.category);
  }

  const ticketPayload = {
    ticket: {
      subject: params.subject,
      comment: {
        body: params.body,
        ...(params.zendeskUserId && { author_id: params.zendeskUserId }),
      },
      requester: {
        name: params.userName,
        email: params.userEmail,
        locale: params.locale === "sv" ? "sv" : "en-US",
      },
      tags,
      custom_fields: customFields.length > 0 ? customFields : undefined,
    },
  };

  const response = await fetch(`${apiUrl}/tickets.json`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ticketPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("ZenDesk API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    throw new Error(
      `ZenDesk API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<ZendeskTicketResponse>;
}

/**
 * Get a ticket by ID from ZenDesk
 */
export async function getTicket(
  ticketId: number,
): Promise<ZendeskTicketResponse | null> {
  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  const response = await fetch(`${apiUrl}/tickets/${ticketId}.json`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `ZenDesk API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<ZendeskTicketResponse>;
}

/**
 * Search for tickets by requester email
 */
export async function searchTicketsByEmail(
  email: string,
): Promise<{ tickets: ZendeskTicketResponse["ticket"][] }> {
  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  const query = encodeURIComponent(`type:ticket requester:${email}`);
  const response = await fetch(`${apiUrl}/search.json?query=${query}`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `ZenDesk API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    results?: ZendeskTicketResponse["ticket"][];
  };
  return { tickets: data.results || [] };
}

/**
 * ZenDesk user details
 */
export interface ZendeskUser {
  id: number;
  email: string;
  name: string;
}

/**
 * Get user details from Zendesk by user ID
 */
export async function getZendeskUser(
  userId: string,
): Promise<ZendeskUser | null> {
  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  const response = await fetch(`${apiUrl}/users/${userId}.json`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `ZenDesk API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { user: ZendeskUser };
  return data.user;
}

/**
 * Verify ZenDesk webhook secret
 *
 * Compares the provided secret from the X-Zendesk-Webhook-Secret header
 * against the stored secret in Secret Manager.
 */
export async function verifyWebhookSecret(
  providedSecret: string | undefined,
): Promise<boolean> {
  if (!providedSecret) {
    return false;
  }

  const expectedSecret = await getZendeskWebhookSecret();

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(expectedSecret),
    );
  } catch {
    // Buffers have different lengths - secrets don't match
    return false;
  }
}

/**
 * Bulk-fetch Zendesk users by their IDs
 * Uses the show_many endpoint to avoid N+1 queries
 */
export async function getZendeskUsersBulk(
  userIds: number[],
): Promise<Array<{ id: number; name: string; role: string }>> {
  if (userIds.length === 0) return [];

  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  const ids = userIds.join(",");
  const response = await fetch(`${apiUrl}/users/show_many.json?ids=${ids}`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `ZenDesk API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    users: Array<{ id: number; name: string; role: string }>;
  };
  return data.users || [];
}

/**
 * Raw comment from Zendesk API
 */
interface ZendeskRawComment {
  id: number;
  body: string;
  author_id: number;
  public: boolean;
  created_at: string;
  via: {
    channel: string;
  };
}

/**
 * Get all comments for a ticket, with author info resolved via bulk user fetch
 */
export async function getTicketComments(ticketId: number): Promise<{
  comments: ZendeskRawComment[];
  authors: Map<number, { name: string; role: string }>;
}> {
  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  const response = await fetch(`${apiUrl}/tickets/${ticketId}/comments.json`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    throw new Error("Ticket not found");
  }

  if (!response.ok) {
    throw new Error(
      `ZenDesk API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { comments: ZendeskRawComment[] };
  const comments = data.comments || [];

  // Collect unique author IDs and bulk-resolve
  const uniqueAuthorIds = [...new Set(comments.map((c) => c.author_id))];
  const users = await getZendeskUsersBulk(uniqueAuthorIds);
  const authors = new Map(
    users.map((u) => [u.id, { name: u.name, role: u.role }]),
  );

  return { comments, authors };
}

/**
 * Add a reply to a ticket on behalf of an end-user
 */
export async function addTicketReply(
  ticketId: number,
  body: string,
  authorId: number,
): Promise<void> {
  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  const response = await fetch(`${apiUrl}/tickets/${ticketId}.json`, {
    method: "PUT",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ticket: {
        comment: {
          body,
          author_id: authorId,
        },
      },
    }),
  });

  if (response.status === 404) {
    throw new Error("Ticket not found");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("ZenDesk API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    throw new Error(
      `ZenDesk API error: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Find or create a Zendesk end-user by email.
 * Returns their Zendesk user ID for use as author_id on comments.
 */
export async function findOrCreateZendeskUser(
  email: string,
  name: string,
): Promise<number> {
  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  const response = await fetch(`${apiUrl}/users/create_or_update.json`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user: { email, name },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to find/create Zendesk user:", {
      status: response.status,
      body: errorBody,
    });
    throw new Error(`Failed to find/create Zendesk user: ${response.status}`);
  }

  const data = (await response.json()) as { user: { id: number } };
  return data.user.id;
}

/**
 * Update a ticket's status in ZenDesk
 */
export async function updateTicketStatus(
  ticketId: number,
  status: "solved" | "open",
): Promise<void> {
  const authHeader = await getAuthHeader();
  const apiUrl = getZendeskApiUrl();

  const response = await fetch(`${apiUrl}/tickets/${ticketId}.json`, {
    method: "PUT",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ticket: { status },
    }),
  });

  if (response.status === 404) {
    throw new Error("Ticket not found");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("ZenDesk API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    throw new Error(
      `ZenDesk API error: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Clear cached secrets (useful for testing or forcing refresh)
 */
export function clearSecretCache(): void {
  cachedApiToken = null;
  cachedWebhookSecret = null;
}
