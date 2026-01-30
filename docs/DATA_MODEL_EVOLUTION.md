# Data Model Evolution Plan

This document describes the planned evolution of the EquiDuty data model to support:
1. **Personal vs Business Organizations** - Two distinct organization types with different feature sets
2. **Horse Ownership vs Placement** - Separating who owns a horse from where it's physically located
3. **Contact Visibility** - Clear rules for private vs organization-shared contacts

## Current State vs Future State

### Organizations

| Aspect | Current | Future |
|--------|---------|--------|
| Types | Single type (implicit) | `personal` \| `business` |
| Stables | Optional, manual creation | Personal: 1 implicit; Business: Multiple |
| Members | Single owner + invited members | Personal: Owner only; Business: Multiple |
| Features | All features available | Tiered by organization type |
| Contacts | Organization-level | Personal: Private only; Business: Private + Org |

### Horses

| Aspect | Current | Future |
|--------|---------|--------|
| Location | `currentStableId` | Ownership org + Placement org/stable |
| Ownership | `ownerId` | `ownerId` + `ownerOrganizationId` |
| Placement | Implicit via stable | Explicit `placementOrganizationId` + `placementStableId` |
| History | `locationHistory` subcollection | Placement date for history visibility cutoff |

### Contacts

| Aspect | Current | Future |
|--------|---------|--------|
| Visibility | `accessLevel: 'organization' \| 'user'` | Same, with clearer enforcement |
| Query | Complex queries | Simplified: private (`userId` only) or org (`organizationId`) |

---

## Architecture Diagrams

### Organization Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SYSTEM LEVEL                                                            │
│ └── systemRole: 'system_admin' | 'stable_owner' | 'member'             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌─────────────────────────┐                   ┌─────────────────────────┐
│ PERSONAL ORGANIZATION   │                   │ BUSINESS ORGANIZATION   │
│ organizationType:       │                   │ organizationType:       │
│   'personal'            │                   │   'business'            │
│                         │                   │                         │
│ • 1 owner (the user)    │                   │ • 1 owner + members     │
│ • 1 implicit stable     │                   │ • Multiple stables      │
│ • Private contacts only │                   │ • Org + private contacts│
│ • Owns horses           │                   │ • Horses placed here    │
│ • Free tier             │                   │ • Paid tiers            │
└─────────────────────────┘                   └─────────────────────────┘
```

### Horse Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Horse Created  │────▶│  Horse Placed   │────▶│  Horse Moved    │
│  (Personal Org) │     │  (Business Org) │     │  (New Bus. Org) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   ownerId: anna          placementOrgId:         placementOrgId:
   ownerOrgId: anna_org     green_valley            sunset_stables
                          placementDate: T1       placementDate: T2

History visible:          History visible:        History visible:
  Owner: ALL                Owner: ALL              Owner: ALL
  Stable: N/A               Stable: T1→             Stable: T2→
```

### Contact Visibility

```
┌──────────────────────────────────────────────────────────────────┐
│ CONTACT DOCUMENT                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Private Contact:                                                 │
│   userId: "anna"                                                 │
│   accessLevel: "user"                                            │
│   organizationId: null         ← Only Anna sees this             │
├──────────────────────────────────────────────────────────────────┤
│ Organization Contact:                                            │
│   userId: "anna"               ← Created by Anna (audit)         │
│   accessLevel: "organization"                                    │
│   organizationId: "green_valley" ← All GV members see this      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Documentation & Foundation (This PR)

**Goal**: Update documentation, add TypeScript types, prepare for migration

| Task | Status | Description |
|------|--------|-------------|
| Update ROLE_MANAGEMENT.md | ✅ | Rewritten with current implementation |
| Update ROLE_SYSTEM_OVERVIEW.md | ✅ | Rewritten with hierarchy diagrams |
| Add OrganizationType to types | ✅ | Added to organization.ts |
| Add placement fields to Horse | ✅ | Added to domain.ts |
| Create DATA_MODEL_EVOLUTION.md | ✅ | This document |

**New TypeScript Types Added**:

```typescript
// Organization type
export type OrganizationType = "personal" | "business";

// Organization interface additions
interface Organization {
  organizationType?: OrganizationType;  // 'personal' | 'business'
  implicitStableId?: string;            // Auto-created stable for personal orgs
}

// Horse interface additions
interface Horse {
  ownerOrganizationId?: string;         // Owner's personal org
  placementOrganizationId?: string;     // Business org where placed
  placementStableId?: string;           // Specific stable in placement org
  placementDate?: Timestamp;            // For history visibility cutoff
}
```

---

### Phase 2: Organization Type Support

**Goal**: Add `organizationType` field and implicit stable for personal orgs

| Task | Files | Description |
|------|-------|-------------|
| 2.1 | Firestore migration script | Set existing orgs: user-owned → 'personal', with stables → 'business' |
| 2.2 | API: organization creation | Set type based on context |
| 2.3 | Functions: user signup | Create personal org with type='personal' |
| 2.4 | API: stable creation | Auto-create "My Horses" stable for personal orgs |
| 2.5 | Security rules | Validate organizationType field |

**Migration Script Logic**:

```typescript
// Determine organizationType for existing organizations
async function setOrganizationType(org: Organization) {
  // Count stables for this organization
  const stables = await db.collection('stables')
    .where('organizationId', '==', org.id)
    .get();

  // Count members (excluding owner)
  const members = await db.collection('organizationMembers')
    .where('organizationId', '==', org.id)
    .where('userId', '!=', org.ownerId)
    .get();

  // Business if has stables or non-owner members
  const type = (stables.size > 1 || members.size > 0) ? 'business' : 'personal';

  await db.collection('organizations').doc(org.id).update({
    organizationType: type,
    updatedAt: Timestamp.now()
  });
}
```

---

### Phase 3: Horse Placement Model

**Goal**: Separate ownership from placement without breaking existing functionality

| Task | Files | Description |
|------|-------|-------------|
| 3.1 | Migration script | Populate `ownerOrganizationId` from owner's personal org |
| 3.2 | API: horse creation | Support new placement fields |
| 3.3 | API: horse update | Handle placement changes |
| 3.4 | RBAC: horseProjection.ts | Consider `placementOrganizationId` for access |
| 3.5 | Frontend: horseService.ts | Query horses by ownership OR placement |
| 3.6 | Security rules | Owner always has access; placement org from `placementDate` |

**New Horse Fields** (all optional for backward compatibility):

```typescript
interface Horse {
  // Existing ownership fields
  ownerId: string;
  ownershipType: 'member' | 'contact' | 'external';

  // NEW: Owner's organization
  ownerOrganizationId?: string;

  // NEW: Placement tracking
  placementOrganizationId?: string;
  placementStableId?: string;
  placementDate?: Timestamp;

  // Existing (maps to placement during transition)
  currentStableId?: string;
}
```

**Access Rules**:

| User Type | Access Level |
|-----------|--------------|
| Horse Owner | Full access (all history) |
| Placement Org Admin | Access from `placementDate` onwards |
| Placement Org Staff | Role-based field access from `placementDate` |

---

### Phase 4: Contact Visibility System

**Goal**: Implement clear private vs organization contact visibility

| Task | Files | Description |
|------|-------|-------------|
| 4.1 | Types: contact.ts | Ensure `organizationId` can be null for private |
| 4.2 | API: contacts.ts | Update queries for visibility logic |
| 4.3 | Security rules | Private: only userId can access; Org: members can access |
| 4.4 | Frontend: contactService.ts | Query both private + org contacts |
| 4.5 | Frontend: ContactsPage.tsx | UI toggle for private/org when creating |
| 4.6 | Validation | Business orgs only can create org-level contacts |

**Query Logic**:

```typescript
// Get all contacts user can see
async function getMyContacts(userId: string, orgIds: string[]) {
  const [privateContacts, orgContacts] = await Promise.all([
    // My private contacts
    db.collection('contacts')
      .where('userId', '==', userId)
      .where('accessLevel', '==', 'user')
      .get(),
    // Organization contacts I can see
    db.collection('contacts')
      .where('organizationId', 'in', orgIds)
      .where('accessLevel', '==', 'organization')
      .get()
  ]);
  return [...privateContacts.docs, ...orgContacts.docs];
}
```

**Visibility Rules**:

| Org Type | Private Contacts | Org Contacts |
|----------|-----------------|--------------|
| Personal | ✅ Can create | ❌ Cannot create |
| Business | ✅ Can create | ✅ Can create |

---

### Phase 5: Frontend Cleanup & Migration

**Goal**: Remove deprecated `stableMembers` references, update UI for new model

| Task | File | Description |
|------|------|-------------|
| 5.1 | ActivityFormDialog.tsx | Migrate from stableMembers → organizationMembers |
| 5.2 | ActivitiesPlanningPage.tsx | Migrate from stableMembers |
| 5.3 | ActivitiesActionListPage.tsx | Migrate from stableMembers |
| 5.4 | TodayPage.tsx | Migrate from stableMembers |
| 5.5 | ScheduleEditorPage.tsx | Migrate from stableMembers |
| 5.6 | RoutineScheduler.tsx | Migrate from stableMembers |
| 5.7 | Dashboard | Show personal vs business org distinction |
| 5.8 | Horse list | Show "My Horses" (owned) vs "Placed Horses" (managing) |

**Migration Pattern**:

```typescript
// Before (deprecated)
const members = await getStableMembers(stableId);

// After
const orgMembers = await getOrganizationMembers(organizationId);
const stableMembers = orgMembers.filter(m =>
  m.stableAccess === 'all' ||
  m.assignedStableIds?.includes(stableId)
);
```

---

### Phase 6: Upgrade Path & Business Features

**Goal**: Allow personal org → business org upgrade

| Task | Files | Description |
|------|-------|-------------|
| 6.1 | API: organizations.ts | Add upgrade endpoint |
| 6.2 | Frontend: SettingsPage.tsx | Upgrade UI with feature comparison |
| 6.3 | Stripe integration | Connect upgrade to subscription tier |
| 6.4 | Security rules | Validate business features only for business orgs |
| 6.5 | Feature flags | Implement feature gating based on org type |

**Upgrade Process**:

1. User clicks "Upgrade to Business"
2. Validate user has `stable_owner` systemRole
3. Update `organizationType: 'business'`
4. Keep implicit stable (can rename)
5. Enable business features:
   - Invite members
   - Create org-level contacts
   - Multiple stables
   - Advanced reporting

**Feature Gating**:

```typescript
function canCreateOrgContact(org: Organization): boolean {
  return org.organizationType === 'business';
}

function canInviteMembers(org: Organization): boolean {
  return org.organizationType === 'business';
}

function canCreateMultipleStables(org: Organization): boolean {
  return org.organizationType === 'business';
}
```

---

### Phase 7: Horse History Visibility (Future)

**Goal**: Allow owners to control what placement orgs can see

| Task | Description |
|------|-------------|
| 7.1 | Add `historyVisibility: 'full' \| 'from_placement'` to horse placement |
| 7.2 | Owner settings UI to control per-horse visibility |
| 7.3 | Activity/task queries respect historyVisibility setting |

**Visibility Options**:

| Setting | Placement Org Sees |
|---------|-------------------|
| `full` | All history (rare, trusted placements) |
| `from_placement` | History from `placementDate` onwards (default) |

---

## Implementation Order

```
Phase 1: Documentation & Foundation    ← COMPLETED
    │
    ▼
Phase 2: Organization Type Support
    │
    ▼
Phase 3: Horse Placement Model
    │
    ├──────────────────┐
    ▼                  ▼
Phase 4: Contact      Phase 5: Frontend
Visibility            Cleanup (parallel)
    │                  │
    └────────┬─────────┘
             ▼
Phase 6: Upgrade Path & Business Features
             │
             ▼
Phase 7: Horse History Visibility (Future)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing data | All new fields optional; migration scripts add defaults |
| User confusion | Clear UI labels: "Personal" vs "Business Organization" |
| Performance (multiple queries) | Use Firestore composite indexes; batch reads |
| Stale cached data | Add organizationMembers → users sync on profile update |
| Frontend breakage | Phase 5 dedicated to cleanup; thorough testing |

---

## Success Criteria

Phase 1 (This PR):
- [x] All documentation updated and accurate
- [x] TypeScript types added for future fields
- [x] Migration path clearly documented

Future Phases:
- [ ] Every organization has `organizationType` set
- [ ] Personal orgs have implicit "My Horses" stable
- [ ] Horses have ownership + placement separation
- [ ] Contact visibility works correctly
- [ ] No references to deprecated `stableMembers` in frontend
- [ ] Upgrade path from personal → business functional
- [ ] All Firestore security rules updated and tested

---

## Related Documentation

- [ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md) - Role definitions and permissions
- [ROLE_SYSTEM_OVERVIEW.md](./ROLE_SYSTEM_OVERVIEW.md) - Visual hierarchy and user journeys
- [RBAC.md](./RBAC.md) - Field-level access control for horses
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Complete database schema
