# Role System Overview - Complete Architecture

## System Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LEVEL 0: SYSTEM LEVEL                                                   │
│ systemRole: 'system_admin' | 'stable_owner' | 'member'                 │
│                                                                         │
│ • system_admin: Platform operators (full access)                        │
│ • stable_owner: Can create organizations                                │
│ • member: Regular users (default on signup)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: ORGANIZATIONS                                                  │
│ organizationMembers.roles[]: 10 professional roles                      │
│                                                                         │
│ Roles: administrator, veterinarian, dentist, farrier, customer,        │
│        groom, saddle_maker, horse_owner, rider, inseminator            │
│                                                                         │
│ Note: Owner is also a member with 'administrator' role                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: STABLES                                                        │
│ organizationMembers.stableAccess: 'all' | 'specific'                   │
│ organizationMembers.assignedStableIds[]: Specific stable access        │
│                                                                         │
│ Each organization can have multiple stables                             │
│ Members access stables based on their stableAccess setting              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LEVEL 3: HORSES                                                         │
│ horse.ownerId + RBAC field-level access                                │
│                                                                         │
│ Access levels based on role:                                            │
│ L1 (public) → L2 (basic_care) → L3 (professional) →                    │
│ L4 (management) → L5 (owner)                                            │
│                                                                         │
│ Horse owners ALWAYS get full access                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Model Overview

### Core Collections

```
users/
  {userId}
    ├── uid: string (Firebase Auth UID)
    ├── email: string
    ├── firstName: string
    ├── lastName: string
    ├── systemRole: 'system_admin' | 'stable_owner' | 'member'
    ├── createdAt: Timestamp
    └── updatedAt: Timestamp

organizations/
  {organizationId}
    ├── id: string
    ├── name: string
    ├── contactType: 'Personal' | 'Business'
    ├── primaryEmail: string
    ├── ownerId: string → references users/{userId}
    ├── ownerEmail: string (cached)
    ├── subscriptionTier: 'free' | 'professional' | 'enterprise'
    ├── stats: { stableCount, totalMemberCount }
    ├── createdAt: Timestamp
    └── updatedAt: Timestamp

organizationMembers/
  {userId}_{organizationId}
    ├── id: string
    ├── organizationId: string
    ├── userId: string
    ├── userEmail: string (cached)
    ├── firstName: string (cached)
    ├── lastName: string (cached)
    ├── roles: OrganizationRole[] (multi-role)
    ├── primaryRole: OrganizationRole
    ├── status: 'active' | 'inactive' | 'pending'
    ├── stableAccess: 'all' | 'specific'
    ├── assignedStableIds?: string[]
    ├── showInPlanning: boolean
    ├── availability?: MemberAvailability
    ├── limits?: MemberLimits
    ├── stats?: MemberStats
    ├── joinedAt: Timestamp
    └── invitedBy: string

stables/
  {stableId}
    ├── id: string
    ├── name: string
    ├── organizationId: string
    ├── ownerId: string
    ├── address?: string
    ├── facilityNumber?: string
    ├── createdAt: Timestamp
    └── updatedAt: Timestamp

horses/
  {horseId}
    ├── id: string
    ├── name: string
    ├── ownerId: string (user who owns)
    ├── ownershipType: 'member' | 'contact' | 'external'
    ├── currentStableId?: string (where placed)
    ├── status: 'active' | 'inactive'
    ├── ... (additional fields)
    ├── createdAt: Timestamp
    └── updatedAt: Timestamp

contacts/
  {contactId}
    ├── id: string
    ├── contactType: 'Personal' | 'Business'
    ├── accessLevel: 'organization' | 'user'
    ├── organizationId?: string (org contacts)
    ├── userId?: string (private contacts)
    ├── badge?: 'primary' | 'stable' | 'member' | 'external'
    ├── email: string
    ├── ... (additional fields)
    └── createdAt: Timestamp
```

## User Journey Examples

### Example 1: Platform Administrator (Service Provider)

```
┌──────────────────────────────────────────────────────────────────┐
│ USER: Platform Admin                                              │
│ systemRole: 'system_admin'                                       │
└──────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────┐
│ CAN DO:                                                          │
│ ✅ View all users across the platform                            │
│ ✅ Promote users to stable_owner                                 │
│ ✅ View all organizations and stables                            │
│ ✅ Access all data for support/management                        │
│ ✅ Configure platform settings                                   │
│ ❌ Cannot create organizations (must be stable_owner)            │
└──────────────────────────────────────────────────────────────────┘
```

### Example 2: Stable Owner Creating an Organization

```
1. User Registration
   ┌─────────────────────────────────────────────────────────────────┐
   │ Anna registers → systemRole: 'member' (default)                │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
2. Promotion to Stable Owner
   ┌─────────────────────────────────────────────────────────────────┐
   │ System Admin promotes Anna → systemRole: 'stable_owner'        │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
3. Organization Creation
   ┌─────────────────────────────────────────────────────────────────┐
   │ Anna creates "Green Valley Stables" organization               │
   │                                                                 │
   │ Result:                                                         │
   │ • organizations/gv123: { ownerId: anna, name: "Green Valley" } │
   │ • organizationMembers/anna_gv123: { roles: ['administrator'] } │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
4. Stable Creation
   ┌─────────────────────────────────────────────────────────────────┐
   │ Anna adds stables to her organization:                         │
   │ • stables/s1: "Main Barn" (organizationId: gv123)             │
   │ • stables/s2: "Training Arena" (organizationId: gv123)        │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
5. Member Invitations
   ┌─────────────────────────────────────────────────────────────────┐
   │ Anna invites Erik as groom:                                    │
   │ • organizationMembers/erik_gv123: {                            │
   │     roles: ['groom'],                                          │
   │     primaryRole: 'groom',                                      │
   │     stableAccess: 'all'                                        │
   │   }                                                            │
   │                                                                 │
   │ Anna invites Dr. Lisa as veterinarian:                         │
   │ • organizationMembers/lisa_gv123: {                            │
   │     roles: ['veterinarian'],                                   │
   │     stableAccess: 'specific',                                  │
   │     assignedStableIds: ['s1']                                  │
   │   }                                                            │
   └─────────────────────────────────────────────────────────────────┘
```

### Example 3: Multi-Role Member

```
┌──────────────────────────────────────────────────────────────────┐
│ USER: Maria                                                       │
│ systemRole: 'member'                                             │
│                                                                   │
│ Organization Memberships:                                         │
│                                                                   │
│ organizationMembers/maria_gv123 (Green Valley):                  │
│   roles: ['veterinarian', 'horse_owner']                         │
│   primaryRole: 'veterinarian'                                    │
│   stableAccess: 'all'                                            │
│                                                                   │
│ organizationMembers/maria_ss456 (Sunset Stables):                │
│   roles: ['customer']                                            │
│   primaryRole: 'customer'                                        │
│   stableAccess: 'specific'                                       │
│   assignedStableIds: ['stable789']                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ PERMISSIONS:                                                      │
│                                                                   │
│ At Green Valley (veterinarian + horse_owner):                     │
│ ✅ Access all stables                                             │
│ ✅ View horse health records (veterinarian)                       │
│ ✅ Add health entries (veterinarian)                              │
│ ✅ Full access to own horses (horse_owner)                        │
│ ❌ Cannot manage members (not administrator)                      │
│                                                                   │
│ At Sunset Stables (customer):                                     │
│ ✅ Access only stable789                                          │
│ ✅ View own horses                                                 │
│ ✅ Basic stable information                                       │
│ ❌ Cannot view other horses' health records                       │
└──────────────────────────────────────────────────────────────────┘
```

### Example 4: Horse Ownership vs. Placement

```
HORSE LIFECYCLE
===============

1. Horse Created (Ownership)
   ┌─────────────────────────────────────────────────────────────────┐
   │ Anna creates horse "Star" in her personal capacity             │
   │                                                                 │
   │ horses/star123: {                                              │
   │   name: "Star",                                                │
   │   ownerId: "anna",                      ← OWNERSHIP (immutable)│
   │   ownershipType: "member",                                     │
   │   currentStableId: null                 ← Not placed yet       │
   │ }                                                              │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
2. Horse Placed at Stable
   ┌─────────────────────────────────────────────────────────────────┐
   │ Anna places Star at Green Valley Main Barn                     │
   │                                                                 │
   │ horses/star123: {                                              │
   │   ownerId: "anna",                      ← Still Anna's horse   │
   │   currentStableId: "s1",                ← PLACEMENT (mutable)  │
   │   currentStableName: "Main Barn",                              │
   │   assignedAt: Timestamp                                        │
   │ }                                                              │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
3. Horse Moved to Another Stable
   ┌─────────────────────────────────────────────────────────────────┐
   │ Star moved to Training Arena                                   │
   │                                                                 │
   │ horses/star123: {                                              │
   │   ownerId: "anna",                      ← Ownership unchanged  │
   │   currentStableId: "s2",                ← New placement        │
   │   currentStableName: "Training Arena",                         │
   │   assignedAt: Timestamp (updated)                              │
   │ }                                                              │
   │                                                                 │
   │ horses/star123/locationHistory/h1: {                           │
   │   stableId: "s1",                                              │
   │   arrivalDate: ...,                                            │
   │   departureDate: ...                                           │
   │ }                                                              │
   └─────────────────────────────────────────────────────────────────┘
```

## Access Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HORSE DATA ACCESS LEVELS (RBAC)                                        │
└─────────────────────────────────────────────────────────────────────────┘

Level 1: PUBLIC (All stable members)
├── name, breed, color, gender
├── status (active/inactive)
├── currentStableId, currentStableName
└── age, dateOfBirth

Level 2: BASIC_CARE (groom, rider)
├── All Level 1 fields
├── specialInstructions
├── equipment[]
├── hasSpecialInstructions
└── usage[]

Level 3: PROFESSIONAL (veterinarian, dentist, farrier, inseminator)
├── All Level 2 fields
├── ueln, chipNumber
├── federationNumber, feiPassNumber
├── sire, dam, damsire
├── withersHeight, studbook, breeder
└── Health records (filtered by specialty)

Level 4: MANAGEMENT (administrator)
├── All Level 3 fields
├── ownerId, ownerName, ownerEmail
├── ownershipType, ownerContactId
├── notes
└── All health records

Level 5: OWNER (horse owner)
├── ALL FIELDS
└── Always full access regardless of org role
```

## Contact Visibility Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CONTACT ACCESS PATTERNS                                                 │
└─────────────────────────────────────────────────────────────────────────┘

PRIVATE CONTACT (only creator sees)
┌──────────────────────────────────────────────────────────────────┐
│ contacts/c1: {                                                    │
│   contactType: "Personal",                                        │
│   accessLevel: "user",         ← Private                         │
│   userId: "anna",              ← Only Anna sees this             │
│   organizationId: null,                                           │
│   firstName: "My Personal Vet",                                   │
│   ...                                                             │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘

ORGANIZATION CONTACT (all org members see)
┌──────────────────────────────────────────────────────────────────┐
│ contacts/c2: {                                                    │
│   contactType: "Business",                                        │
│   accessLevel: "organization", ← Shared                          │
│   organizationId: "gv123",     ← All GV members see this         │
│   userId: "anna",              ← Created by Anna (audit)         │
│   businessName: "Equine Supply Co",                               │
│   badge: "external",                                              │
│   ...                                                             │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘

MEMBER-LINKED CONTACT (auto-created on invite)
┌──────────────────────────────────────────────────────────────────┐
│ contacts/c3: {                                                    │
│   contactType: "Personal",                                        │
│   accessLevel: "organization",                                    │
│   organizationId: "gv123",                                        │
│   linkedMemberId: "erik_gv123", ← Linked to member               │
│   linkedUserId: "erik",                                           │
│   badge: "member",                                                │
│   hasLoginAccess: true,                                           │
│   source: "invite",                                               │
│   ...                                                             │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
```

## Key Permissions Summary

### Organization Role Permissions

| Capability | administrator | veterinarian | groom | customer | horse_owner |
|------------|---------------|--------------|-------|----------|-------------|
| Manage members | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create stables | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all horses | ✅ | ✅ | ✅ | ❌ | ❌ |
| Access health data | ✅ | ✅ | ❌ | ❌ | Own only |
| Create activities | ✅ | ❌ | ❌ | ❌ | ❌ |
| Execute tasks | ✅ | ✅ | ✅ | ❌ | ❌ |

### Horse Field Access by Role

| Field Category | administrator | veterinarian | groom | customer | Owner |
|----------------|---------------|--------------|-------|----------|-------|
| Basic (name, breed) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Care (instructions) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Medical (health) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Ownership (owner info) | ✅ | ❌ | ❌ | ❌ | ✅ |

## Security Rules Overview

```javascript
// Organization access
match /organizations/{orgId} {
  allow read: if isOrganizationMember(orgId);
  allow write: if isOrganizationAdmin(orgId);
}

// Member management
match /organizationMembers/{memberId} {
  allow read: if resource.data.userId == request.auth.uid ||
                 isOrganizationAdmin(resource.data.organizationId);
  allow write: if isOrganizationAdmin(resource.data.organizationId);
}

// Stable access
match /stables/{stableId} {
  allow read: if canAccessStable(stableId);
  allow write: if isOrganizationAdmin(resource.data.organizationId);
}

// Horse access (field-level RBAC enforced on backend)
match /horses/{horseId} {
  allow read: if resource.data.ownerId == request.auth.uid ||
                 canAccessStable(resource.data.currentStableId);
  allow write: if resource.data.ownerId == request.auth.uid ||
                  isOrganizationAdmin(getOrgForStable(resource.data.currentStableId));
}

// Contact visibility
match /contacts/{contactId} {
  // Private contacts
  allow read: if resource.data.accessLevel == 'user' &&
                 resource.data.userId == request.auth.uid;
  // Organization contacts
  allow read: if resource.data.accessLevel == 'organization' &&
                 isOrganizationMember(resource.data.organizationId);
}
```

## Migration Notes

### Deprecated: stableMembers Collection

The `stableMembers` collection is deprecated in favor of `organizationMembers`.

**Migration Mapping**:
| Old (stableMembers) | New (organizationMembers) |
|---------------------|---------------------------|
| `role: 'manager'` | `roles: ['administrator']` or custom mapping |
| `role: 'member'` | `roles: ['customer']` or `['groom']` |
| `stableId` | `assignedStableIds: [stableId]` |
| `status` | `status` (same) |

### Frontend Pages Requiring Migration

Six pages still reference the deprecated `stableMembers`:
1. `ActivityFormDialog.tsx`
2. `ActivitiesPlanningPage.tsx`
3. `ActivitiesActionListPage.tsx`
4. `TodayPage.tsx`
5. `ScheduleEditorPage.tsx`
6. `RoutineScheduler.tsx`

## Future Evolution

See [DATA_MODEL_EVOLUTION.md](./DATA_MODEL_EVOLUTION.md) for planned changes:
- Personal vs Business organization types
- Horse placement tracking (separate from ownership)
- Enhanced contact visibility controls
- Organization upgrade path (personal → business)

## Related Documentation

- [ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md) - Detailed role definitions and permissions
- [RBAC.md](./RBAC.md) - Field-level access control implementation
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Complete database schema
- [DATA_MODEL_EVOLUTION.md](./DATA_MODEL_EVOLUTION.md) - Future data model changes
