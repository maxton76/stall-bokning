# Role System Overview - Complete Architecture

## System Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ LEVEL 1: SYSTEM ADMINISTRATORS (Service Providers)             │
│ Role: system_admin                                              │
│ Can: Manage platform, promote users, access all data           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LEVEL 2: STABLE OWNERS                                          │
│ Role: stable_owner                                              │
│ Can: Create multiple stables, own horses, full stable control  │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Stable A    │  │  Stable B    │  │  Stable C    │
    │              │  │              │  │              │
    │  Owner's     │  │  Owner's     │  │  Owner's     │
    │  Horses 🐴   │  │  Horses 🐴   │  │  Horses 🐴   │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │
            └─────────────────┴─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LEVEL 3: STABLE MEMBERS                                         │
│ Role: member (system) + manager/member (per-stable)            │
│ Can: Join stables, add own horses, book shifts                 │
│                                                                 │
│ Member Types:                                                   │
│ • Manager - Can manage schedules & invite members              │
│ • Member  - Can view schedules & book shifts                   │
│                                                                 │
│ Each Member's Horses 🐴🐴                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### Collections

```
users/
  {userId}
    - uid: string
    - email: string
    - systemRole: 'system_admin' | 'stable_owner' | 'member'
    - createdAt: timestamp

stables/
  {stableId}
    - name: string
    - ownerId: string → references user (must be stable_owner)
    - address: string
    - createdAt: timestamp

stableMembers/
  {userId}_{stableId}
    - userId: string → references user
    - stableId: string → references stable
    - role: 'manager' | 'member'
    - status: 'active' | 'pending' | 'inactive'
    - joinedAt: timestamp

horses/
  {horseId}
    - name: string
    - ownerId: string → references user (owner or member)
    - stableId: string → references stable
    - breed: string
    - age: number
    - status: 'active' | 'inactive'
    - createdAt: timestamp
```

## User Journey Examples

### Example 1: System Admin (You - Service Provider)
```
✅ Create system_admin account
✅ Promote users to stable_owner
✅ View all stables, horses, members
✅ Access all data for support/management
```

### Example 2: Stable Owner (Anna)
```
1. System admin promotes Anna to stable_owner
2. Anna creates "Green Valley Stables"
   → Anna becomes ownerId of this stable
3. Anna adds her horses to Green Valley Stables
   → Horse1: ownerId=Anna, stableId=GreenValley
   → Horse2: ownerId=Anna, stableId=GreenValley
4. Anna creates another stable "Sunset Stables"
   → Anna is now ownerId of TWO stables
5. Anna adds horses to Sunset Stables
6. Anna invites Erik as manager to Green Valley
7. Anna invites Maria as member to Green Valley
```

### Example 3: Member (Erik - Manager Role)
```
1. Erik registers (default: systemRole=member)
2. Anna invites Erik to Green Valley Stables as manager
3. Erik accepts → stableMembers record created
   → userId=Erik, stableId=GreenValley, role=manager
4. Erik can now:
   ✅ Add his own horses to Green Valley
      → Horse3: ownerId=Erik, stableId=GreenValley
   ✅ Manage schedules
   ✅ Invite other members
   ❌ Cannot change stable settings (only Anna can)
   ❌ Cannot edit Anna's horses (only own horses)
```

### Example 4: Member (Maria - Member Role)
```
1. Maria registers (default: systemRole=member)
2. Anna invites Maria to Green Valley Stables as member
3. Maria accepts → stableMembers record created
   → userId=Maria, stableId=GreenValley, role=member
4. Maria can:
   ✅ Add her own horses to Green Valley
      → Horse4: ownerId=Maria, stableId=GreenValley
   ✅ View all horses in Green Valley (Anna's, Erik's, her own)
   ✅ View schedules
   ✅ Book shifts for her horses
   ❌ Cannot manage schedules (only owners & managers)
   ❌ Cannot edit Erik's or Anna's horses
5. Erik invites Maria to Sunset Stables as member
6. Maria now belongs to TWO stables with her horses
```

## Key Permissions

### Creating Stables
- ❌ Regular members CANNOT create stables
- ✅ Only stable_owner role can create stables
- ✅ System admins can create stables
- 💡 Service providers control who becomes stable_owner

### Adding Horses
- ✅ Stable owners can add horses to their own stables
- ✅ Members (manager or member role) can add horses to stables they belong to
- ✅ Each horse is owned by one user (ownerId)
- ❌ Users can only edit/delete their own horses
- ✅ Everyone in stable can VIEW all horses

### Managing Stables
| Action | stable_owner | manager | member |
|--------|--------------|---------|--------|
| Update stable settings | ✅ (own) | ❌ | ❌ |
| Create schedules | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ❌ | ❌ |

### Managing Horses
| Action | Owner | Other users |
|--------|-------|-------------|
| Edit horse | ✅ | ❌ |
| Delete horse | ✅ | ❌ |
| View horse | ✅ | ✅ (if in same stable) |
| Book shifts for horse | ✅ | ❌ |

## Security Rules Summary

### Stable Creation
```javascript
// Only stable_owner or system_admin can create stables
allow create: if isSystemAdmin() || hasStableOwnerRole();
```

### Horse Management
```javascript
// Anyone in stable can add horses
allow create: if canAccessStable(request.resource.data.stableId);

// Only horse owner can update/delete
allow update, delete: if resource.data.ownerId == request.auth.uid;

// Anyone in stable can view horses
allow read: if canAccessStable(resource.data.stableId);
```

### Member Management
```javascript
// Only stable owner can add/remove members
allow write: if isStableOwner(stableId);

// Users can read their own memberships
allow read: if resource.data.userId == request.auth.uid;
```

## Migration Strategy

### Phase 1: Set System Roles
```typescript
// 1. Set all existing users to default 'member'
// 2. Promote specific users to 'stable_owner'
// 3. Set service provider accounts to 'system_admin'
```

### Phase 2: Maintain Stable Ownership
```typescript
// stables.ownerId already exists
// Just verify owners have stable_owner systemRole
```

### Phase 3: Create stableMembers
```typescript
// Create stableMembers records for all current members
// (except owners - they're tracked in stables.ownerId)
```

### Phase 4: Add Horses Support
```typescript
// Create horses collection
// Allow users to add horses to their stables
```

## Business Logic

### User Lifecycle
1. **Registration**: User created with `systemRole: 'member'`
2. **Promotion**: Admin promotes user to `stable_owner` (if applicable)
3. **Stable Creation**: User with `stable_owner` role creates stable
4. **Member Invitation**: Owner/manager invites members to stable
5. **Horse Addition**: Any stable member adds their horses
6. **Shift Booking**: Members book shifts for their horses

### Constraints
- ✅ One stable = one owner (but owner can have multiple stables)
- ✅ One horse = one owner (per stable)
- ✅ Users can be members of multiple stables
- ✅ Users can own horses in multiple stables
- ❌ Regular members cannot create stables (must be stable_owner)
- ❌ Users cannot edit horses they don't own

## Next Steps

1. ✅ Design complete
2. ⏳ Implement updated firestore.rules
3. ⏳ Create TypeScript interfaces
4. ⏳ Implement helper functions
5. ⏳ Create admin UI for promoting users
6. ⏳ Update stable creation to check systemRole
7. ⏳ Implement horse management UI
8. ⏳ Migration script
9. ⏳ Testing
10. ⏳ Deployment
