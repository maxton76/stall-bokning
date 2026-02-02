# PRD: Global Search / Command Palette

## Document Information

| Attribute       | Value                          |
|----------------|--------------------------------|
| Version        | 1.0                            |
| Date           | 2026-02-01                     |
| Status         | Draft                          |
| Author         | Product Team                   |
| Last Updated   | 2026-02-01                     |
| Related        | [PRD.md](./PRD.md), [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## Executive Summary

A global search and command palette (Cmd+K / Ctrl+K) that provides fast keyboard-driven navigation, entity search, and quick actions across the entire EquiDuty application. Inspired by command palettes in Stripe Dashboard, Linear, and Superhuman.

**Goal**: Let any user reach any page, find any horse/person/schedule, or trigger any action in under 3 keystrokes after opening the palette.

**Existing infrastructure**: `cmdk` v1.1.1 is already installed, shadcn/ui `Command` components are fully implemented, and the header already contains a search input placeholder (`AuthenticatedLayout.tsx:309-320`) with a `TODO: Open search dialog` comment.

---

## Problem Statement

### Current State

- The application has 30+ pages across 9 navigation sections, plus organization admin pages
- Users must navigate multi-level sidebar menus to reach destinations
- No way to search for entities (horses, members, schedules) from a central place
- The search input in the header is non-functional (placeholder only)
- Power users have no keyboard-driven workflow

### Impact

- Stable owners managing 15+ horses and boarders waste time navigating deep menu structures
- New users struggle to discover features buried in sub-navigation
- No quick way to jump to a specific horse profile, member, or schedule entry

---

## User Stories

### All Authenticated Users

| # | Story | Priority |
|---|-------|----------|
| US-1 | As a user, I want to press Cmd+K (or Ctrl+K) to open the command palette from anywhere in the app | P0 |
| US-2 | As a user, I want to type a page name and press Enter to navigate there instantly | P0 |
| US-3 | As a user, I want to see recently visited pages in the palette when I haven't typed anything | P1 |
| US-4 | As a user, I want to search for a horse by name and jump to its profile | P0 |
| US-5 | As a user, I want to search for a member by name and jump to their profile | P1 |
| US-6 | As a user, I want the palette to respect my language setting (sv/en) | P0 |
| US-7 | As a user, I want to see keyboard hints in the footer of the palette (Esc, arrows, Enter) | P1 |

### Stable Owner / Administrator

| # | Story | Priority |
|---|-------|----------|
| US-8 | As a stable owner, I want to type "add horse" and be taken to the create horse form | P1 |
| US-9 | As a stable owner, I want to quickly navigate to organization settings pages | P1 |
| US-10 | As a stable owner, I want to search across all horses in my organization | P0 |
| US-11 | As a stable owner, I want quick actions like "Create schedule" or "Invite member" | P2 |

### Boarder / Groom

| # | Story | Priority |
|---|-------|----------|
| US-12 | As a boarder, I want to quickly find my horse's profile | P0 |
| US-13 | As a boarder, I want to navigate to today's activities or feeding schedule in one step | P1 |

### System Admin

| # | Story | Priority |
|---|-------|----------|
| US-14 | As a system admin, I want the palette to include admin-specific pages (organizations list, system settings) | P2 |

---

## Phased Implementation

### Phase 1: Navigation Commands (MVP)

**Scope**: Static page navigation via command palette. No backend changes.

**Features**:
1. **Keyboard activation**: Cmd+K / Ctrl+K opens the palette; Esc closes it
2. **Click activation**: Clicking the existing header search input opens the palette
3. **Page navigation**: All sidebar navigation items are searchable commands
   - Main navigation (Overview, Horses, Activities, Facilities, Feeding, Schedule, Lessons, My Page, Settings)
   - Sub-navigation items (e.g., "Schedule > Week View", "Feeding > Today")
   - Organization admin pages (Members, Permissions, Subscription, etc.)
4. **Fuzzy matching**: Typing "sch" matches "Schema" (sv) and "Schedule" (en)
5. **Grouped results**: Commands grouped by section (Navigation, Organization)
6. **i18n**: All commands searchable in both Swedish and English, displayed in active language
7. **Recently visited**: Show last 5 visited pages when query is empty
8. **Keyboard footer**: Show Esc/arrow/Enter hints

**Data source**: `navigation.ts` config + `createOrganizationNavigation()` output. Purely client-side.

**Command registry structure**:
```typescript
interface CommandItem {
  id: string;
  label: string;           // Translated display label
  searchTerms: string[];   // All searchable terms (sv + en + aliases)
  icon: LucideIcon;
  group: string;           // "navigation" | "organization" | "recent"
  action: () => void;      // Typically navigate(href)
  keywords?: string[];     // Additional search aliases
  roles?: string[];        // Role-based visibility
  moduleFlag?: string;     // Subscription feature gate
}
```

**Integration point**: Replace the static `<Input>` in `AuthenticatedLayout.tsx:309-320` with a trigger that opens `CommandDialog`.

**Acceptance criteria**:
- Palette opens in <100ms after keystroke
- All navigation items are reachable
- Fuzzy search works for partial matches
- Module-gated items (e.g., Lessons) are hidden when module is disabled
- Works on both desktop and mobile (mobile: tap search input)

---

### Phase 2: Entity Search

**Scope**: Search for horses, members, and schedules. Requires lightweight API support.

**Features**:
1. **Horse search**: Type a horse name → see matching horses → navigate to horse profile
   - Display: Horse name, breed (if available), owner name
   - Source: Firestore query on `horses` collection (name prefix match)
2. **Member search**: Type a person's name → see matching members → navigate to member profile
   - Display: Full name, email, role badge
   - Source: Firestore query on `users` collection within organization
3. **Schedule entry search**: Type date or activity name → navigate to schedule view
   - Display: Activity name, date, time
   - Source: Firestore query on activities/schedule collections
4. **Mixed results**: When query could match multiple entity types, show grouped results:
   - "Pages" group (navigation commands)
   - "Horses" group (entity results)
   - "Members" group (entity results)
5. **Debounced search**: 250ms debounce on entity queries to avoid excessive Firestore reads
6. **Result limits**: Max 5 results per group to keep the palette fast and scannable

**API approach**:
- Option A (preferred for Phase 2): Client-side Firestore queries using existing SDK
  - `horses` collection: `where('organizationId', '==', orgId)` + client-side name filtering
  - `users` collection: Similar pattern
  - Leverage Firestore offline cache for repeat queries
- Option B (future): Dedicated search API endpoint if dataset grows beyond Firestore query efficiency

**Acceptance criteria**:
- Entity results appear within 500ms of typing
- Results are scoped to the user's current organization
- RBAC is respected (users only see horses/members they have access to)
- Empty state shows helpful message ("No horses matching 'xyz'")

---

### Phase 3: Quick Actions & Advanced Features

**Scope**: Contextual actions, smart suggestions, and keyboard-first workflows.

**Features**:
1. **Quick actions**: Commands that trigger forms or workflows
   - "Create horse" → Navigate to horse creation form
   - "Invite member" → Open invite member dialog
   - "Create schedule" → Navigate to schedule creation
   - "Go to settings" → Navigate to settings
   - "Switch organization" → Open organization switcher
2. **Contextual awareness**: Palette suggests relevant commands based on current page
   - On horse profile → "Edit horse", "View health records", "View feeding schedule"
   - On schedule view → "Create new schedule", "Export schedule"
3. **Command prefix syntax** (power users):
   - `> ` prefix: Filter to actions only
   - `@ ` prefix: Filter to members only
   - `# ` prefix: Filter to horses only
4. **Keyboard shortcuts display**: Show global shortcuts in the palette
   - e.g., "Go to Overview" shows `Cmd+Shift+O` hint
5. **Search analytics**: Track which commands are used most frequently to inform UX improvements

**Acceptance criteria**:
- Actions execute without additional navigation where possible (e.g., dialogs open in-place)
- Prefix syntax is optional; regular search still works
- Most-used commands float to top over time (per user)

---

## UX Design

### Visual Design

The palette follows the existing shadcn/ui `CommandDialog` patterns already in the codebase (`dialog-search.tsx`). Key design decisions:

```
┌──────────────────────────────────────────┐
│ 🔍  Search or type a command...     ⌘K  │
├──────────────────────────────────────────┤
│                                          │
│ RECENT                                   │
│   🏠  Overview                           │
│   🐴  Horses > My Horses                │
│   📅  Schedule > Week View               │
│                                          │
│ NAVIGATION                               │
│   🏠  Overview                           │
│   🐴  Horses                             │
│   📋  Activities > Today's Work          │
│   🏪  Facilities > Stables              │
│   🌾  Feeding > Today                    │
│   📅  Schedule > Week View               │
│   ...                                    │
│                                          │
├──────────────────────────────────────────┤
│ esc Close   ↑↓ Navigate   ↵ Select      │
└──────────────────────────────────────────┘
```

**With entity search (Phase 2)**:

```
┌──────────────────────────────────────────┐
│ 🔍  "stor"                          ⌘K  │
├──────────────────────────────────────────┤
│                                          │
│ PAGES                                    │
│   (no matching pages)                    │
│                                          │
│ HORSES                                   │
│   🐴  Stormwind        │ Anna S.        │
│   🐴  Stormare         │ Erik L.        │
│                                          │
│ MEMBERS                                  │
│   👤  Storbjörk, Lisa  │ Groom          │
│                                          │
├──────────────────────────────────────────┤
│ esc Close   ↑↓ Navigate   ↵ Select      │
└──────────────────────────────────────────┘
```

### Interaction Patterns

| Trigger | Behavior |
|---------|----------|
| `Cmd+K` / `Ctrl+K` | Open palette (global, any page) |
| `Esc` | Close palette |
| `↑` / `↓` | Navigate results |
| `Enter` | Execute selected command |
| Click search input in header | Open palette |
| Type in palette | Filter/search results in real-time |
| Click outside palette | Close palette |

### Responsive Behavior

- **Desktop**: Centered modal dialog, max-width 640px, max-height 65vh
- **Tablet**: Same as desktop
- **Mobile**: Full-width dialog from bottom (sheet-style), max-height 80vh

### Accessibility

- Focus trap within dialog while open
- `aria-label` on the dialog for screen readers
- `role="combobox"` pattern following WAI-ARIA
- All items keyboard-navigable
- Search input auto-focused on open
- Results announced to screen readers via `aria-live` region

---

## Technical Approach

### Existing Infrastructure

| Component | Status | Location |
|-----------|--------|----------|
| `cmdk` package | Installed (v1.1.1) | `package.json` |
| `Command` components | Complete | `components/ui/command.tsx` |
| `CommandDialog` | Complete | `components/ui/command.tsx` |
| Search input (header) | Placeholder | `AuthenticatedLayout.tsx:309-320` |
| Example usage | Reference | `blocks/dialog-search.tsx` |
| Navigation config | Complete | `config/navigation.ts` |
| i18n infrastructure | Complete | `react-i18next` |

### New Components (Phase 1)

```
packages/frontend/src/
├── components/
│   └── CommandPalette/
│       ├── CommandPalette.tsx       # Main component with CommandDialog
│       ├── useCommandPalette.ts     # State management hook
│       ├── useCommandRegistry.ts    # Command registration and filtering
│       └── types.ts                 # CommandItem interface
├── config/
│   └── commands.ts                  # Static command definitions derived from navigation
└── hooks/
    └── useRecentPages.ts            # Track recently visited pages (localStorage)
```

### Key Implementation Details

**Command registration**:
- Derive commands from `mainNavigation` and `createOrganizationNavigation()` at runtime
- Apply module flag filtering via `useSubscription().isFeatureAvailable()`
- Apply role filtering based on user's current role
- Support both sv and en search terms by loading both translation files

**Search behavior**:
- cmdk provides built-in fuzzy search on `CommandItem` text content
- Add `data-value` attributes with concatenated sv+en terms for bilingual search
- Phase 2 entity search runs as a separate async query alongside client-side filtering

**State management**:
- Open/close state managed by `useCommandPalette` hook
- Global keyboard listener for Cmd+K registered once in `AuthenticatedLayout`
- Recent pages stored in `localStorage` with key `equiduty:recent-pages`

**Performance**:
- Navigation commands are pre-computed (no runtime cost)
- Entity search (Phase 2) debounced at 250ms
- Palette shell renders immediately; results stream in
- Max 65vh height with virtual scrolling if result count > 50 (Phase 3)

---

## Scope Exclusions

The following are explicitly **out of scope** for all phases:

- **Documentation search**: Searching help articles or docs is not included. This may be a future feature tied to a help center or knowledge base integration.
- **Full-text content search**: Searching within horse health records, activity notes, or other free-text fields.
- **Cross-organization search**: The palette only searches within the user's currently active organization.
- **Offline-first search index**: No client-side search index (e.g., Lunr, MiniSearch). Relying on cmdk's built-in filtering for Phase 1 and Firestore queries for Phase 2.
- **Natural language commands**: No NLP parsing (e.g., "show me horses added last week").

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Palette open-to-navigate time | <2 seconds (P50) | Frontend analytics |
| Adoption rate | >30% of DAU within 4 weeks | Feature flag + event tracking |
| Navigation success rate | >90% queries result in a click | Click-through tracking |
| Entity search latency (Phase 2) | <500ms P95 | Performance monitoring |
| Reduction in sidebar clicks | -20% after Phase 1 launch | Navigation event comparison |

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| `cmdk` v1.1.1 | npm package | Already installed |
| shadcn/ui Command components | UI components | Already implemented |
| Navigation config (`navigation.ts`) | Data source | Already exists |
| `react-i18next` | i18n | Already configured |
| `useNavigation` hook | Navigation state | Already exists |
| Firestore queries (Phase 2) | Data access | Existing SDK patterns |
| `useSubscription` hook | Feature gating | Already exists |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Firestore read costs from entity search | Medium | Medium | Debounce queries, limit results, leverage offline cache |
| Bilingual search complexity | Low | Medium | Concatenate sv+en terms in search index; cmdk handles fuzzy matching |
| Mobile usability | Medium | Low | Bottom-sheet pattern for mobile; test on real devices |
| Feature discoverability | Medium | Medium | Show Cmd+K hint in search input placeholder; onboarding tooltip |
| Result relevance | Low | Medium | Weight recent pages and exact matches higher than fuzzy matches |

---

## Open Questions

1. **Should the palette show different commands based on the user's current page context?** (Phase 3 proposes this, but it adds complexity.)
2. **Should we track search queries that return no results?** (Useful for identifying missing features or content gaps.)
3. **Should Cmd+K override browser default behavior?** (Cmd+K focuses the browser URL bar in some browsers. Most SaaS apps override this.)
4. **What is the maximum acceptable Firestore read cost per search session in Phase 2?** (Relevant for pricing/billing.)
