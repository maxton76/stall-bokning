# Role Management System

## Overview

The StallBokning system implements a comprehensive role-based access control (RBAC) system with:

1. **System Roles** - Platform-wide permissions via Firebase custom claims
2. **Organization Roles** - Professional roles within organizations (10 specialized roles)
3. **Stable Access** - Granular access to specific stables within an organization

## Role Architecture

### System Roles (Platform Level)

Stored in `users.systemRole` and Firebase custom claims:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `system_admin` | Platform administrator (service provider) | Full access to all resources, user management, platform configuration |
| `stable_owner` | Can create and own organizations | Create organizations, manage stables, full control of owned resources |
| `member` | Regular user (default) | Join organizations as member, participate in activities |

```
System Admin (platform operators)
    │
    ▼
Stable Owner (organization creators)
    │
    ├── Organization A
    │   ├── Stable 1
    │   └── Stable 2
    │
    └── Organization B
        └── Stable 3
```

### Organization Roles (Professional Roles)

Stored in `organizationMembers.roles[]` (array) with `primaryRole` for display:

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| `administrator` | Full organization access | Manage members, settings, all stables |
| `veterinarian` | Animal health services | Access health records, create medical entries |
| `dentist` | Equine dental services | Access dental records, schedule appointments |
| `farrier` | Hoof care services | Access hoof records, schedule visits |
| `customer` | Horse owner/client | View own horses, basic stable access |
| `groom` | Daily care staff | Execute tasks, update horse status |
| `saddle_maker` | Tack and saddle services | Access equipment records |
| `horse_owner` | External horse owner | Manage owned horses, limited stable access |
| `rider` | Professional rider | Access assigned horses, competition data |
| `inseminator` | Breeding services | Access breeding records, schedule services |

**Multi-Role Support**: Users can have multiple roles within an organization. For example, a user might be both a `veterinarian` and a `horse_owner`.

### Stable Access Control

Organization members have configurable stable access:

| Access Level | Description |
|--------------|-------------|
| `all` | Access to all stables in the organization |
| `specific` | Access only to stables listed in `assignedStableIds[]` |

## Database Collections

### 1. users Collection

```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;
  firstName: string;
  lastName: string;
  systemRole: 'system_admin' | 'stable_owner' | 'member';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Security Rules**:
- Users can read/update their own document
- System admins can read all users
- System roles can only be changed by system admins

### 2. organizations Collection

```typescript
interface Organization {
  id: string;
  name: string;
  description?: string;

  // Contact Information
  contactType: 'Personal' | 'Business';
  primaryEmail: string;
  phoneNumber?: string;

  // Timezone
  timezone: string;

  // Ownership
  ownerId: string;              // User with stable_owner systemRole
  ownerEmail: string;           // Cached for display

  // Subscription
  subscriptionTier: 'free' | 'professional' | 'enterprise';

  // Statistics (denormalized)
  stats: {
    stableCount: number;
    totalMemberCount: number;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Key Points**:
- Owner is ALSO an organizationMember with `administrator` role
- Owner tracked in both `ownerId` field AND `organizationMembers`
- Statistics are denormalized for performance

### 3. organizationMembers Collection

```typescript
interface OrganizationMember {
  id: string;                   // Format: {userId}_{organizationId}
  organizationId: string;
  userId: string;

  // Cached user information
  userEmail: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;

  // Multi-role support
  roles: OrganizationRole[];    // Array of roles
  primaryRole: OrganizationRole; // Main role for display

  // Status
  status: 'active' | 'inactive' | 'pending';

  // Planning visibility
  showInPlanning: boolean;      // Controls visibility in activity planning

  // Stable access control
  stableAccess: 'all' | 'specific';
  assignedStableIds?: string[]; // Only if stableAccess === 'specific'

  // Shift constraints (optional)
  availability?: MemberAvailability;
  limits?: MemberLimits;
  stats?: MemberStats;

  // Metadata
  joinedAt: Timestamp;
  invitedBy: string;
  inviteAcceptedAt?: Timestamp;
}
```

**Indexes Required**:
- `organizationId` - Query all members of an organization
- `userId` - Query all organizations a user belongs to
- `organizationId + status` - Query active members

### 4. stables Collection

```typescript
interface Stable {
  id: string;
  name: string;
  description?: string;
  address?: string;
  facilityNumber?: string;      // Jordbruksverket registration

  ownerId: string;              // Must be stable_owner systemRole
  ownerEmail?: string;
  organizationId?: string;      // Link to parent organization

  // Points system configuration
  pointsSystem?: PointsSystemConfig;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5. horses Collection

```typescript
interface Horse {
  id: string;
  name: string;

  // Ownership (immutable - who owns the horse)
  ownerId: string;              // User who owns this horse
  ownerName?: string;
  ownerEmail?: string;
  ownershipType: 'member' | 'contact' | 'external';
  ownerContactId?: string;      // If ownershipType === 'contact'

  // Current Stable Assignment (mutable - where horse is placed)
  currentStableId?: string;     // Current stable location
  currentStableName?: string;
  assignedAt?: Timestamp;

  // Status
  status: 'active' | 'inactive';
  isExternal: boolean;          // If horse is outside the system

  // ... additional fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6. contacts Collection

```typescript
interface Contact {
  id: string;
  contactType: 'Personal' | 'Business';

  // Access control
  accessLevel: 'organization' | 'user';
  organizationId?: string;      // If accessLevel === 'organization'
  userId?: string;              // If accessLevel === 'user'

  // Linking
  linkedMemberId?: string;      // Format: {userId}_{organizationId}
  linkedUserId?: string;        // Firebase Auth UID

  // Badge
  badge?: 'primary' | 'stable' | 'member' | 'external';
  source: 'manual' | 'invite' | 'import' | 'sync';
  hasLoginAccess: boolean;

  // Contact details...
  email: string;
  phoneNumber: string;
  address: ContactAddress;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Permission Matrix

### System Operations

| Operation | system_admin | stable_owner | member |
|-----------|--------------|--------------|--------|
| View all users | ✅ | ❌ | ❌ |
| Promote to stable_owner | ✅ | ❌ | ❌ |
| Delete any user | ✅ | ❌ | ❌ |
| View all organizations | ✅ | ❌ | ❌ |
| Create organization | ✅ | ✅ | ❌ |

### Organization Operations

| Operation | administrator | Other roles |
|-----------|---------------|-------------|
| Update org settings | ✅ | ❌ |
| Manage members | ✅ | ❌ |
| Invite members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| Create stables | ✅ | ❌ |
| View org details | ✅ | ✅ (if member) |

### Stable Operations

| Operation | administrator | manager* | Other roles |
|-----------|---------------|----------|-------------|
| Update stable settings | ✅ | ❌ | ❌ |
| Delete stable | ✅ | ❌ | ❌ |
| View stable | ✅ | ✅ | ✅ (if has access) |
| Create schedules | ✅ | ✅ | ❌ |
| Edit schedules | ✅ | ✅ | ❌ |
| View schedules | ✅ | ✅ | ✅ |

*Note: The `manager` role here refers to `stableMembers.role` which is being deprecated in favor of `organizationMembers.roles[]`.

### Horse Operations (RBAC Field-Level Access)

The system implements **field-level RBAC** for horse data with 5 access levels:

| Access Level | Roles | Fields Visible |
|--------------|-------|----------------|
| Level 1: public | All stable members | Basic info (name, breed, color, status) |
| Level 2: basic_care | groom, rider | Care instructions, equipment |
| Level 3: professional | veterinarian, dentist, farrier, inseminator | Medical data, identification |
| Level 4: management | administrator | Owner info, notes |
| Level 5: owner | Horse owner | Full access to all fields |

**Key Rules**:
- Horse owners ALWAYS get full access regardless of organization role
- Multi-role users get highest applicable access level
- Health records filtered by professional specialty

## Contact Visibility Model

Contacts have two access levels:

| Type | Storage | Visibility |
|------|---------|------------|
| Private | `accessLevel: 'user'`, `userId: string` | Only creator can see |
| Organization | `accessLevel: 'organization'`, `organizationId: string` | All org members can see |

**Query Patterns**:

```typescript
// Get private contacts
db.collection('contacts')
  .where('userId', '==', currentUserId)
  .where('accessLevel', '==', 'user')

// Get organization contacts
db.collection('contacts')
  .where('organizationId', '==', orgId)
  .where('accessLevel', '==', 'organization')
```

## Security Rules Helpers

```javascript
// Check if user is authenticated
function isAuthenticated() {
  return request.auth != null;
}

// Check if user is system admin
function isSystemAdmin() {
  return isAuthenticated() &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.systemRole == 'system_admin';
}

// Check if user is organization member
function isOrganizationMember(orgId) {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + orgId)) &&
         get(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + orgId)).data.status == 'active';
}

// Check if user is organization admin
function isOrganizationAdmin(orgId) {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + orgId)) &&
         'administrator' in get(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + orgId)).data.roles;
}

// Check if user has specific role in organization
function hasOrganizationRole(orgId, role) {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + orgId)) &&
         role in get(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + orgId)).data.roles;
}

// Check if user can access stable
function canAccessStable(stableId) {
  let stable = get(/databases/$(database)/documents/stables/$(stableId)).data;
  let orgId = stable.organizationId;

  return isSystemAdmin() ||
         (isOrganizationMember(orgId) &&
          (getMemberStableAccess(orgId) == 'all' ||
           stableId in getMemberAssignedStables(orgId)));
}
```

## Migration Notes

### Deprecated: stableMembers Collection

The `stableMembers` collection is deprecated. Migration path:

| Old Field | New Location |
|-----------|--------------|
| `stableMembers.role` | `organizationMembers.roles[]` |
| `stableMembers.stableId` | `organizationMembers.assignedStableIds[]` |
| `stableMembers.status` | `organizationMembers.status` |

### Frontend Pages Still Using stableMembers

The following pages need migration to `organizationMembers`:
- `ActivityFormDialog.tsx`
- `ActivitiesPlanningPage.tsx`
- `ActivitiesActionListPage.tsx`
- `TodayPage.tsx`
- `ScheduleEditorPage.tsx`
- `RoutineScheduler.tsx`

## Related Documentation

- [ROLE_SYSTEM_OVERVIEW.md](./ROLE_SYSTEM_OVERVIEW.md) - Visual hierarchy and user journeys
- [DATA_MODEL_EVOLUTION.md](./DATA_MODEL_EVOLUTION.md) - Future data model changes
- [RBAC.md](./RBAC.md) - Field-level access control for horses
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Complete database schema
