# Firebase Emulator Scripts

This document describes the scripts available for managing Firebase emulators with data persistence.

## Available Scripts

### Emulator Management

```bash
# Start emulators with data persistence
npm run emulator:start
```
- Starts Auth and Firestore emulators
- Automatically imports data from `./firebase-emulator-data/` (if exists)
- Automatically exports data on exit to `./firebase-emulator-data/`
- Emulator UI available at: http://127.0.0.1:5444/

```bash
# Stop emulators
npm run emulator:stop
```
- Stops all running Firebase emulators
- Data is automatically exported before shutdown

```bash
# Restart emulators
npm run emulator:restart
```
- Stops and restarts emulators
- Useful when you need to reload configuration or clear temporary state
- Data persists across restarts

```bash
# Export current emulator data
npm run emulator:export
```
- Manually export current emulator data to `./firebase-emulator-data/`
- Useful for creating backups while emulator is running

```bash
# Clear all emulator data
npm run emulator:clear
```
- **WARNING**: Deletes all persisted emulator data
- Use this to start fresh or when data becomes corrupted
- You'll need to recreate all users and Firestore data

### Development

```bash
# Run frontend dev server
npm run dev:frontend
```
- Starts Vite dev server on http://localhost:5173/

```bash
# Run everything (emulators + frontend)
npm run dev:all
```
- Starts both emulators and frontend dev server concurrently
- Requires `concurrently` package (install with `npm install`)

```bash
# Build frontend for production
npm run build:frontend
```
- Compiles TypeScript and builds production bundle

## Data Persistence

### How It Works

1. **On Start**: Emulator imports data from `firebase-emulator-data/`
2. **On Exit**: Emulator exports data to `firebase-emulator-data/`
3. **Data Includes**:
   - Firebase Auth users
   - Firestore collections and documents
   - Emulator configuration

### Directory Structure

```
firebase-emulator-data/
├── auth_export/          # Auth users
├── firestore_export/     # Firestore data
└── firebase-export-metadata.json
```

**Note**: This directory is in `.gitignore` - emulator data stays local and is not committed to version control.

## First-Time Setup

Since emulator data is not committed to git, you'll need to create initial users and data:

1. Start emulators: `npm run emulator:start`
2. Open Auth UI: http://127.0.0.1:5444/auth
3. Add test users (e.g., `maxkrax@gmail.com`)
4. Open Firestore UI: http://127.0.0.1:5444/firestore
5. Create test data if needed

From this point forward, all data will persist between emulator restarts.

## Troubleshooting

### Emulator won't start
```bash
# Kill any stuck processes
npm run emulator:stop
# Wait a moment
sleep 2
# Start fresh
npm run emulator:start
```

### Data corruption
```bash
# Clear all data and start fresh
npm run emulator:clear
npm run emulator:start
# Recreate users and data
```

### Port conflicts
Check if ports are in use:
- Auth: 5099
- Firestore: 5081
- Emulator UI: 5444
- Hub: 4400

```bash
# Check what's using a port (e.g., 5099)
lsof -i :5099
```

## Manual Commands

If you need more control, you can run Firebase CLI commands directly:

```bash
# Start with custom ports
firebase emulators:start --only auth,firestore \
  --import=./firebase-emulator-data \
  --export-on-exit=./firebase-emulator-data

# Start without persistence
firebase emulators:start --only auth,firestore

# Export to custom location
firebase emulators:export ./my-backup-data
```
