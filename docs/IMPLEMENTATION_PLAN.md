# Implementation Plan - Stable Booking System

## 📋 Document Information

| **Attribute** | **Value** |
|--------------|-----------|
| **Version** | 1.0 |
| **Date** | 2025-12-25 |
| **Status** | Draft |
| **Related documents** | [PRD.md](./PRD.md), [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## 🎯 Overview

This document describes the implementation roadmap for MVP1 of the Stable Booking System. The plan is divided into **Phases** → **Epics** → **Stories** → **Tasks**.

**Total estimated time**: 12-16 weeks with 2 full-time developers

---

## 📅 Release Plan

### Phase 1: Foundation (Week 1-3)
**Goal**: Infrastructure, authentication, basic UI

**Deliverables**:
- ✅ Firebase project setup (development)
- ✅ CI/CD pipeline (GitHub Actions for dev environment)
- ✅ Authentication (email/password + Google Sign-In)
- ✅ Basic UI components (mobile-first)
- ✅ Database structure in Firestore
- *Note: Staging/production environments will be created later as needed*

---

### Phase 2: Core Features (Week 4-8)
**Goal**: Stable management, shift types, scheduling

**Deliverables**:
- ✅ Create and manage stables
- ✅ Invite stable guests
- ✅ Define shift types with weighting
- ✅ Create standard schedules
- ✅ Hybrid model for shift allocation

---

### Phase 3: Booking & Notifications (Week 9-11)
**Goal**: Booking system, notifications, statistics

**Deliverables**:
- ✅ Book, swap, and cancel shifts
- ✅ Email notifications
- ✅ Basic statistics
- ✅ Admin messages

---

### Phase 4: Payments & Polish (Week 12-16)
**Goal**: Payments, premium features, bug fixes

**Deliverables**:
- ✅ Stripe integration
- ✅ Freemium + premium tiers
- ✅ SMS notifications (premium)
- ✅ Advanced statistics and export
- ✅ Bug fixes and performance optimization
- ✅ Beta launch

---

## 🏗️ Epic Breakdown

### Phase 1: Foundation

#### Epic 1.1: Infrastructure Setup
**Priority**: P0 (Critical)
**Estimate**: 1 week
**Dependencies**: None

**Stories**:

**STORY-001**: Setup Firebase Project (Development)
- **Description**: Create Firebase development environment
- **Acceptance Criteria**:
  - [ ] Firebase development project created (`equiduty-dev`)
  - [ ] Firestore enabled in test mode
  - [ ] Authentication enabled (Email/Password + Google Sign-In providers)
  - [ ] Google OAuth configured (authorized domains + redirect URIs)
  - [ ] Storage enabled
  - [ ] Hosting enabled
  - [ ] Firebase Emulators configured
- **Tasks**:
  - Create Firebase project via console
  - Configure Firestore Security Rules (basic)
  - Enable Authentication providers (Email/Password + Google)
  - Configure Google OAuth in GCP Console
  - Setup Firebase Emulators for local development
  - Document project ID and OAuth client ID
- **Estimate**: 3h (+1h for Google OAuth setup)
- **Note**: Staging/production environments will be created later as needed

---

**STORY-002**: Setup Google Cloud Infrastructure
- **Description**: Configure GCP for Cloud Run and Cloud Functions
- **Acceptance Criteria**:
  - [ ] Cloud Run API enabled
  - [ ] Cloud Functions API enabled
  - [ ] Secret Manager enabled
  - [ ] Service accounts created
  - [ ] IAM roles configured
- **Tasks**:
  - Enable GCP APIs via gcloud CLI
  - Create service account for backend
  - Configure IAM roles (Firebase Admin)
  - Setup Secret Manager for API keys
- **Estimate**: 3h

---

**STORY-003**: CI/CD Pipeline Setup (Development)
- **Description**: Automated deployment pipeline with GitHub Actions for dev environment
- **Acceptance Criteria**:
  - [ ] GitHub Actions workflow created
  - [ ] Automated tests run on push
  - [ ] Auto-deploy to dev on merge to `main` branch
  - [ ] Rollback functionality for dev
- **Tasks**:
  - Create `.github/workflows/deploy.yml`
  - Configure Firebase Hosting deployment (dev)
  - Setup Cloud Run deployment (dev)
  - Configure environment secrets for dev
- **Estimate**: 3h
- **Note**: CI/CD for staging/production will be created later as needed

---

**STORY-004**: Monorepo Structure
- **Description**: Structure the project as a monorepo with shared packages
- **Acceptance Criteria**:
  - [ ] `/packages/frontend` - React app
  - [ ] `/packages/api` - Cloud Run service
  - [ ] `/packages/functions` - Cloud Functions
  - [ ] `/packages/shared` - Shared types and utils
  - [ ] Root package.json with workspace scripts
  - [ ] TypeScript configured for all packages
- **Tasks**:
  - Create package structure
  - Setup TypeScript project references
  - Configure shared tsconfig.json
  - Setup linting and formatting (ESLint, Prettier)
- **Estimate**: 3h

---

#### Epic 1.2: Authentication & User Management
**Priority**: P0 (Critical)
**Estimate**: 1.5 weeks
**Dependencies**: Epic 1.1

**Stories**:

**STORY-005**: Firebase Authentication Integration (Frontend)
- **Description**: Implement auth in React app with Firebase SDK (Email/Password + Google Sign-In)
- **Acceptance Criteria**:
  - [ ] SignUp with email/password
  - [ ] Login with email/password
  - [ ] SignIn/SignUp with Google (OAuth 2.0)
  - [ ] Account linking (Google ↔ email/password)
  - [ ] Logout functionality
  - [ ] Auth state persistence (localStorage)
  - [ ] Protected routes (React Router)
  - [ ] Error handling for auth failures and OAuth errors
  - [ ] Mobile-optimized auth UI (touch-friendly buttons ≥44px)
- **Tasks**:
  - Setup Firebase SDK in frontend
  - Enable Email/Password + Google providers in Firebase Console
  - Configure Google OAuth credentials (authorized domains + redirect URIs)
  - Create AuthContext with React Context API
  - Implement SignUp/Login forms (React Hook Form + Zod)
  - Implement Google Sign-In button (firebase/auth signInWithPopup)
  - Implement account linking logic
  - Create ProtectedRoute component
  - Error handling and loading states (OAuth errors, popup-blocked)
  - Mobile-first responsive design for auth screens
- **Estimate**: 8h (+2h for Google Sign-In and account linking)

---

**STORY-006**: User Profile Management
- **Description**: Manage user profiles in Firestore
- **Acceptance Criteria**:
  - [ ] Create user document on signup (onUserCreated trigger)
  - [ ] Display user profile (name, email, avatar)
  - [ ] Edit profile functionality
  - [ ] Upload avatar to Firebase Storage
  - [ ] Validation with Zod schema
- **Tasks**:
  - Create `users` collection in Firestore
  - Implement Cloud Function `onUserCreated`
  - Create ProfilePage component
  - Implement avatar upload
  - Real-time sync with Firestore listener
- **Estimate**: 8h

---

**STORY-007**: Role-Based Access Control (RBAC)
- **Description**: Implement roles and permissions via Firebase Custom Claims
- **Acceptance Criteria**:
  - [ ] Custom claims for roles (systemAdmin, stableOwner, guest)
  - [ ] Backend middleware to validate roles
  - [ ] Frontend role checks (hide/show UI based on role)
  - [ ] Admin-only routes
- **Tasks**:
  - Setup custom claims in Cloud Function
  - Implement auth middleware in Cloud Run API
  - Create `usePermissions` hook
  - Conditional rendering based on role
- **Estimate**: 6h

---

#### Epic 1.3: UI Foundation
**Priority**: P0 (Critical)
**Estimate**: 1 week
**Dependencies**: Epic 1.1

**Stories**:

**STORY-008**: Setup shadcn/ui Component Library
- **Description**: Install and configure shadcn/ui with Tailwind CSS
- **Acceptance Criteria**:
  - [ ] Tailwind CSS configured
  - [ ] shadcn/ui CLI installed
  - [ ] Theme configured (colors, fonts)
  - [ ] Base components installed (Button, Input, Card, etc.)
  - [ ] Dark mode support (future-proof)
- **Tasks**:
  - Install Tailwind CSS and dependencies
  - Run shadcn-ui init
  - Customize theme.ts
  - Install core components
- **Estimate**: 3h

---

**STORY-009**: Layout & Navigation
- **Description**: Create app layout with navigation
- **Acceptance Criteria**:
  - [ ] AppLayout component with sidebar/header
  - [ ] Responsive navigation (mobile menu)
  - [ ] Navigation items based on role
  - [ ] Breadcrumbs
  - [ ] Footer
- **Tasks**:
  - Create Layout component
  - Implement Sidebar with navigation links
  - Mobile responsive menu
  - Role-based navigation rendering
- **Estimate**: 6h

---

**STORY-010**: Dashboard Pages (Skeleton)
- **Description**: Create skeleton for all main pages
- **Acceptance Criteria**:
  - [ ] DashboardPage (landing after login)
  - [ ] StablesPage (list all stables)
  - [ ] SchedulePage (view schedule)
  - [ ] BookingPage (book shifts)
  - [ ] ReportsPage (statistics)
  - [ ] SettingsPage (settings)
  - [ ] AdminPage (system admin only)
- **Tasks**:
  - Create routing structure (React Router)
  - Implement page components (skeleton)
  - Setup lazy loading for routes
- **Estimate**: 4h

---

### Phase 2: Core Features

#### Epic 2.1: Stable Management
**Priority**: P0 (Critical)
**Estimate**: 1.5 weeks
**Dependencies**: Epic 1.2

**Stories**:

**STORY-011**: Create Stable (Owner)
- **Description**: Stable owner can create a new stable
- **Acceptance Criteria**:
  - [ ] "Create Stable" form (name, description, address)
  - [ ] Validation with Zod
  - [ ] Create `stables` document in Firestore
  - [ ] Create initial member document (owner)
  - [ ] Redirect to stable dashboard after create
- **Tasks**:
  - Create CreateStableForm component
  - Backend API endpoint: POST /api/v1/stables
  - Firestore write transaction
  - Success/error handling
- **Estimate**: 6h

---

**STORY-012**: Stable Settings & Configuration
- **Description**: Configure stable settings
- **Acceptance Criteria**:
  - [ ] Edit stable information (name, description, address)
  - [ ] Configuration for weighting system (memoryHorizonDays, resetPeriod)
  - [ ] Configuration for scheduling (scheduleHorizonDays, autoAssignment)
  - [ ] Configuration for notifications
  - [ ] Holidays (include Swedish holidays, custom holidays)
- **Tasks**:
  - Create StableSettingsPage
  - Form sections for each config category
  - Backend API: PUT /api/v1/stables/:id
  - Real-time sync with Firestore
- **Estimate**: 8h

---

**STORY-013**: Invite Stable Members
- **Description**: Stable owner invites stable guests via email
- **Acceptance Criteria**:
  - [ ] "Invite Member" form (email, role)
  - [ ] Send invite email (SendGrid)
  - [ ] Generate invite link with token
  - [ ] Accept invite flow (user creates account or logs in)
  - [ ] Auto-add to stable members on accept
- **Tasks**:
  - Create InviteMemberForm
  - Backend endpoint: POST /api/v1/stables/:id/invite
  - Cloud Function to send email
  - Accept invite route and logic
- **Estimate**: 10h

---

**STORY-014**: Member Management (Roles & Status)
- **Description**: Manage members in a stable
- **Acceptance Criteria**:
  - [ ] List all members with info (name, email, role, status, stats)
  - [ ] Change member role (owner, admin, coAdmin, scheduleManager, guest)
  - [ ] Change member status (active, vacation, temporaryAbsent, inactive)
  - [ ] Set vacation period for members
  - [ ] Remove member from stable
- **Tasks**:
  - Create MemberListPage component
  - EditMemberDialog with form
  - Backend endpoint: PUT /api/v1/stables/:id/members/:userId
  - Delete endpoint: DELETE /api/v1/stables/:id/members/:userId
- **Estimate**: 10h

---

**STORY-015**: Member Search & Join Request
- **Description**: Stable guests can search for stables and request membership
- **Acceptance Criteria**:
  - [ ] Search bar for stables (name, city)
  - [ ] List search results
  - [ ] "Request to Join" button
  - [ ] Stable admin receives notification
  - [ ] Approve/Deny join request
- **Tasks**:
  - Create SearchStablesPage
  - Backend endpoint: GET /api/v1/stables/search?q=...
  - POST /api/v1/stables/:id/join-request
  - Notification trigger (Cloud Function)
  - Approve/deny UI for admin
- **Estimate**: 8h

---

#### Epic 2.2: Shift Types & Scheduling
**Priority**: P0 (Critical)
**Estimate**: 2 weeks
**Dependencies**: Epic 2.1

**Stories**:

**STORY-016**: Create Shift Types
- **Description**: Stable admin creates shift types with time, task, and weighting
- **Acceptance Criteria**:
  - [ ] "Create Shift Type" form
  - [ ] Name (e.g. "Morning stable cleaning")
  - [ ] Time (start, end HH:MM)
  - [ ] Task (taskType dropdown, custom taskName)
  - [ ] Weighting (points: number)
  - [ ] Days of week (multiselect: Mon-Sun)
  - [ ] Holiday config (different points for holidays)
  - [ ] List all shift types
  - [ ] Edit/Delete shift types
- **Tasks**:
  - Create ShiftTypesPage
  - CreateShiftTypeForm component
  - Backend endpoint: POST /api/v1/stables/:id/shift-types
  - List, Update, Delete endpoints
  - Firestore subcollection: `stables/{id}/shiftTypes`
- **Estimate**: 10h

---

**STORY-017**: Create Schedule (Manual)
- **Description**: Stable admin creates a schedule manually
- **Acceptance Criteria**:
  - [ ] "Create Schedule" form
  - [ ] Period (startDate, endDate)
  - [ ] Type (weekly, monthly, custom)
  - [ ] Select shift types to include
  - [ ] Generate shifts automatically based on period + daysOfWeek
  - [ ] Preview schedule before save
  - [ ] Save as "draft"
- **Tasks**:
  - Create CreateSchedulePage
  - Schedule generation algorithm
  - Backend endpoint: POST /api/v1/schedules
  - Generate shifts subcollection: `schedules/{id}/shifts`
- **Estimate**: 12h

---

**STORY-018**: Fairness Algorithm (Auto-Assignment)
- **Description**: System suggests fair shift allocation (hybrid model)
- **Acceptance Criteria**:
  - [ ] Algorithm that calculates optimal allocation
  - [ ] Input: members, shifts, historical points, availability
  - [ ] Output: suggested assignments
  - [ ] Minimize standard deviation in point distribution
  - [ ] Respect individual limits (min/max shifts)
  - [ ] Respect member availability
  - [ ] Generate fairness score (0-100)
- **Tasks**:
  - Implement SchedulingService in backend
  - Fairness algorithm (greedy or constraint solver)
  - Calculate fairness index
  - Unit tests for algorithm
- **Estimate**: 16h

---

**STORY-019**: Manual Adjustment & Publish Schedule
- **Description**: Stable admin can adjust AI suggestions and publish
- **Acceptance Criteria**:
  - [ ] Display AI-generated suggestion in UI
  - [ ] Drag-and-drop to reassign shifts
  - [ ] Lock/unlock shifts
  - [ ] See fairness score in real-time when making changes
  - [ ] "Publish Schedule" button
  - [ ] Notification to all members on publish
- **Tasks**:
  - Create ScheduleEditorPage with drag-drop (react-beautiful-dnd)
  - Real-time fairness calculation
  - Backend endpoint: PUT /api/v1/schedules/:id
  - Publish endpoint: POST /api/v1/schedules/:id/publish
  - Cloud Function trigger: onSchedulePublished
- **Estimate**: 14h

---

### Phase 3: Booking & Notifications

#### Epic 3.1: Shift Booking System
**Priority**: P0 (Critical)
**Estimate**: 1.5 weeks
**Dependencies**: Epic 2.2

**Stories**:

**STORY-020**: View Schedule (Calendar View)
- **Description**: Display published schedule in calendar view
- **Acceptance Criteria**:
  - [ ] Calendar view (week, month)
  - [ ] Display all shifts with assignment info
  - [ ] Color-coding based on status (assigned, unassigned, completed)
  - [ ] Filter for own shifts vs. all shifts
  - [ ] Click on shift → Shift Details modal
- **Tasks**:
  - Create CalendarPage with FullCalendar or react-big-calendar
  - Fetch shifts from Firestore (real-time listener)
  - Implement filters
  - ShiftDetailsModal component
- **Estimate**: 10h

---

**STORY-021**: Book Available Shift
- **Description**: Stable guest can book an available shift
- **Acceptance Criteria**:
  - [ ] "Take Shift" button on unassigned shift
  - [ ] Confirmation dialog
  - [ ] Optimistic update in UI
  - [ ] Backend validates shift is still unassigned
  - [ ] Update Firestore (shift.assignedTo = userId)
  - [ ] Trigger notification (Cloud Function)
- **Tasks**:
  - Implement BookShiftButton component
  - Backend endpoint: POST /api/v1/shifts/:id/assign
  - Atomic transaction in Firestore
  - Cloud Function: onShiftAssigned
  - Update member stats (totalPoints, totalShifts)
- **Estimate**: 8h

---

**STORY-022**: Swap Shift with Another Guest
- **Description**: Stable guests can swap shifts directly with each other
- **Acceptance Criteria**:
  - [ ] "Swap Shift" button on own shift
  - [ ] Select another shift to swap with (from list or select user)
  - [ ] Both shifts reassigned atomically
  - [ ] Both users receive notification
  - [ ] Real-time update in calendar
- **Tasks**:
  - Create SwapShiftDialog component
  - Backend endpoint: POST /api/v1/shifts/swap
  - Transaction for atomic swap
  - Cloud Function for notifications
- **Estimate**: 10h

---

**STORY-023**: Cancel Shift (Acute)
- **Description**: Stable guest can cancel shift urgently
- **Acceptance Criteria**:
  - [ ] "Cancel Shift" button on own shift
  - [ ] Reason input (optional)
  - [ ] Shift returned to pool (status = unassigned)
  - [ ] Stable admin notified
  - [ ] (Config) Other members notified if enabled
  - [ ] Update member stats
- **Tasks**:
  - Implement CancelShiftButton
  - Backend endpoint: DELETE /api/v1/shifts/:id/cancel
  - Cloud Function: onShiftCancelled
  - Conditional notifications based on config
- **Estimate**: 6h

---

**STORY-024**: Shift Comments
- **Description**: Comment on shifts for communication
- **Acceptance Criteria**:
  - [ ] Comment section on ShiftDetailsModal
  - [ ] Add comment textarea + submit
  - [ ] List all comments (real-time)
  - [ ] Edit/delete own comments
  - [ ] Notification to relevant users
- **Tasks**:
  - Create ShiftComments component
  - Firestore subcollection: `shifts/{id}/comments`
  - Real-time listener for comments
  - Edit/delete functionality
- **Estimate**: 6h

---

#### Epic 3.2: Notification System
**Priority**: P0 (Critical)
**Estimate**: 1.5 weeks
**Dependencies**: Epic 3.1

**Stories**:

**STORY-025**: Email Notification Service
- **Description**: Send email notifications via SendGrid
- **Acceptance Criteria**:
  - [ ] SendGrid integration in Cloud Functions
  - [ ] Email templates (HTML + plain text)
  - [ ] Notification types:
    - Shift assigned
    - Shift cancelled
    - Schedule published
    - Admin message
    - Monthly report
  - [ ] Delivery tracking (log status)
  - [ ] Error handling (retry logic)
- **Tasks**:
  - Setup SendGrid in Cloud Functions
  - Create HTML email templates
  - Implement NotificationService
  - Cloud Functions for each event type
  - Log notifications in Firestore
- **Estimate**: 12h

---

**STORY-026**: In-App Notifications
- **Description**: Display notifications in the app
- **Acceptance Criteria**:
  - [ ] Notification bell icon in header (unread count badge)
  - [ ] Notification dropdown list
  - [ ] Mark as read functionality
  - [ ] Click notification → Navigate to relevant page
  - [ ] Real-time updates (Firestore listener)
  - [ ] Notification settings per user
- **Tasks**:
  - Create NotificationBell component
  - NotificationList component
  - Firestore subcollection: `users/{id}/notifications`
  - Mark as read endpoint
  - Real-time sync
- **Estimate**: 10h

---

**STORY-027**: User Notification Preferences
- **Description**: Users can configure notification settings
- **Acceptance Criteria**:
  - [ ] NotificationSettingsPage
  - [ ] Per stable settings (guest can be member of multiple stables)
  - [ ] Per event type (shift reminders, admin messages, etc.)
  - [ ] Per channel (email, SMS, in-app)
  - [ ] Shift reminder timing (24h, 12h, 2h before)
  - [ ] Save preferences in Firestore
- **Tasks**:
  - Create NotificationSettingsPage
  - Form for per-stable preferences
  - Firestore document: `users/{id}/settings/preferences`
  - Real-time sync
- **Estimate**: 8h

---

**STORY-028**: Scheduled Notifications (Cron Jobs)
- **Description**: Cloud Functions for scheduled notifications
- **Acceptance Criteria**:
  - [ ] sendScheduledReminders (hourly cron)
    - Query shifts next 24h
    - Check user preferences
    - Send reminders based on timing
  - [ ] checkUnassignedShifts (every 6h)
    - Find unassigned shifts approaching
    - Escalate to stable admin
  - [ ] generateMonthlyReports (monthly)
    - Generate stats for all members
    - Send email summary
- **Tasks**:
  - Implement Cloud Scheduler triggers
  - sendScheduledReminders function
  - checkUnassignedShifts function
  - generateMonthlyReports function
  - Testing with emulator
- **Estimate**: 12h

---

#### Epic 3.3: Statistics & Reporting
**Priority**: P1 (High)
**Estimate**: 1 week
**Dependencies**: Epic 3.1

**Stories**:

**STORY-029**: Real-Time Stats Dashboard (Stable Admin)
- **Description**: Dashboard with key statistics for stable admin
- **Acceptance Criteria**:
  - [ ] Current period stats:
    - Total shifts (completed, missed, unassigned)
    - Fairness index
    - Member activity leaderboard
  - [ ] Member stats table (sortable):
    - Name, total points, total shifts, avg points/shift
  - [ ] Popular shift types chart
  - [ ] Real-time updates (Firestore listener)
- **Tasks**:
  - Create StatsPage for admin
  - Fetch from `analytics/{stableId}` document
  - Charts with recharts or chart.js
  - Real-time sync
- **Estimate**: 10h

---

**STORY-030**: Pre-computed Analytics (Backend)
- **Description**: Cloud Function to pre-compute stats
- **Acceptance Criteria**:
  - [ ] Update `analytics/{stableId}` on every shift change
  - [ ] Calculate fairness index
  - [ ] Aggregate member stats
  - [ ] Identify popular shift types
  - [ ] Generate monthly reports in subcollection
- **Tasks**:
  - Cloud Function trigger: onShiftUpdated
  - Analytics calculation logic
  - Write to analytics collection
  - Generate monthly document (cron job)
- **Estimate**: 10h

---

**STORY-031**: Member Stats (Guest View)
- **Description**: Stable guest can see their own statistics
- **Acceptance Criteria**:
  - [ ] MyStatsPage
  - [ ] Current period: total points, total shifts
  - [ ] Shift history (list view with filter)
  - [ ] Calendar view of historical shifts
  - [ ] Comparison with stable average (future)
- **Tasks**:
  - Create MyStatsPage component
  - Fetch member stats from `stables/{id}/members/{userId}`
  - Shift history from `shifts` collection
  - Calendar component for historical view
- **Estimate**: 6h

---

### Phase 4: Payments & Polish

#### Epic 4.1: Subscription & Payments
**Priority**: P1 (High)
**Estimate**: 2 weeks
**Dependencies**: All previous epics

**Stories**:

**STORY-032**: Stripe Integration Setup
- **Description**: Setup Stripe for subscriptions
- **Acceptance Criteria**:
  - [ ] Stripe account created (test mode)
  - [ ] Products created in Stripe:
    - Free tier (0-10 guests)
    - Premium S (11-25 guests) - 299 SEK/month
    - Premium M (26-50 guests) - 499 SEK/month
    - Premium L (51+ guests) - 799 SEK/month
  - [ ] Webhook endpoint configured
  - [ ] Stripe SDK integration in backend
- **Tasks**:
  - Setup Stripe products via dashboard
  - Implement webhook endpoint: POST /api/v1/webhooks/stripe
  - Stripe SDK setup in backend
  - Test webhook locally with Stripe CLI
- **Estimate**: 6h

---

**STORY-033**: Subscription Management (Owner)
- **Description**: Stable owner manages their subscription
- **Acceptance Criteria**:
  - [ ] SubscriptionPage displays current plan
  - [ ] "Upgrade Plan" button
  - [ ] Stripe Checkout redirect for payment
  - [ ] Success callback → Update subscription in Firestore
  - [ ] Cancel subscription functionality
  - [ ] Customer Portal link (Stripe-hosted)
- **Tasks**:
  - Create SubscriptionPage component
  - Backend endpoint: POST /api/v1/subscriptions/create-checkout
  - Success webhook handler: subscription.created
  - Update `subscriptions` collection in Firestore
  - Cancel endpoint and webhook handler
- **Estimate**: 12h

---

**STORY-034**: Enforce Subscription Limits
- **Description**: Restrict features based on subscription tier
- **Acceptance Criteria**:
  - [ ] Check member count against plan limit
  - [ ] Block adding members if over limit
  - [ ] Prompt to upgrade
  - [ ] Disable premium features on free tier:
    - SMS notifications
    - Advanced reports
    - Export functionality
- **Tasks**:
  - Middleware for subscription check
  - Frontend gating for premium features
  - Upgrade prompts in UI
  - Backend validation
- **Estimate**: 8h

---

**STORY-035**: Payment Analytics (System Admin)
- **Description**: System admin can see revenue metrics
- **Acceptance Criteria**:
  - [ ] AdminDashboard with metrics:
    - MRR (Monthly Recurring Revenue)
    - Active subscriptions count
    - Churn rate
    - Revenue by plan tier
  - [ ] List all subscriptions (filterable, sortable)
  - [ ] Revenue chart over time
- **Tasks**:
  - Create AdminDashboard component
  - Aggregate subscription data
  - Charts for revenue metrics
  - Real-time sync
- **Estimate**: 8h

---

#### Epic 4.2: Premium Features
**Priority**: P2 (Medium)
**Estimate**: 1 week
**Dependencies**: Epic 4.1

**Stories**:

**STORY-036**: SMS Notifications (Premium)
- **Description**: Send SMS via Twilio for premium users
- **Acceptance Criteria**:
  - [ ] Twilio integration in Cloud Functions
  - [ ] SMS credits system:
    - Each premium plan has limited SMS/month
    - Track usage in `subscriptions` document
  - [ ] SMS for shift reminders (24h before)
  - [ ] SMS for urgent cancellations
  - [ ] Delivery tracking
- **Tasks**:
  - Setup Twilio in Cloud Functions
  - SMS credit tracking logic
  - Update notification service for SMS channel
  - Usage tracking and alerts when credits run out
- **Estimate**: 10h

---

**STORY-037**: Advanced Reports & Export (Premium)
- **Description**: Export reports to Excel/PDF
- **Acceptance Criteria**:
  - [ ] Export button on StatsPage
  - [ ] Generate Excel with stats (exceljs)
  - [ ] Generate PDF report (puppeteer)
  - [ ] Download file from Cloud Storage
  - [ ] Only for premium users
- **Tasks**:
  - Backend endpoint: POST /api/v1/reports/export
  - Generate Excel with exceljs library
  - Generate PDF with puppeteer
  - Upload to Firebase Storage
  - Return download URL
- **Estimate**: 12h

---

**STORY-038**: Admin Messages (Bulletin Board)
- **Description**: Stable admin can post messages to all members
- **Acceptance Criteria**:
  - [ ] AdminMessagesPage
  - [ ] Create message form (title, content markdown, attachments)
  - [ ] Publish message (in-app + email notification)
  - [ ] Pin important messages
  - [ ] Members can view messages in feed
- **Tasks**:
  - Create AdminMessagesPage
  - CreateMessageForm with markdown editor
  - Firestore subcollection: `stables/{id}/messages`
  - Cloud Function to send notifications
  - MessageFeed component for guests
- **Estimate**: 10h

---

#### Epic 4.3: Testing & Quality Assurance
**Priority**: P0 (Critical)
**Estimate**: 1 week
**Dependencies**: All previous epics

**Stories**:

**STORY-039**: Unit Tests (Frontend)
- **Description**: Write unit tests for React components and hooks
- **Acceptance Criteria**:
  - [ ] Test coverage >80% for critical components
  - [ ] Tests for:
    - Auth flows (login, signup, logout)
    - Form validation (Zod schemas)
    - Hooks (useAuth, usePermissions, etc.)
    - Utility functions
  - [ ] Vitest + Testing Library setup
  - [ ] CI pipeline runs tests
- **Tasks**:
  - Setup Vitest and Testing Library
  - Write tests for AuthContext
  - Write tests for forms (React Hook Form)
  - Mock Firebase SDK
  - Integrate in CI/CD pipeline
- **Estimate**: 16h

---

**STORY-040**: Unit Tests (Backend)
- **Description**: Write unit tests for backend services
- **Acceptance Criteria**:
  - [ ] Test coverage >80% for business logic
  - [ ] Tests for:
    - Fairness algorithm
    - Shift assignment logic
    - Notification service
    - Subscription validation
  - [ ] Mock Firestore with @firebase/rules-unit-testing
  - [ ] CI pipeline runs tests
- **Tasks**:
  - Setup Vitest for backend
  - Mock Firestore and external APIs
  - Write tests for SchedulingService
  - Write tests for NotificationService
  - Integrate in CI/CD
- **Estimate**: 16h

---

**STORY-041**: E2E Tests (Playwright)
- **Description**: End-to-end tests for critical user flows
- **Acceptance Criteria**:
  - [ ] Tests for:
    - Signup → Create stable → Invite member → Accept
    - Login → Create shift types → Create schedule → Publish
    - Guest login → Book shift → Cancel shift
    - Admin → View stats → Export report
  - [ ] Cross-browser testing (Chrome, Firefox, Safari)
  - [ ] CI pipeline runs E2E tests nightly
- **Tasks**:
  - Setup Playwright
  - Write E2E test specs
  - Setup test data fixtures
  - Integrate in CI/CD (nightly runs)
- **Estimate**: 20h

---

**STORY-042**: Performance Optimization
- **Description**: Optimize application for performance
- **Acceptance Criteria**:
  - [ ] Frontend:
    - Page load <2s (3G network)
    - Time to Interactive <3s
    - Bundle size <500KB initial
    - Lighthouse score >90
  - [ ] Backend:
    - API response time <200ms (p95)
    - Cloud Run cold start <1s
  - [ ] Firestore:
    - Optimized queries (composite indexes)
    - Denormalized data for fast reads
- **Tasks**:
  - Analyze bundle size (vite-bundle-visualizer)
  - Code splitting for routes
  - Lazy load images
  - Optimize Firestore queries
  - Add caching headers
  - Performance monitoring with Firebase Performance
- **Estimate**: 12h

---

**STORY-043**: Security Audit
- **Description**: Security review of the system
- **Acceptance Criteria**:
  - [ ] Firestore Security Rules tested (unit tests)
  - [ ] No sensitive data in client-side code
  - [ ] API authentication tested
  - [ ] OWASP Top 10 checks:
    - XSS prevention (React escapes by default)
    - CSRF protection (SameSite cookies)
    - SQL Injection (N/A - NoSQL)
    - Sensitive data exposure (check logs)
  - [ ] Penetration testing (basic)
- **Tasks**:
  - Firestore Security Rules unit tests
  - Code review for security issues
  - OWASP checklist
  - Test authentication flows
  - Audit logging review
- **Estimate**: 10h

---

#### Epic 4.4: Beta Launch Preparation
**Priority**: P0 (Critical)
**Estimate**: 1 week
**Dependencies**: All previous epics

**Stories**:

**STORY-044**: Production Deployment Setup (Future)
- **Description**: Setup production environment and optionally staging
- **Note**: This is a future story that will be executed when MVP1 is fully developed and tested in dev environment
- **Acceptance Criteria**:
  - [ ] Firebase production project created (optionally staging)
  - [ ] GCP production project configured
  - [ ] Production domain configured (e.g. app.equiduty.se)
  - [ ] SSL certificates
  - [ ] Production Stripe account (live mode)
  - [ ] Monitoring and alerting setup
  - [ ] Backup strategy configured
  - [ ] CI/CD for production deployment
- **Tasks**:
  - Create production Firebase project (+ staging if desired)
  - Configure custom domain
  - Deploy production environment
  - Setup monitoring (Cloud Monitoring, Sentry)
  - Configure backups (daily Firestore export)
  - Update CI/CD pipeline for production
- **Estimate**: 12h (+4h for staging environment if desired)

---

**STORY-045**: Beta User Documentation
- **Description**: Create user documentation for beta users
- **Acceptance Criteria**:
  - [ ] User guide (how to use the system)
  - [ ] Video tutorials (optional)
  - [ ] FAQ page
  - [ ] Support contact information
  - [ ] Known issues list
- **Tasks**:
  - Write user guide (Markdown or Notion)
  - Create FAQ page in the app
  - Setup support email (support@equiduty.se)
  - Create onboarding flow for new users
- **Estimate**: 10h

---

**STORY-046**: Beta Launch
- **Description**: Launch beta to first 5-10 stables
- **Acceptance Criteria**:
  - [ ] 5-10 beta stables recruited
  - [ ] Onboarding sessions completed
  - [ ] Feedback mechanism (in-app or Google Form)
  - [ ] Monitor errors and performance
  - [ ] Weekly check-ins with beta users
  - [ ] Collect NPS score after 2 weeks
- **Tasks**:
  - Recruit beta users
  - Onboarding calls
  - Setup feedback form
  - Monitor system health
  - Weekly reports to stakeholders
- **Estimate**: Ongoing (post-launch)

---

## 📊 Estimation Summary

| **Phase** | **Epics** | **Stories** | **Estimate** |
|-----------|-----------|-------------|--------------|
| Phase 1: Foundation | 3 | 10 | 3 weeks |
| Phase 2: Core Features | 2 | 9 | 3.5 weeks |
| Phase 3: Booking & Notifications | 3 | 12 | 3 weeks |
| Phase 4: Payments & Polish | 4 | 15 | 5.5 weeks |
| **TOTAL** | **12** | **46** | **15 weeks** |

**Note**: Estimates assume 2 full-time developers working in parallel

---

## 🎯 Sprint Planning (2-week sprints)

### Sprint 1 (Week 1-2): Infrastructure & Auth
- STORY-001 to STORY-007
- Deliverable: Auth working, basic UI, CI/CD pipeline

### Sprint 2 (Week 3-4): UI & Stable Management
- STORY-008 to STORY-015
- Deliverable: Create stable, invite members, member management

### Sprint 3 (Week 5-6): Shift Types & Scheduling
- STORY-016 to STORY-019
- Deliverable: Create shift types, generate schedules, fairness algorithm

### Sprint 4 (Week 7-8): Booking System
- STORY-020 to STORY-024
- Deliverable: Calendar view, book/swap/cancel shifts, comments

### Sprint 5 (Week 9-10): Notifications & Stats
- STORY-025 to STORY-031
- Deliverable: Email notifications, in-app notifications, stats dashboard

### Sprint 6 (Week 11-12): Payments
- STORY-032 to STORY-035
- Deliverable: Stripe integration, subscription management, payment analytics

### Sprint 7 (Week 13-14): Premium Features & Testing
- STORY-036 to STORY-043
- Deliverable: SMS, export, admin messages, tests

### Sprint 8 (Week 15-16): Beta Launch Prep & Launch
- STORY-044 to STORY-046
- Deliverable: Production deployment, documentation, beta launch

---

## 🚨 Risks & Mitigation

### Risk 1: Fairness Algorithm Complexity
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Start with simple greedy algorithm
- Iterate based on user feedback
- Consider constraint solver library if needed

### Risk 2: Stripe Integration Issues
**Probability**: Low
**Impact**: High
**Mitigation**:
- Thorough testing in test mode
- Stripe CLI for local webhook testing
- Fallback plan: Manual invoicing via Stripe Dashboard

### Risk 3: Performance Issues with Firestore
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Denormalize data for critical queries
- Pre-compute analytics
- Monitor query performance
- Ready to migrate to PostgreSQL if needed (ADR-004)

### Risk 4: User Adoption
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Beta launch with supportive users
- Rapid iteration based on feedback
- In-person onboarding for first stable
- Free tier to lower adoption barrier

---

## 📈 Success Criteria (Post-Launch)

**After 3 months**:
- [ ] 10 active stables
- [ ] 200+ total stable guests
- [ ] >80% retention rate
- [ ] NPS >50
- [ ] <0.1% error rate
- [ ] <2s page load time

**After 6 months**:
- [ ] 25 active stables
- [ ] 500+ stable guests
- [ ] 50K SEK MRR
- [ ] >85% retention rate
- [ ] Feature requests cataloged for v2

---

**Version History**:
| **Version** | **Date** | **Changes** | **Author** |
|-------------|-----------|---------------|----------------|
| 1.0 | 2025-12-25 | Initial implementation plan | Product & Dev Team |

---

*Related documents: [PRD.md](./PRD.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) | [SETUP.md](./SETUP.md)*
