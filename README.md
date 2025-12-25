# Stable Booking System

A modern SaaS platform for stable owners and guests to manage and fairly distribute daily chores through an intelligent, weight-based booking system.

## 📚 Documentation

All project documentation is located in the [`docs/`](./docs/) directory:

### Core Documentation

- **[PRD.md](./docs/PRD.md)** - Product Requirements Document
  - Executive summary
  - Problem statement
  - User personas
  - Functional requirements
  - Success metrics

### Technical Documentation

- **[TECH_STACK.md](./docs/TECH_STACK.md)** - Technical Stack & Infrastructure
  - System architecture overview
  - Frontend stack (React 19, Vite, Firebase SDK)
  - Backend stack (Cloud Run Services + Cloud Functions)
  - External integrations (Stripe, Twilio, SendGrid, Telegram)
  - Deployment & CI/CD pipeline
  - Cost estimation

- **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - Firestore Database Schema
  - Collection structure
  - Document schemas (TypeScript interfaces)
  - Firestore Security Rules
  - Query examples
  - Indexing strategy
  - Backup & recovery

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System Architecture & Design
  - High-level and detailed architecture diagrams
  - Data flow diagrams (authentication, booking, notifications)
  - Security architecture (4-layer security model)
  - Scalability architecture
  - Performance optimization (5-layer caching)
  - Architectural Decision Records (ADRs)

### Development

- **[SETUP.md](./docs/SETUP.md)** - Development Setup Guide
  - Prerequisites (Node.js, Firebase CLI, gcloud SDK, Docker)
  - Quick start (7 steps)
  - Detailed setup (10 steps)
  - Testing setup
  - Troubleshooting
  - Coding standards

- **[IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)** - Implementation Roadmap
  - 4 Phases (Foundation, Core Features, Booking, Payments)
  - 12 Epics
  - 46 User Stories with acceptance criteria and estimates
  - Sprint planning (8 sprints, 2-week each)
  - Risks & mitigation
  - Success criteria

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/your-org/stall-bokning.git
cd stall-bokning

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your Firebase config

# 4. Start development
firebase emulators:start           # Terminal 1
cd packages/frontend && npm run dev # Terminal 2
cd packages/api && npm run dev      # Terminal 3

# Open http://localhost:5173
```

Detailed setup guide can be found in [SETUP.md](./docs/SETUP.md).

## 🏗️ Project Structure

```
stall-bokning/
├── docs/                          # 📚 Documentation
│   ├── PRD.md                     # Product requirements
│   ├── TECH_STACK.md              # Technical stack
│   ├── DATABASE_SCHEMA.md         # Firestore schema
│   ├── ARCHITECTURE.md            # System design
│   ├── SETUP.md                   # Development setup
│   └── IMPLEMENTATION_PLAN.md     # Implementation roadmap
├── packages/                      # Monorepo packages
│   ├── frontend/                  # React 19 app
│   ├── api/                       # Cloud Run API service
│   ├── functions/                 # Cloud Functions
│   └── shared/                    # Shared types & utils
├── terraform/                     # Infrastructure as Code
├── .github/workflows/             # CI/CD pipelines
└── README.md                      # This file
```

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js 24 (Cloud Run), Node.js 22 (Cloud Functions)
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (JWT-based)
- **Hosting**: Firebase Hosting (CDN)
- **Infrastructure**: Google Cloud Platform (GCP)
- **Payments**: Stripe
- **Notifications**: SendGrid (email), Twilio (SMS), Telegram Bot API

See [TECH_STACK.md](./docs/TECH_STACK.md) for details.

## 📝 Contributing

1. Read [SETUP.md](./docs/SETUP.md) for development setup
2. Read [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) for current stories
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Follow coding standards in [SETUP.md](./docs/SETUP.md#-coding-standards)
5. Create a Pull Request

### Commit Message Format

```
feat: add shift booking functionality
fix: resolve authentication bug
docs: update setup guide
style: format code with prettier
refactor: restructure scheduling service
test: add unit tests for fairness algorithm
chore: update dependencies
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

## 📊 Project Status

**Current Phase**: Phase 1 - Foundation (Planning)

**Milestones**:
- [ ] Phase 1: Infrastructure & Authentication (Week 1-3)
- [ ] Phase 2: Core Features (Week 4-8)
- [ ] Phase 3: Booking & Notifications (Week 9-11)
- [ ] Phase 4: Payments & Polish (Week 12-16)
- [ ] Beta Launch

See [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) for details.

## 📞 Support & Contact

- **Documentation**: See [`docs/`](./docs/) directory
- **Issues**: [GitHub Issues](https://github.com/your-org/stall-bokning/issues)
- **Email**: support@stallbokning.se (coming soon)

## 📄 License

[MIT License](./LICENSE) (coming soon)

---

**Version**: 1.0 (MVP Planning)
**Last Updated**: 2025-12-25
