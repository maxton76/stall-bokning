# OpenAPI Route Annotation Guide

**Purpose**: Step-by-step guide for adding OpenAPI annotations to API routes incrementally.

**Status**: Infrastructure complete ✅ | Pattern established ✅ | Incremental annotation recommended

---

## Quick Start

When modifying an API route, add OpenAPI schema annotations following this pattern:

```typescript
import { PERMISSIONS } from '../utils/openapiPermissions.js';

fastify.post(
  "/endpoint",
  {
    preHandler: [authenticate, requirePermission('action', 'params')],
    schema: {
      description: 'Clear description of what this endpoint does and why',
      tags: ['DomainName'], // Must match tag in config/openapi.ts

      // Request validation (if applicable)
      body: {
        type: 'object',
        required: ['field1', 'field2'],
        properties: {
          field1: { type: 'string', minLength: 1 },
          field2: { type: 'number', minimum: 0 },
        },
      },
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Resource ID' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },

      // Response schemas (REQUIRED)
      response: {
        200: {
          description: 'Success response description',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'object' }, // Timestamps are objects
          },
        },
        400: {
          description: 'Invalid request parameters or body',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
          },
        },
        401: {
          description: 'Missing or invalid JWT token',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        403: {
          description: 'Insufficient permissions',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        404: {
          description: 'Resource not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },

      // Permission metadata (use appropriate helper)
      ...PERMISSIONS.ORG_PERMISSION('manage_horses', 'Optional context notes'),
    },
  },
  handler
);
```

---

## Critical Rules

### ❌ DO NOT Use `$ref` in Route Schemas

**WRONG** (causes Fastify validation errors):
```typescript
response: {
  200: {
    properties: {
      createdAt: { $ref: '#/components/schemas/Timestamp' }, // ❌ BREAKS
    },
  },
  400: { $ref: '#/components/responses/BadRequest' }, // ❌ BREAKS
}
```

**CORRECT** (inline definitions):
```typescript
response: {
  200: {
    properties: {
      createdAt: { type: 'object' }, // ✅ Works
    },
  },
  400: {
    description: 'Invalid request',
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
    },
  }, // ✅ Works
}
```

**Why?** Fastify validates schemas at route registration. It cannot resolve `$ref` during runtime validation, only during OpenAPI spec generation.

### ✅ Use JSON Schema Format (Not Zod)

**WRONG**:
```typescript
import { signupSchema } from './schemas.js'; // Zod schema

schema: {
  body: signupSchema, // ❌ Causes validation errors
}
```

**CORRECT**:
```typescript
schema: {
  body: {
    type: 'object',
    required: ['email', 'firstName'],
    properties: {
      email: { type: 'string', format: 'email' },
      firstName: { type: 'string', minLength: 1 },
    },
  }, // ✅ JSON Schema format
}
```

**Note**: Keep Zod schemas for runtime validation in handler logic. Use JSON Schema for OpenAPI documentation.

### ✅ Timestamps are Objects

```typescript
properties: {
  createdAt: { type: 'object' }, // ✅ Correct
  updatedAt: { type: 'object' }, // ✅ Correct
}
```

### ✅ Use Appropriate Tags

Tags must match those defined in `packages/api/src/config/openapi.ts`:

```typescript
tags: ['Authentication']     // ✅ For auth routes
tags: ['Organizations']      // ✅ For org routes
tags: ['Horses']             // ✅ For horse routes
tags: ['Schedules']          // ✅ For schedule routes
// ... see openapi.ts for full list
```

---

## PERMISSIONS Helper Reference

Import: `import { PERMISSIONS } from '../utils/openapiPermissions.js';`

### Available Helpers

```typescript
// Public endpoint (no auth)
...PERMISSIONS.PUBLIC

// Authenticated users only
...PERMISSIONS.AUTHENTICATED

// System administrators only
...PERMISSIONS.SYSTEM_ADMIN

// Organization member (any role)
...PERMISSIONS.ORG_MEMBER('Additional context')

// Specific organization permission
...PERMISSIONS.ORG_PERMISSION('manage_horses', 'Optional notes')

// Specific stable permission
...PERMISSIONS.STABLE_PERMISSION('manage_schedules', 'Optional notes')

// Organization OR stable permission
...PERMISSIONS.ORG_OR_STABLE_PERMISSION('org_action', 'stable_action', 'Notes')

// Resource owner only
...PERMISSIONS.RESOURCE_OWNER('horse', 'Or admin with manage_horses')
```

### Common Patterns

**Authentication routes**: `PERMISSIONS.AUTHENTICATED`
**Organization management**: `PERMISSIONS.ORG_PERMISSION('manage_org_settings')`
**Horse management**: `PERMISSIONS.ORG_PERMISSION('manage_horses')`
**Schedule management**: `PERMISSIONS.STABLE_PERMISSION('manage_schedules')`
**Admin-only**: `PERMISSIONS.SYSTEM_ADMIN`

---

## Complete Examples

### Example 1: Simple GET (No Body/Params)

**File**: `packages/api/src/routes/auth.ts`

```typescript
import { PERMISSIONS } from '../utils/openapiPermissions.js';

fastify.get(
  "/me",
  {
    preHandler: [authenticate],
    schema: {
      description: 'Get authenticated user profile from Firestore',
      tags: ['Authentication'],
      response: {
        200: {
          description: 'User profile retrieved successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            systemRole: {
              type: 'string',
              enum: ['system_admin', 'stable_owner', 'stable_user']
            },
            createdAt: { type: 'object' },
            updatedAt: { type: 'object' },
          },
        },
        401: {
          description: 'Missing or invalid JWT token',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        404: {
          description: 'Resource not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
      ...PERMISSIONS.AUTHENTICATED,
    },
  },
  handler
);
```

### Example 2: POST with Body Validation

**File**: `packages/api/src/routes/auth.ts`

```typescript
fastify.post(
  "/signup",
  {
    preHandler: [authenticate],
    schema: {
      description: 'Complete user registration by creating Firestore profile, personal organization with implicit stable, and migrating pending invites',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 },
          phoneNumber: { type: 'string' },
          organizationType: { type: 'string', enum: ['personal', 'business'] },
        },
      },
      response: {
        201: {
          description: 'User successfully registered',
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                systemRole: { type: 'string', enum: ['stable_user'] },
                createdAt: { type: 'object' },
                updatedAt: { type: 'object' },
              },
            },
          },
        },
        400: {
          description: 'Invalid request parameters or body',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
          },
        },
        401: {
          description: 'Missing or invalid JWT token',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        409: {
          description: 'User already registered',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
      ...PERMISSIONS.AUTHENTICATED,
    },
  },
  handler
);
```

### Example 3: PATCH with Partial Updates

```typescript
fastify.patch(
  "/me/settings",
  {
    preHandler: [authenticate],
    schema: {
      description: 'Update user preferences and notification settings',
      tags: ['Authentication'],
      body: {
        type: 'object',
        properties: {
          emailNotifications: { type: 'boolean' },
          pushNotifications: { type: 'boolean' },
          darkMode: { type: 'boolean' },
          timezone: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Settings updated successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            settings: {
              type: 'object',
              properties: {
                emailNotifications: { type: 'boolean' },
                pushNotifications: { type: 'boolean' },
                darkMode: { type: 'boolean' },
                timezone: { type: 'string' },
              },
            },
            updatedAt: { type: 'object' },
          },
        },
        400: {
          description: 'Invalid request parameters or body',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
          },
        },
        401: {
          description: 'Missing or invalid JWT token',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        404: {
          description: 'Resource not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
      ...PERMISSIONS.AUTHENTICATED,
    },
  },
  handler
);
```

---

## Testing Your Annotations

### 1. Export OpenAPI Spec

```bash
cd packages/api
npm run openapi:export
```

**Success**: Creates `openapi.json` with your routes
**Failure**: Shows validation errors - fix schema issues

### 2. Validate Spec Structure

```bash
npm run openapi:validate
```

**Success**: "Validation successful"
**Failure**: Shows structural issues in the spec

### 3. Check Annotation Coverage

```bash
bash ../../scripts/validate-openapi.sh
```

**Output**:
```
📚 OpenAPI Validation
─────────────────────────────
  Paths: 392
  Operations: 518
  Annotated: 3/518 (1%)

Validating spec structure...
✅ Spec structure valid

Checking annotations...
⚠️  Low annotation coverage (1%)
Non-strict mode: Deployment allowed (warnings only)
```

### 4. Lint for Quality Issues

```bash
npm run openapi:lint
```

**Note**: Warnings about unused components are OK - they're defined in `config/openapi.ts` for future use.

---

## Deployment Integration

OpenAPI validation runs **automatically** before every API deployment:

```bash
task deploy:api         # Validates OpenAPI spec before deploying
task deploy:api ENV=staging  # Same validation for staging
```

**Validation happens in**: `scripts/prepare-api-deploy.sh` → calls `scripts/validate-openapi.sh`

**Non-strict mode** (default): Warns about missing annotations but allows deployment
**Strict mode** (optional): Blocks deployment if <100% annotated

To enable strict mode:
```bash
bash scripts/validate-openapi.sh --strict
```

---

## Incremental Annotation Strategy

### Recommended Approach

**Don't annotate everything at once.** Add annotations when:

1. **Creating new routes** - Annotate as you write them
2. **Modifying existing routes** - Add schema while you're there
3. **Bug fixes in routes** - Annotate the fixed route
4. **API evolution** - Document changes with annotations

### Priority Order (If Doing Batches)

1. **Tier 1: Core APIs** (authentication, organizations, horses, schedules)
2. **Tier 2: Business Logic** (billing, activities, health, facilities)
3. **Tier 3: Supporting Features** (everything else)

### Pattern: Annotate on Touch

```bash
# Developer workflow
git checkout -b feature/update-horse-endpoint
# Edit packages/api/src/routes/horses.ts
# Add OpenAPI schema while you're modifying the route
npm run openapi:export  # Verify it works
git commit -m "feat: update horse endpoint + add OpenAPI schema"
```

Over time, coverage increases naturally without dedicated annotation sprints.

---

## Common Errors and Fixes

### Error: "Cannot find reference #/components/..."

**Cause**: Using `$ref` in route schema
**Fix**: Use inline schema definitions (see "DO NOT Use $ref" section)

### Error: "schema is invalid: data/required must be array"

**Cause**: Using Zod schema directly instead of JSON Schema
**Fix**: Convert to JSON Schema format with `type`, `properties`, `required`

### Error: "Failed building the serialization schema"

**Cause**: Response schema has invalid structure or `$ref`
**Fix**: Use inline response schemas, ensure proper `type` and `properties`

### Warning: "Unused components"

**Cause**: Schemas defined in `config/openapi.ts` but not used in routes
**Status**: OK - these are reference schemas for future use

---

## Reference Files

**Pattern established**: `packages/api/src/routes/auth.ts` (3 routes fully annotated)

**PERMISSIONS helpers**: `packages/api/src/utils/openapiPermissions.ts`

**OpenAPI config**: `packages/api/src/config/openapi.ts` (tags, components, servers)

**Validation script**: `scripts/validate-openapi.sh`

**Integration point**: `scripts/prepare-api-deploy.sh`

**Full documentation**: `packages/api/docs/OPENAPI.md`

---

## Summary

**Infrastructure Complete** ✅:
- Pre-flight validation prevents broken specs
- Pattern documented in auth.ts
- PERMISSIONS system ready
- Deployment integration active

**Next Steps**:
- Annotate routes incrementally as you modify them
- Use auth.ts as reference pattern
- Run `npm run openapi:export` to verify
- Coverage will grow naturally over time

**Questions?** See `packages/api/docs/OPENAPI.md` for full implementation roadmap and details.
