/**
 * ZenDesk Support Service
 *
 * Handles ZenDesk API integration for support ticket management.
 * Uses Secret Manager for secure API token storage.
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import crypto from "crypto";

// ZenDesk configuration from environment
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN || "equicare";
const ZENDESK_EMAIL =
  process.env.ZENDESK_EMAIL || "support@equicare.zendesk.com";

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

  const token = version.payload?.data?.toString() || "";
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

  const secret = version.payload?.data?.toString() || "";
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
 * Clear cached secrets (useful for testing or forcing refresh)
 */
export function clearSecretCache(): void {
  cachedApiToken = null;
  cachedWebhookSecret = null;
}
