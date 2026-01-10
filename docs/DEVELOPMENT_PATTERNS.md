# Development Patterns & Best Practices

## 🎯 Code Organization Principles

### 1. CRUD Factory Pattern (MANDATORY for Firestore services)

**When to use**: All Firestore data access operations

**Example**:
```typescript
// ✅ GOOD - Use CRUD factory
import { createCrudService } from './firestoreCrud'

const horseCrud = createCrudService<Horse>({
  collectionName: 'horses',
  timestampsEnabled: true,
  parentField: { field: 'stableId', required: true }
})

export async function getHorsesByStable(stableId: string) {
  return horseCrud.getByParent(stableId)
}

// ❌ BAD - Manual Firestore operations
export async function getHorsesByStable(stableId: string) {
  const q = query(collection(db, 'horses'), where('stableId', '==', stableId))
  const snapshot = await getDocs(q)
  return mapDocsToObjects(snapshot)
}
```

**Factory Configuration Options**:
```typescript
interface CrudFactoryOptions<T> {
  collectionName: string                    // Required
  timestampsEnabled?: boolean               // Default: true
  parentField?: {                           // For hierarchical data
    field: string
    required: boolean
  }
  subcollection?: {                         // For nested collections
    parentCollection: string
    pathSegments: string[]
  }
  compositeKey?: {                          // For compound IDs
    fields: string[]
    separator?: string                      // Default: '_'
  }
  sanitizeFn?: (data: Partial<T>) => Partial<T>  // Pre-save transforms
  writeOnly?: boolean                       // For audit logs
}
```

**Pattern Selection Guide**:
- **Simple collection**: `{ collectionName: 'horses' }`
- **Parent-child**: Use `parentField` (e.g., horses → stableId)
- **Nested subcollection**: Use `subcollection` (e.g., horses/{id}/locationHistory)
- **Composite keys**: Use `compositeKey` (e.g., organizationMembers: userId_organizationId)

---

### 2. TanStack Query Integration (MANDATORY for components)

**When to use**: All React components fetching data

**Example**:
```typescript
// ✅ GOOD - TanStack Query hooks
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import { queryKeys } from '@/lib/queryClient'

function HorseList({ stableId }: Props) {
  const { data: horses = [], isLoading } = useFirestoreQuery(
    queryKeys.horses.list({ stableId }),
    horseCrud,
    [where('stableId', '==', stableId), orderBy('name')]
  )

  if (isLoading) return <Spinner />
  return <HorseTable horses={horses} />
}

// ❌ BAD - Manual state management
function HorseList({ stableId }: Props) {
  const [horses, setHorses] = useState<Horse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHorsesByStable(stableId).then(setHorses).finally(() => setLoading(false))
  }, [stableId])

  if (loading) return <Spinner />
  return <HorseTable horses={horses} />
}
```

**Available Hooks**:
- `useFirestoreQuery` - List queries with caching
- `useFirestoreDoc` - Single document with caching
- `useFirestoreByParent` - Parent-child queries
- `useFirestoreCreate` - Create with optimistic updates
- `useFirestoreUpdate` - Update with cache invalidation
- `useFirestoreDelete` - Delete with cache cleanup

**Query Key Strategy**:
```typescript
// Always use queryKeys factory for consistency
queryKeys.horses.all           // ['horses']
queryKeys.horses.list(filters) // ['horses', 'list', { stableId: '...' }]
queryKeys.horses.detail(id)    // ['horses', 'detail', 'horse123']
```

---

### 3. Shared Package Structure

**Organization**:
```
packages/shared/src/
├── types/                 # TypeScript types (domain, organization, contact, etc.)
├── utils/                 # Shared utilities (name, date, firestore helpers)
├── constants/             # Shared constants (colors, activity types)
├── schemas/               # Zod validation schemas (future)
└── index.ts               # Barrel exports
```

**Import Conventions**:
```typescript
// ✅ GOOD - Use @shared alias
import type { Horse, HorseGroup } from '@shared/types/domain'
import { formatHorseName } from '@shared/utils/name'
import { HORSE_COLORS } from '@shared/constants/horse'

// ❌ BAD - Relative paths or local duplicates
import type { Horse } from '../../../shared/src/types/domain'
import { formatHorseName } from '@/lib/nameUtils'  // If duplicated
```

**When to add to shared**:
- ✅ Types used by both frontend AND backend
- ✅ Constants referenced in multiple packages
- ✅ Pure utility functions without framework dependencies
- ❌ Component-specific logic (stays in frontend)
- ❌ API route handlers (stays in backend)

---

### 4. Service Layer Organization

**File Structure**:
```typescript
// packages/frontend/src/services/horseService.ts

// 1. Imports
import { where, orderBy } from 'firebase/firestore'
import type { Horse } from '@shared/types/domain'
import { createCrudService } from './firestoreCrud'

// 2. CRUD Service (using Factory)
const horseCrud = createCrudService<Horse>({
  collectionName: 'horses',
  timestampsEnabled: true,
  parentField: { field: 'stableId', required: true }
})

// 3. Type Guards & Helpers (optional)
export function isActiveHorse(horse: Horse): boolean {
  return horse.status === 'active'
}

// 4. Query Operations
export async function getHorsesByStable(stableId: string) {
  return horseCrud.getByParent(stableId)
}

export async function getActiveHorses(stableId: string) {
  return horseCrud.query([
    where('stableId', '==', stableId),
    where('status', '==', 'active'),
    orderBy('name')
  ])
}

// 5. Business Logic (beyond CRUD)
export async function assignHorseToGroup(
  horseId: string,
  groupId: string,
  userId: string
): Promise<void> {
  // Complex business logic here
  await horseCrud.update(horseId, userId, { horseGroupId: groupId })
  // Additional side effects
}
```

**Naming Conventions**:
- Services: `{entity}Service.ts` (e.g., `horseService.ts`)
- CRUD instance: `{entity}Crud` (e.g., `horseCrud`)
- Functions: Verb + noun (e.g., `getHorsesByStable`, `createHorse`)

---

### 5. Component Patterns

**Naming Conventions**:
```
components/
├── horses/                    # Feature-based grouping
│   ├── HorseTable.tsx        # PascalCase for components
│   ├── HorseFilterBar.tsx
│   └── HorseCard.tsx
├── shared/                    # Reusable components
│   ├── DataTable.tsx
│   └── FormDialog.tsx
└── ui/                        # shadcn/ui components
    ├── button.tsx             # lowercase for primitives
    └── dialog.tsx
```

**Component Structure**:
```typescript
// 1. Imports (grouped)
import { useState } from 'react'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import type { Horse } from '@shared/types/domain'
import { Button } from '@/components/ui/button'

// 2. Types
interface HorseTableProps {
  stableId: string
  onSelect?: (horse: Horse) => void
}

// 3. Component
export function HorseTable({ stableId, onSelect }: HorseTableProps) {
  // Hooks first
  const { data: horses = [] } = useFirestoreQuery(...)
  const [selectedId, setSelectedId] = useState<string>()

  // Event handlers
  const handleSelect = (horse: Horse) => {
    setSelectedId(horse.id)
    onSelect?.(horse)
  }

  // Render
  return (...)
}
```

---

### 6. Type Safety Best Practices

**TypeScript Strictness**:
```json
// tsconfig.json (already configured)
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Timestamp Handling**:
```typescript
// ✅ GOOD - Use client SDK for frontend types
import type { Timestamp } from 'firebase/firestore'

// ✅ GOOD - Use admin SDK for backend types
import type { Timestamp } from 'firebase-admin/firestore'

// ⚠️ SHARED PACKAGE - Use client SDK (frontend compatibility)
import type { Timestamp } from 'firebase/firestore'
```

**Null Safety**:
```typescript
// ✅ GOOD - Explicit null handling
const horse = await horseCrud.getById(id)
if (!horse) {
  throw new Error('Horse not found')
}
return horse.name

// ❌ BAD - Unsafe access
const horse = await horseCrud.getById(id)
return horse!.name  // Non-null assertion
```

---

## 📋 Checklist for New Features

### Before Writing Code:
- [ ] Check if similar pattern exists (`grep -r "similar_function" packages/`)
- [ ] Identify if it needs shared types/utils
- [ ] Review DEVELOPMENT_PATTERNS.md for applicable patterns

### Creating a New Service:
- [ ] Use `createCrudService` factory (not manual Firestore)
- [ ] Add to `queryKeys` in `lib/queryClient.ts`
- [ ] Export types from `@shared/types` if needed
- [ ] Follow naming convention: `{entity}Service.ts`

### Creating a New Component:
- [ ] Use TanStack Query hooks (not useState + useEffect)
- [ ] Reuse existing UI components from `components/ui/`
- [ ] Follow feature-based folder organization
- [ ] Add proper TypeScript types for props

### Adding to Shared Package:
- [ ] Check if used by BOTH frontend AND backend
- [ ] Use client SDK Timestamp for type compatibility
- [ ] Export from appropriate barrel file
- [ ] Run `npm run build` in shared package

### Before Committing:
- [ ] Run `npm run lint` (fix all errors)
- [ ] Run `npm run build` (TypeScript compilation)
- [ ] Check bundle size impact (if frontend changes)
- [ ] Update CLAUDE.md if new conventions added

---

## 🚫 Anti-Patterns to Avoid

### 1. Manual Firestore Operations
```typescript
// ❌ NEVER DO THIS
const horsesRef = collection(db, 'horses')
const q = query(horsesRef, where('stableId', '==', stableId))
const snapshot = await getDocs(q)
const horses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

// ✅ DO THIS INSTEAD
const horses = await horseCrud.getByParent(stableId)
```

### 2. Duplicate Type Definitions
```typescript
// ❌ NEVER DO THIS
// frontend/src/types/horse.ts
export interface Horse { ... }

// backend/src/types/horse.ts
export interface Horse { ... }  // DUPLICATE!

// ✅ DO THIS INSTEAD
// shared/src/types/domain.ts
export interface Horse { ... }
```

### 3. Manual Loading States
```typescript
// ❌ AVOID THIS
const [data, setData] = useState()
const [loading, setLoading] = useState(true)
const [error, setError] = useState()

useEffect(() => {
  setLoading(true)
  fetchData()
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false))
}, [dependency])

// ✅ DO THIS INSTEAD
const { data, isLoading, error } = useFirestoreQuery(...)
```

### 4. Hardcoded Values
```typescript
// ❌ NEVER DO THIS
const colors = ['#ef4444', '#f97316', ...] // Hardcoded in component

// ✅ DO THIS INSTEAD
import { DEFAULT_COLORS } from '@shared/constants/activity'
```

---

## 🔄 Migration Guide for Existing Code

### Step 1: Identify Pattern
- **Manual Firestore code?** → Use CRUD factory
- **useState + useEffect for data?** → Use TanStack Query
- **Duplicate types?** → Move to @shared/types
- **Duplicate utilities?** → Move to @shared/utils

### Step 2: Refactor
```typescript
// BEFORE
const [horses, setHorses] = useState<Horse[]>([])
useEffect(() => {
  const q = query(collection(db, 'horses'), where('stableId', '==', stableId))
  getDocs(q).then(snapshot => {
    setHorses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
  })
}, [stableId])

// AFTER
const horseCrud = createCrudService<Horse>({ collectionName: 'horses' })
const { data: horses = [] } = useFirestoreQuery(
  queryKeys.horses.list({ stableId }),
  horseCrud,
  [where('stableId', '==', stableId)]
)
```

### Step 3: Test
- Verify functionality unchanged
- Check TypeScript compilation
- Test in dev environment
- Review bundle size impact (frontend only)

---

## 📚 Additional Resources

- **CRUD Factory**: `packages/frontend/src/services/firestoreCrud.ts`
- **Query Hooks**: `packages/frontend/src/hooks/useFirestoreQuery.ts`
- **Query Keys**: `packages/frontend/src/lib/queryClient.ts`
- **Shared Types**: `packages/shared/src/types/`
- **Examples**: `contactService.ts`, `organizationMemberService.ts`, `locationHistoryService.ts`

---

## ✅ Code Review Checklist

**For Reviewers**:
- [ ] CRUD factory used for all Firestore operations?
- [ ] TanStack Query used for data fetching?
- [ ] Types imported from @shared when applicable?
- [ ] No duplicate code across packages?
- [ ] Follows naming conventions?
- [ ] TypeScript strict mode compliant?
- [ ] No manual loading/error state management?

**For Authors**:
- [ ] Read DEVELOPMENT_PATTERNS.md before implementing
- [ ] Searched for existing similar patterns
- [ ] Added JSDoc comments for exported functions
- [ ] Updated CLAUDE.md if introducing new patterns
- [ ] Ran linter and TypeScript compilation
- [ ] Tested in local dev environment

---

**Last Updated**: 2026-01-10
**Contributors**: Refactoring Team (Track 1-3 implementation)
