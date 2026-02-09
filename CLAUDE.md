# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EquiDuty** - A modern SaaS platform for stable owners and guests to manage and fairly distribute daily chores through an intelligent, weight-based booking system.

**Status**: Phase 1 - Foundation (Planning stage)
**Default Language**: Swedish (sv) with English (en) support
**Tech Stack**: React 19, Firebase, Google Cloud Platform

## Architecture

### Monorepo Structure
```
equiduty/
├── packages/
│   ├── frontend/          # React 19 SPA (Vite + TypeScript)
│   ├── api/               # Cloud Run service (Node.js 24, Fastify)
│   ├── functions/         # Cloud Functions Gen2 (Node.js 22)
│   └── shared/            # Shared TypeScript types and utilities
├── terraform/             # Infrastructure as Code
├── docs/                  # Comprehensive project documentation
└── .github/workflows/     # CI/CD pipelines
```

### Key Architectural Decisions

**Frontend**:
- React 19 with functional components and hooks only
- State management: React Context + TanStack Query + Firestore SDK (no Redux)
- Real-time data via Firestore listeners
- Protected routes via React Router v6
- UI components: shadcn/ui with Tailwind CSS
- **Internationalization (i18n)**: react-i18next with Swedish (sv) as default, English (en) supported

**Backend**:
- **Cloud Run API**: Main REST API service (Node.js 24, Fastify framework)
- **Cloud Functions**: Background jobs, scheduled tasks, webhooks (Node.js 22)
- **Firestore**: NoSQL database with real-time capabilities
- **Firebase Auth**: JWT-based authentication with role-based access control

**Integration Services**:
- Stripe: Payments and subscriptions
- SendGrid: Transactional emails
- Twilio: SMS notifications (optional for MVP)
- Telegram Bot API: Notification channel

### Data Flow Patterns

1. **Authentication Flow**: Firebase Auth (JWT) → Custom claims for RBAC → Protected routes
2. **Real-time Updates**: Firestore listeners → React state → UI updates
3. **Background Processing**: Firestore triggers → Cloud Functions → External APIs
4. **File Storage**: Firebase Storage with signed URLs and security rules

## Task Commands (Recommended)

This project uses [Task](https://taskfile.dev) for common operations. Install via `brew install go-task`.

### Quick Reference
```bash
task --list                              # List all available tasks
task env                                 # Show current environment config
task env:switch ENV=staging              # Switch to different environment
```

### Frontend Deployments

**IMPORTANT**: The frontend consists of TWO separate Firebase Hosting sites:
- **Landing site** → Marketing pages at `equiduty-{env}.web.app`
- **App site** → React SPA at `equiduty-{env}-app.web.app`

The custom domain `app.equiduty.se` points to the **app site** in production.

```bash
# Deploy both landing + app (RECOMMENDED for production)
task deploy:frontend:all ENV=prod TAG=v0.x.y

# Deploy individually (for targeted updates)
task deploy:landing ENV=dev       # Landing site only
task deploy:frontend ENV=dev      # React app only
task deploy:all ENV=prod TAG=v0.x.y  # Everything (frontend, API, functions, rules)
```

**Verification after deployment**:
```bash
# Verify both hosting targets are accessible
bash scripts/verify-hosting-deployment.sh prod
```

### Backend Deployments
```bash
task deploy:api                          # Build & deploy Cloud Run API
task deploy:functions                    # Deploy all Cloud Functions
task deploy:function NAME=scanForReminders  # Deploy specific function

# Deploy to other environments
task deploy:api ENV=staging
task deploy:api ENV=prod TAG=v0.x.y
```

### Terraform
```bash
task tf:init                             # Initialize Terraform
task tf:plan                             # Preview changes
task tf:apply                            # Apply changes
task tf:output                           # Show outputs
task tf:init-backend                     # Create state bucket
```

### Development
```bash
task dev:frontend                        # Start frontend dev server
task dev:api                             # Start API dev server
task dev:emulators                       # Start Firebase emulators
task build                               # Build all packages
task test                                # Run all tests
```

### Logs & Monitoring
```bash
task logs:api                            # View Cloud Run logs
task logs:functions                      # View all function logs
task logs:function NAME=processQueue     # View specific function logs
task logs:tail:api                       # Live tail API logs
```

### Secrets
```bash
task secrets:list                        # List all secrets
task secrets:set SECRET=jwt-secret       # Set a secret value
task secrets:get SECRET=jwt-secret       # Get a secret value
```

### Scheduler
```bash
task scheduler:list                      # List scheduler jobs
task scheduler:run JOB=dev-monthly-time-accrual-scheduler  # Trigger job
task scheduler:pause JOB=...             # Pause job
task scheduler:resume JOB=...            # Resume job
```

## Development Commands

### Environment Setup
```bash
# Initial setup (first time only)
npm install                              # Install root dependencies
npm run install:all                      # Install all package dependencies
firebase login                           # Authenticate with Firebase
gcloud auth application-default login    # Set up GCP credentials
cp .env.example .env                     # Create environment files

# Configure environment variables in:
# - packages/frontend/.env
# - packages/api/.env
# - packages/functions/.env
```

### Development Workflow
```bash
# Using Task (recommended)
task dev:emulators                       # Terminal 1: Firebase emulators
task dev:frontend                        # Terminal 2: Frontend dev server
task dev:api                             # Terminal 3: Cloud Run API

# Or manually
firebase emulators:start                 # Terminal 1: Firebase emulators
cd packages/frontend && npm run dev      # Terminal 2: Frontend dev server
cd packages/api && npm run dev           # Terminal 3: Cloud Run API

# Emulator UI available at: http://localhost:4000
```

### Testing
```bash
# Unit tests
cd packages/frontend && npm run test     # Frontend tests
cd packages/api && npm run test          # API tests
cd packages/functions && npm run test    # Functions tests

# E2E tests (Playwright)
npx playwright install                   # Install browsers (first time)
npm run test:e2e                         # Run E2E tests
npm run test:e2e:ui                      # Open Playwright UI

# Run all tests
npm run test:all
```

### Code Quality
```bash
npm run lint                             # Lint all packages
npm run format                           # Format code with Prettier
npm run build:all                        # Build all packages
```

### Firebase Operations
```bash
firebase use equiduty-dev           # Switch to dev environment
firebase deploy --only firestore:rules   # Deploy security rules
firebase deploy --only firestore:indexes # Deploy database indexes
firebase deploy --only hosting           # Deploy frontend
firebase deploy --only functions         # Deploy Cloud Functions
firebase functions:log                   # View function logs

# Emulator data persistence
npm run emulator:export                  # Export current emulator data to .firebase-data/
npm run emulator:clear                   # Clear all saved emulator data
npm run emulator:start                   # Start with auto-import and export-on-exit
```

### Google Cloud Operations
```bash
gcloud run services list                 # List Cloud Run services
gcloud run deploy api-service \
  --source packages/api \
  --region europe-west1                  # Deploy API service

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

### Terraform Operations
```bash
# Navigate to environment directory
cd terraform/environments/dev

# Initialize Terraform (first time or after adding providers)
terraform init

# Preview changes
terraform plan

# Apply changes
terraform apply

# View current state
terraform state list
terraform state show <resource-address>

# Import existing resources
./scripts/import-existing.sh equiduty-dev dev
```

**Managed Resources**: Cloud Run, Cloud Functions, Service Accounts, Secrets, Monitoring
**Manual Resources**: Firestore Rules, Firestore Indexes, Storage Rules, Hosting (via Firebase CLI)

See `terraform/README.md` for detailed documentation.

### Troubleshooting
```bash
# Kill process on occupied port
lsof -ti:5003 | xargs kill -9

# Restart dev environment after .env changes
# (Vite requires VITE_ prefix for frontend variables)

# Stripe webhook testing locally
stripe listen --forward-to localhost:5003/api/v1/webhooks/stripe
```

#### Frontend Returns 404 After Deployment

If `app.equiduty.se` returns 404:

1. **Check both hosting targets are deployed**:
   ```bash
   curl -I https://equiduty-prod.web.app/        # Landing
   curl -I https://equiduty-prod-app.web.app/    # App
   ```

2. **Run verification script**:
   ```bash
   bash scripts/verify-hosting-deployment.sh prod
   ```

3. **Redeploy both targets**:
   ```bash
   task deploy:frontend:all ENV=prod TAG=v0.x.y
   ```

4. **Check Firebase Console**:
   - Visit: https://console.firebase.google.com/project/equiduty-prod/hosting/sites
   - Verify both `equiduty-prod` and `equiduty-prod-app` show recent deployments
   - Verify custom domain `app.equiduty.se` is connected to `equiduty-prod-app`

## API Documentation
**Location**: `packages/api/openapi.json` (auto-generated, do not commit to git)

**Adding OpenAPI Annotations**:
# See pattern in packages/api/src/routes/auth.ts (3 routes fully annotated)
# Complete guide: packages/api/docs/OPENAPI_ANNOTATION_GUIDE.md
# Summary: OPENAPI_IMPLEMENTATION_SUMMARY.md

**IMPORTANT - API Stability**:
- The API serves **iOS app**, **Android app**, and **web frontend**
- **Avoid breaking changes** - requires coordinated updates across all platforms
- Use semantic versioning for API paths (`/api/v1/`, `/api/v2/`)
- Mark deprecated endpoints in OpenAPI spec before removal
- Test changes against all client applications before deployment

**IMPORTANT - Annotation Strategy**:
- ✅ **Incremental approach** - Annotate routes when creating/modifying them
- ✅ **Pattern established** - See `packages/api/src/routes/auth.ts` for reference
- ❌ **Don't use `$ref`** - Causes Fastify validation errors (use inline schemas)
- ⚠️ **Timestamps** - Use `{ type: 'string', format: 'date-time', description: 'ISO 8601 timestamp' }` to match `serializeTimestamps()` output
- 🔥 **CRITICAL** - ALWAYS wrap Firestore responses in `serializeTimestamps()` to convert Timestamp objects to ISO strings

**Comprehensive API Documentation**:
- **Quick Guide**: `packages/api/docs/OPENAPI_ANNOTATION_GUIDE.md` - How to annotate routes
- **Full Docs**: `packages/api/docs/OPENAPI.md` - Complete implementation details
- **Summary**: `OPENAPI_IMPLEMENTATION_SUMMARY.md` - What was delivered and why

### Firebase Configuration

**Service Account Security**:
- Service account keys stored in `packages/api/service-account-*.json`
- **NEVER** commit service account files to git (already in .gitignore)
- Create separate service accounts for dev/staging/production environments

**Google OAuth Setup**:
- OAuth Client ID configured in GCP Console → APIs & Services → Credentials
- Authorized JavaScript origins: `http://localhost:5173`, `https://equiduty-dev.web.app`
- Authorized redirect URIs: `http://localhost:5173/__/auth/handler`
- Firebase SDK handles OAuth flow automatically

**Emulator Data Persistence**:
- Emulator data automatically saved to `.firebase-data/` directory
- Data persists across emulator restarts (users, Firestore, Storage)
- Manual export: `npm run emulator:export` (saves current state)
- Manual import: Automatic on `npm run emulator:start`
- Clear data: `npm run emulator:clear` (removes all saved data)
- `.firebase-data/` is gitignored (not committed to repository)

### Environment Variables

**Frontend** (`packages/frontend/.env`):
- Must use `VITE_` prefix for all environment variables
- Firebase config, API URLs, Stripe publishable key

**Backend** (`packages/api/.env`):
- Firebase credentials, Stripe secret key, external API keys
- Service account path: `./service-account-dev.json`

**Functions** (`packages/functions/.env`):
- Webhook secrets, notification API keys

### Security Rules

**Firestore Security Rules**:
- Deployed via: `firebase deploy --only firestore:rules`
- Located in: `firestore.rules`
- Test in Emulator UI before production deployment
- Users must be authenticated for most operations
- Role-based access control via custom claims

### Role-Based Access Control (RBAC)

**Implementation Status**: ✅ Phase 1 Complete (Backend Infrastructure)

The system implements **field-level RBAC** for horse data with 5 access levels:
- **Level 1: public** - Basic horse information (all stable members)
- **Level 2: basic_care** - Care instructions and equipment (grooms, riders)
- **Level 3: professional** - Medical and identification data (veterinarians, farriers, dentists)
- **Level 4: management** - Owner information and notes (administrators, stable owners)
- **Level 5: owner** - Full access to all fields (horse owners)

**Key Principles**:
- Field-level access control **enforced on backend** (not frontend filtering)
- Horse owners always get full access regardless of other roles
- Multi-role users get highest applicable access level
- Health records filtered by professional specialty (veterinarians see only veterinary records)

**⚠️ Important for Development**:
- Use `getMyHorses()` instead of deprecated `getUserHorses()`
- Check `horse._accessLevel` and `horse._isOwner` metadata in responses
- Test with different user roles to verify field projection

**Comprehensive Documentation**: See `docs/RBAC.md` for:
- Complete field visibility matrix by role
- Access level determination logic
- Health records filtering rules
- API testing examples
- Troubleshooting guide
- Migration status and future enhancements

**Implementation Files**:
- Backend authorization: `packages/api/src/utils/authorization.ts`
- Field projection: `packages/api/src/utils/horseProjection.ts`
- API routes: `packages/api/src/routes/horses.ts`
- Frontend service: `packages/frontend/src/services/horseService.ts`

### Internationalization (i18n)

**Configuration**:
- Library: `react-i18next` with `i18next`
- Default language: Swedish (`sv`)
- Supported languages: Swedish (`sv`), English (`en`)
- Language detection: Browser preference with localStorage persistence

**Translation Files**:
```
packages/frontend/src/locales/
├── sv/                      # Swedish translations (default)
│   ├── common.json          # Shared labels, buttons, errors
│   ├── auth.json            # Authentication screens
│   ├── dashboard.json       # Dashboard content
│   ├── horses.json          # Horse management
│   ├── organizations.json   # Organization/stable management
│   ├── schedules.json       # Scheduling and shifts
│   └── ...
└── en/                      # English translations
    └── (same structure)
```

**Usage in Components**:
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation(['common', 'horses']);

  return (
    <div>
      <h1>{t('horses:titles.myHorses')}</h1>
      <button>{t('common:buttons.save')}</button>
    </div>
  );
}
```

**Translation Key Conventions**:
- Use namespaced keys: `namespace:section.key`
- Group by feature/domain in separate JSON files
- Keep keys descriptive: `buttons.save`, `errors.required`, `titles.editHorse`
- Always add keys to both `sv/` and `en/` files

**Adding New Translations**:
1. Add key to Swedish file first (`sv/*.json`)
2. Add corresponding key to English file (`en/*.json`)
3. Use `t('namespace:key')` in component
4. Test both languages via language switcher

### File Structure Conventions

**React Components**:
```
ComponentName/
  index.tsx                  # Public exports
  ComponentName.tsx          # Main component
  ComponentName.test.tsx     # Tests
  ComponentName.styles.ts    # Styles (if needed)
```

**TypeScript Standards**:
- Use strict mode
- Prefer interfaces over types
- Descriptive variable names
- JSDoc comments for public functions

### Git Workflow

**Branching Model** (see `docs/GIT_BRANCHING_STRATEGY.md` for full details):
- **`develop`**: Default branch. Daily work, deploys to dev.
- **`main`**: Release-ready. Merges from `develop`. Tags created here.
- **`feature/*`**: Larger features off `develop`. Small work directly on `develop`.
- **`hotfix/*`**: Urgent fixes off `main`. Merge to `main`, tag, deploy, then back-merge to `develop`.

**Deployment Safety**:
- **dev**: `task deploy:api` — works from any branch, no checks.
- **staging**: `task deploy:api ENV=staging` (must be on synced `main`) or `task deploy:api ENV=staging TAG=v0.x.y`.
- **prod**: `task deploy:api ENV=prod TAG=v0.x.y` — TAG is mandatory.
- Staging/prod block on dirty working tree. TAG deploys auto-checkout the tag and restore your branch.

**Branch Naming**:
- `feature/feature-name` - New features
- `hotfix/bug-description` - Urgent fixes off `main`
- `fix/bug-description` - Bug fixes
- `docs/update-description` - Documentation
- `refactor/description` - Code restructuring

**Tag Naming**: Semantic versioning on `main` — `v0.13.0`, `v0.13.1`, `v1.0.0`

**Commit Message Format**:
```
feat: add shift booking functionality
fix: resolve authentication bug
docs: update setup guide
style: format code with prettier
refactor: restructure scheduling service
test: add unit tests for fairness algorithm
chore: update dependencies
```

## Key Business Logic

### Fairness Algorithm
The system uses a weight-based algorithm to distribute chores fairly:
- Each task has a weight based on effort/time required
- System tracks total weight per user over time
- Booking suggestions prioritize users with lower accumulated weights
- Monthly resets maintain long-term fairness

### User Roles & Permissions
1. **System Admin**: Platform-wide management
2. **Stable Owner**: Stable management, user administration, shift creation
3. **Stable Guest**: Shift booking, personal dashboard access

### Notification System

Multi-channel notification strategy:
1. **Email** (SMTP via send.one.com): Primary channel, transactional emails. Password stored in Secret Manager (`dev-smtp-password`). See `.env.example` files and `packages/functions/src/lib/smtp.ts` for configuration.
2. **SMS** (Twilio): Optional, high-priority alerts
3. **Telegram Bot**: User-preferred notification channel
4. **In-app**: Real-time notifications via Firestore

## Documentation References

Comprehensive documentation located in `docs/`:
- **[PRD.md](./docs/PRD.md)**: Product requirements, user personas, success metrics
- **[TECH_STACK.md](./docs/TECH_STACK.md)**: Detailed tech stack, infrastructure, cost estimation
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: System architecture, data flow diagrams, ADRs, security model
- **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)**: Firestore collections, schemas, security rules, queries
- **[RBAC.md](./docs/RBAC.md)**: Role-based access control system, field-level permissions, API reference
- **[SETUP.md](./docs/SETUP.md)**: Complete development setup guide, troubleshooting
- **[IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)**: 4-phase roadmap, 46 user stories, sprint planning
- **[NAMING_STANDARDS.md](./docs/NAMING_STANDARDS.md)**: Resource naming conventions for all environments
- **[GIT_BRANCHING_STRATEGY.md](./docs/GIT_BRANCHING_STRATEGY.md)**: Branch model, deployment rules, tag conventions, workflow examples

## Common Development Tasks

**Add a new Cloud Function**:
1. Create function in `packages/functions/src/`
2. Export in `packages/functions/src/index.ts`
3. Add environment variables to `packages/functions/.env`
4. Test with Firebase emulator
5. Deploy: `firebase deploy --only functions:functionName`

**Add a new API endpoint**:
1. Create route handler in `packages/api/src/routes/`
2. Register route in `packages/api/src/index.ts`
3. Add types to `packages/shared/src/types/`
4. Test locally with `curl` or Postman
5. Deploy: `gcloud run deploy api-service --source packages/api`

**Add a new React component**:
1. Create component directory in `packages/frontend/src/components/`
2. Follow file structure convention (see above)
3. Use shadcn/ui components as base
4. Add TypeScript interfaces for props
5. Write unit tests with Testing Library

**Update Firestore schema**:
1. Update TypeScript interfaces in `packages/shared/src/types/`
2. Update security rules in `firestore.rules`
3. Update indexes in `firestore.indexes.json` if needed
4. Deploy rules: `firebase deploy --only firestore:rules`
5. Deploy indexes: `firebase deploy --only firestore:indexes`
6. Update documentation in `docs/DATABASE_SCHEMA.md`

## Performance Optimization

**Frontend**:
- Use `React.memo()` for expensive components
- Lazy load routes with `React.lazy()`
- Optimize images (WebP format)
- TanStack Query for caching and request deduplication
- Firestore offline persistence enabled

**Backend**:
- Cloud Run auto-scaling (0 → N instances)
- Firestore composite indexes for complex queries
- Cloud CDN for static assets via Firebase Hosting
- Firebase Storage CDN for images

**Monitoring**:
- Bundle size analysis: `npm run analyze`
- Firebase Performance Monitoring
- Cloud Run metrics in GCP Console

## Current Implementation Phase

**Phase 1: Foundation** (Weeks 1-3)
- Infrastructure setup
- Firebase configuration
- Authentication system
- Basic UI framework

See `docs/IMPLEMENTATION_PLAN.md` for complete roadmap and user stories.
