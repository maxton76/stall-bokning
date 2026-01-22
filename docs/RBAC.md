# Role-Based Access Control (RBAC) System

## Overview

The Stallbokningssystem implements a comprehensive **field-level RBAC system** for horse data, ensuring that users only see information appropriate to their role and relationship with each horse.

**Core Principle**: "Trust no one" - lock down by default, expose specific fields based on role.

**Key Features**:
- 5-level access hierarchy (public → basic_care → professional → management → owner)
- Field-level data projection enforced on backend
- Multi-role organization membership support
- Owner-based full access override
- Professional role-specific health record filtering

## Role Hierarchy

The system uses a **3-tier role hierarchy**:

### 1. System-Level Roles (Platform-wide)

Assigned to users in Firebase Auth custom claims.

| Role | Description | Access Level |
|------|-------------|--------------|
| `system_admin` | Full platform access | Management (all horses) |
| `stable_owner` | Can own/manage stables | Management (owned stables) |
| `member` | Standard user | Role-dependent |

### 2. Organization-Level Roles (Multi-role)

Stored in `organizationMembers` collection. Users can have **multiple roles** simultaneously.

| Role | Description | Default Access Level |
|------|-------------|---------------------|
| `administrator` | Full organization access | Management |
| `veterinarian` | Animal health services | Professional (medical focus) |
| `dentist` | Equine dental services | Professional (dental focus) |
| `farrier` | Hoof care services | Professional (hoof focus) |
| `groom` | Daily care staff | Basic Care |
| `rider` | Professional rider | Basic Care |
| `customer` | Horse owner/client | Basic Care |
| `saddle_maker` | Tack services | Basic Care |
| `horse_owner` | External horse owner | Basic Care |
| `inseminator` | Breeding services | Professional |

### 3. Stable-Level Access (Deprecated)

Legacy roles now managed through `organizationMembers.stableAccess`:
- `stableAccess: "all"` - Access to all stables in organization
- `stableAccess: "specific"` - Access only to `assignedStableIds`

## Access Level System

### Access Level Hierarchy

Each user's access level for a horse is determined by:
1. **Ownership**: Horse owners always get "owner" level (full access)
2. **System Role**: `system_admin` gets management level
3. **Stable Ownership**: Stable owners get management level for their stable's horses
4. **Organization Roles**: Highest applicable role determines level

```
Level 5: owner (full access)
   ↓
Level 4: management (administrators, stable owners)
   ↓
Level 3: professional (veterinarian, farrier, dentist)
   ↓
Level 2: basic_care (grooms, riders, customers)
   ↓
Level 1: public (all stable members)
```

### Field Visibility Matrix

**Level 1: Public** (All stable members)
```typescript
[
  "id", "name", "breed", "color", "gender", "age", "dateOfBirth",
  "status", "currentStableId", "currentStableName", "usage"
]
```

**Level 2: Basic Care** (Grooms, Riders, Daily Staff)
```typescript
[
  ...public,
  "specialInstructions", "equipment", "hasSpecialInstructions",
  "horseGroupId", "horseGroupName", "withersHeight"
]
```

**Level 3: Professional** (Veterinarian, Farrier, Dentist)
```typescript
[
  ...basic_care,
  "vaccinationRuleId", "vaccinationRuleName", "lastVaccinationDate",
  "nextVaccinationDue", "vaccinationStatus", "ueln", "chipNumber",
  "feiPassNumber", "feiExpiryDate", "sire", "dam", "damsire",
  "studbook", "breeder", "hasTeamAssignments", "hasTransportInstructions",
  "hasPedigreeData"
]
```

**Level 4: Management** (Administrators, Stable Owners)
```typescript
[
  ...professional,
  "ownerId", "ownerName", "ownerEmail", "ownershipType",
  "ownerContactId", "ownerContactName", "ownerOrganizationId",
  "isExternal", "dateOfArrival", "assignedAt", "federationNumber",
  "notes", "relatedLinks", "createdAt", "updatedAt", "lastModifiedBy"
]
```

**Level 5: Owner** (Horse Owner + System Admin)
```typescript
[
  ...management,
  "externalContactId", "externalLocation", "externalMoveType",
  "externalDepartureDate", "externalMoveReason", "isRemoved"
]
```

### Health Records Filtering

Professional roles receive **filtered health records** based on their specialty:

| Role | Visible Health Records |
|------|----------------------|
| `veterinarian` | veterinary, medication |
| `farrier` | farrier (hoof care) |
| `dentist` | dental |
| Other roles | None |

## API Endpoints

### GET /api/v1/horses

Retrieve horses with role-based field projection.

**Query Parameters**:
- `scope`: `"my"` (owned), `"stable"` (specific stable), `"all"` (all accessible)
- `stableId`: Required when `scope=stable`
- `status`: `"active"` | `"inactive"` (optional, defaults to active)

**Response**:
```json
{
  "horses": [
    {
      "id": "horse-123",
      "name": "Thunder",
      "breed": "Warmblood",
      "color": "Bay",
      "age": 8,
      "_accessLevel": "basic_care",
      "_isOwner": false,
      // ... fields based on user's access level
    }
  ],
  "meta": {
    "scope": "stable",
    "count": 15
  }
}
```

**Access Level Metadata**:
- `_accessLevel`: User's access level for this horse
- `_isOwner`: Boolean indicating ownership

**Examples**:
```bash
# Get my owned horses (full data)
GET /api/v1/horses?scope=my

# Get horses in specific stable (role-filtered)
GET /api/v1/horses?scope=stable&stableId=stable-123

# Get all accessible horses (owned + stable horses, role-filtered)
GET /api/v1/horses?scope=all

# Filter by status
GET /api/v1/horses?scope=my&status=inactive
```

### GET /api/v1/horses/:id

Retrieve single horse with role-based field projection.

**Response**:
```json
{
  "id": "horse-123",
  "name": "Thunder",
  "_accessLevel": "professional",
  "_isOwner": false,
  // ... fields based on user's access level
}
```

**Access Control**:
- Returns `403 Forbidden` if user has no access to horse
- Returns `404 Not Found` if horse doesn't exist

## Frontend Integration

### Horse Service Functions

**New Scoped Functions**:
```typescript
// Get owned horses (Level 5 - full access)
getMyHorses(stableId?: string, status?: "active" | "inactive"): Promise<Horse[]>

// Get horses in specific stable (role-filtered)
getStableHorses(stableId: string, status?: "active" | "inactive"): Promise<Horse[]>

// Get all accessible horses (owned + stable horses)
getAllAccessibleHorses(status?: "active" | "inactive"): Promise<Horse[]>
```

**Generic Function**:
```typescript
getHorses(
  scope: "my" | "stable" | "all",
  stableId?: string,
  status?: "active" | "inactive"
): Promise<Horse[]>
```

**Deprecated**:
```typescript
// ❌ Deprecated - Use getMyHorses() instead
getUserHorses(userId: string): Promise<Horse[]>
```

### Usage Examples

**My Horses Page** (Owner View):
```typescript
const horses = useAsyncData<Horse[]>({
  loadFn: () => getMyHorses(), // Only owned horses with full data
  errorMessage: t("horses:messages.loadError"),
});
```

**Stable Horses Page** (Filtered by Role):
```typescript
const horses = useAsyncData<Horse[]>({
  loadFn: () => getStableHorses(stableId), // Role-filtered data
  errorMessage: t("horses:messages.loadError"),
});
```

**All Accessible Horses**:
```typescript
const horses = useAsyncData<Horse[]>({
  loadFn: () => getAllAccessibleHorses(), // Owned + stable horses
  errorMessage: t("horses:messages.loadError"),
});
```

## Implementation Details

### Access Context Determination

**File**: `packages/api/src/utils/authorization.ts`

```typescript
export interface HorseAccessContext {
  userId: string;
  systemRole: string;
  isOwner: boolean;
  organizationRoles: string[];
  stableAccess: "all" | "specific";
  accessLevel: HorseAccessLevel;
}

export async function getHorseAccessContext(
  horseId: string,
  userId: string,
  systemRole: string
): Promise<HorseAccessContext | null>
```

**Logic**:
1. Check if user owns the horse → Return "owner" level
2. Check if horse is assigned to stable
3. Verify user has access to that stable via organization membership
4. Determine access level based on user's roles
5. Return access context or null (no access)

### Field Projection

**File**: `packages/api/src/utils/horseProjection.ts`

```typescript
export function projectHorseFields(
  horse: Horse,
  accessLevel: HorseAccessLevel,
  context: HorseAccessContext
): Partial<Horse>
```

**Logic**:
1. Select allowed fields based on access level
2. Project only those fields from horse object
3. Add metadata: `_accessLevel`, `_isOwner`
4. Return projected horse object

### Health Records Filtering

```typescript
export function filterHealthRecordsByRole(
  records: HealthRecord[] | undefined,
  organizationRoles: string[]
): HealthRecord[] | undefined
```

**Logic**:
- Veterinarians see: `veterinary`, `medication` records
- Farriers see: `farrier` records
- Dentists see: `dental` records
- Other roles see: No health records

## Security Considerations

### Backend Enforcement

✅ **Field-level access control enforced on backend**
- Data projection happens in API layer
- Frontend receives only accessible fields
- No reliance on frontend filtering for security

✅ **Ownership verification**
- Direct ownership check via `horse.ownerId === userId`
- Full access granted to owners regardless of other roles

✅ **Stable access validation**
- Organization membership verified before projection
- `stableAccess` scope respected (all vs. specific stables)
- Unassigned horses only accessible by owner

### Access Control Flow

```
1. User makes API request for horse data
   ↓
2. Authentication middleware verifies JWT token
   ↓
3. Extract user ID and system role from token
   ↓
4. For each horse:
   - Check ownership (owner → full access)
   - Check stable assignment
   - Verify organization membership
   - Determine access level from roles
   - Project fields based on access level
   ↓
5. Return projected horse data with metadata
```

### Critical Security Points

⚠️ **Bug Fixed**: Field name mismatch in authorization.ts:472
- **Before**: `stableId` (incorrect)
- **After**: `currentStableId` (correct)
- **Impact**: Prevented proper stable access validation

⚠️ **Type Safety**: All field projection uses TypeScript types
- `FIELD_ACCESS_MAP` keys are `keyof Horse`
- Prevents accidental exposure of non-existent fields
- Compile-time validation of field access

⚠️ **Metadata Exposure**: Access level metadata included in response
- `_accessLevel`: Informs frontend of user's access level
- `_isOwner`: Indicates ownership for UI decisions
- These fields are safe to expose (user-specific, not sensitive)

## Testing the RBAC System

### Test Scenarios

**1. Owner Access (Level 5)**
```
Login as: Horse owner
Navigate to: /horses (My Horses page)
Expected: Full access to all fields including:
  - externalLocation
  - notes
  - ownerEmail
  - All sensitive owner-only fields
```

**2. Groom Access (Level 2)**
```
Login as: User with "groom" role
View: Stable horses page
Expected: Basic care access only:
  ✅ name, age, breed, color
  ✅ specialInstructions, equipment
  ❌ owner details
  ❌ medical records
  ❌ notes
```

**3. Veterinarian Access (Level 3)**
```
Login as: User with "veterinarian" role
View: Horse details
Expected: Professional access with medical focus:
  ✅ basic care fields
  ✅ vaccinationRecords
  ✅ healthRecords (veterinary, medication only)
  ✅ chipNumber, ueln
  ❌ owner contact details
  ❌ notes, externalLocation
```

**4. Administrator Access (Level 4)**
```
Login as: Organization administrator
View: Stable horses
Expected: Management-level access:
  ✅ all professional fields
  ✅ owner details (name, email)
  ✅ notes
  ❌ externalLocation (owner-only)
```

**5. Multi-Role User**
```
Login as: User with ["groom", "farrier"] roles
Expected: Highest applicable level (professional)
  ✅ basic care fields
  ✅ healthRecords (farrier records only)
  ✅ professional identification fields
```

### API Testing with curl

**Test Owned Horses**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://dev-api-service-wigho7gnca-ew.a.run.app/api/v1/horses?scope=my"
```

**Test Stable Access with Role Filtering**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://dev-api-service-wigho7gnca-ew.a.run.app/api/v1/horses?scope=stable&stableId=STABLE_ID"
```

**Test Unauthorized Access**:
```bash
# Should return 403 Forbidden
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://dev-api-service-wigho7gnca-ew.a.run.app/api/v1/horses?scope=stable&stableId=UNAUTHORIZED_STABLE_ID"
```

**Test Single Horse Access**:
```bash
# Returns projected fields + metadata
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://dev-api-service-wigho7gnca-ew.a.run.app/api/v1/horses/HORSE_ID"
```

### Expected Response Structure

**Groom viewing stable horse**:
```json
{
  "id": "horse-123",
  "name": "Thunder",
  "breed": "Warmblood",
  "color": "Bay",
  "age": 8,
  "specialInstructions": "Prefers morning turnout",
  "equipment": ["saddle", "bridle"],
  "_accessLevel": "basic_care",
  "_isOwner": false
  // No owner details, medical records, or notes
}
```

**Veterinarian viewing stable horse**:
```json
{
  "id": "horse-123",
  "name": "Thunder",
  // ... basic care fields ...
  "vaccinationRecords": [...],
  "healthRecords": [
    { "recordType": "veterinary", "date": "2024-01-15", ... },
    { "recordType": "medication", "date": "2024-01-20", ... }
    // No farrier or dental records
  ],
  "chipNumber": "123456789",
  "ueln": "ABC123456789",
  "_accessLevel": "professional",
  "_isOwner": false
  // Still no owner contact details
}
```

**Owner viewing their horse**:
```json
{
  "id": "horse-123",
  "name": "Thunder",
  // ... ALL fields including ...
  "ownerEmail": "owner@example.com",
  "notes": "Private notes about the horse",
  "externalLocation": "Winter pasture at farm X",
  "healthRecords": [/* All records, no filtering */],
  "_accessLevel": "owner",
  "_isOwner": true
}
```

## Migration & Rollout

### Current Status

✅ **Phase 1: Backend RBAC Infrastructure** (Completed)
- ✅ Authorization utilities implemented
- ✅ Field projection system created
- ✅ API endpoints updated with scope parameter
- ✅ Health record filtering by role
- ✅ Deployed to dev environment

🔄 **Phase 2: Frontend Integration** (In Progress)
- ✅ Horse service updated with scoped functions
- ✅ MyHorsesPage updated to use `getMyHorses()`
- ⏳ 6 remaining pages using deprecated `getUserHorses()`:
  - StableDetailPage
  - StableSchedulePage
  - ActivitiesPlanningPage
  - ActivitiesCarePage
  - FeedingOverviewPage
  - FeedingSchedulePage

⏳ **Phase 3: Security Hardening** (Pending)
- Audit logging for access attempts
- Rate limiting on horse endpoints
- Monitoring for suspicious enumeration attempts

⏳ **Phase 4: UI Enhancements** (Pending)
- Access level indicators in UI
- Tooltips explaining limited visibility
- Role-based feature gating

### Backward Compatibility

**Deprecated Function**:
```typescript
// Old function - still works but returns all accessible horses
getUserHorses(userId: string): Promise<Horse[]>

// Migration path
// Before:
getUserHorses(user.uid)

// After:
getMyHorses() // For owned horses only
// OR
getAllAccessibleHorses() // For owned + stable horses
```

**API Compatibility**:
- Old API calls without `scope` parameter default to `scope=my`
- Existing frontend code continues to work during migration
- Gradual migration path for all horse listing pages

## Performance Considerations

### Query Optimization

**Firestore Queries**:
```typescript
// Owned horses - Single index: ownerId
db.collection("horses").where("ownerId", "==", userId)

// Stable horses - Single index: currentStableId
db.collection("horses").where("currentStableId", "==", stableId)

// Status filtering - Composite index: ownerId + status
db.collection("horses")
  .where("ownerId", "==", userId)
  .where("status", "==", status)
```

**Projection Overhead**:
- Minimal overhead (<10ms per horse)
- Field projection happens in memory
- No additional database queries

**Caching Strategy**:
- TanStack Query caches projected results
- Cache invalidation on horse updates
- Per-user cache based on access level

### Scalability

**Current Implementation**:
- Suitable for up to 1000 horses per stable
- Projection scales linearly with horse count
- Organization membership lookup cached per request

**Future Optimizations** (if needed):
- Redis cache for organization membership
- GraphQL for client-specified field selection
- Firestore security rules as secondary validation

## Troubleshooting

### Common Issues

**1. User sees no horses despite stable membership**
```
Check:
- User has active organizationMember record
- organizationMember.status === "active"
- stableAccess is "all" or includes specific stable
- Organization ID matches stable's organizationId
```

**2. User sees fewer fields than expected**
```
Check:
- User's organization roles
- Access level determination logic
- Console log: horse._accessLevel in response
- Verify role assignment in organizationMembers
```

**3. Health records not showing for veterinarian**
```
Check:
- User has "veterinarian" in organizationRoles
- healthRecords exist with recordType: "veterinary" or "medication"
- filterHealthRecordsByRole() is being called
```

**4. Owner sees filtered data instead of full access**
```
Check:
- horse.ownerId matches user.uid exactly
- Ownership check happens before role-based logic
- Console log: horse._isOwner should be true
```

### Debugging Tools

**Log Access Context**:
```typescript
const context = await getHorseAccessContext(horseId, userId, systemRole);
console.log("Access Context:", context);
// Should show: accessLevel, isOwner, organizationRoles
```

**Inspect Projected Fields**:
```typescript
const projected = projectHorseFields(horse, accessLevel, context);
console.log("Projected fields:", Object.keys(projected));
console.log("Access metadata:", {
  _accessLevel: projected._accessLevel,
  _isOwner: projected._isOwner
});
```

**Verify Organization Membership**:
```typescript
const orgMemberId = `${userId}_${organizationId}`;
const memberDoc = await db.collection("organizationMembers").doc(orgMemberId).get();
console.log("Membership:", memberDoc.data());
// Check: roles, status, stableAccess, assignedStableIds
```

## Future Enhancements

### Planned Features

1. **Audit Logging** (Phase 3)
   - Log all horse access attempts with role and access level
   - Track field-level access patterns
   - Monitor for suspicious enumeration attempts

2. **Rate Limiting** (Phase 3)
   - Per-user rate limits on horse list endpoints
   - Progressive backoff for repeated 403 errors
   - Abuse pattern detection

3. **UI Indicators** (Phase 4)
   - Badge showing user's access level on horse cards
   - Tooltips explaining why certain fields are hidden
   - Visual distinction between owned and accessible horses

4. **Role-Based Feature Gating** (Phase 4)
   - Hide edit buttons for read-only access
   - Conditional rendering based on access level
   - Smart forms that adapt to available fields

5. **Advanced Permissions** (Future)
   - Custom role definitions per organization
   - Field-level permissions configuration
   - Temporary access grants (time-limited)
   - Permission inheritance and delegation

### Open Questions

1. **"customer" role access level?**
   - Current: basic_care
   - Alternative: professional (since they're paying clients)

2. **Health record provider name visibility?**
   - Current: Veterinarians see only veterinary records
   - Alternative: All professionals see all records but filtered fields?

3. **Cross-organization horses?**
   - If horse is in multiple stables across organizations
   - Should access level be per-organization?

4. **Role hierarchy customization?**
   - Allow organizations to define custom access levels?
   - Maintain platform-wide consistency vs. organization flexibility?

## References

- **Implementation Plan**: See project planning documents
- **API Routes**: `packages/api/src/routes/horses.ts`
- **Authorization**: `packages/api/src/utils/authorization.ts`
- **Field Projection**: `packages/api/src/utils/horseProjection.ts`
- **Frontend Service**: `packages/frontend/src/services/horseService.ts`
- **Type Definitions**: `packages/shared/src/types/domain.ts`
- **Database Schema**: `docs/DATABASE_SCHEMA.md`

---

**Document Version**: 1.0
**Last Updated**: 2024-01-21
**Status**: Implementation Phase 1 Complete, Phase 2 In Progress
