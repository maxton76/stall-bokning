# Local Development Guide

Complete guide for running the Stall Bokning application locally on macOS.

## 📋 Prerequisites

### Required Software

1. **Node.js 24+**
   ```bash
   # Check version
   node --version  # Should be v24.x or higher

   # Install if needed (using nvm)
   nvm install 24
   nvm use 24
   ```

2. **Podman** (for containerization)
   ```bash
   # Install
   brew install podman

   # Initialize and start Podman machine (macOS)
   podman machine init
   podman machine start

   # Verify
   podman --version
   ```

3. **Podman Compose** (for multi-container orchestration)
   ```bash
   # Install
   brew install podman-compose

   # Verify
   podman-compose --version
   ```

4. **Firebase CLI** (for local emulators)
   ```bash
   # Install globally
   npm install -g firebase-tools

   # Verify
   firebase --version
   ```

## 🚀 Quick Start (Recommended)

### Option 1: Podman Compose (Production-like Setup)

This runs everything in containers, most similar to production.

```bash
# 1. Navigate to API directory
cd packages/api

# 2. Start all services (API + Firebase Emulators)
./scripts/podman-dev.sh

# 3. In a new terminal, start the frontend
cd packages/frontend
npm install
npm run dev
```

**Services will be available at:**
- Frontend: http://localhost:5173
- API Gateway: http://localhost:5003
- Firebase Emulator UI: http://localhost:5444
- Firestore: localhost:5081
- Auth Emulator: localhost:5099

### Option 2: Direct Node.js (Fastest Development)

This runs everything directly on your machine for fastest hot-reload.

**Terminal 1 - Firebase Emulators:**
```bash
cd /Users/p950xam/Utv/stall-bokning
firebase emulators:start --only firestore,auth
```

**Terminal 2 - API Gateway:**
```bash
cd packages/api
npm install
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd packages/frontend
npm install
npm run dev
```

## 📁 Project Structure

```
stall-bokning/
├── packages/
│   ├── api/                  # Fastify API Gateway (Cloud Run)
│   │   ├── src/
│   │   │   ├── index.ts      # Main server
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── middleware/   # Auth, CORS, etc.
│   │   │   └── utils/        # Firebase Admin
│   │   ├── scripts/
│   │   │   ├── dev.sh        # Direct Node.js dev
│   │   │   └── podman-dev.sh # Podman dev
│   │   ├── Dockerfile
│   │   ├── podman-compose.yml
│   │   └── .env              # Local config
│   │
│   ├── frontend/             # React + Vite frontend
│   │   ├── src/
│   │   │   ├── pages/        # Landing, Login, etc.
│   │   │   ├── components/   # UI components
│   │   │   └── lib/
│   │   │       └── api.ts    # API client
│   │   └── .env.local        # Local API config
│   │
│   ├── functions/            # Cloud Functions Gen2
│   └── shared/               # Shared code
│
└── firebase.json             # Firebase config
```

## 🔧 Detailed Setup

### 1. Clone and Install

```bash
cd /Users/p950xam/Utv/stall-bokning

# Install API dependencies
cd packages/api
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend (.env):**
The file `packages/api/.env` is already configured for local development. Review it:

```bash
cd packages/api
cat .env
```

Key settings:
- `FIRESTORE_EMULATOR_HOST=localhost:5081`
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:5099`
- `CORS_ORIGIN=http://localhost:5173`

**Frontend (.env.local):**
Already configured to use local API:

```bash
cd packages/frontend
cat .env.local
```

Key settings:
- `VITE_API_BASE_URL=http://localhost:5003`
- `VITE_USE_FIREBASE_EMULATOR=true`

### 3. Start Development Environment

#### With Podman (Recommended):

```bash
# Terminal 1: Start API + Emulators with Podman
cd packages/api
./scripts/podman-dev.sh start    # or just ./scripts/podman-dev.sh

# Terminal 2: Start Frontend
cd packages/frontend
npm run dev

# Other useful commands:
./scripts/podman-dev.sh stop     # Stop all services
./scripts/podman-dev.sh restart  # Restart services
./scripts/podman-dev.sh logs     # View all logs
./scripts/podman-dev.sh health   # Check service health
./scripts/podman-dev.sh help     # See all commands
```

#### Without Podman (Direct Node.js):

```bash
# Terminal 1: Firebase Emulators
firebase emulators:start --only firestore,auth

# Terminal 2: API Gateway
cd packages/api
./scripts/dev.sh

# Terminal 3: Frontend
cd packages/frontend
npm run dev
```

## 🧪 Testing the Setup

### 1. Health Check API

```bash
curl http://localhost:5003/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development",
  "uptime": 123.456
}
```

### 2. Test Public Endpoints

```bash
# Get all stables
curl http://localhost:5003/api/v1/stables

# Expected: {"stables": []}
```

### 3. Test Frontend

Open http://localhost:5173 in your browser. You should see the landing page with:
- Hero section
- Features section
- Testimonials
- Pricing
- Navigation links

## 📊 Monitoring

### View Logs

**Podman Setup:**
```bash
# View all logs
cd packages/api
podman-compose logs -f

# View just API logs
podman-compose logs -f api-gateway

# View just Firebase logs
podman-compose logs -f firebase-emulator
```

**Direct Node.js Setup:**
- API logs appear in Terminal 2
- Frontend logs appear in Terminal 3
- Emulator logs appear in Terminal 1

### Firebase Emulator UI

Access the Firebase Emulator UI at: http://localhost:5444

Here you can:
- View and edit Firestore data
- Manage Auth users
- Monitor all Firebase operations

## 🔍 Troubleshooting

### Port Already in Use

**Find and kill the process:**
```bash
# For port 5003 (API)
lsof -i :5003
kill -9 <PID>

# For port 5173 (Frontend)
lsof -i :5173
kill -9 <PID>

# For port 5081 (Firestore)
lsof -i :5081
kill -9 <PID>

# For port 5099 (Auth)
lsof -i :5099
kill -9 <PID>

# For port 5444 (Firebase UI)
lsof -i :5444
kill -9 <PID>
```

### Podman Machine Not Running (macOS)

```bash
# Check status
podman machine list

# Start if needed
podman machine start

# If issues persist, recreate
podman machine stop
podman machine rm
podman machine init
podman machine start
```

### Firebase Emulators Not Starting

```bash
# Stop any running emulators
pkill -f "firebase"

# Clear emulator data
rm -rf .firebase/

# Restart emulators
firebase emulators:start --only firestore,auth
```

### API Can't Connect to Firestore

Check that:
1. Firebase Emulators are running (port 5081)
2. `FIRESTORE_EMULATOR_HOST` is set in `.env`
3. No firewall blocking localhost connections

```bash
# Test Firestore connectivity
curl http://localhost:5081

# Should see Firestore emulator info
```

### CORS Errors in Frontend

Ensure:
1. API is running on port 5003
2. Frontend is running on port 5173
3. `CORS_ORIGIN` in `.env` includes `http://localhost:5173`

### Module Not Found Errors

```bash
# Clear and reinstall dependencies
cd packages/api
rm -rf node_modules package-lock.json
npm install

cd packages/frontend
rm -rf node_modules package-lock.json
npm install
```

## 🔄 Development Workflow

### Making API Changes

1. Edit files in `packages/api/src/`
2. Changes auto-reload with `tsx watch` (direct Node.js)
3. For Podman: rebuild container
   ```bash
   podman-compose down
   podman-compose up -d --build
   ```

### Making Frontend Changes

1. Edit files in `packages/frontend/src/`
2. Vite hot-reloads automatically
3. See changes instantly in browser

### Adding New API Endpoints

1. Create route file in `packages/api/src/routes/`
2. Register route in `packages/api/src/index.ts`
3. Add types to `packages/api/src/types/index.ts`
4. Add client method to `packages/frontend/src/lib/api.ts`

## 📝 Useful Commands

### Podman

```bash
# View running containers
podman ps

# View all containers
podman ps -a

# Stop all containers
podman-compose down

# Rebuild containers
podman-compose up -d --build

# View container logs
podman logs <container-name>

# Execute command in container
podman exec -it stall-bokning-api sh
```

### NPM Scripts

**API:**
```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build TypeScript
npm run start        # Start production server
npm run type-check   # Check TypeScript types
```

**Frontend:**
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## 🚀 Next Steps

Once your local environment is running:

1. **Create sample data** in Firestore Emulator UI
2. **Test authentication** by creating a test user
3. **Test API endpoints** with curl or Postman
4. **Develop frontend features** that call the API

## 📚 Additional Resources

- [Fastify Documentation](https://www.fastify.io/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Podman Documentation](https://podman.io/docs)
- [Vite Documentation](https://vitejs.dev/)

## 🤝 Need Help?

If you encounter issues:

1. Check this troubleshooting guide
2. Review the API README: `packages/api/README.md`
3. Check Firebase Emulator UI: http://localhost:5444
4. Review container logs: `podman-compose logs -f`
