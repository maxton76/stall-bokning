# Feature Toggle System

**Status**: ✅ Implemented (Phases 1-5 Complete)
**Last Updated**: 2026-02-07

## Overview

The Feature Toggle System provides a **global kill switch** for features, allowing system administrators to:
- **Disable features for ALL organizations** regardless of subscription tier
- **Enable features for specific beta organizations** while keeping them globally disabled
- **Gradually roll out features** with internal → beta → general phases
- **Manage feature visibility** through admin portal UI without code deployments

**Important**: Feature toggles **only affect menu visibility**, not backend API access. This allows testing APIs directly while hiding incomplete UI.

## Architecture

### Three-Layer Feature Control

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Global Toggle (Admin-controlled)              │
│ - Stored in Firestore: featureToggles/global           │
│ - Can disable features for ALL orgs (even Pro tier)    │
│ - Managed via Admin Portal UI                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Organization Beta Access (Admin-controlled)   │
│ - Stored in Organization.betaFeatures: string[]        │
│ - Overrides global disable for specific orgs           │
│ - Managed via Beta Access Dialog in Admin Portal       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Subscription Tier (Existing System)           │
│ - Module flags and addon flags per tier                │
│ - Existing isFeatureAvailable() logic                  │
│ - No changes to existing subscription system           │
└─────────────────────────────────────────────────────────┘
```

### Feature Resolution Logic

```typescript
function isFeatureEnabled(featureKey: string): boolean {
  // 1. Check if org has beta access (overrides everything)
  if (currentOrganization.betaFeatures?.includes(featureKey)) {
    return true;
  }

  // 2. Check subscription tier (handles globally enabled features)
  return isInTier(featureKey);
}
```

**Backend Resolution** (when loading organization):
1. If globally disabled AND org has beta access → Add to org.betaFeatures
2. If globally disabled AND no beta access → NOT in org.betaFeatures
3. If globally enabled → Tier check determines visibility

**Frontend Simplification**:
- Check `org.betaFeatures` (beta access granted)
- Otherwise check subscription tier (existing system)

## Backend Implementation

### Firestore Data Structure

**Global Toggles** (`featureToggles/global` document):
```json
{
  "lessons": {
    "key": "lessons",
    "enabled": true,
    "name": "Lessons",
    "description": "Lesson management system",
    "category": "primary",
    "rolloutPhase": "general",
    "updatedAt": <Timestamp>,
    "updatedBy": "admin-user-id"
  },
  "trainerCommission": {
    "key": "trainerCommission",
    "enabled": false,
    "name": "Trainer Commission",
    "description": "Instructor fee tracking",
    "category": "secondary",
    "dependsOn": "lessons",
    "rolloutPhase": "internal"
  }
}
```

**Organization Beta Access**:
```json
{
  "id": "org-123",
  "name": "Test Stable",
  "betaFeatures": ["trainerCommission", "chargeableItems"],
  ...
}
```

### API Endpoints

#### Admin Endpoints (System Admin Only)

**List Global Toggles**
```http
GET /api/v1/admin/feature-toggles
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": {
    "lessons": { ... },
    "trainerCommission": { ... }
  }
}
```

**Update Feature Toggle**
```http
PUT /api/v1/admin/feature-toggles/:key
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "enabled": false,
  "rolloutPhase": "beta"
}
```

**Invalidate Cache**
```http
POST /api/v1/admin/feature-toggles/cache/invalidate
Authorization: Bearer <admin-token>
```

**Get Organization Beta Features**
```http
GET /api/v1/admin/organizations/:orgId/beta-features
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": {
    "organizationId": "org-123",
    "betaFeatures": ["trainerCommission"]
  }
}
```

**Set Organization Beta Features**
```http
PUT /api/v1/admin/organizations/:orgId/beta-features
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "betaFeatures": ["trainerCommission", "chargeableItems"]
}
```

### Caching Strategy

**Server-Side Cache**:
- **TTL**: 5 minutes (300,000ms)
- **Pattern**: Same as tierDefaults service
- **Invalidation**: Manual via `/admin/feature-toggles/cache/invalidate` endpoint
- **Location**: In-memory cache in `featureToggleService.ts`

## Frontend Implementation

### useFeatureToggle Hook

```typescript
import { useFeatureToggle } from "@/hooks/useFeatureToggle";

function MyComponent() {
  const { isFeatureEnabled } = useFeatureToggle();

  if (!isFeatureEnabled('lessons')) {
    return null; // Hide feature
  }

  return <LessonsUI />;
}
```

### Navigation Integration

Feature toggles are checked in `useNavigation.ts`:
```typescript
const { isFeatureEnabled } = useFeatureToggle();

// Filter menu items by module flag
if (item.moduleFlag && !isFeatureEnabled(item.moduleFlag)) {
  return false;
}
```

## Admin Portal UI

### Feature Toggles Page (`/admin/feature-toggles`)

**Features**:
- View all feature toggles grouped by category (Primary/Secondary)
- Toggle features on/off with visual switch
- View rollout phase badges (Internal/Beta/General)
- Search features by name, key, or description
- See dependency warnings (e.g., trainerCommission depends on lessons)
- Manage beta access per feature

### Beta Access Dialog

**Features**:
- View organizations with beta access to a feature
- Search and add organizations to beta access list
- Remove organizations from beta access
- Shows organization count with beta access

## Feature Configuration

### Current Features (8 total)

**Primary Features** (Main Menu Items):
1. **lessons** - Enabled globally, general rollout
2. **invoicing** - Enabled globally, general rollout

**Secondary Features** (Admin Menu Items):
3. **leaveManagement** - Enabled globally, general rollout
4. **integrations** - Enabled globally, general rollout
5. **manure** - Enabled globally, general rollout
6. **trainerCommission** - Disabled globally, internal rollout (depends on lessons)
7. **chargeableItems** - Disabled globally, internal rollout
8. **billingGroups** - Disabled globally, internal rollout

## Development Workflows

### Adding a New Feature Toggle

1. **Update initialization script**:
```typescript
// packages/api/scripts/initializeFeatureToggles.ts
const featureToggles: FeatureToggleMap = {
  ...existing,
  newFeature: {
    key: "newFeature",
    enabled: false, // Start disabled for gradual rollout
    name: "New Feature",
    description: "What this feature does",
    category: "secondary",
    rolloutPhase: "internal",
  },
};
```

2. **Add moduleFlag to navigation** (if applicable):
```typescript
// packages/frontend/src/config/navigation.ts
{
  id: "new-feature",
  labelKey: "menu.newFeature",
  href: "/new-feature",
  icon: Icon,
  moduleFlag: "newFeature", // <-- Add this
}
```

3. **Deploy and initialize** (first time only):
```bash
cd packages/api
npm run init:feature-toggles  # Only needed once per environment
```

4. **Update via Admin Portal**:
   - Navigate to `/admin/feature-toggles`
   - Toggle the new feature on/off as needed
   - Add organizations to beta access list

### Testing a New Feature

**Scenario**: Testing `trainerCommission` with 2 beta organizations

1. **Deploy feature code** (disabled globally via toggle)
2. **Admin Portal** → Feature Toggles → Find "Trainer Commission"
3. **Click "Manage Beta Access"**
4. **Add organizations**: Search and add 2 test organizations
5. **Verify**: Beta orgs can see the feature, others cannot
6. **Iterate**: Make code changes, redeploy, beta orgs test again
7. **General Release**: Enable toggle globally when ready

### Rollout Strategy

**Phase 1: Internal** (Week 1)
- Feature disabled globally
- Enable for internal test organization only
- Fix critical bugs

**Phase 2: Beta** (Week 2-3)
- Still disabled globally
- Add 3-5 customer organizations to beta access
- Gather feedback, fix bugs
- Update rollout phase to "beta" in admin portal

**Phase 3: General** (Week 4+)
- Enable globally for all organizations with Pro tier
- Update rollout phase to "general"
- Monitor for issues
- Remove beta access (now redundant since globally enabled)

## Troubleshooting

### Feature not appearing despite toggle enabled

1. **Check subscription tier**: Feature may be disabled in tier definition
   - Verify: Admin Portal → Tier Management → Check module/addon flags
2. **Check organization type**: Feature may be restricted to business orgs
   - Verify: Navigation config `visibleForOrgType` setting
3. **Cache delay**: Changes take up to 5 minutes to propagate
   - Fix: Admin Portal → Feature Toggles → Refresh button
   - Or: API call to `/admin/feature-toggles/cache/invalidate`

### Beta organization cannot see feature

1. **Check beta access list**: Organization may not be in beta list
   - Fix: Admin Portal → Feature Toggles → Manage Beta Access → Add org
2. **Check global toggle**: If enabled globally, beta access is redundant
   - Expected: Beta access only matters when global toggle is OFF
3. **Check subscription tier**: Organization may be on Free tier
   - Note: Beta access does NOT override tier restrictions
   - Fix: Upgrade organization to tier that includes the module

### Dependency confusion

**Problem**: Disabled `lessons` but `trainerCommission` still shows

**Explanation**: Dependencies are informational only, not enforced automatically

**Solution**:
- Disable parent feature (`lessons`)
- Also disable dependent features (`trainerCommission`)
- Or implement backend enforcement in Phase 7 (future)

## Performance Considerations

**Cache TTL**: 5 minutes matches backend tier cache
- **Trade-off**: Balance between freshness and performance
- **Impact**: Changes take max 5 minutes to propagate
- **Workaround**: Manual cache invalidation for immediate changes

**Backend Impact**:
- **Storage**: Single document in Firestore (minimal cost)
- **Reads**: Cached reads reduce Firestore reads by ~95%
- **Writes**: Admin writes are infrequent (manual changes only)

**Frontend Impact**:
- **Bundle Size**: +3KB for hook and types
- **Runtime**: Zero impact (uses existing org data + subscription context)

## Security Considerations

**Admin-Only Operations**:
- All toggle management requires `system_admin` role
- Protected by `requireSystemAdmin` middleware
- Beta access management also requires `system_admin`

**Validation**:
- Feature keys validated against existing toggles
- Invalid keys rejected with 400 Bad Request
- Organization IDs validated before beta access updates

**Audit Trail**:
- `updatedAt` and `updatedBy` fields track changes
- Consider adding full audit log in Phase 7 (future)

## Future Enhancements (Phase 7+)

### Backend Enforcement
Add optional `enforceBackend: boolean` flag to toggle backend API access:
```typescript
if (toggle.enforceBackend && !isFeatureEnabledForOrg(featureKey, orgId)) {
  return reply.code(403).send({ error: "Feature disabled" });
}
```

### Gradual Rollout Percentage
Enable feature for X% of organizations:
```typescript
rolloutPercentage: 20, // 20% of orgs get access
```

### Scheduled Releases
Auto-enable features at specific date/time:
```typescript
scheduledEnableAt: Timestamp, // Enable at this time
```

### Feature Analytics
Track feature usage and adoption rates:
- How many orgs use each feature
- Identify unused features for deprecation

### User-Level Toggles
Enable features for specific users (not just orgs):
```typescript
betaUsers: ["user1", "user2"], // User-level beta access
```

## Related Documentation

- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Subscription System**: [SUBSCRIPTION.md](./SUBSCRIPTION.md)
- **Admin Portal**: [ADMIN_PORTAL.md](./ADMIN_PORTAL.md)
- **API Reference**: [API.md](./API.md)
