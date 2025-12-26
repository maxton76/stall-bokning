# Stall Bokning API Gateway

Cloud Run API Gateway built with Fastify for the Stall Bokning application.

## 🏗️ Architecture

This is the API Gateway that sits in front of all backend services:

- **Framework**: Fastify (Node.js 24)
- **Deployment**: Google Cloud Run
- **Database**: Firestore
- **Authentication**: Firebase Auth with JWT tokens
- **Middleware**: CORS, Rate Limiting, Authentication

## 📋 Prerequisites

- **Node.js**: v24 or higher
- **Podman**: For containerization (or Docker)
- **Firebase CLI**: For running emulators locally

Install Podman on macOS:
```bash
brew install podman
podman machine init
podman machine start
```

Install Firebase CLI:
```bash
npm install -g firebase-tools
```

## 🚀 Local Development Setup

### Option 1: Direct Node.js (Fastest for Development)

1. **Install dependencies**:
```bash
cd packages/api
npm install
```

2. **Set up environment**:
```bash
# The .env file is already configured for local development
cat .env  # Review settings
```

3. **Start Firebase Emulators** (in a separate terminal):
```bash
# From project root
firebase emulators:start --only firestore,auth
```

4. **Start the API server**:
```bash
npm run dev  # Hot reload with tsx
```

5. **Test the API**:
```bash
# Health check
curl http://localhost:5003/health

# Get stables (public endpoint)
curl http://localhost:5003/api/v1/stables
```

### Option 2: Podman Compose (Production-like)

Use the enhanced management script for easy control:

```bash
cd packages/api

# Start services
./scripts/podman-dev.sh start    # or just ./scripts/podman-dev.sh

# Stop services
./scripts/podman-dev.sh stop

# Restart services
./scripts/podman-dev.sh restart

# View logs
./scripts/podman-dev.sh logs          # All services
./scripts/podman-dev.sh logs-api      # API only
./scripts/podman-dev.sh logs-firebase # Firebase only

# Check health
./scripts/podman-dev.sh health

# Show status
./scripts/podman-dev.sh status

# Rebuild containers
./scripts/podman-dev.sh build

# Complete cleanup
./scripts/podman-dev.sh clean

# See all commands
./scripts/podman-dev.sh help
```

This starts:
- Firebase Emulator (Firestore + Auth)
- API Gateway (Fastify)

### Option 3: Podman Only (Manual)

1. **Build the image**:
```bash
podman build -t stall-bokning-api:local .
```

2. **Run the container**:
```bash
podman run -d \
  --name stall-bokning-api \
  -p 3000:8080 \
  --env-file .env \
  stall-bokning-api:local
```

3. **View logs**:
```bash
podman logs -f stall-bokning-api
```

## 📁 Project Structure

```
packages/api/
├── src/
│   ├── index.ts              # Main Fastify server
│   ├── routes/
│   │   ├── stables.ts        # Stable management endpoints
│   │   └── schedules.ts      # Booking schedule endpoints
│   ├── middleware/
│   │   └── auth.ts           # Firebase Auth middleware
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── utils/
│       └── firebase.ts       # Firebase Admin initialization
├── Dockerfile                # Podman/Docker container config
├── podman-compose.yml        # Local orchestration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .env                      # Local environment variables
└── .env.example              # Template for environment vars
```

## 🔐 Authentication

All protected endpoints require a Firebase ID token:

```bash
# Get token from Firebase Auth (in your frontend)
const token = await user.getIdToken()

# Use token in API requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5003/api/v1/schedules
```

## 🛣️ API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /api/v1` - API version info
- `GET /api/v1/stables` - List all stables
- `GET /api/v1/stables/:id` - Get stable details
- `GET /api/v1/schedules/stable/:stableId` - Get confirmed schedules for a stable

### Protected Endpoints (Require Authentication)

#### Stables
- `POST /api/v1/stables` - Create stable (stable_owner, admin only)
- `PATCH /api/v1/stables/:id` - Update stable (owner or admin)
- `DELETE /api/v1/stables/:id` - Delete stable (owner or admin)

#### Schedules
- `GET /api/v1/schedules` - Get user's schedules
- `POST /api/v1/schedules` - Create booking
- `PATCH /api/v1/schedules/:id` - Update booking
- `DELETE /api/v1/schedules/:id` - Cancel booking

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:5003/health

# Get all stables
curl http://localhost:5003/api/v1/stables

# Create a stable (requires auth token)
curl -X POST http://localhost:5003/api/v1/stables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Green Valley Stables",
    "address": "123 Farm Road, Countryside",
    "capacity": 20,
    "availableStalls": 5,
    "pricePerMonth": 750,
    "amenities": ["Indoor Arena", "Turnout", "Training"]
  }'
```

### Load Testing

```bash
# Install hey (HTTP load generator)
brew install hey

# Test API performance
hey -n 1000 -c 50 http://localhost:5003/health
```

## 📊 Monitoring

### View Logs

**Podman Compose**:
```bash
podman-compose logs -f api-gateway
```

**Direct Podman**:
```bash
podman logs -f stall-bokning-api
```

**Node.js**:
```bash
# Logs appear in terminal where you ran npm run dev
```

### Health Check

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

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Find process using port 5003
lsof -i :5003

# Kill the process
kill -9 <PID>
```

### Firebase Emulator Not Running

```bash
# Check if emulators are running
firebase emulators:start --only firestore,auth

# Access Emulator UI
open http://localhost:5444
```

### Podman Container Issues

```bash
# Remove all containers
podman rm -f $(podman ps -aq)

# Remove all images
podman rmi -f stall-bokning-api:local

# Rebuild
podman build -t stall-bokning-api:local .
```

### Connection Refused Errors

Check that:
1. Firebase Emulators are running (port 8081, 9099)
2. Environment variables are set correctly
3. FIRESTORE_EMULATOR_HOST points to correct address

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Cloud Run

```bash
gcloud run deploy stall-bokning-api \
  --source . \
  --region europe-north1 \
  --platform managed \
  --allow-unauthenticated
```

## 📝 Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5003)
- `FIRESTORE_EMULATOR_HOST` - Firestore emulator address (localhost:5081)
- `FIREBASE_AUTH_EMULATOR_HOST` - Auth emulator address (localhost:5099)
- `CORS_ORIGIN` - Allowed origins for CORS
- `RATE_LIMIT_MAX` - Max requests per time window
- `RATE_LIMIT_WINDOW_MS` - Rate limit time window

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test locally
4. Submit pull request

## 📄 License

MIT
