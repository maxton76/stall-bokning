# iOS Permission System Implementation Guide

**Status**: Phase 1-3 Complete (Models, Services, Presentation)
**Remaining**: Phase 4-5 (View Migration + Testing)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [View Migration Patterns](#view-migration-patterns)
4. [AuthService Integration](#authservice-integration)
5. [Horse RBAC Filtering](#horse-rbac-filtering)
6. [Testing Checklist](#testing-checklist)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Using Permission View Modifiers

```swift
import SwiftUI

struct InvoiceListView: View {
    var body: some View {
        VStack {
            // Hide entire navigation link if no permission
            NavigationLink("Create Invoice") {
                CreateInvoiceView()
            }
            .requiresPermission(.manageInvoices)

            // Hide button if feature not available
            Button("View Analytics") { }
                .requiresFeature("analytics")

            // Combine permission + feature check
            Button("Manage Lessons") { }
                .requiresFeatureAndPermission("lessons", .manageLessons)

            // Show only for administrators
            NavigationLink("Organization Settings") {
                SettingsView()
            }
            .requiresRole(.administrator)

            // Show for any of multiple roles
            Button("Manage Horses") { }
                .requiresRoles([.veterinarian, .farrier, .dentist])
        }
    }
}
```

### Using Permission Property Wrappers

```swift
import SwiftUI
import Observation

@Observable
class InvoiceViewModel {
    @Permission(.manageInvoices) var canManageInvoices
    @Permission(.viewInvoices) var canViewInvoices
    @FeatureFlag("invoicing") var hasInvoicing
    @HasRole(.bookkeeper) var isBookkeeper

    func createInvoice() {
        guard canManageInvoices else {
            showError("You don't have permission to create invoices")
            return
        }

        guard hasInvoicing else {
            showUpgradePrompt()
            return
        }

        // Create invoice logic...
    }
}
```

---

## 🏗 Architecture Overview

### Service Layer

**SubscriptionService** (`SubscriptionService.shared`)
- Manages subscription tiers and feature flags
- 5-minute caching per organization
- `isFeatureAvailable(_ module:)` - Check feature access
- `isWithinLimit(_ keyPath:currentCount:)` - Check limits
- Auto-loads on sign-in and organization switch

**PermissionService** (`PermissionService.shared`)
- Manages user permissions (60 actions across 10 categories)
- 5-minute caching per organization
- `hasPermission(_ action:)` - Check single permission
- `hasPermissions(_ actions:)` - Batch check
- `hasAnyRole(_ roles:)` - Role checking
- Auto-loads on sign-in and organization switch

**RBACFilterService** (`RBACFilterService.shared`)
- Filters horse data by access level (5 levels)
- `filterHorse(_ horse:)` - Remove sensitive fields
- `canViewField(_ field:horse:)` - Field-level checks
- `canEditHorse(_ horse:)` - Edit permission logic

### Model Layer

**SubscriptionTier** - Dynamic subscription tier (no hardcoded enum)
```swift
let tier = SubscriptionTier(value: "standard")  // Any tier value supported
```

**ModuleFlags** - 13 feature flags
```swift
struct ModuleFlags {
    let analytics: Bool
    let selectionProcess: Bool
    let locationHistory: Bool
    let photoEvidence: Bool
    let leaveManagement: Bool
    let inventory: Bool
    let lessons: Bool
    let staffMatrix: Bool
    let advancedPermissions: Bool
    let integrations: Bool
    let manure: Bool
    let aiAssistant: Bool
    let supportAccess: Bool
}
```

**PermissionAction** - 60 permission actions
```swift
enum PermissionAction: String, Codable, CaseIterable {
    // Organization (4)
    case manageOrgSettings, manageMembers, viewMembers, manageBilling

    // Billing (8 - requires 'invoicing' addon)
    case viewInvoices, manageInvoices, viewPayments, managePayments
    case manageBillingSettings, viewFinancialReports, managePrices, manageBillingGroups

    // Stables (3)
    case createStables, manageStableSettings, viewStables

    // Horses (3)
    case viewHorses, manageOwnHorses, manageAnyHorse

    // Scheduling (5)
    case viewSchedules, manageSchedules, bookShifts
    case cancelOthersBookings, markShiftsMissed

    // Activities (3)
    case manageActivities, manageRoutines, manageSelectionProcesses

    // Lessons (1)
    case manageLessons

    // Facilities (1)
    case manageFacilities

    // Records (2)
    case manageRecords, viewRecords

    // Integrations (3)
    case manageIntegrations, sendCommunications, exportData
}
```

**OrganizationRole** - 14 roles
```swift
enum OrganizationRole: String, Codable, CaseIterable {
    case administrator
    case stableManager, schedulePlanner, bookkeeper
    case veterinarian, dentist, farrier
    case customer, groom, saddleMaker
    case horseOwner, rider, inseminator
    case trainer, trainingAdmin, supportContact
}
```

---

## 📝 View Migration Patterns

### Pattern 1: Simple Permission Check

**BEFORE:**
```swift
NavigationLink("Organization Settings") {
    OrganizationSettingsView()
}
```

**AFTER:**
```swift
NavigationLink("Organization Settings") {
    OrganizationSettingsView()
}
.requiresPermission(.manageOrgSettings)
```

---

### Pattern 2: Feature Flag Check

**BEFORE:**
```swift
Section("Analytics") {
    NavigationLink("View Reports") {
        AnalyticsView()
    }
}
```

**AFTER:**
```swift
Section("Analytics") {
    NavigationLink("View Reports") {
        AnalyticsView()
    }
}
.requiresFeature("analytics")
```

---

### Pattern 3: Combined Permission + Feature

**BEFORE:**
```swift
Button("Create Lesson") {
    createLesson()
}
```

**AFTER:**
```swift
Button("Create Lesson") {
    createLesson()
}
.requiresFeatureAndPermission("lessons", .manageLessons)
```

---

### Pattern 4: Role-Based Visibility

**BEFORE:**
```swift
NavigationLink("Admin Panel") {
    AdminPanelView()
}
```

**AFTER:**
```swift
NavigationLink("Admin Panel") {
    AdminPanelView()
}
.requiresRole(.administrator)
```

---

### Pattern 5: Multiple Permissions (OR logic)

**BEFORE:**
```swift
Button("Edit Horse") {
    editHorse()
}
```

**AFTER:**
```swift
Button("Edit Horse") {
    editHorse()
}
.requiresAnyPermission([.manageOwnHorses, .manageAnyHorse])
```

---

### Pattern 6: Multiple Permissions (AND logic)

**BEFORE:**
```swift
Button("Advanced Billing Settings") {
    showAdvancedSettings()
}
```

**AFTER:**
```swift
Button("Advanced Billing Settings") {
    showAdvancedSettings()
}
.requiresAllPermissions([.manageBilling, .manageBillingSettings])
```

---

### Pattern 7: Organization Owner Only

**BEFORE:**
```swift
Button("Delete Organization") {
    deleteOrganization()
}
```

**AFTER:**
```swift
Button("Delete Organization") {
    deleteOrganization()
}
.requiresOrgOwner()
```

---

### Pattern 8: Conditional Toolbar Items

**BEFORE:**
```swift
.toolbar {
    ToolbarItem(placement: .primaryAction) {
        Button("Create") {
            createItem()
        }
    }
}
```

**AFTER:**
```swift
.toolbar {
    ToolbarItem(placement: .primaryAction) {
        Button("Create") {
            createItem()
        }
        .requiresPermission(.manageSchedules)
    }
}
```

---

### Pattern 9: Entire Sections with Permission

**BEFORE:**
```swift
Section("Billing") {
    NavigationLink("Invoices") { InvoiceListView() }
    NavigationLink("Payments") { PaymentListView() }
    NavigationLink("Settings") { BillingSettingsView() }
}
```

**AFTER:**
```swift
Section("Billing") {
    NavigationLink("Invoices") { InvoiceListView() }
        .requiresPermission(.viewInvoices)

    NavigationLink("Payments") { PaymentListView() }
        .requiresPermission(.viewPayments)

    NavigationLink("Settings") { BillingSettingsView() }
        .requiresPermission(.manageBillingSettings)
}
.requiresFeature("invoicing")  // Hide entire section if no addon
```

---

### Pattern 10: ViewModel with Property Wrappers

**BEFORE:**
```swift
@Observable
class ScheduleViewModel {
    func createSchedule() {
        // No permission check
        // Create schedule...
    }
}
```

**AFTER:**
```swift
@Observable
class ScheduleViewModel {
    @Permission(.manageSchedules) var canManageSchedules
    @Permission(.bookShifts) var canBookShifts
    @FeatureFlag("selectionProcess") var hasSelectionProcess

    func createSchedule() {
        guard canManageSchedules else {
            showError("You don't have permission to manage schedules")
            return
        }

        // Create schedule...
    }

    func bookShift() {
        guard canBookShifts else {
            showError("You don't have permission to book shifts")
            return
        }

        // Book shift...
    }
}
```

---

## 🔗 AuthService Integration

The services are automatically integrated with AuthService. When users sign in or switch organizations, permissions and subscriptions load automatically.

### Automatic Loading

```swift
// ✅ Already implemented in AuthService
// - Loads tier definitions on sign-in
// - Loads subscription for selected org
// - Loads permissions for selected org
// - Refreshes on organization switch
// - Clears caches on sign-out
```

### Manual Organization Switch

```swift
// NEW: Use selectOrganization() method
@State private var authService = AuthService.shared

Button("Switch Organization") {
    authService.selectOrganization(someOrganization)
    // ✅ Automatically loads permissions + subscription + stables
}
```

### Manual Refresh

```swift
// If you need to manually refresh permissions/subscription:
Task {
    if let orgId = AuthService.shared.selectedOrganization?.id {
        try? await PermissionService.shared.fetchPermissions(organizationId: orgId)
        try? await SubscriptionService.shared.fetchSubscription(organizationId: orgId)
    }
}
```

---

## 🐴 Horse RBAC Filtering

### Filtering Horse Data

```swift
import SwiftUI

struct HorseDetailView: View {
    let horse: Horse
    @State private var filteredHorse: Horse

    init(horse: Horse) {
        self.horse = horse
        // Apply RBAC filtering
        _filteredHorse = State(initialValue: RBACFilterService.shared.filterHorse(horse))
    }

    var body: some View {
        VStack {
            // Level 1: Public (always visible)
            Text(filteredHorse.name)
            Text(filteredHorse.breed ?? "")
            Text("Age: \(filteredHorse.age ?? 0)")

            // Level 2: Basic Care (grooms, riders)
            if RBACFilterService.shared.canViewBasicCareFields(filteredHorse) {
                Text(filteredHorse.notes ?? "")
                Text(filteredHorse.specialInstructions ?? "")
            }

            // Level 3: Professional (vets, farriers, dentists)
            if RBACFilterService.shared.canViewProfessionalFields(filteredHorse) {
                Text("UELN: \(filteredHorse.ueln ?? "")")
                Text("Chip: \(filteredHorse.chipNumber ?? "")")
            }

            // Level 4: Management (administrators, managers)
            if RBACFilterService.shared.canViewManagementFields(filteredHorse) {
                Text("Owner: \(filteredHorse.ownerName ?? "")")
                Text("Email: \(filteredHorse.ownerEmail ?? "")")
            }

            // Edit button (owner override + permission check)
            if RBACFilterService.shared.canEditHorse(filteredHorse) {
                Button("Edit Horse") {
                    editHorse()
                }
            }
        }
    }
}
```

### Batch Horse Filtering

```swift
struct HorseListView: View {
    @State private var horses: [Horse] = []
    @State private var filteredHorses: [Horse] = []

    var body: some View {
        List(filteredHorses) { horse in
            HorseRow(horse: horse)
        }
        .task {
            await loadHorses()
        }
    }

    private func loadHorses() async {
        do {
            let response: HorsesResponse = try await APIClient.shared.get("/horses")
            horses = response.horses

            // Apply RBAC filtering to all horses
            filteredHorses = RBACFilterService.shared.filterHorses(horses)
        } catch {
            print("Failed to load horses: \(error)")
        }
    }
}
```

### Field-Level Visibility

```swift
// Check if specific field is visible
let canViewUELN = RBACFilterService.shared.canViewField(.ueln, horse: horse)

if canViewUELN {
    Text("UELN: \(horse.ueln ?? "")")
}
```

---

## ✅ Testing Checklist

### Pre-Migration Testing

- [ ] All 11 new files compile without errors
- [ ] AuthService integration doesn't break existing sign-in flow
- [ ] Services load on authentication (check debug logs)
- [ ] Cache invalidation works on sign-out

### Post-Migration Testing

#### Subscription Tiers
- [ ] Free tier: analytics hidden, invoicing hidden, lessons hidden
- [ ] Standard tier: analytics visible, invoicing hidden, lessons hidden
- [ ] Pro tier: all modules visible
- [ ] Enterprise tier: all modules + addons visible
- [ ] Custom tier: doesn't crash, decodes correctly

#### Permission Checks
- [ ] Administrator: sees all management screens
- [ ] Bookkeeper: sees invoicing (if addon enabled), no org settings
- [ ] Groom: sees scheduling, no admin screens
- [ ] Customer: sees horses, limited scheduling
- [ ] Veterinarian: sees professional horse fields, no owner info

#### Horse RBAC
- [ ] Public level (all): sees name, breed, age
- [ ] Basic care (groom, rider): sees notes, equipment
- [ ] Professional (vet, farrier, dentist): sees UELN, medical data
- [ ] Management (admin, manager): sees owner info
- [ ] Owner: sees everything

#### Error Handling
- [ ] 403 Forbidden shows clear error message
- [ ] Permission cache invalidates on 403
- [ ] Feature not available shows upgrade prompt
- [ ] Missing permissions hide UI elements (not disabled state)

#### Cache Behavior
- [ ] Permissions cached for 5 minutes
- [ ] Subscription cached for 5 minutes
- [ ] Cache invalidates on org switch
- [ ] Cache invalidates on sign out
- [ ] Manual refresh works

---

## 🔧 Troubleshooting

### Issue: Permissions Not Loading

**Symptoms**: All permission checks return false, features hidden

**Solution**:
```swift
// Check if permissions loaded
print("Has permissions: \(PermissionService.shared.userPermissions != nil)")
print("Current org: \(AuthService.shared.selectedOrganization?.id ?? "none")")

// Force reload
if let orgId = AuthService.shared.selectedOrganization?.id {
    Task {
        try? await PermissionService.shared.fetchPermissions(organizationId: orgId)
    }
}
```

### Issue: Subscription Not Loading

**Symptoms**: All features hidden, tier shows as nil

**Solution**:
```swift
// Check if subscription loaded
print("Has subscription: \(SubscriptionService.shared.currentSubscription != nil)")
print("Current tier: \(SubscriptionService.shared.currentSubscription?.tier.value ?? "none")")

// Force reload
if let orgId = AuthService.shared.selectedOrganization?.id {
    Task {
        try? await SubscriptionService.shared.fetchSubscription(organizationId: orgId)
    }
}
```

### Issue: App Crashes on "standard" Tier

**Cause**: Old hardcoded `SubscriptionTier` enum still referenced somewhere

**Solution**:
```bash
# Search for old enum references
grep -r "enum SubscriptionTier" EquiDuty/EquiDuty/
grep -r "SubscriptionTier.standard" EquiDuty/EquiDuty/

# Replace with:
let tier = SubscriptionTier(value: "standard")
```

### Issue: Horse Fields Not Filtered

**Cause**: Not using `RBACFilterService.shared.filterHorse()`

**Solution**:
```swift
// WRONG
let horse = response.horse

// CORRECT
let horse = RBACFilterService.shared.filterHorse(response.horse)
```

### Issue: Permission Checks Slow

**Cause**: Not using cached service, making API calls on every check

**Solution**:
```swift
// WRONG (slow, multiple API calls)
func hasPermission(_ action: PermissionAction) async -> Bool {
    let response: UserPermissionsResponse = try await APIClient.shared.get(...)
    return response.permissions.hasPermission(action)
}

// CORRECT (fast, uses 5-minute cache)
func hasPermission(_ action: PermissionAction) -> Bool {
    PermissionService.shared.hasPermission(action)
}
```

---

## 📊 Migration Progress Tracker

Copy this checklist to track view migration progress:

### Organization & Admin (6 files)
- [ ] OrganizationListView.swift
- [ ] OrganizationDetailView.swift
- [ ] OrganizationSettingsView.swift - `.requiresPermission(.manageOrgSettings)`
- [ ] MemberListView.swift - `.requiresPermission(.viewMembers)`
- [ ] MemberDetailView.swift
- [ ] InviteMemberView.swift - `.requiresPermission(.manageMembers)`

### Billing & Invoicing (6 files)
- [ ] InvoiceListView.swift - `.requiresFeature("invoicing")` + `.requiresPermission(.viewInvoices)`
- [ ] InvoiceDetailView.swift
- [ ] CreateInvoiceView.swift - `.requiresPermission(.manageInvoices)`
- [ ] PaymentListView.swift - `.requiresPermission(.viewPayments)`
- [ ] BillingGroupsView.swift - `.requiresPermission(.manageBillingGroups)`
- [ ] BillingSettingsView.swift - `.requiresPermission(.manageBillingSettings)`

### Stables (4 files)
- [ ] StableListView.swift - `.requiresPermission(.viewStables)`
- [ ] StableDetailView.swift
- [ ] StableSettingsView.swift - `.requiresPermission(.manageStableSettings)`
- [ ] CreateStableView.swift - `.requiresPermission(.createStables)`

### Horses (4 files)
- [ ] HorseListView.swift - Apply `RBACFilterService.shared.filterHorses()`
- [ ] HorseDetailView.swift - Apply `RBACFilterService.shared.filterHorse()`
- [ ] HorseEditView.swift - Check `RBACFilterService.shared.canEditHorse()`
- [ ] CreateHorseView.swift - `.requiresPermission(.manageOwnHorses)`

### Scheduling (5 files)
- [ ] ScheduleListView.swift - `.requiresPermission(.viewSchedules)`
- [ ] ScheduleDetailView.swift
- [ ] CreateScheduleView.swift - `.requiresPermission(.manageSchedules)`
- [ ] ShiftBookingView.swift - `.requiresPermission(.bookShifts)`
- [ ] SelectionProcessView.swift - `.requiresFeature("selectionProcess")`

### Analytics & Reports (3 files)
- [ ] AnalyticsView.swift - `.requiresFeature("analytics")`
- [ ] ReportsView.swift - `.requiresPermission(.viewFinancialReports)`
- [ ] DashboardView.swift

### Activities & Routines (3 files)
- [ ] RoutineListView.swift - `.requiresPermission(.manageRoutines)`
- [ ] RoutineDetailView.swift
- [ ] ActivityListView.swift - `.requiresPermission(.manageActivities)`

**Total Progress: 0/31 files migrated (0%)**

---

## 🎯 Next Steps

1. **Update Organization Switching**
   - Replace `authService.selectedOrganization = org` with `authService.selectOrganization(org)`

2. **Migrate Views** (31 files)
   - Start with billing/admin views (highest security impact)
   - Then horses (RBAC filtering)
   - Then scheduling/activities

3. **Write Unit Tests** (3 test files)
   - PermissionServiceTests
   - SubscriptionServiceTests
   - RBACFilterServiceTests

4. **Integration Testing**
   - Test all 6 scenarios from plan
   - Verify cache behavior
   - Test error handling

---

## 📚 Additional Resources

- **Backend Permission Matrix**: `packages/api/src/utils/permissionMatrix.ts`
- **Backend Horse Projection**: `packages/api/src/utils/horseProjection.ts`
- **Frontend usePermissions**: `packages/frontend/src/hooks/usePermissions.tsx`
- **Frontend useSubscription**: `packages/frontend/src/hooks/useSubscription.tsx`

---

**Questions?** Check the plan document: `/iOS Dynamic Subscriptions & Permission System Implementation Plan`
