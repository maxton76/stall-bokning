# Tech Stack - Stable Booking System

## 📋 Document Information

| **Attribute** | **Value** |
|--------------|-----------|
| **Version** | 1.0 |
| **Date** | 2025-12-25 |
| **Status** | Draft |
| **Related documents** | [PRD.md](./PRD.md), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) |

---

## 🎯 Overview

The stable booking system uses a modern, cloud-based architecture built on Firebase and Google Cloud Platform. The architecture is designed for scalability, security, and easy maintenance.

### Architecture Principles
1. **Serverless-first**: Minimize infrastructure management through serverless services
2. **Firebase ecosystem**: Leverage Firebase's integrated services for rapid development
3. **Modularity**: Separate frontend, backend, and functions for independent deployment
4. **Scalability**: Auto-scaling via Cloud Run and Firebase
5. **Cost-effectiveness**: Pay-as-you-go with Firebase's freemium model

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USERS                                    │
│  (Web Browser - Desktop/Mobile/Tablet)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 FIREBASE HOSTING                             │
│  • React 19 SPA (Vite build)                                │
│  • CDN distribution                                          │
│  • SSL/TLS certificates                                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ FIREBASE AUTH    │ │ FIRESTORE DB │ │ CLOUD STORAGE    │
│ • User Auth      │ │ • NoSQL DB   │ │ • File uploads   │
│ • JWT tokens     │ │ • Real-time  │ │ • Images         │
│ • RBAC           │ │ • Offline    │ │ • Exports        │
└──────────────────┘ └──────────────┘ └──────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                            │ REST API / Cloud Functions
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE CLOUD BACKEND                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ CLOUD RUN SERVICES (Node.js 24)                    │    │
│  │ • Main API (Express/Fastify)                       │    │
│  │ • Containerized workloads                          │    │
│  │ • Auto-scaling (0 → N instances)                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ CLOUD FUNCTIONS GEN2 (Node.js 22)                  │    │
│  │ • Background jobs (notifications)                  │    │
│  │ • Scheduled tasks (cron jobs)                      │    │
│  │ • Event-driven processing                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ STRIPE API       │ │ TWILIO SMS   │ │ SENDGRID EMAIL   │
│ • Payments       │ │ • SMS notify │ │ • Transactional  │
│ • Subscriptions  │ │              │ │ • Bulk emails    │
└──────────────────┘ └──────────────┘ └──────────────────┘
```

---

## 🎨 Frontend Stack

### Core Framework
- **React 19**: Modern hooks, concurrent features, Server Components
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type safety and better developer experience

### UI & Styling
- **Tailwind CSS 3.x**: Utility-first CSS framework
- **shadcn/ui**: Headless UI component library
  - Accessible components (ARIA-compliant)
  - Customizable and themeable
  - Radix UI primitives
- **Lucide React**: Icon library

### State Management
- **Firebase SDK**: Real-time data syncing with Firestore
- **React Context API**: Global state for auth, user, settings
- **TanStack Query (React Query)**: Server state management and caching
  - Intelligent caching of Firestore queries
  - Automatic background refetching
  - Optimistic updates

### Routing & Navigation
- **React Router v6**: Client-side routing
  - Protected routes (requires auth)
  - Role-based access control
  - Lazy loading of routes

### Form Handling & Validation
- **React Hook Form**: Performant form state management
- **Zod**: Schema validation
  - Type-safe validation
  - Reusable schemas for both frontend and backend

### Firebase Integration
- **Firebase SDK v10+**:
  - `firebase/auth`: Authentication
  - `firebase/firestore`: Real-time database
  - `firebase/storage`: File uploads
  - `firebase/analytics`: Usage analytics
  - `firebase/performance`: Performance monitoring

### Testing
- **Vitest**: Faster than Jest, native ESM support
- **Testing Library**: User-centric testing
- **Playwright**: E2E testing (cross-browser)

### Build & Deploy
- **Vite Build**: Optimized production build
  - Tree-shaking
  - Code splitting
  - Asset optimization
- **Firebase Hosting**:
  - Global CDN
  - Auto SSL certificates
  - Preview channels for staging
  - Rollback support

### Mobile-First Design & PWA
- **Viewport Strategy**: Mobile-first (320px-768px primary target)
- **Touch Optimization**:
  - Minimum 44x44px touch targets (Apple HIG compliance)
  - Thumb-zone navigation for one-handed use
  - Swipe gestures for navigation and interaction
- **Progressive Web App (PWA)**:
  - Service Worker for offline functionality
  - App Manifest for "Add to Home Screen"
  - Push Notifications (browser-based)
  - Pull-to-refresh for data updates
- **Responsive Breakpoints**:
  - Mobile: 320px - 767px (primary)
  - Tablet: 768px - 1023px (enhanced)
  - Desktop: 1024px+ (full features)
- **Future Native Migration**:
  - API-first design ready for native clients
  - Shared business logic (TypeScript)
  - React Native migration path (iOS/Android)

### Performance Optimization
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: WebP/AVIF with fallbacks
- **Bundle Analysis**: Vite bundle visualizer
- **Mobile Performance**: Optimized for 3G networks (<3s load time)

---

## ⚙️ Backend Stack

### Architecture Pattern
**Hybrid Serverless Architecture**:
- **Cloud Run Services**: Stateful API server (long-running requests)
- **Cloud Functions Gen2**: Event-driven tasks (notifications, cron jobs)

### Cloud Run Services (Node.js 24)

#### Main API Service
**Framework**:
- **Fastify** or **Express.js**
  - Recommendation: Fastify (faster, native TypeScript support)
  - RESTful API design
  - Middleware for auth, logging, error handling

**Features**:
- **TypeScript**: Full type safety
- **Containerized**: Docker container deployment
- **Auto-scaling**: 0 → N instances based on load
- **JWT Validation**: Verifies Firebase Auth tokens
- **CORS**: Configured for Firebase Hosting origin
- **Rate Limiting**: Prevent abuse
- **Request Validation**: Zod schemas for input validation

**Endpoints** (examples):
```
POST   /api/v1/stables              - Create new stable
GET    /api/v1/stables/:id          - Get stable details
PUT    /api/v1/stables/:id          - Update stable
DELETE /api/v1/stables/:id          - Delete stable

POST   /api/v1/schedules            - Create schedule
GET    /api/v1/schedules/:id        - Get schedule
PUT    /api/v1/schedules/:id        - Update schedule

POST   /api/v1/shifts/:id/assign    - Assign shift
POST   /api/v1/shifts/:id/swap      - Swap shift
DELETE /api/v1/shifts/:id/cancel    - Cancel shift

GET    /api/v1/reports/stable/:id   - Get statistics
POST   /api/v1/reports/export       - Export to PDF/Excel
```

**Environment Variables**:
```bash
FIREBASE_PROJECT_ID=equiduty-prod
FIREBASE_SERVICE_ACCOUNT=./service-account.json
STRIPE_SECRET_KEY=sk_live_...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SENDGRID_API_KEY=...
NODE_ENV=production
PORT=8080
```

### Cloud Functions Gen2 (Node.js 22)

#### Background Jobs
**Event-Driven Functions**:

1. **onUserCreated** (Auth Trigger):
   - Creates user document in Firestore
   - Sends welcome email
   - Initializes user settings

2. **onShiftAssigned** (Firestore Trigger):
   - Sends notification to assigned user
   - Updates points statistics
   - Logs event

3. **onShiftCancelled** (Firestore Trigger):
   - Notifies stable administrator
   - (Optional) Notifies other stable guests
   - Updates availability pool

4. **sendScheduledReminders** (Scheduled - Cron):
   - Runs every hour
   - Finds upcoming shifts (24h, 12h, 2h before)
   - Sends reminders via email/SMS/Telegram

5. **checkUnassignedShifts** (Scheduled - Cron):
   - Runs every 6 hours
   - Identifies unstaffed shifts <24h
   - Escalates to stable administrator

6. **generateMonthlyReports** (Scheduled - Cron):
   - Runs last day of each month
   - Generates monthly summary
   - Sends to all stable guests

7. **processSubscriptionUpdates** (HTTP Callable):
   - Handles Stripe webhooks
   - Updates subscription status
   - Handles failed payments

**Cron Schedule**:
```yaml
sendScheduledReminders: "0 * * * *"    # Every hour
checkUnassignedShifts: "0 */6 * * *"   # Every 6 hours
generateMonthlyReports: "0 0 1 * *"    # 00:00 first day of each month
cleanupOldData: "0 2 * * 0"            # 02:00 every Sunday
```

### Shared Libraries
**Monorepo structure** (recommended):
```
/packages
  /shared           - Shared code (types, utils, validation)
  /api              - Cloud Run API service
  /functions        - Cloud Functions
  /frontend         - React app
```

**Shared Code**:
- **TypeScript Types**: Shared interfaces for User, Stable, Shift etc.
- **Zod Schemas**: Validation schemas for both frontend and backend
- **Utilities**: Date helpers, formatters, constants
- **Firebase Admin**: Initialization of Admin SDK

---

## 🗄️ Database & Storage

### Firebase Firestore
- **NoSQL Document Database**
- **Real-time syncing**: Changes propagate directly to clients
- **Offline support**: Local cache for offline-first UX
- **Security Rules**: Firestore Security Rules for access control
- **Indexing**: Composite indexes for complex queries
- **Subcollections**: Hierarchical data structure

**See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed structure**

### Firebase Authentication
- **Auth Providers**:
  - Email/Password - Traditional registration and login
  - Google Sign-In (OAuth 2.0) - One-click login with Google account
  - Apple Sign-In (future expansion)
- **OAuth Flow**:
  - Google OAuth 2.0 with Firebase SDK
  - Automatic token handling and refresh
  - Account linking between email/password and Google accounts
- **Custom Claims**: Roles and permissions (systemAdmin, stableAdmin, guest)
- **JWT Tokens**: Secure API calls to Cloud Run
- **Session Management**: Firebase handles token refresh automatically
- **Multi-Provider Support**: Users can link multiple auth methods to the same account

### Firebase Storage
- **Use Cases**:
  - User profile pictures
  - Horse images
  - Exported reports (PDF/Excel)
  - Admin announcements with attachments

**Folder Structure**:
```
/users/{userId}/profile.jpg
/stables/{stableId}/logo.jpg
/horses/{horseId}/{imageId}.jpg
/reports/{stableId}/{reportId}.pdf
```

**Storage Rules**: Role-based access, max file size limits

---

## 🔗 External Integrations

### Payment Processing
**Stripe API**:
- **Products**: Subscription plans (Freemium, Premium tiers)
- **Checkout**: Hosted checkout pages
- **Customer Portal**: Self-service billing management
- **Webhooks**: Real-time updates (payment success, subscription cancelled)
- **Payment Methods**: Card, Apple Pay, Google Pay
- **Swish Integration** (via Stripe or separate API)

**Stripe Objects**:
- `Customer`: One per stableOwner
- `Subscription`: Recurring billing
- `Invoice`: Monthly invoices
- `PaymentIntent`: One-time purchases (SMS credits)

### Communication Services

#### Email - SendGrid
- **Transactional Emails**:
  - Welcome email
  - Shift reminders
  - Monthly summaries
  - Admin announcements
- **Templates**: Dynamic templates with variable substitution
- **Tracking**: Open rates, click rates
- **API Integration**: RESTful API via Cloud Functions

#### SMS - Twilio
- **Premium Feature**: SMS notifications
- **Use Cases**:
  - Shift reminders (24h before)
  - Urgent cancellations
  - Unstaffed shift warnings
- **Tracking**: Delivery status, error handling
- **Cost Management**: SMS credits in Firestore

#### Telegram - Bot API
- **Premium Feature**: Telegram notifications
- **Bot Commands**:
  - `/start` - Link Telegram with account
  - `/upcomingshifts` - Show upcoming shifts
  - `/stats` - Show points statistics
- **Webhooks**: Receive commands via Cloud Functions

---

## 📊 Monitoring & Analytics

### Firebase Services
- **Firebase Analytics**: User behavior, feature usage
- **Firebase Performance Monitoring**: App startup time, network requests
- **Firebase Crashlytics** (future): Crash reporting for mobile apps

### Google Cloud Monitoring
- **Cloud Logging**: Centralized logging
  - Structured logs (JSON)
  - Log levels: ERROR, WARN, INFO, DEBUG
- **Cloud Trace**: Distributed tracing for API requests
- **Cloud Metrics**: Custom metrics for business logic
  - Number of bookings/day
  - API response times
  - Function execution times

### Error Tracking
- **Sentry** (recommended):
  - Frontend error tracking
  - Backend error tracking
  - Source maps for stack traces
  - User context for debugging

### Analytics Dashboard
- **Google Analytics 4**:
  - User journeys
  - Conversion funnels (signup → paid subscription)
  - Retention cohorts

---

## 🔐 Security

### Authentication & Authorization
- **Firebase Auth**: Handles JWT tokens
- **Custom Claims**: Roles stored in token
  ```json
  {
    "userId": "abc123",
    "role": "stableAdmin",
    "stableIds": ["stable1", "stable2"]
  }
  ```
- **Firestore Security Rules**: Enforce access control at database level
- **Cloud Run Auth**: Validates Firebase tokens via middleware

### Data Security
- **Encryption at Rest**: Firestore and Storage encrypt automatically
- **Encryption in Transit**: TLS 1.3 for all connections
- **Secrets Management**: Google Secret Manager for API keys
- **CORS**: Strict origin whitelist

### GDPR Compliance
- **Data Export**: Users can export their data
- **Data Deletion**: "Right to be forgotten" - Cloud Function for deletion
- **Audit Logs**: Log sensitive operations
- **Privacy Policy**: Document data usage

---

## 🚀 Deployment & CI/CD

### Infrastructure as Code
- **Terraform**:
  - Provision GCP resources (Cloud Run, Functions, IAM)
  - Firebase projects can be configured via Firebase CLI
  - Terraform state in GCS bucket

### CI/CD Pipeline (GitHub Actions recommended)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    - Run Vitest (frontend tests)
    - Run Jest/Vitest (backend tests)
    - Run Playwright (E2E tests)

  build:
    - Build frontend (Vite)
    - Build backend (Docker image)
    - Upload to Artifact Registry

  deploy-dev:
    if: branch == 'main'
    - Deploy frontend to Firebase Hosting (dev)
    - Deploy Cloud Run service (dev)
    - Deploy Cloud Functions (dev)
    - Run smoke tests
```

**Note**: Staging and production environments as well as CI/CD for these will be created later as needed.

### Environments
- **Development**:
  - Local development with Firebase Emulators
  - Firebase project: `equiduty-dev`
- **Future**: Staging and production environments will be created as needed

### Versioning & Rollback
- **Frontend**: Firebase Hosting has automatic rollback
- **Cloud Run**: Revisions can be rolled back via console/gcloud
- **Cloud Functions**: Version tagging, rollback support

---

## 🧪 Testing Strategy

### Frontend Testing
- **Unit Tests** (Vitest):
  - Components
  - Hooks
  - Utils
  - Target: >80% coverage

- **Integration Tests** (Testing Library):
  - User flows
  - Form submissions
  - API mocking

- **E2E Tests** (Playwright):
  - Critical paths (signup, booking, payment)
  - Cross-browser (Chrome, Firefox, Safari)

### Backend Testing
- **Unit Tests** (Vitest/Jest):
  - Functions
  - Validation logic
  - Business logic
  - Target: >80% coverage

- **Integration Tests**:
  - API endpoints
  - Firestore interactions (emulator)
  - External API mocks

- **Load Testing** (k6 or Artillery):
  - API endpoint performance
  - Concurrent user simulation

### Firebase Emulators
**Local Development**:
```bash
firebase emulators:start
# - Auth Emulator (9099)
# - Firestore Emulator (8080)
# - Functions Emulator (5001)
# - Hosting Emulator (5000)
# - Storage Emulator (9199)
```

---

## 💰 Cost Estimation

### Firebase (Free Tier Limits)
- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day
- **Authentication**: Unlimited
- **Hosting**: 10 GB storage, 360 MB/day transfer
- **Storage**: 5 GB storage, 1 GB/day download
- **Functions**: 2M invocations/month, 400K GB-seconds

### Firebase (Paid - Blaze Plan)
- **Firestore**: $0.06/100K reads, $0.18/100K writes
- **Functions**: $0.40/M invocations, $0.0000025/GB-second
- **Hosting**: $0.15/GB transfer
- **Storage**: $0.026/GB

### Google Cloud Platform
- **Cloud Run**: $0.00002400/vCPU-second, $0.00000250/GiB-second
  - Minimum instance: 1 vCPU, 512 MiB = ~$10-30/month
- **Cloud Functions Gen2**: Same as Cloud Run pricing

### External Services
- **Stripe**: 1.4% + 1.80 SEK per transaction (Europe)
- **Twilio SMS**: ~$0.08/SMS (0.80 SEK)
- **SendGrid**: $19.95/month for 50K emails (Free tier: 100/day)

**Estimated Monthly Cost (10 stables, 200 users)**:
- Firebase: $20-50
- Cloud Run/Functions: $30-60
- SendGrid: $19.95
- Twilio: $40 (500 SMS/month)
- **Total**: ~$110-170/month

---

## 📦 Package.json Dependencies (examples)

### Frontend (`/packages/frontend`)
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.22.0",
    "firebase": "^10.8.0",
    "@tanstack/react-query": "^5.20.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.320.0"
  },
  "devDependencies": {
    "vite": "^5.1.0",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.2.0",
    "playwright": "^1.41.0",
    "typescript": "^5.3.0"
  }
}
```

### Backend API (`/packages/api`)
```json
{
  "dependencies": {
    "fastify": "^4.26.0",
    "@fastify/cors": "^9.0.0",
    "firebase-admin": "^12.0.0",
    "stripe": "^14.15.0",
    "twilio": "^4.20.0",
    "@sendgrid/mail": "^8.1.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "vitest": "^1.2.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.11.0"
  }
}
```

### Cloud Functions (`/packages/functions`)
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.6.0",
    "zod": "^3.22.0"
  }
}
```

---

## 🔄 Data Flow Examples

### Example 1: Stable guest books shift
```
1. User clicks "Take shift" in React app
2. Frontend validates with Zod schema
3. POST /api/v1/shifts/:id/assign (Cloud Run API)
4. API validates Firebase Auth token
5. API updates Firestore (shifts collection)
6. Firestore trigger → onShiftAssigned (Cloud Function)
7. Function sends notification (SendGrid email)
8. Real-time update → Frontend via Firestore listener
9. UI updates automatically
```

### Example 2: Scheduled reminder
```
1. Cloud Scheduler triggers sendScheduledReminders (Cloud Function)
2. Function queries Firestore for shifts next 24h
3. For each shift:
   - Fetch user preferences (Firestore)
   - Send email (SendGrid) or SMS (Twilio) or Telegram (Bot API)
4. Log sent notifications (Firestore)
```

---

## 🎓 Development Setup

### Prerequisites
- Node.js 22+ (for compatibility with Cloud Functions Gen2)
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud SDK: `gcloud` CLI
- Docker (for Cloud Run local development)

### Local Development
```bash
# 1. Clone repo
git clone https://github.com/your-org/equiduty.git
cd equiduty

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Fill in Firebase config, API keys etc.

# 4. Start Firebase Emulators
firebase emulators:start

# 5. Start frontend dev server
cd packages/frontend
npm run dev
# → http://localhost:5173

# 6. Start backend dev server (Cloud Run local)
cd packages/api
npm run dev
# → http://localhost:8080

# 7. Deploy functions to emulator
cd packages/functions
npm run serve
```

---

## 📚 Documentation & Resources

### Firebase
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)

### Google Cloud
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Functions Gen2](https://cloud.google.com/functions/docs/2nd-gen/overview)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)

### External Services
- [Stripe API Reference](https://stripe.com/docs/api)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [SendGrid API](https://docs.sendgrid.com/)

---

**Version History**:
| **Version** | **Date** | **Changes** | **Author** |
|-------------|-----------|---------------|----------------|
| 1.0 | 2025-12-25 | Initial version with Firebase-focused architecture | Tech Team |

---

*Related documents: [PRD.md](./PRD.md) | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)*
