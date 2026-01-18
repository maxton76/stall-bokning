# Database Schema - Firebase Firestore

## 📋 Document Information

| **Attribute** | **Value** |
|--------------|-----------|
| **Version** | 1.0 |
| **Date** | 2025-12-25 |
| **Status** | Draft |
| **Related documents** | [PRD.md](./PRD.md), [TECH_STACK.md](./TECH_STACK.md) |

---

## 🎯 Overview

This document describes the Firestore database structure for the Stable Booking System. Firestore is a NoSQL database that uses collections and documents instead of tables and rows.

### Design Principles
1. **Denormalization**: Duplicate data where it provides better read performance
2. **Subcollections**: Use for 1-to-many relationships
3. **Flat Structure**: Avoid deeply nested structures (max 2-3 levels)
4. **Query Optimization**: Design for most common queries
5. **Real-time Updates**: Leverage Firestore's real-time listeners

---

## 🗂️ Collection Structure

```
📁 users/                           (Top-level collection)
  📄 {userId}                        (Document per user)
    📁 notifications/                (Subcollection)
      📄 {notificationId}
    📁 settings/                     (Subcollection)
      📄 preferences

📁 stables/                         (Top-level collection)
  📄 {stableId}                      (Document per stable)
    📁 members/                      (Subcollection)
      📄 {userId}
    📁 shiftTypes/                   (Subcollection)
      📄 {shiftTypeId}
    📁 schedules/                    (Subcollection)
      📄 {scheduleId}
        📁 shifts/                   (Sub-subcollection)
          📄 {shiftId}
    📁 messages/                     (Subcollection - Admin messages)
      📄 {messageId}

📁 subscriptions/                   (Top-level collection)
  📄 {subscriptionId}                (Document per subscription)

📁 shifts/                          (Top-level collection - Denormalized for queries)
  📄 {shiftId}                       (Document per shift)
    📁 comments/                     (Subcollection)
      📄 {commentId}

📁 analytics/                       (Top-level collection)
  📄 {stableId}                      (Aggregated stats per stable)
    📁 monthly/                      (Subcollection)
      📄 {YYYY-MM}

📁 auditLogs/                       (Top-level collection - GDPR compliance)
  📄 {logId}

📁 vaccinationRules/                (Top-level collection - Multi-scope rules)
  📄 {ruleId}                        (Document per vaccination rule)

📁 vaccinationRecords/              (Top-level collection - Horse vaccination history)
  📄 {recordId}                      (Document per vaccination record)
```

---

## 📊 Collection Details

### 1. `users/` Collection

**Purpose**: Stores all user information (system admins, stable owners, stable guests)

**Document ID**: Firebase Auth UID

**Document Schema**:
```typescript
interface User {
  // Identity
  userId: string;              // Same as document ID (Firebase Auth UID)
  email: string;
  displayName: string;
  phoneNumber?: string;

  // Roles (global level)
  role: 'systemAdmin' | 'stableOwner' | 'guest';

  // Profile
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    bio?: string;
  };

  // Horses (for stable guests)
  horses?: {
    horseId: string;
    name: string;
    breed?: string;
    birthYear?: number;
    imageUrl?: string;
  }[];

  // Stable membership (denormalized for fast lookup)
  stableIds: string[];         // Array of stables user is member of

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  isActive: boolean;
}
```

**Indexes**:
- `email` (ascending)
- `stableIds` (array-contains)
- `role` + `isActive` (composite)

**Security Rules**:
```javascript
match /users/{userId} {
  // Users can read their own document
  allow read: if request.auth.uid == userId;

  // Users can update their own profile (not role or stableIds)
  allow update: if request.auth.uid == userId
                && !request.resource.data.diff(resource.data).affectedKeys()
                  .hasAny(['role', 'stableIds']);

  // Only systemAdmins can create/delete users
  allow create, delete: if hasSystemAdminRole();
}
```

---

### 1.1 `users/{userId}/notifications/` Subcollection

**Purpose**: Notification history per user

**Document Schema**:
```typescript
interface Notification {
  notificationId: string;
  type: 'shiftReminder' | 'shiftAssigned' | 'shiftCancelled' | 'newSchedule'
        | 'adminMessage' | 'monthlyReport' | 'lowPoints' | 'unassignedShift';
  title: string;
  message: string;

  // Metadata
  relatedShiftId?: string;
  relatedStableId?: string;
  relatedScheduleId?: string;

  // Status
  isRead: boolean;
  readAt?: Timestamp;

  // Delivery
  sentVia: ('email' | 'sms' | 'telegram' | 'inApp')[];
  deliveryStatus: {
    email?: 'sent' | 'delivered' | 'failed';
    sms?: 'sent' | 'delivered' | 'failed';
    telegram?: 'sent' | 'delivered' | 'failed';
  };

  createdAt: Timestamp;
}
```

**Indexes**:
- `isRead` + `createdAt` (composite, descending)
- `type` + `createdAt` (composite, descending)

---

### 1.2 `users/{userId}/settings/preferences` Document

**Purpose**: User settings (notifications, language etc.)

**Document Schema**:
```typescript
interface UserPreferences {
  // Notifications per stable
  notificationSettings: {
    [stableId: string]: {
      shiftReminders: {
        enabled: boolean;
        timeBefore: number;        // Minutes before shift
        channels: ('email' | 'sms' | 'telegram' | 'inApp')[];
      };
      adminMessages: {
        enabled: boolean;
        channels: ('email' | 'sms' | 'telegram' | 'inApp')[];
      };
      shiftUpdates: {
        enabled: boolean;
        channels: ('email' | 'sms' | 'telegram' | 'inApp')[];
      };
    };
  };

  // Telegram integration
  telegram?: {
    chatId: string;
    username: string;
    isLinked: boolean;
  };

  // UI preferences
  language: 'sv' | 'en';
  theme: 'light' | 'dark' | 'auto';
  timezone: string;              // e.g., 'Europe/Stockholm'

  updatedAt: Timestamp;
}
```

---

### 2. `stables/` Collection

**Purpose**: Stores all information about stables

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface Stable {
  stableId: string;              // Same as document ID

  // Basic information
  name: string;
  description?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Owner
  ownerId: string;               // User ID for stable owner
  ownerEmail: string;            // Denormalized for fast lookup

  // Membership
  memberCount: number;           // Cached count for performance

  // Configuration
  config: {
    // Points system
    pointsSystem: {
      memoryHorizonDays: number;  // How far back the system remembers
      minimumPointsPerPeriod?: number;
      resetPeriod: 'monthly' | 'rolling';
    };

    // Scheduling
    scheduling: {
      scheduleHorizonDays: number;  // How far ahead schedule is shown
      autoAssignment: boolean;       // Hybrid model on/off
    };

    // Notifications
    notifications: {
      notifyOnUnassignedShift: {
        enabled: boolean;
        hoursBeforeShift: number;
      };
      notifyAllOnCancellation: boolean;
    };

    // Holidays
    includeSwedishHolidays: boolean;
    customHolidays?: {
      date: string;               // YYYY-MM-DD
      name: string;
    }[];
  };

  // Subscription
  subscriptionId?: string;       // Link to subscriptions collection
  subscriptionTier: 'free' | 'premium-s' | 'premium-m' | 'premium-l';

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}
```

**Indexes**:
- `ownerId` + `isActive` (composite)
- `subscriptionTier` (ascending)
- `isActive` + `createdAt` (composite, descending)

**Security Rules**:
```javascript
match /stables/{stableId} {
  // Members can read stable data
  allow read: if isStableMember(stableId);

  // Only stableAdmins can update
  allow update: if hasStableRole(stableId, 'admin')
                || hasStableRole(stableId, 'owner');

  // Only systemAdmins or stableOwners can create
  allow create: if hasSystemAdminRole()
                || request.auth.uid == request.resource.data.ownerId;

  // Only owner or systemAdmin can delete
  allow delete: if hasSystemAdminRole()
                || (get(/databases/$(database)/documents/stables/$(stableId)).data.ownerId == request.auth.uid);
}
```

---

### 2.1 `stables/{stableId}/members/` Subcollection

**Purpose**: Membership and roles per stable

**Document ID**: User ID

**Document Schema**:
```typescript
interface StableMember {
  userId: string;                // Same as document ID
  stableId: string;              // Parent stable ID

  // Denormalized user info (for performance)
  displayName: string;
  email: string;
  avatarUrl?: string;

  // Role in this stable
  role: 'owner' | 'admin' | 'coAdmin' | 'scheduleManager' | 'guest';

  // Status
  status: 'active' | 'vacation' | 'temporaryAbsent' | 'inactive';
  vacationPeriod?: {
    start: Timestamp;
    end: Timestamp;
  };

  // Availability
  availability?: {
    neverAvailable?: {
      dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0=Sunday
      timeSlots: { start: string; end: string }[];  // "HH:MM"
    }[];
    preferredTimes?: {
      dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      timeSlots: { start: string; end: string }[];
    }[];
  };

  // Individual limits (optional)
  limits?: {
    maxShiftsPerWeek?: number;
    minShiftsPerWeek?: number;
    maxShiftsPerMonth?: number;
    minShiftsPerMonth?: number;
  };

  // Statistics (cached for performance)
  stats: {
    totalPoints: number;
    totalShifts: number;
    lastShiftDate?: Timestamp;
    currentPeriodPoints: number;  // Based on memoryHorizonDays
  };

  // Metadata
  joinedAt: Timestamp;
  invitedBy?: string;            // User ID
  inviteAcceptedAt?: Timestamp;
}
```

**Indexes**:
- `role` + `status` (composite)
- `status` + `stats.currentPeriodPoints` (composite)

---

### 2.2 `stables/{stableId}/shiftTypes/` Subcollection

**Purpose**: Definitions of shift types (time + task + points)

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface ShiftType {
  shiftTypeId: string;           // Same as document ID
  stableId: string;              // Parent stable ID

  // Definition
  name: string;                  // e.g., "Morning barn cleaning"
  description?: string;

  // Time
  timeSlot: {
    start: string;               // "HH:MM" (e.g., "06:00")
    end: string;                 // "HH:MM" (e.g., "09:00")
  };

  // Task
  taskType: 'cleaning' | 'feeding' | 'turnout' | 'grooming' | 'other';
  taskName?: string;             // Custom task name

  // Points
  points: number;                // e.g., 4 for heavy shift, 1 for light

  // Schedule
  daysOfWeek: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];  // Which days the shift applies
  isHolidayDifferent: boolean;   // If holidays have different points
  holidayPoints?: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}
```

**Indexes**:
- `isActive` + `timeSlot.start` (composite)
- `taskType` (ascending)

---

### 2.3 `stables/{stableId}/schedules/` Subcollection

**Purpose**: Published schedules for different periods

**Document ID**: Auto-generated Firestore ID or `{YYYY-MM}` for monthly schedules

**Document Schema**:
```typescript
interface Schedule {
  scheduleId: string;            // Same as document ID
  stableId: string;              // Parent stable ID

  // Period
  startDate: Timestamp;          // First day of schedule
  endDate: Timestamp;            // Last day of schedule

  // Type
  type: 'weekly' | 'monthly' | 'custom';
  name: string;                  // e.g., "Week 12 2026", "March 2026"

  // Status
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Timestamp;
  publishedBy?: string;          // User ID

  // AI/System-generated suggestion
  autoGeneratedSuggestion?: {
    generatedAt: Timestamp;
    fairnessScore: number;       // 0-100
    algorithm: string;           // Version of scheduling algorithm
  };

  // Statistics (cached)
  stats: {
    totalShifts: number;
    assignedShifts: number;
    unassignedShifts: number;
    fairnessIndex: number;       // 0-100
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `status` + `startDate` (composite, descending)
- `startDate` + `endDate` (composite)

---

### 2.3.1 `stables/{stableId}/schedules/{scheduleId}/shifts/` Sub-subcollection

**Purpose**: Individual shifts within a schedule

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface Shift {
  shiftId: string;               // Same as document ID
  stableId: string;              // Parent stable ID
  scheduleId: string;            // Parent schedule ID

  // Reference to shift type
  shiftTypeId: string;
  shiftTypeName: string;         // Denormalized for performance

  // Date & time
  date: Timestamp;               // Specific date for this shift
  startTime: string;             // "HH:MM"
  endTime: string;               // "HH:MM"

  // Task
  taskType: string;
  taskName: string;

  // Points
  points: number;

  // Assignment
  assignedTo?: string;           // User ID
  assignedToName?: string;       // Denormalized
  assignedAt?: Timestamp;
  assignedBy?: string;           // User ID (admin or auto)
  assignmentType: 'auto' | 'manual' | 'selfBooked';

  // Status
  status: 'unassigned' | 'assigned' | 'completed' | 'cancelled' | 'missed';
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelledBy?: string;          // User ID
  cancellationReason?: string;

  // Escalation
  isEscalated: boolean;          // If shift is unmanned and approaching
  escalatedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `status` + `date` (composite)
- `assignedTo` + `date` (composite, descending)
- `date` + `status` (composite, ascending)
- `isEscalated` + `date` (composite)

---

### 2.4 `stables/{stableId}/messages/` Subcollection

**Purpose**: Admin messages (bulletin board)

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface AdminMessage {
  messageId: string;             // Same as document ID
  stableId: string;              // Parent stable ID

  // Content
  title: string;
  content: string;               // Markdown-formatted
  attachments?: {
    fileName: string;
    fileUrl: string;             // Firebase Storage URL
    fileSize: number;            // Bytes
  }[];

  // Metadata
  authorId: string;              // Admin user ID
  authorName: string;

  // Publishing
  isPublished: boolean;
  publishedAt?: Timestamp;
  isPinned: boolean;             // Sticky message

  // Notification
  sendNotification: boolean;     // If everyone should be notified
  notifiedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### 3. `subscriptions/` Collection

**Purpose**: Subscriptions and payment information

**Document ID**: Stripe Subscription ID or auto-generated

**Document Schema**:
```typescript
interface Subscription {
  subscriptionId: string;        // Same as document ID

  // Connection
  stableId: string;              // Link to stable
  ownerId: string;               // User ID for paying customer

  // Stripe
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;

  // Plan
  tier: 'free' | 'premium-s' | 'premium-m' | 'premium-l';
  billingInterval: 'month' | 'year';

  // Pricing
  amount: number;                // SEK
  currency: 'SEK';

  // Status
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAt?: Timestamp;
  canceledAt?: Timestamp;

  // Add-ons
  addOns?: {
    smsCredits?: {
      remaining: number;
      lastPurchaseAt: Timestamp;
    };
    telegramEnabled: boolean;
    advancedReports: boolean;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `stableId` (ascending)
- `status` + `currentPeriodEnd` (composite)
- `stripeCustomerId` (ascending)

---

### 4. `shifts/` Collection (Denormalized)

**Purpose**: Global shift collection for faster queries (denormalized copy)

**Document ID**: Same as shift ID from subcollection

**Document Schema**: Same as `Shift` interface above, but includes:
```typescript
interface DenormalizedShift extends Shift {
  // Extra fields for queries
  stableName: string;            // Denormalized
  ownerEmail: string;

  // For advanced queries
  dayOfWeek: number;             // 0-6
  weekNumber: number;            // 1-53
  monthYear: string;             // "YYYY-MM"
}
```

**Indexes**:
- `stableId` + `status` + `date` (composite)
- `assignedTo` + `status` + `date` (composite)
- `monthYear` + `stableId` (composite)

---

### 4.1 `shifts/{shiftId}/comments/` Subcollection

**Purpose**: Comments on shifts

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface ShiftComment {
  commentId: string;             // Same as document ID
  shiftId: string;               // Parent shift ID

  // Author
  authorId: string;              // User ID
  authorName: string;            // Denormalized
  authorAvatarUrl?: string;

  // Content
  text: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isEdited: boolean;
}
```

**Indexes**:
- `createdAt` (ascending)

---

### 5. `analytics/` Collection

**Purpose**: Aggregated statistics per stable (pre-computed for performance)

**Document ID**: Stable ID

**Document Schema**:
```typescript
interface StableAnalytics {
  stableId: string;              // Same as document ID

  // Current period (rolling according to config)
  currentPeriod: {
    startDate: Timestamp;
    endDate: Timestamp;

    // Per stable guest
    memberStats: {
      userId: string;
      displayName: string;
      totalPoints: number;
      totalShifts: number;
      completedShifts: number;
      missedShifts: number;
      cancelledShifts: number;
      averagePointsPerShift: number;
    }[];

    // Aggregated
    totalShifts: number;
    completedShifts: number;
    missedShifts: number;
    unassignedShifts: number;

    // Fairness
    fairnessIndex: number;        // 0-100
    pointsStdDev: number;         // Standard deviation

    // Popularity
    popularShiftTypes: {
      shiftTypeId: string;
      shiftTypeName: string;
      timesAssigned: number;
      averageTimeToBook: number;  // Minutes from publication
    }[];
  };

  // All-time stats
  allTime: {
    totalShiftsCreated: number;
    totalShiftsCompleted: number;
    mostActiveMonth: string;      // "YYYY-MM"
    longestStreak: {
      userId: string;
      displayName: string;
      consecutiveShifts: number;
    };
  };

  lastUpdatedAt: Timestamp;
}
```

---

### 5.1 `analytics/{stableId}/monthly/` Subcollection

**Purpose**: Monthly historical statistics

**Document ID**: `{YYYY-MM}` (e.g., "2026-03")

**Document Schema**:
```typescript
interface MonthlyAnalytics {
  month: string;                 // "YYYY-MM"
  stableId: string;

  // Same structure as currentPeriod above
  memberStats: { /* ... */ }[];
  totalShifts: number;
  completedShifts: number;
  fairnessIndex: number;

  // Extra for historical comparison
  comparedToPreviousMonth: {
    shiftsChange: number;        // Percentage
    fairnessChange: number;
    engagementChange: number;
  };

  generatedAt: Timestamp;
}
```

---

### 6. `auditLogs/` Collection

**Purpose**: Audit trail for GDPR compliance and security

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface AuditLog {
  logId: string;                 // Same as document ID

  // Who
  userId?: string;
  userEmail?: string;
  role?: string;

  // What
  action: 'create' | 'update' | 'delete' | 'read' | 'export' | 'login';
  resource: 'user' | 'stable' | 'shift' | 'schedule' | 'subscription' | 'data';
  resourceId?: string;

  // Details
  details?: {
    [key: string]: any;          // Flexible for different action types
  };

  // Security
  ipAddress?: string;
  userAgent?: string;

  // GDPR
  isDataExport?: boolean;
  isDeletion?: boolean;

  timestamp: Timestamp;
}
```

**Indexes**:
- `userId` + `timestamp` (composite, descending)
- `action` + `timestamp` (composite, descending)
- `resource` + `resourceId` (composite)

**Retention**: 2 years according to GDPR requirements

---

### 7. `vaccinationRules/` Collection

**Purpose**: Multi-scope vaccination rules (system, organization, and user levels)

**Document ID**: Auto-generated Firestore ID (system rules use deterministic IDs: `system-fei`, `system-knhs`)

**Document Schema**:
```typescript
interface VaccinationRule {
  id: string;                  // Same as document ID

  // Scope Identification (EXACTLY ONE will be set)
  scope: 'system' | 'organization' | 'user';
  systemWide?: boolean;        // true for FEI/KNHS system rules
  organizationId?: string;     // set if scope='organization'
  userId?: string;             // set if scope='user'

  // Core Fields
  name: string;                // e.g., "FEI rules", "KNHS rules"
  description?: string;        // Full description of the rule
  periodMonths: number;        // Months between vaccinations
  periodDays: number;          // Additional days beyond months
  daysNotCompeting: number;    // Days horse cannot compete after vaccination

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;           // userId or 'system' for system rules

  // Deprecated (backward compatibility)
  /** @deprecated Use scope and organizationId instead */
  stableId?: string;
}
```

**Scope Types**:

1. **System Rules** (`scope: 'system'`):
   - Standard rules (FEI, KNHS) available to all users
   - Read-only, cannot be edited or deleted
   - Created via seed script with deterministic IDs
   - `systemWide: true` flag set

2. **Organization Rules** (`scope: 'organization'`):
   - Created by organization administrators
   - Visible to all organization members
   - Editable/deletable by organization admins only
   - `organizationId` field set

3. **User Rules** (`scope: 'user'`):
   - Personal rules created by individual users
   - Private to the user (owner only access)
   - Editable/deletable by owner only
   - `userId` field set

**System Rules** (seeded):
- `system-fei`: FEI rules - 6 months 21 days, 7 days not competing
- `system-knhs`: KNHS rules - 12 months 0 days, 7 days not competing

**Indexes**:
```json
[
  {
    "collectionGroup": "vaccinationRules",
    "fields": [
      { "fieldPath": "scope", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "vaccinationRules",
    "fields": [
      { "fieldPath": "organizationId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "vaccinationRules",
    "fields": [
      { "fieldPath": "userId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "vaccinationRules",
    "fields": [
      { "fieldPath": "systemWide", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  }
]
```

**Query Operations**:
```typescript
// Get all system rules (FEI, KNHS)
const systemRules = await getSystemVaccinationRules();

// Get organization rules for a specific organization
const orgRules = await getOrganizationVaccinationRules(organizationId);

// Get user's personal rules
const userRules = await getUserVaccinationRules(userId);

// Get ALL available rules (system + org + user) - Parallel execution
const allRules = await getAllAvailableVaccinationRules(userId, organizationId);
```

**Security Rules**:
```javascript
match /vaccinationRules/{ruleId} {
  function isOrgAdmin(orgId) {
    let membership = get(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + orgId));
    return membership.data.roles.hasAny(['administrator']);
  }

  // LIST: All authenticated users can list
  allow list: if isAuthenticated();

  // GET: Scope-based read permissions
  allow get: if isAuthenticated() && (
    // System rules: everyone can read
    (resource.data.scope == 'system') ||
    // Organization rules: org members can read
    (resource.data.scope == 'organization' &&
     exists(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + resource.data.organizationId))) ||
    // User rules: owner only
    (resource.data.scope == 'user' && resource.data.userId == request.auth.uid)
  );

  // CREATE: Org admins for org rules, users for their own rules
  allow create: if isAuthenticated() && (
    (request.resource.data.scope == 'organization' &&
     isOrgAdmin(request.resource.data.organizationId)) ||
    (request.resource.data.scope == 'user' &&
     request.resource.data.userId == request.auth.uid)
  );

  // UPDATE: Cannot update system rules
  allow update: if isAuthenticated() && resource.data.scope != 'system' && (
    (resource.data.scope == 'organization' && isOrgAdmin(resource.data.organizationId)) ||
    (resource.data.scope == 'user' && resource.data.userId == request.auth.uid)
  );

  // DELETE: Cannot delete system rules
  allow delete: if isAuthenticated() && (
    (resource.data.scope == 'organization' && isOrgAdmin(resource.data.organizationId)) ||
    (resource.data.scope == 'user' && resource.data.userId == request.auth.uid)
  );
}
```

**Migration Notes**:
- Existing stable-scoped rules migrated to organization-scoped
- Mapping: `stableId → stable.ownerId → organization.ownerId → organizationId`
- Deprecated `stableId` field preserved for backward compatibility
- Migration script: `packages/api/src/scripts/migrateVaccinationRules.ts`

---

### 8. `vaccinationRecords/` Collection

**Purpose**: Track vaccination history for horses with automatic status calculation and alerting

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface VaccinationRecord {
  id: string;                  // Same as document ID

  // Organization & Horse linking
  organizationId: string;      // For org-scoped queries and permissions
  horseId: string;             // Links to horses collection
  horseName: string;           // Cached for display

  // Vaccination details
  vaccinationRuleId: string;   // Links to vaccinationRules collection
  vaccinationRuleName: string; // Cached for display
  vaccinationDate: Timestamp;  // When vaccination was administered
  nextDueDate: Timestamp;      // Calculated: vaccinationDate + rule.period

  // Veterinary details (optional)
  veterinarianName?: string;
  vaccineProduct?: string;     // Vaccine brand/product name
  batchNumber?: string;        // Vaccine batch/lot number
  notes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;           // userId who created record
  updatedAt: Timestamp;
  lastModifiedBy: string;
}
```

**Vaccination Status Calculation**:
The system automatically calculates vaccination status based on records and rules:

```typescript
type VaccinationStatus =
  | 'current'         // Up to date
  | 'expiring_soon'   // Due within 30 days
  | 'expired'         // Overdue
  | 'no_rule'         // No vaccination rule assigned
  | 'no_records';     // Rule assigned but no records

// Algorithm:
// 1. No rule assigned → 'no_rule'
// 2. Rule assigned but no records → 'no_records'
// 3. Calculate days until due (nextDueDate - today)
// 4. If daysUntilDue < 0 → 'expired'
// 5. If daysUntilDue <= 30 → 'expiring_soon'
// 6. Otherwise → 'current'
```

**Cached Horse Fields**:
When vaccination records are created/updated/deleted, the following fields on the `horses` collection are automatically updated:

```typescript
interface Horse {
  // ... existing fields ...

  // Vaccination tracking (denormalized for performance)
  lastVaccinationDate?: Timestamp;      // Most recent vaccination
  nextVaccinationDue?: Timestamp;       // When next vaccination is due
  vaccinationStatus?: VaccinationStatus; // Cached status
}
```

**Indexes**:
```json
[
  {
    "collectionGroup": "vaccinationRecords",
    "fields": [
      { "fieldPath": "horseId", "order": "ASCENDING" },
      { "fieldPath": "vaccinationDate", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "vaccinationRecords",
    "fields": [
      { "fieldPath": "organizationId", "order": "ASCENDING" },
      { "fieldPath": "nextDueDate", "order": "ASCENDING" }
    ]
  }
]
```

**Query Operations**:
```typescript
// Get all vaccination records for a horse (sorted by date, most recent first)
const records = await getHorseVaccinationRecords(horseId);

// Get organization-wide vaccination records
const orgRecords = await getOrganizationVaccinationRecords(organizationId);

// Get horses with vaccinations expiring soon (within 30 days)
const expiringSoon = await getExpiringSoon(organizationId, 30);

// Calculate vaccination status for a horse
const status = await getVaccinationStatus(horse);
// Returns: { status: 'current' | 'expiring_soon' | 'expired' | 'no_rule' | 'no_records', message: string, daysUntilDue?: number }

// Update horse's cached vaccination fields after record changes
await updateHorseVaccinationCache(horseId);
```

**Security Rules**:
```javascript
match /vaccinationRecords/{recordId} {
  function hasOrganizationRole(orgId, allowedRoles) {
    let memberDoc = get(/databases/$(database)/documents/organizationMembers/$(request.auth.uid + '_' + orgId));
    return memberDoc.data.roles.hasAny(allowedRoles);
  }

  function isHorseOwner(horseId) {
    let horse = get(/databases/$(database)/documents/horses/$(horseId));
    return horse.data.ownerId == request.auth.uid;
  }

  // READ: Organization members with appropriate roles OR horse owner
  allow read: if isAuthenticated() && (
    hasOrganizationRole(resource.data.organizationId, ['administrator', 'veterinarian', 'customer', 'horse_owner']) ||
    isHorseOwner(resource.data.horseId)
  );

  // CREATE: Organization administrators and veterinarians only
  allow create: if isAuthenticated() &&
    hasOrganizationRole(request.resource.data.organizationId, ['administrator', 'veterinarian']);

  // UPDATE/DELETE: Organization administrators and veterinarians only
  allow update, delete: if isAuthenticated() &&
    hasOrganizationRole(resource.data.organizationId, ['administrator', 'veterinarian']);
}
```

**Business Logic**:
1. **Automatic Cache Updates**: When a vaccination record is created/updated/deleted, the system automatically updates the horse's `lastVaccinationDate`, `nextVaccinationDue`, and `vaccinationStatus` fields
2. **Next Due Date Calculation**: `nextDueDate = vaccinationDate + rule.periodMonths + rule.periodDays`
3. **Status Icons**: UI displays real-time status icons based on vaccination status (green checkmark, yellow warning, red alert)
4. **Expiration Alerts**: Dashboard widget shows horses with vaccinations due soon or overdue
5. **Multi-Role Access**: Administrators and veterinarians can manage records; horse owners and organization members can view

**UI Integration**:
- **Horse Table**: Color-coded status icons in name column (ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion, Info)
- **Horse Form**: Vaccination section with status summary, last vaccination date, next due date, and action buttons
- **Vaccination History**: Modal table showing all records for a horse with edit/delete actions
- **Vaccination Alerts**: Dashboard widget listing horses with upcoming/overdue vaccinations
- **Record Dialog**: Form to create/edit vaccination records with auto-calculated next due date

---

### 9. `routineTemplates/` Collection

**Purpose**: Stores reusable routine flow definitions for organizations (Morgonpass, Dagpass, Kvällspass, etc.)

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface RoutineTemplate {
  id: string;
  organizationId: string;
  stableId?: string;           // Optional: stable-specific template

  // Identity
  name: string;                // e.g., "Morgonpass", "Kvällspass"
  description?: string;
  type: 'morning' | 'midday' | 'evening' | 'custom';
  icon?: string;
  color?: string;              // Hex color for display

  // Timing
  defaultStartTime: string;    // "HH:MM" format
  estimatedDuration: number;   // Minutes

  // Steps (ordered)
  steps: RoutineStep[];

  // Settings
  requiresNotesRead: boolean;  // Must read daily notes before starting
  allowSkipSteps: boolean;
  pointsValue: number;         // For fairness algorithm

  // Audit
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy?: string;
  isActive: boolean;
}

interface RoutineStep {
  id: string;
  order: number;
  name: string;                // "Morgonfodring", "Mockning"
  description?: string;
  category: RoutineCategory;   // 'feeding' | 'medication' | 'blanket' | etc.
  horseContext: 'all' | 'specific' | 'groups' | 'none';
  showFeeding?: boolean;
  showMedication?: boolean;
  showSpecialInstructions?: boolean;
  showBlanketStatus?: boolean;
  requiresConfirmation: boolean;
  allowPartialCompletion: boolean;
  allowPhotoEvidence?: boolean;
  estimatedMinutes?: number;
}

type RoutineCategory =
  | 'preparation' | 'feeding' | 'medication' | 'blanket'
  | 'turnout' | 'bring_in' | 'mucking' | 'water'
  | 'health_check' | 'safety' | 'cleaning' | 'other';
```

**Indexes**:
- `organizationId` + `isActive` + `name` (composite)
- `organizationId` + `type` (composite)
- `stableId` + `isActive` (composite)

**Security Rules**:
- LIST/GET: Organization members can view
- CREATE/UPDATE/DELETE: Organization administrators only

---

### 10. `routineInstances/` Collection

**Purpose**: Materialized routine execution for a specific date and assignment

**Document ID**: Auto-generated Firestore ID

**Document Schema**:
```typescript
interface RoutineInstance {
  id: string;
  templateId: string;
  templateName: string;        // Denormalized
  organizationId: string;
  stableId: string;
  stableName?: string;

  // Scheduling
  scheduledDate: Timestamp;
  scheduledStartTime: string;  // "HH:MM"
  estimatedDuration: number;

  // Assignment
  assignedTo?: string;
  assignedToName?: string;
  assignmentType: 'auto' | 'manual' | 'selfBooked';

  // Status
  status: 'scheduled' | 'started' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string;

  // Progress
  currentStepId?: string;
  currentStepOrder?: number;
  progress: RoutineProgress;

  // Fairness
  pointsValue: number;
  pointsAwarded?: number;

  // Daily notes
  dailyNotesAcknowledged: boolean;
  dailyNotesAcknowledgedAt?: Timestamp;

  // Metadata
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

interface RoutineProgress {
  stepsCompleted: number;
  stepsTotal: number;
  percentComplete: number;
  stepProgress: Record<string, StepProgress>;
}

interface StepProgress {
  stepId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  horseProgress?: Record<string, HorseStepProgress>;
}

interface HorseStepProgress {
  horseId: string;
  horseName: string;
  completed: boolean;
  skipped: boolean;
  skipReason?: string;
  notes?: string;
  photoUrls?: string[];
  feedingConfirmed?: boolean;
  medicationGiven?: boolean;
  medicationSkipped?: boolean;  // Triggers alert
  blanketAction?: 'on' | 'off' | 'unchanged';
}
```

**Indexes**:
- `stableId` + `scheduledDate` (composite, descending)
- `stableId` + `status` (composite)
- `assignedTo` + `scheduledDate` (composite)
- `templateId` + `scheduledDate` (composite)

**Security Rules**:
- LIST/GET: Stable members can view
- CREATE: Stable managers only
- UPDATE: Members can update progress fields; managers full control
- DELETE: Stable managers only

---

### 11. `dailyNotes/` Collection

**Purpose**: Daily notes and alerts for stable communication during routine execution

**Document ID**: `{stableId}_{YYYY-MM-DD}` (e.g., "abc123_2026-01-18")

**Document Schema**:
```typescript
interface DailyNotes {
  id: string;                  // Same as document ID
  organizationId: string;
  stableId: string;
  date: string;                // "YYYY-MM-DD"

  // General notes
  generalNotes?: string;
  weatherNotes?: string;

  // Horse-specific notes
  horseNotes: HorseDailyNote[];

  // Priority alerts
  alerts: DailyAlert[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUpdatedBy: string;
  lastUpdatedByName?: string;
}

interface HorseDailyNote {
  id: string;
  horseId: string;
  horseName: string;           // Denormalized
  note: string;
  priority: 'info' | 'warning' | 'critical';
  category?: 'medication' | 'health' | 'feeding' | 'blanket' | 'behavior' | 'other';
  createdAt: Timestamp;
  createdBy: string;
}

interface DailyAlert {
  id: string;
  title: string;
  message: string;
  priority: 'info' | 'warning' | 'critical';
  affectedHorseIds?: string[];
  affectedHorseNames?: string[];
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}
```

**Indexes**:
- `stableId` + `date` (composite, descending)
- Document ID format enables efficient single-document lookups

**Security Rules**:
- LIST/GET: Stable members can view
- CREATE/UPDATE: Any stable member can add notes
- DELETE: Stable managers only

**Usage Pattern**:
1. Before starting a routine, user must acknowledge daily notes
2. Notes can be updated throughout the day by any stable member
3. Critical alerts are shown prominently in routine flow UI
4. Horse-specific notes appear in the relevant step context

---

## 🔐 Security Rules (Examples)

### Helper Functions
```javascript
function isAuthenticated() {
  return request.auth != null;
}

function hasSystemAdminRole() {
  return isAuthenticated() &&
         request.auth.token.role == 'systemAdmin';
}

function isStableMember(stableId) {
  return isAuthenticated() &&
         request.auth.uid in get(/databases/$(database)/documents/stables/$(stableId)/members).data;
}

function hasStableRole(stableId, role) {
  return isAuthenticated() &&
         get(/databases/$(database)/documents/stables/$(stableId)/members/$(request.auth.uid)).data.role == role;
}

function isStableAdmin(stableId) {
  return hasStableRole(stableId, 'owner') ||
         hasStableRole(stableId, 'admin');
}
```

### Complete Rules Example
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId
                    && !request.resource.data.diff(resource.data).affectedKeys()
                      .hasAny(['role', 'stableIds']);
      allow create, delete: if hasSystemAdminRole();

      // Notifications subcollection
      match /notifications/{notificationId} {
        allow read, write: if request.auth.uid == userId;
      }

      // Settings subcollection
      match /settings/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Stables collection
    match /stables/{stableId} {
      allow read: if isStableMember(stableId);
      allow update: if isStableAdmin(stableId);
      allow create: if hasSystemAdminRole() ||
                    request.auth.uid == request.resource.data.ownerId;
      allow delete: if hasSystemAdminRole() ||
                    resource.data.ownerId == request.auth.uid;

      // Members subcollection
      match /members/{userId} {
        allow read: if isStableMember(stableId);
        allow write: if isStableAdmin(stableId);
      }

      // ShiftTypes subcollection
      match /shiftTypes/{shiftTypeId} {
        allow read: if isStableMember(stableId);
        allow write: if isStableAdmin(stableId) ||
                     hasStableRole(stableId, 'scheduleManager');
      }

      // Schedules and shifts
      match /schedules/{scheduleId} {
        allow read: if isStableMember(stableId);
        allow write: if isStableAdmin(stableId) ||
                     hasStableRole(stableId, 'scheduleManager');

        match /shifts/{shiftId} {
          allow read: if isStableMember(stableId);
          allow create, update: if isStableAdmin(stableId) ||
                                 hasStableRole(stableId, 'scheduleManager') ||
                                 (request.resource.data.assignedTo == request.auth.uid);
          allow delete: if isStableAdmin(stableId);
        }
      }

      // Admin messages
      match /messages/{messageId} {
        allow read: if isStableMember(stableId);
        allow write: if isStableAdmin(stableId);
      }
    }

    // Shifts (denormalized)
    match /shifts/{shiftId} {
      allow read: if isStableMember(resource.data.stableId);
      allow write: if isStableAdmin(resource.data.stableId) ||
                   request.resource.data.assignedTo == request.auth.uid;

      match /comments/{commentId} {
        allow read: if isStableMember(get(/databases/$(database)/documents/shifts/$(shiftId)).data.stableId);
        allow create: if isAuthenticated() &&
                      isStableMember(get(/databases/$(database)/documents/shifts/$(shiftId)).data.stableId);
        allow update, delete: if request.auth.uid == resource.data.authorId;
      }
    }

    // Subscriptions
    match /subscriptions/{subscriptionId} {
      allow read: if isAuthenticated() &&
                  (request.auth.uid == resource.data.ownerId || hasSystemAdminRole());
      allow write: if hasSystemAdminRole();
    }

    // Analytics
    match /analytics/{stableId} {
      allow read: if isStableMember(stableId);
      allow write: if false;  // Only backend can write

      match /monthly/{monthId} {
        allow read: if isStableMember(stableId);
        allow write: if false;
      }
    }

    // Audit logs
    match /auditLogs/{logId} {
      allow read: if hasSystemAdminRole();
      allow write: if false;  // Only backend can write
    }
  }
}
```

---

## 📈 Query Examples

### Frontend Queries

#### Get user's upcoming shifts
```typescript
const q = query(
  collection(db, 'shifts'),
  where('assignedTo', '==', userId),
  where('date', '>=', Timestamp.now()),
  where('status', '==', 'assigned'),
  orderBy('date', 'asc'),
  limit(10)
);

const shifts = await getDocs(q);
```

#### Get stable members with stats
```typescript
const membersRef = collection(db, `stables/${stableId}/members`);
const q = query(
  membersRef,
  where('status', '==', 'active'),
  orderBy('stats.currentPeriodPoints', 'desc')
);

const members = await getDocs(q);
```

#### Real-time schedule listener
```typescript
const scheduleRef = doc(db, `stables/${stableId}/schedules/${scheduleId}`);
const shiftsRef = collection(scheduleRef, 'shifts');

const unsubscribe = onSnapshot(
  query(shiftsRef, orderBy('date', 'asc')),
  (snapshot) => {
    const shifts = snapshot.docs.map(doc => doc.data());
    updateUI(shifts);
  }
);
```

### Backend Queries (Cloud Functions)

#### Find unassigned shifts approaching
```typescript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const q = query(
  collection(db, 'shifts'),
  where('status', '==', 'unassigned'),
  where('date', '<=', Timestamp.fromDate(tomorrow)),
  where('isEscalated', '==', false)
);

const unassignedShifts = await getDocs(q);
```

#### Calculate fairness index
```typescript
const membersRef = collection(db, `stables/${stableId}/members`);
const membersSnapshot = await getDocs(
  query(membersRef, where('status', '==', 'active'))
);

const points = membersSnapshot.docs.map(
  doc => doc.data().stats.currentPeriodPoints
);

const mean = points.reduce((a, b) => a + b, 0) / points.length;
const variance = points.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / points.length;
const stdDev = Math.sqrt(variance);
const fairnessIndex = Math.max(0, 100 - (stdDev / mean) * 100);
```

---

## 🔄 Data Migration Strategy

### Phase 1: Initial Setup
1. Create Firebase development project (`stall-bokning-dev`)
2. Deploy initial Firestore Security Rules
3. Create composite indexes via `firestore.indexes.json`
4. Seed test data for development
5. Setup Firebase Emulators for local development
**Note**: Staging/production projects will be created later as needed

### Phase 2: Data Import (if migrating)
1. Export data from old system
2. Transform to Firestore schema
3. Batch write to Firestore (max 500 operations per batch)
4. Validate data integrity

### Phase 3: Ongoing Maintenance
1. Monitor index usage (Firebase Console)
2. Optimize based on query patterns
3. Archive old data (move to Cloud Storage)
4. Regular backups (daily exports to GCS)

---

## 💾 Backup & Recovery

### Automated Backups
```bash
# Daily export to Cloud Storage
gcloud firestore export gs://stall-bokning-backups/$(date +%Y-%m-%d)

# Retention: 30 days
```

### Point-in-Time Recovery
- Firestore supports PITR for up to 7 days
- Use daily exports for longer-term recovery

---

## 📊 Performance Optimization

### Indexing Strategy
1. **Single-field indexes**: Automatically created by Firestore
2. **Composite indexes**: Defined in `firestore.indexes.json`
3. **Array-contains queries**: Automatically indexed
4. **Monitor**: Firebase Console → Firestore → Indexes

### Denormalization
- Duplicate frequently accessed data for faster reads
- Examples: `displayName`, `avatarUrl`, `shiftTypeName` in multiple collections
- Trade-off: More storage, faster queries

### Caching
- Firestore SDK caches automatically
- Client-side: TanStack Query for additional caching layer
- Offline support: Firestore persistence enabled

---

**Version History**:
| **Version** | **Date** | **Changes** | **Author** |
|-------------|-----------|---------------|----------------|
| 1.0 | 2025-12-25 | Initial Firestore schema design | Data Team |

---

*Related documents: [PRD.md](./PRD.md) | [TECH_STACK.md](./TECH_STACK.md)*
