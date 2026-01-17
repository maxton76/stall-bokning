# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stallbokningssystem** - A modern SaaS platform for stable owners and guests to manage and fairly distribute daily chores through an intelligent, weight-based booking system.

**Status**: Phase 1 - Foundation (Planning stage)
**Default Language**: Swedish (sv) with English (en) support
**Tech Stack**: React 19, Firebase, Google Cloud Platform

## Architecture

### Monorepo Structure
```
stall-bokning/
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
# Start all services (requires 3 terminals)
firebase emulators:start                 # Terminal 1: Firebase emulators (Auth, Firestore, Functions, Storage)
cd packages/frontend && npm run dev      # Terminal 2: Frontend dev server (http://localhost:5555)
cd packages/api && npm run dev           # Terminal 3: Cloud Run API (http://localhost:5003)

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
firebase use stall-bokning-dev           # Switch to dev environment
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

### Troubleshooting
```bash
# Kill process on occupied port
lsof -ti:5003 | xargs kill -9

# Restart dev environment after .env changes
# (Vite requires VITE_ prefix for frontend variables)

# Stripe webhook testing locally
stripe listen --forward-to localhost:5003/api/v1/webhooks/stripe
```

## Important Development Notes

### Firebase Configuration

**Service Account Security**:
- Service account keys stored in `packages/api/service-account-*.json`
- **NEVER** commit service account files to git (already in .gitignore)
- Create separate service accounts for dev/staging/production environments

**Google OAuth Setup**:
- OAuth Client ID configured in GCP Console → APIs & Services → Credentials
- Authorized JavaScript origins: `http://localhost:5173`, `https://stall-bokning-dev.web.app`
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

**Branch Naming**:
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-description` - Documentation
- `refactor/description` - Code restructuring

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
1. **Email** (SendGrid): Primary channel, transactional emails
2. **SMS** (Twilio): Optional, high-priority alerts
3. **Telegram Bot**: User-preferred notification channel
4. **In-app**: Real-time notifications via Firestore

## Documentation References

Comprehensive documentation located in `docs/`:
- **[PRD.md](./docs/PRD.md)**: Product requirements, user personas, success metrics
- **[TECH_STACK.md](./docs/TECH_STACK.md)**: Detailed tech stack, infrastructure, cost estimation
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: System architecture, data flow diagrams, ADRs, security model
- **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)**: Firestore collections, schemas, security rules, queries
- **[SETUP.md](./docs/SETUP.md)**: Complete development setup guide, troubleshooting
- **[IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)**: 4-phase roadmap, 46 user stories, sprint planning

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
