# Role Management System

## Overview

The StallBokning system implements a three-tier role hierarchy to support:
1. **Service Providers** - System administrators managing the entire platform
2. **Stable Owners** - Users who own and manage one or more stables
3. **Stable Members** - Users who are members of one or more stables

## Role Architecture

### System Roles (Platform Level)

Stored in `users.systemRole`:

| Role | Description | Permissions |
|------|-------------|-------------|
| `system_admin` | Service provider/platform administrator | Full access to all resources across all stables |
| `stable_owner` | Designated user who can create and own stables | Can create stables, own multiple stables, full control of owned stables |
| `member` | Regular user (default) | Can only join stables as member, cannot create stables |

**Hierarchy**:
```
System Admin (service providers)
    ↓
Stable Owner (can own multiple stables)
    ↓
Stable A, Stable B, Stable C...
    ↓
Members (of each stable)
```

### Stable-Level Roles

Stored in `stableMembers.role` (for members only, owner tracked separately):

| Role | Description | Permissions |
|------|-------------|-------------|
| `manager` | Delegated management rights by owner | Can manage schedules, shifts, and invite members |
| `member` | Regular stable member | Can view schedules, book shifts, view own bookings |

**Note**: Stable owners are NOT in the stableMembers collection. They are tracked via `stables.ownerId`.

## Database Collections

### 1. users Collection

```typescript
interface User {
  uid: string                    // Firebase Auth UID
  email: string
  displayName?: string
  systemRole: 'system_admin' | 'stable_owner' | 'member'  // Platform-level role
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Security Rules**:
- Any authenticated user can read their own document
- System admins can read all user documents
- Only the user or system admin can update their document
- Only system admins can delete users

### 2. stableMembers Collection (NEW)

```typescript
interface StableMember {
  id: string                     // Auto-generated ID (format: userId_stableId)
  stableId: string              // Reference to stable
  userId: string                // Reference to user (NOT the owner)
  role: 'manager' | 'member'    // Only managers and members (owner tracked separately)
  status: 'active' | 'inactive' | 'pending'
  joinedAt: Timestamp
  invitedBy?: string            // userId who sent invite
  inviteAcceptedAt?: Timestamp
}
```

**Indexes Required**:
- `stableId` (for querying all members of a stable)
- `userId` (for querying all stables a user belongs to)
- Composite: `stableId + userId` (for checking membership)

**Security Rules**:
- Stable owners and managers can read all members of their stable
- Users can read their own memberships
- Only stable owners can create/update/delete memberships
- System admins have full access

### 3. stables Collection (UPDATED)

```typescript
interface Stable {
  id: string
  name: string
  description?: string
  address?: string
  ownerId: string               // Reference to stable_owner user
  ownerEmail?: string           // Cached for display
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Security Rules**:
- Members can read stables they belong to
- Owners can update their stables
- Owners can delete their stables (with confirmation)
- System admins have full access

### 4. horses Collection (NEW)

```typescript
interface Horse {
  id: string                    // Auto-generated ID
  name: string
  breed?: string
  age?: number
  color?: string
  ownerId: string              // Reference to user who owns this horse
  ownerEmail?: string          // Cached for display
  stableId: string             // Which stable this horse belongs to
  status: 'active' | 'inactive'
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Key Points**:
- Both stable owners AND members can add horses
- Each horse has an `ownerId` (the person who owns the horse)
- Each horse belongs to a `stableId`
- Stable owners can add horses for themselves
- Members can add horses for themselves
- Users can only edit/delete their own horses
- Stable owners can view all horses in their stable
- Members can view all horses in stables they belong to

**Security Rules**:
- Users can create horses in stables they have access to
- Users can only update/delete their own horses
- Stable owners can view all horses in their stables
- Members can view all horses in their stables
- System admins have full access

## Permission Matrix

### System Operations

| Operation | system_admin | stable_owner | member |
|-----------|--------------|--------------|--------|
| View all users | ✅ | ❌ | ❌ |
| Promote user to stable_owner | ✅ | ❌ | ❌ |
| Delete any user | ✅ | ❌ | ❌ |
| View all stables | ✅ | ❌ | ❌ |
| Access any stable data | ✅ | ❌ | ❌ |
| Create new stable | ✅ | ✅ | ❌ |

### Stable Operations

| Operation | owner | manager | member |
|-----------|-------|---------|--------|
| View stable details | ✅ | ✅ | ✅ |
| Update stable settings | ✅ | ❌ | ❌ |
| Delete stable | ✅ | ❌ | ❌ |
| View all members | ✅ | ✅ | ✅ |
| Invite members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ❌ | ❌ |
| Create schedules | ✅ | ✅ | ❌ |
| Edit schedules | ✅ | ✅ | ❌ |
| Delete schedules | ✅ | ❌ | ❌ |
| View schedules | ✅ | ✅ | ✅ |
| Book shifts | ✅ | ✅ | ✅ |
| Cancel own bookings | ✅ | ✅ | ✅ |
| Cancel others' bookings | ✅ | ✅ | ❌ |

### Horse Operations

| Operation | stable owner | member (own horse) | member (other's horse) |
|-----------|--------------|-------------------|----------------------|
| Add horse to stable | ✅ | ✅ | ❌ |
| View all horses in stable | ✅ | ✅ | ✅ |
| Edit horse details | ✅ (own horses) | ✅ (own horses) | ❌ |
| Delete horse | ✅ (own horses) | ✅ (own horses) | ❌ |
| View horse owner info | ✅ | ✅ | ✅ |
| Assign horse to shift | ✅ (own horses) | ✅ (own horses) | ❌ |

## Implementation Plan

### Phase 1: Database Migration
1. Create `stableMembers` collection
2. Migrate existing stable owners to stableMembers
3. Update security rules
4. Create required indexes

### Phase 2: Backend Updates
1. Update stable creation to create owner membership
2. Update invite system to create pending memberships
3. Add membership management endpoints
4. Add role checking utilities

### Phase 3: Frontend Updates
1. Add membership management UI
2. Update permission checks throughout app
3. Add role-based UI visibility
4. Update member invitation flow

### Phase 4: Testing & Deployment
1. Test all permission scenarios
2. Test multi-stable memberships
3. Deploy to staging
4. Production deployment

## Helper Functions

### Firestore Security Rules

```javascript
// Helper to get user data
function getUserData() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}

// Check if user is authenticated
function isAuthenticated() {
  return request.auth != null;
}

// Check if user is system admin
function isSystemAdmin() {
  return isAuthenticated() && getUserData().systemRole == 'system_admin';
}

// Check if user has stable_owner system role
function hasStableOwnerRole() {
  return isAuthenticated() && getUserData().systemRole == 'stable_owner';
}

// Check if user is owner of specific stable
function isStableOwner(stableId) {
  return isAuthenticated() &&
         get(/databases/$(database)/documents/stables/$(stableId)).data.ownerId == request.auth.uid;
}

// Check if user is member of specific stable (manager or member)
function isStableMember(stableId) {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/stableMembers/$(request.auth.uid + '_' + stableId)) &&
         get(/databases/$(database)/documents/stableMembers/$(request.auth.uid + '_' + stableId)).data.status == 'active';
}

// Check if user has specific role in stable (manager or member)
function hasStableRole(stableId, role) {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/stableMembers/$(request.auth.uid + '_' + stableId)) &&
         get(/databases/$(database)/documents/stableMembers/$(request.auth.uid + '_' + stableId)).data.role == role;
}

// Check if user can access stable (owner, member, or admin)
function canAccessStable(stableId) {
  return isSystemAdmin() || isStableOwner(stableId) || isStableMember(stableId);
}
```

### Frontend Utilities

```typescript
// Get user's system role
async function getUserSystemRole(userId: string): Promise<'system_admin' | 'stable_owner' | 'member'> {
  const userDoc = await getDoc(doc(db, 'users', userId))
  if (!userDoc.exists()) return 'member'
  return userDoc.data().systemRole || 'member'
}

// Check if user is owner of specific stable
async function isUserStableOwner(userId: string, stableId: string): Promise<boolean> {
  const stableDoc = await getDoc(doc(db, 'stables', stableId))
  if (!stableDoc.exists()) return false
  return stableDoc.data().ownerId === userId
}

// Get user's role in specific stable (for members only)
async function getUserStableMemberRole(userId: string, stableId: string): Promise<'manager' | 'member' | null> {
  const memberDoc = await getDoc(doc(db, 'stableMembers', `${userId}_${stableId}`))
  if (!memberDoc.exists()) return null
  return memberDoc.data().role
}

// Get all stables user owns
async function getUserOwnedStables(userId: string): Promise<Stable[]> {
  const q = query(
    collection(db, 'stables'),
    where('ownerId', '==', userId)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stable))
}

// Get all stables user is member of
async function getUserMemberStables(userId: string): Promise<StableMember[]> {
  const q = query(
    collection(db, 'stableMembers'),
    where('userId', '==', userId),
    where('status', '==', 'active')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StableMember))
}

// Get all stables user has access to (owned + member)
async function getAllUserStables(userId: string) {
  const [ownedStables, memberStables] = await Promise.all([
    getUserOwnedStables(userId),
    getUserMemberStables(userId)
  ])

  return {
    owned: ownedStables,
    member: memberStables
  }
}

// Check if user can perform action in stable
async function canPerformAction(
  userId: string,
  stableId: string,
  action: string
): Promise<boolean> {
  const systemRole = await getUserSystemRole(userId)

  // System admins can do everything
  if (systemRole === 'system_admin') return true

  // Check if user is owner of this stable
  const isOwner = await isUserStableOwner(userId, stableId)
  if (isOwner) return true

  // Check member role
  const memberRole = await getUserStableMemberRole(userId, stableId)

  const permissions = {
    manager: ['view_stable', 'manage_schedules', 'manage_shifts', 'invite_members', 'view_members'],
    member: ['view_stable', 'view_schedules', 'book_shifts', 'view_own_bookings']
  }

  if (!memberRole) return false
  return permissions[memberRole].includes(action)
}
```

## Migration Script

```typescript
// Migrate existing stable owners to stableMembers collection
async function migrateStableOwners() {
  const stablesSnapshot = await getDocs(collection(db, 'stables'))

  for (const stableDoc of stablesSnapshot.docs) {
    const stable = stableDoc.data()

    if (stable.ownerId) {
      // Create owner membership
      await setDoc(doc(db, 'stableMembers', `${stable.ownerId}_${stableDoc.id}`), {
        stableId: stableDoc.id,
        userId: stable.ownerId,
        role: 'owner',
        status: 'active',
        joinedAt: stable.createdAt || Timestamp.now()
      })

      console.log(`Created owner membership for stable ${stableDoc.id}`)
    }
  }
}
```

## Security Considerations

1. **Document IDs**: Use `${userId}_${stableId}` format for stableMembers to ensure unique memberships and easy lookups
2. **Indexes**: Create composite indexes for efficient queries
3. **Validation**: Always validate roles on backend before granting access
4. **Audit Trail**: Consider adding audit logging for role changes
5. **Cascade Deletes**: When deleting a stable, delete all associated stableMembers
6. **Owner Protection**: Ensure at least one owner exists per stable

## Next Steps

1. Review and approve this design
2. Implement database migration script
3. Update Firestore security rules
4. Implement backend services
5. Update frontend components
6. Test thoroughly in development
7. Deploy to production
