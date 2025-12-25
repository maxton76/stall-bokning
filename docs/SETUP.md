# Development Setup Guide

## 📋 Document Information

| **Attribute** | **Value** |
|--------------|-----------|
| **Version** | 1.0 |
| **Date** | 2025-12-25 |
| **Status** | Draft |
| **Related Documents** | [TECH_STACK.md](./TECH_STACK.md), [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## 🎯 Overview

This guide will help you set up a complete development environment for the Stable Booking System. Follow the steps in order for a smooth setup.

**Estimated time**: 45-60 minutes (first time)

---

## ✅ Prerequisites

### Required Software

| **Software** | **Version** | **Installation** |
|--------------|-------------|------------------|
| Node.js | 22.x LTS | [nodejs.org](https://nodejs.org/) or `brew install node@22` |
| npm | 10.x+ | Comes with Node.js |
| Git | 2.x+ | [git-scm.com](https://git-scm.com/) or `brew install git` |
| Firebase CLI | Latest | `npm install -g firebase-tools` |
| Google Cloud SDK | Latest | [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install) |
| Docker | 24.x+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| VS Code | Latest | [code.visualstudio.com](https://code.visualstudio.com/) (recommended) |

### Optional but Recommended

| **Software** | **Purpose** |
|--------------|-------------|
| pnpm | Faster package manager (`npm install -g pnpm`) |
| Postman | API testing |
| TablePlus | Database GUI for exploring Firestore data |

### Accounts Needed

1. **Google Account** (for Firebase & GCP)
2. **GitHub Account** (for version control)
3. **Stripe Account** (for payments - test mode first)

---

## 🚀 Quick Start (TL;DR)

```bash
# 1. Clone repo
git clone https://github.com/your-org/stall-bokning.git
cd stall-bokning

# 2. Install dependencies
npm install

# 3. Setup Firebase
firebase login
firebase init

# 4. Copy environment template
cp .env.example .env
# Edit .env with your Firebase config

# 5. Start emulators
firebase emulators:start

# 6. Start frontend (new terminal)
cd packages/frontend
npm run dev

# 7. Start backend API (new terminal)
cd packages/api
npm run dev

# Open http://localhost:5173
```

---

## 📝 Detailed Setup Steps

### Step 1: Clone Repository

```bash
# SSH (recommended if you have SSH keys set up)
git clone git@github.com:your-org/stall-bokning.git

# HTTPS (easier for first-time)
git clone https://github.com/your-org/stall-bokning.git

cd stall-bokning
```

**Verify**:
```bash
ls -la
# Should see: packages/, terraform/, .github/, etc.
```

---

### Step 2: Install Node Dependencies

```bash
# Install root dependencies
npm install

# Install dependencies for all packages (monorepo)
npm run install:all

# Or manually:
cd packages/frontend && npm install && cd ../..
cd packages/api && npm install && cd ../..
cd packages/functions && npm install && cd ../..
cd packages/shared && npm install && cd ../..
```

**Verify**:
```bash
node --version
# Should output: v22.x.x

npm --version
# Should output: 10.x.x
```

---

### Step 3: Firebase Setup

#### 3.1 Login to Firebase

```bash
firebase login
```

This will open your browser for authentication.

#### 3.2 Create Firebase Project

**Option A: Via Firebase Console** (Easier)

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. Click "Add project"
3. Create development project:
   - `stall-bokning-dev` (Development)
   - *Note: Staging and production environments are created later as needed*

**Option B: Via CLI**

```bash
# Create development project
firebase projects:create stall-bokning-dev
```

#### 3.3 Initialize Firebase in Project

```bash
firebase init
```

**Select the following**:
- **Features**: Firestore, Functions, Hosting, Storage, Emulators
- **Project**: Use existing project → `stall-bokning-dev`
- **Firestore Rules**: `firestore.rules`
- **Firestore Indexes**: `firestore.indexes.json`
- **Functions Language**: TypeScript
- **Functions Directory**: `packages/functions`
- **ESLint**: Yes
- **Hosting Directory**: `packages/frontend/dist`
- **Single-page app**: Yes
- **GitHub Actions**: No (we'll do this manually)
- **Emulators**: Select all (Auth, Firestore, Functions, Hosting, Storage)

#### 3.4 Enable Firebase Services

```bash
# Enable Authentication
firebase use stall-bokning-dev
gcloud services enable identitytoolkit.googleapis.com

# Enable Firestore
gcloud services enable firestore.googleapis.com

# Enable Storage
gcloud services enable storage-api.googleapis.com
```

**Or via Console**:
- Go to Firebase Console → Authentication → Get Started
  - **Email/Password**: Enable Email/Password sign-in method
  - **Google**: Enable Google sign-in method
    1. Click "Google" under Sign-in providers
    2. Toggle "Enable"
    3. Set project support email (required)
    4. Save
- Go to Firestore Database → Create Database (Start in test mode for dev)
- Go to Storage → Get Started

#### 3.5 Configure Google OAuth (for Google Sign-In)

**Get OAuth Client ID** (for web app):

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (`stall-bokning-dev`)
3. Navigate to **APIs & Services** → **Credentials**
4. Find the auto-created **Web client (auto created by Google Service)**
5. Add authorized JavaScript origins:
   - `http://localhost:5173` (Vite dev server)
   - `https://stall-bokning-dev.web.app` (Firebase Hosting dev)
6. Add authorized redirect URIs:
   - `http://localhost:5173/__/auth/handler` (Local development)
   - `https://stall-bokning-dev.web.app/__/auth/handler` (Firebase Hosting dev)

**Add OAuth Client ID to .env**:

```bash
# packages/frontend/.env.development
VITE_FIREBASE_AUTH_DOMAIN=stall-bokning-dev.firebaseapp.com
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Note**: Firebase SDK handles OAuth flow automatically - no manual token exchange needed!

---

### Step 4: Google Cloud Setup

#### 4.1 Install gcloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install

# Verify
gcloud --version
```

#### 4.2 Login and Set Project

```bash
gcloud auth login
gcloud config set project stall-bokning-dev

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

#### 4.3 Set Up Application Default Credentials

```bash
gcloud auth application-default login
```

This creates credentials for local development.

---

### Step 5: Environment Variables

#### 5.1 Create `.env` Files

```bash
# Root .env
cp .env.example .env

# Frontend .env
cd packages/frontend
cp .env.example .env
cd ../..

# API .env
cd packages/api
cp .env.example .env
cd ../..

# Functions .env
cd packages/functions
cp .env.example .env
cd ../..
```

#### 5.2 Get Firebase Config

**Via Console**:
1. Go to Firebase Console → Project Settings
2. Under "Your apps", add a Web app
3. Copy the Firebase config object

**Via CLI**:
```bash
firebase apps:sdkconfig web
```

#### 5.3 Fill in Environment Variables

**`packages/frontend/.env`**:
```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=stall-bokning-dev
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_URL=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**`packages/api/.env`**:
```bash
NODE_ENV=development
PORT=8080
FIREBASE_PROJECT_ID=stall-bokning-dev
FIREBASE_SERVICE_ACCOUNT=./service-account-dev.json

# External APIs
STRIPE_SECRET_KEY=sk_test_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
SENDGRID_API_KEY=SG...
```

**`packages/functions/.env`**:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

---

### Step 6: Service Account Setup

#### 6.1 Create Service Account

```bash
# Via gcloud
gcloud iam service-accounts create stall-bokning-dev \
  --display-name="Stall Bokning Dev Service Account"

# Grant roles
gcloud projects add-iam-policy-binding stall-bokning-dev \
  --member="serviceAccount:stall-bokning-dev@stall-bokning-dev.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

#### 6.2 Download Service Account Key

```bash
gcloud iam service-accounts keys create ./packages/api/service-account-dev.json \
  --iam-account=stall-bokning-dev@stall-bokning-dev.iam.gserviceaccount.com

# IMPORTANT: Add to .gitignore
echo "service-account-*.json" >> .gitignore
```

**⚠️ Security Warning**: Never commit service account keys to git!

---

### Step 7: External Services Setup

#### 7.1 Stripe (Test Mode)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com/register)
2. Create account
3. Toggle "Test mode" on
4. Get API keys:
   - Developers → API Keys
   - Copy "Publishable key" → `VITE_STRIPE_PUBLISHABLE_KEY`
   - Copy "Secret key" → `STRIPE_SECRET_KEY`

5. Create test products:
```bash
# Or via Stripe Dashboard: Products → Add Product
```

#### 7.2 SendGrid (Email)

1. Sign up at [sendgrid.com](https://signup.sendgrid.com/)
2. Create API key: Settings → API Keys → Create API Key
3. Copy to `SENDGRID_API_KEY`
4. Verify sender email: Settings → Sender Authentication

#### 7.3 Twilio (SMS) - Optional for MVP

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Get Account SID and Auth Token from Console Dashboard
3. Copy to `.env`

---

### Step 8: Firestore Setup

#### 8.1 Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

#### 8.2 Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

#### 8.3 Seed Test Data (Optional)

```bash
# Run seed script
npm run seed:dev

# Or manually via Firebase Console
```

---

### Step 9: Start Development Environment

#### 9.1 Start Firebase Emulators

```bash
# Terminal 1
firebase emulators:start
```

This starts:
- Authentication Emulator: http://localhost:9099
- Firestore Emulator: http://localhost:8080
- Functions Emulator: http://localhost:5001
- Hosting Emulator: http://localhost:5000
- Storage Emulator: http://localhost:9199

**Emulator UI**: http://localhost:4000

#### 9.2 Start Frontend Dev Server

```bash
# Terminal 2
cd packages/frontend
npm run dev
```

Frontend available at: http://localhost:5173

#### 9.3 Start Backend API (Cloud Run Local)

```bash
# Terminal 3
cd packages/api
npm run dev
```

API available at: http://localhost:8080

#### 9.4 Verify Everything Works

1. Open http://localhost:5173
2. You should see the login page
3. Create test account via email/password
4. Check Emulator UI to see created user

---

### Step 10: VS Code Setup (Recommended)

#### 10.1 Install Extensions

```bash
# Open VS Code
code .

# Install these extensions:
# - ESLint
# - Prettier
# - Firebase
# - Tailwind CSS IntelliSense
# - TypeScript Vue Plugin (Volar)
# - GitLens
```

**Or install via CLI**:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension toba.vsfire
code --install-extension bradlc.vscode-tailwindcss
```

#### 10.2 Workspace Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

#### 10.3 Launch Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/packages/api/src/index.ts",
      "preLaunchTask": "tsc: build - packages/api/tsconfig.json",
      "outFiles": ["${workspaceFolder}/packages/api/dist/**/*.js"]
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/packages/frontend"
    }
  ]
}
```

---

## 🧪 Testing Setup

### Unit Tests

```bash
# Frontend tests
cd packages/frontend
npm run test

# API tests
cd packages/api
npm run test

# Functions tests
cd packages/functions
npm run test
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Open Playwright UI
npm run test:e2e:ui
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Firebase Emulators Won't Start

**Error**: `Port 8080 already in use`

**Solution**:
```bash
# Find and kill process using port
lsof -ti:8080 | xargs kill -9

# Or change port in firebase.json
```

---

#### 2. Firestore Permission Denied

**Error**: `Missing or insufficient permissions`

**Solution**:
- Check Firestore Security Rules
- Verify user is authenticated
- Check user has correct custom claims

```bash
# Deploy updated rules
firebase deploy --only firestore:rules
```

---

#### 3. Cloud Run API Not Connecting

**Error**: `CORS error when calling API`

**Solution**:
```typescript
// In packages/api/src/index.ts
import cors from '@fastify/cors';

await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:5000'],
  credentials: true
});
```

---

#### 4. Environment Variables Not Loading

**Error**: `undefined` values in code

**Solution**:
```bash
# Restart dev servers after changing .env
# Vite requires VITE_ prefix for frontend vars
```

---

#### 5. Service Account Errors

**Error**: `Error: Could not load the default credentials`

**Solution**:
```bash
# Re-run auth
gcloud auth application-default login

# Or set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="./packages/api/service-account-dev.json"
```

---

#### 6. Stripe Webhook Errors in Local Dev

**Error**: Webhooks not working locally

**Solution**:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
```

---

## 📚 Useful Commands

### Firebase

```bash
# List projects
firebase projects:list

# Ensure using dev project
firebase use stall-bokning-dev

# Deploy specific service
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules

# View logs
firebase functions:log
```

### Google Cloud

```bash
# List Cloud Run services
gcloud run services list

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Deploy Cloud Run service
gcloud run deploy api-service \
  --source packages/api \
  --region europe-west1
```

### Development

```bash
# Run all tests
npm run test:all

# Lint code
npm run lint

# Format code
npm run format

# Build all packages
npm run build:all

# Clean node_modules
npm run clean
```

---

## 🎓 Next Steps

1. **Read the documentation**:
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
   - [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Firestore structure
   - [TECH_STACK.md](./TECH_STACK.md) - Technology choices

2. **Explore the codebase**:
   - `packages/frontend/src/` - React components
   - `packages/api/src/` - API routes and business logic
   - `packages/functions/src/` - Cloud Functions
   - `packages/shared/src/` - Shared types and utils

3. **Start coding**:
   - Pick a task from [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
   - Create a feature branch: `git checkout -b feature/your-feature`
   - Follow coding standards (see below)

---

## 📝 Coding Standards

### TypeScript

- Use strict mode
- Prefer interfaces over types
- Use descriptive variable names
- Add JSDoc comments for public functions

### React

- Use functional components with hooks
- Prefer composition over prop drilling
- Use React Query for server state
- Follow file structure convention:
  ```
  ComponentName/
    index.tsx
    ComponentName.tsx
    ComponentName.test.tsx
    ComponentName.styles.ts (if needed)
  ```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/shift-booking

# 2. Make changes and commit
git add .
git commit -m "feat: add shift booking functionality"

# 3. Push and create PR
git push origin feature/shift-booking

# Commit message format:
# feat: new feature
# fix: bug fix
# docs: documentation
# style: formatting
# refactor: code restructuring
# test: adding tests
# chore: maintenance
```

---

## 🔒 Security Checklist

Before committing:

- [ ] No API keys in code (use `.env`)
- [ ] Service account files in `.gitignore`
- [ ] Firestore Security Rules tested
- [ ] Input validation on all forms
- [ ] XSS prevention (React escapes by default)
- [ ] CSRF tokens for mutations (if needed)

---

## 📊 Performance Tips

- Use React.memo() for expensive components
- Lazy load routes with React.lazy()
- Optimize images (WebP format)
- Use TanStack Query for caching
- Enable Firestore offline persistence
- Monitor bundle size with `npm run analyze`

---

## 🆘 Getting Help

- **Documentation**: Check all `.md` files in repo
- **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Google Cloud Docs**: [cloud.google.com/docs](https://cloud.google.com/docs)
- **Stack Overflow**: Tag questions with `firebase`, `google-cloud-run`
- **Team Chat**: [Your team's communication channel]

---

**Version History**:
| **Version** | **Date** | **Changes** | **Author** |
|-------------|-----------|---------------|----------------|
| 1.0 | 2025-12-25 | Initial setup guide | Dev Team |

---

*Related documents: [ARCHITECTURE.md](./ARCHITECTURE.md) | [TECH_STACK.md](./TECH_STACK.md) | [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)*
