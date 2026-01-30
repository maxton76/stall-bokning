#!/bin/bash
# Development startup script for EquiDuty API

set -e

echo "🚀 Starting EquiDuty API Development Environment"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 24 or higher."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 24 ]; then
    echo "❌ Node.js version 24 or higher is required. Current: $(node -v)"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please review and update .env with your configuration"
fi

echo ""
echo "✅ Prerequisites checked"
echo ""
echo "📝 Next steps:"
echo "   1. Ensure Firebase Emulators are running:"
echo "      firebase emulators:start --only firestore,auth"
echo ""
echo "   2. API will start on: http://localhost:5003"
echo "   3. Health check: curl http://localhost:5003/health"
echo ""
echo "🔥 Starting Fastify API server..."
echo ""

# Start the development server
npm run dev
