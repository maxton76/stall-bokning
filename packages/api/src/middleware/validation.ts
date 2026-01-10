import { z } from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Validation Middleware
 *
 * Centralizes validation error response logic.
 * Eliminates Pattern 3: Duplicate validation error responses (9+ occurrences)
 *
 * Before (repeated 9+ times):
 * ```
 * const validation = schema.safeParse(request.body)
 * if (!validation.success) {
 *   return reply.status(400).send({
 *     error: 'Bad Request',
 *     message: 'Invalid input',
 *     details: validation.error.errors
 *   })
 * }
 * ```
 *
 * After (single implementation):
 * ```
 * fastify.post('/', {
 *   preHandler: [authenticate, validateBody(schema)]
 * }, async (request, reply) => {
 *   const data = (request as any).validatedBody
 *   // data is already validated and typed
 * })
 * ```
 */

/**
 * Validate request body against Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Fastify preHandler function
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const validation = schema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid input",
        details: validation.error.errors,
      });
    }

    // Attach validated data to request for use in route handler
    (request as any).validatedBody = validation.data;
  };
}

/**
 * Validate request params against Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Fastify preHandler function
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const validation = schema.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid parameters",
        details: validation.error.errors,
      });
    }

    (request as any).validatedParams = validation.data;
  };
}

/**
 * Validate request query against Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Fastify preHandler function
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const validation = schema.safeParse(request.query);

    if (!validation.success) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid query parameters",
        details: validation.error.errors,
      });
    }

    (request as any).validatedQuery = validation.data;
  };
}
