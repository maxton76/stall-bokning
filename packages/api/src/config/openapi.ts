/**
 * OpenAPI 3.0 Configuration for EquiDuty API
 *
 * This configuration defines the OpenAPI specification structure for the entire API.
 * Used by @fastify/swagger to auto-generate machine-readable API documentation.
 *
 * SECURITY NOTE: No Swagger UI exposed in any environment (dev/staging/prod are all internet-accessible).
 * Spec is exported to file for internal code generation only.
 */

import type { FastifyDynamicSwaggerOptions } from "@fastify/swagger";

export const openapiConfig: FastifyDynamicSwaggerOptions = {
  openapi: {
    openapi: "3.0.3",
    info: {
      title: "EquiDuty API",
      description: `
# EquiDuty API Documentation

Comprehensive REST API for stable management, horse tracking, scheduling, and billing.

## Authentication
All endpoints require Firebase Auth JWT token in Authorization header:
\`\`\`
Authorization: Bearer <firebase-jwt-token>
\`\`\`

## Authorization
- **System Roles**: system_admin, stable_owner, stable_user
- **Organization Roles**: 18 roles including administrator, groom, rider, veterinarian, etc.
- **Permissions**: 60+ granular actions via Permission Engine V2
- **Field-Level Access**: Horse data projection based on access levels (public → owner)

## Response Format
- **Success**: Serialized Firestore data (timestamps converted to ISO strings)
- **Error**: \`{ error: string, message: string, details?: unknown }\`

## Rate Limiting
- Standard: 100 requests/minute per user
- Burst: 20 requests/second per user

## Environments
- **Development**: https://equiduty-dev.ew.r.appspot.com/api/v1
- **Staging**: https://equiduty-staging.ew.r.appspot.com/api/v1
- **Production**: https://api.equiduty.com/api/v1
      `.trim(),
      version: "1.0.0",
      contact: {
        name: "EquiDuty Support",
        email: "support@equiduty.com",
      },
      license: {
        name: "Proprietary",
      },
    },
    servers: [
      {
        url: "https://equiduty-dev.ew.r.appspot.com/api/v1",
        description: "Development Environment",
      },
      {
        url: "https://equiduty-staging.ew.r.appspot.com/api/v1",
        description: "Staging Environment",
      },
      {
        url: "https://api.equiduty.com/api/v1",
        description: "Production Environment",
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "User authentication and registration",
      },
      {
        name: "Organizations",
        description: "Organization management and settings",
      },
      {
        name: "Organization Members",
        description: "Member management and invitations",
      },
      { name: "Stables", description: "Stable facilities and configuration" },
      { name: "Horses", description: "Horse management and tracking" },
      {
        name: "Horse Ownership",
        description: "Horse ownership and co-ownership",
      },
      { name: "Horse Media", description: "Horse photos and documents" },
      { name: "Horse Team", description: "Horse care team management" },
      { name: "Horse Tack", description: "Tack and equipment management" },
      {
        name: "Horse Groups",
        description: "Horse grouping and categorization",
      },
      { name: "Schedules", description: "Shift scheduling and management" },
      { name: "Shifts", description: "Individual shift operations" },
      { name: "Shift Types", description: "Shift type definitions" },
      { name: "Activities", description: "Activity tracking and logging" },
      {
        name: "Recurring Activities",
        description: "Recurring activity templates",
      },
      { name: "Activity Types", description: "Activity type definitions" },
      { name: "Routines", description: "Routine templates and management" },
      { name: "Routine Instances", description: "Routine execution instances" },
      {
        name: "Routine Schedules",
        description: "Routine scheduling and automation",
      },
      { name: "Health Records", description: "Health and medical records" },
      { name: "Vaccinations", description: "Vaccination tracking and records" },
      {
        name: "Vaccination Rules",
        description: "Vaccination requirements and rules",
      },
      { name: "Billing", description: "Invoice and payment management" },
      { name: "Invoices", description: "Invoice operations" },
      { name: "Payments", description: "Payment processing" },
      { name: "Billing Groups", description: "Billing group management" },
      { name: "Line Items", description: "Invoice line items" },
      { name: "Facilities", description: "Facility and resource management" },
      {
        name: "Facility Reservations",
        description: "Facility booking and reservations",
      },
      { name: "Feeding", description: "Feed management and tracking" },
      { name: "Feed Types", description: "Feed type definitions" },
      { name: "Feeding Times", description: "Feeding schedule management" },
      {
        name: "Horse Feedings",
        description: "Individual horse feeding records",
      },
      { name: "Inventory", description: "Inventory management" },
      { name: "Inventory Items", description: "Inventory item tracking" },
      {
        name: "Inventory Transactions",
        description: "Inventory movement tracking",
      },
      { name: "Inventory Alerts", description: "Low stock alerts" },
      {
        name: "Notifications",
        description: "Notification preferences and delivery",
      },
      { name: "Settings", description: "User and organization settings" },
      { name: "Feature Toggles", description: "Feature flag management" },
      { name: "Admin", description: "System administration endpoints" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Firebase Auth JWT token. Obtain via Firebase Authentication SDK.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error", "message"],
          properties: {
            error: {
              type: "string",
              description: "Error code or type",
              example: "UNAUTHORIZED",
            },
            message: {
              type: "string",
              description: "Human-readable error message",
              example: "Invalid authentication token",
            },
            details: {
              type: "object",
              description: "Additional error context (optional)",
              additionalProperties: true,
            },
          },
        },
        Timestamp: {
          type: "object",
          description:
            "Firestore Timestamp (serialized as ISO string in responses)",
          properties: {
            _seconds: { type: "number" },
            _nanoseconds: { type: "number" },
          },
        },
      },
      parameters: {
        organizationId: {
          name: "organizationId",
          in: "path",
          required: true,
          description: "Organization ID",
          schema: { type: "string" },
        },
        stableId: {
          name: "stableId",
          in: "path",
          required: true,
          description: "Stable ID",
          schema: { type: "string" },
        },
        horseId: {
          name: "horseId",
          in: "path",
          required: true,
          description: "Horse ID",
          schema: { type: "string" },
        },
        scheduleId: {
          name: "scheduleId",
          in: "path",
          required: true,
          description: "Schedule ID",
          schema: { type: "string" },
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing or invalid JWT token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                error: "UNAUTHORIZED",
                message: "Invalid authentication token",
              },
            },
          },
        },
        Forbidden: {
          description: "Insufficient permissions for this operation",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                error: "FORBIDDEN",
                message: "You do not have permission to perform this action",
              },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                error: "NOT_FOUND",
                message: "The requested resource was not found",
              },
            },
          },
        },
        BadRequest: {
          description: "Invalid request parameters or body",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                error: "BAD_REQUEST",
                message: "Validation failed",
                details: {
                  field: "email",
                  issue: "Invalid email format",
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  transform: ({ schema, url }: { schema: any; url: string }) => {
    // Transform Zod schemas to JSON Schema for OpenAPI
    return {
      schema,
      url,
    };
  },
};
