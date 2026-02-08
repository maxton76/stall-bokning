# OpenAPI Documentation Guide

## Quick Links

📘 **Annotating Routes?** → See [`OPENAPI_ANNOTATION_GUIDE.md`](./OPENAPI_ANNOTATION_GUIDE.md) for step-by-step guide
📊 **Implementation Summary** → See [`../../OPENAPI_IMPLEMENTATION_SUMMARY.md`](../../OPENAPI_IMPLEMENTATION_SUMMARY.md)
🔍 **Reference Example** → See [`../src/routes/auth.ts`](../src/routes/auth.ts) (3 routes fully annotated)

## Overview

The EquiDuty API uses OpenAPI 3.0 specification for:
- **Code Generation**: Generate client SDKs and validation code
- **API Validation**: Ensure routes match contracts (validates before deployment)
- **Internal Reference**: Machine-readable API documentation for development teams

**IMPORTANT - Security Policy**:
- ⛔ **NO Swagger UI exposed** - all environments (dev/staging/prod) are internet-accessible
- ⛔ **NO `/api/docs` endpoint** - disabled for security
- ✅ **File-based access only** - spec exported to `openapi.json` for internal use
- ✅ **Pre-flight validation** - runs automatically before `task deploy:api`

## Accessing the Spec

### Local Development
```bash
cd packages/api
npm run openapi:export      # Generates openapi.json
npm run openapi:validate    # Validates spec integrity
npm run openapi:lint        # Lints spec for quality issues
```

### CI/CD Access
- **Automated Generation**: Every PR and push to `main`/`develop` triggers OpenAPI validation
- **Download Artifacts**: GitHub Actions uploads `openapi.json` as build artifact
- **Retention**: Artifacts kept for 30 days

### Current Status

**Infrastructure**: ✅ Complete (2026-02-07)
- Fastify Swagger plugin registered
- OpenAPI config with security schemes and common components
- Permission metadata system (`PERMISSIONS` helpers)
- Export, validation, and linting scripts
- Pre-flight validation integrated with deployment (`task deploy:api`)

**Route Annotations**: 📝 Incremental Strategy (2026-02-07)
- **Total Endpoints**: 392 paths, 518 operations
- **Annotated**: 3 operations (pattern established in `auth.ts`)
- **Strategy**: Annotate incrementally when creating/modifying routes
- **Quick Guide**: See `OPENAPI_ANNOTATION_GUIDE.md` for pattern
- **ROI Decision**: Full annotation deferred (low value given no Swagger UI, existing TypeScript types)

## Adding New Endpoints

**IMPORTANT**: See `OPENAPI_ANNOTATION_GUIDE.md` for complete guide and examples.

When creating a new route, include OpenAPI schema following this pattern:

```typescript
import { PERMISSIONS } from '../utils/openapiPermissions.js';

fastify.post(
  "/horses",
  {
    preHandler: [authenticate, requirePermission('manage_horses', 'params')],
    schema: {
      description: 'Create a new horse in the organization',
      tags: ['Horses'],

      // ❌ DO NOT use Zod schemas or $ref - causes Fastify validation errors
      // ✅ Use inline JSON Schema format
      body: {
        type: 'object',
        required: ['name', 'breed'],
        properties: {
          name: { type: 'string', minLength: 1 },
          breed: { type: 'string' },
          birthDate: { type: 'string', format: 'date' },
        },
      },

      response: {
        201: {
          description: 'Horse created successfully',
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Horse ID' },
            name: { type: 'string', description: 'Horse name' },
            breed: { type: 'string', description: 'Horse breed' },
            createdAt: { type: 'object' }, // Timestamps are objects
          },
        },
        // ❌ DO NOT use $ref in route schemas
        // ✅ Use inline error response definitions
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
      },

      ...PERMISSIONS.ORG_PERMISSION('manage_horses', 'Horse owners get full access'),
    },
  },
  async (request, reply) => {
    // Handler implementation
  }
);
```

### Schema Properties

**Required**:
- `description` - Clear explanation of what the endpoint does
- `tags` - Array of domain tags for grouping (see config/openapi.ts for list)
- `response` - At minimum, success (200/201) and error responses

**Optional but Recommended**:
- `body` - Request body schema (Zod or JSON Schema)
- `params` - Path parameters schema
- `querystring` - Query parameters schema
- `headers` - Custom headers schema

**Permission Metadata** (custom extension):
- Use `...PERMISSIONS.*` helper to document authorization requirements
- Adds `x-permissions` object to OpenAPI spec for code generation

## Permission Documentation

All endpoints should include `x-permissions` metadata using helpers:

```typescript
// Public endpoint (no auth required)
...PERMISSIONS.PUBLIC

// Authenticated users only
...PERMISSIONS.AUTHENTICATED

// System administrators
...PERMISSIONS.SYSTEM_ADMIN

// Organization member
...PERMISSIONS.ORG_MEMBER('Requires active membership')

// Organization permission required
...PERMISSIONS.ORG_PERMISSION('manage_horses', 'Optional notes')

// Stable permission required
...PERMISSIONS.STABLE_PERMISSION('manage_schedules')

// Either organization OR stable permission
...PERMISSIONS.ORG_OR_STABLE_PERMISSION('view_horses', 'view_horses_stable')

// Resource owner only
...PERMISSIONS.RESOURCE_OWNER('horse', 'Or admin with manage_horses')
```

Example in OpenAPI output:
```json
{
  "x-permissions": {
    "authenticated": true,
    "systemRole": null,
    "organizationPermission": "manage_horses",
    "stablePermission": null,
    "notes": "Horse owners get full access regardless of organization permission"
  }
}
```

## Updating the Spec

### Manual Workflow
1. Edit route schemas in `packages/api/src/routes/*.ts`
2. Run `npm run openapi:export` to regenerate spec
3. Run `npm run openapi:validate` to check validity
4. Run `npm run openapi:lint` to check quality
5. Commit both route changes and `openapi.json` (if committing spec)

### Automated Workflow (Coming in Phase 5)
- CI/CD automatically validates spec on every PR
- Pre-commit hook regenerates spec before each commit (optional)
- Blocks deployment if validation fails
- PR comments show endpoint count changes

## Using for Code Generation

### Generate TypeScript Client Types
```bash
npm install -g openapi-typescript
openapi-typescript packages/api/openapi.json -o packages/frontend/src/api/types.ts
```

### Generate Request Validators
The spec can be used to generate request validators for other languages/frameworks:
- **Python**: openapi-generator-cli
- **Java**: swagger-codegen
- **Go**: oapi-codegen

## API Stability and Versioning

⚠️ **CRITICAL**: The API serves **iOS app**, **Android app**, and **web frontend**

### Breaking Change Policy
- **Avoid breaking changes** - requires coordinated updates across ALL platforms
- Use semantic versioning for API paths (`/api/v1/`, `/api/v2/`)
- Mark deprecated endpoints in OpenAPI spec before removal
- Test changes against all client applications before deployment

### What Constitutes a Breaking Change?
- Removing or renaming endpoints
- Changing required fields
- Modifying response structure
- Changing authentication/authorization requirements
- Altering error codes or formats

### Safe Changes
- Adding new optional fields
- Adding new endpoints
- Adding new response fields (additive only)
- Improving error messages (without changing codes)

## Troubleshooting

### Validation Errors
```bash
npm run openapi:lint         # Detailed quality issues
npm run openapi:validate     # Schema validity check
```

Common issues:
- **Missing descriptions**: All operations must have `description` property
- **Missing tags**: All operations must have `tags` array
- **Invalid references**: Check `$ref` paths to components
- **Duplicate routes**: Ensure no path collisions (check route prefixes)

### Missing Routes
- Verify route is registered in `src/index.ts`
- Check that route includes `schema` property
- Restart API server to refresh spec: `npm run dev`
- Re-export: `npm run openapi:export`

### Zod Schema Issues
Zod schemas are auto-converted to JSON Schema by Fastify. If conversion fails:
- Use simple Zod types (string, number, boolean, array, object)
- Avoid complex refinements or transforms in API schemas
- Test with `npm run type-check` to catch TypeScript errors

## Quality Standards

**Minimum Requirements** (enforced by linting):
- ✅ All operations have descriptions
- ✅ All operations have tags
- ✅ All operations document success responses
- ✅ All operations include permission metadata
- ✅ Contact and license information in spec
- ✅ Consistent error response formats

**Best Practices**:
- Use descriptive operation descriptions (explain "why", not just "what")
- Group related endpoints with same tags
- Include examples in request/response schemas
- Document edge cases and error conditions
- Keep descriptions concise but informative

## Next Steps (Implementation Phases)

**Phase 2**: Route Annotation (8-10 hours)
- [ ] Tier 1 - Core APIs (Auth, Organizations, Horses, Schedules)
- [ ] Tier 2 - Business Logic (Billing, Activities, Health, Facilities)
- [ ] Tier 3 - Supporting Features (64 route files)

**Phase 3**: Permission Metadata (2-3 hours)
- [x] Create permission helper utilities
- [ ] Apply permission metadata to all endpoints
- [ ] Document complex authorization rules

**Phase 4**: Export & Validation (1-2 hours)
- [x] Create export script
- [x] Add validation scripts
- [x] Create linting configuration
- [ ] Test complete workflow

**Phase 5**: CI/CD Integration (2 hours)
- [ ] Create GitHub Actions workflow
- [ ] Add pre-commit hooks (optional)
- [ ] Set up automated PR comments
- [ ] Configure artifact upload

**Phase 6**: Documentation (1 hour)
- [x] Create this guide
- [ ] Update CLAUDE.md with API docs section
- [ ] Add examples for common patterns
- [ ] Document troubleshooting procedures

## Resources

- **OpenAPI Specification**: https://spec.openapis.org/oas/v3.0.3
- **Fastify Swagger**: https://github.com/fastify/fastify-swagger
- **Spectral Linting**: https://stoplight.io/open-source/spectral
- **openapi-typescript**: https://github.com/drwpow/openapi-typescript

## Support

For questions or issues with API documentation:
1. Check this guide first
2. Review examples in annotated routes (auth.ts, horses.ts after Phase 2)
3. Run linting to identify specific issues
4. Check #engineering Slack channel for team support
