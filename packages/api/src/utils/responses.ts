/**
 * HTTP Response Utilities
 *
 * Centralized error response helpers for consistent API responses.
 * Eliminates 40+ duplicated error response patterns across routes.
 *
 * @example
 * ```typescript
 * // Before (repeated pattern)
 * return reply.status(400).send({ error: "Validation failed", details });
 *
 * // After (centralized)
 * return badRequest(reply, "Validation failed", details);
 * ```
 */

import type { FastifyReply } from "fastify";

// =============================================================================
// Error Response Types
// =============================================================================

interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  code?: string;
}

// =============================================================================
// Client Error Responses (4xx)
// =============================================================================

/**
 * 400 Bad Request - Invalid input or validation failure
 */
export function badRequest(
  reply: FastifyReply,
  message: string,
  details?: unknown,
): FastifyReply {
  const body: ErrorResponse = { error: message };
  if (details) body.details = details;
  return reply.status(400).send(body);
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export function unauthorized(
  reply: FastifyReply,
  message = "Authentication required",
): FastifyReply {
  return reply.status(401).send({ error: message });
}

/**
 * 403 Forbidden - Authenticated but not allowed
 */
export function forbidden(
  reply: FastifyReply,
  message = "Access denied",
): FastifyReply {
  return reply.status(403).send({ error: message });
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export function notFound(
  reply: FastifyReply,
  resource: string,
  id?: string,
): FastifyReply {
  const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
  return reply.status(404).send({ error: message });
}

/**
 * 409 Conflict - Resource state conflict (e.g., duplicate)
 */
export function conflict(
  reply: FastifyReply,
  message: string,
  details?: unknown,
): FastifyReply {
  const body: ErrorResponse = { error: message };
  if (details) body.details = details;
  return reply.status(409).send(body);
}

/**
 * 422 Unprocessable Entity - Valid syntax but semantic error
 */
export function unprocessable(
  reply: FastifyReply,
  message: string,
  details?: unknown,
): FastifyReply {
  const body: ErrorResponse = { error: message };
  if (details) body.details = details;
  return reply.status(422).send(body);
}

// =============================================================================
// Server Error Responses (5xx)
// =============================================================================

/**
 * 500 Internal Server Error - Unexpected server error
 * Logs the error and returns a safe message to the client
 */
export function serverError(
  reply: FastifyReply,
  error: unknown,
  context?: string,
): FastifyReply {
  const message = error instanceof Error ? error.message : String(error);
  const logContext = context ? `[${context}] ` : "";

  // Log full error for debugging
  console.error(`${logContext}Server error:`, error);

  return reply.status(500).send({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? message : undefined,
  });
}

/**
 * 503 Service Unavailable - Temporary service issue
 */
export function serviceUnavailable(
  reply: FastifyReply,
  message = "Service temporarily unavailable",
): FastifyReply {
  return reply.status(503).send({ error: message });
}

// =============================================================================
// Success Response Helpers
// =============================================================================

/**
 * 200 OK with data
 */
export function ok<T>(reply: FastifyReply, data: T): FastifyReply {
  return reply.status(200).send(data);
}

/**
 * 201 Created with resource ID
 */
export function created(
  reply: FastifyReply,
  id: string,
  data?: Record<string, unknown>,
): FastifyReply {
  return reply.status(201).send({ id, ...data });
}

/**
 * 204 No Content - Success with no body
 */
export function noContent(reply: FastifyReply): FastifyReply {
  return reply.status(204).send();
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Handle Zod validation errors consistently
 */
export function validationError(
  reply: FastifyReply,
  zodError: { issues: Array<{ path: (string | number)[]; message: string }> },
): FastifyReply {
  const details = zodError.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  return badRequest(reply, "Validation failed", details);
}
