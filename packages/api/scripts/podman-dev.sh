#!/bin/bash
# Podman development management script for EquiDuty API

set -e

SCRIPT_NAME="$(basename "$0")"
COMMAND="${1:-start}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}🐳 EquiDuty API - Podman Manager${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_prerequisites() {
    # Check if Podman is installed
    if ! command -v podman &> /dev/null; then
        print_error "Podman is not installed."
        echo "   Install with: brew install podman"
        exit 1
    fi

    # Check if Podman machine is running (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! podman machine list | grep -q "Currently running"; then
            print_warning "Podman machine is not running. Starting..."
            podman machine start
            sleep 5
        fi
    fi

    # Check if podman-compose is installed
    if ! command -v podman-compose &> /dev/null; then
        print_error "podman-compose is not installed."
        echo "   Install with: brew install podman-compose"
        exit 1
    fi
}

show_usage() {
    cat << EOF
Usage: $SCRIPT_NAME [COMMAND]

Commands:
  start         Start all services (default)
  stop          Stop all services
  restart       Restart all services
  status        Show service status
  logs          Show logs from all services
  logs-api      Show logs from API Gateway only
  logs-firebase Show logs from Firebase Emulator only
  build         Rebuild containers
  clean         Stop and remove all containers and volumes
  health        Check health of all services
  help          Show this help message

Examples:
  $SCRIPT_NAME              # Start services
  $SCRIPT_NAME stop         # Stop services
  $SCRIPT_NAME restart      # Restart services
  $SCRIPT_NAME logs-api     # View API logs
  $SCRIPT_NAME clean        # Complete cleanup

EOF
}

start_services() {
    print_header
    check_prerequisites

    print_info "Starting services..."
    podman-compose up -d

    echo ""
    print_success "Services started successfully!"
    echo ""

    show_status
    show_service_urls
}

stop_services() {
    print_header
    print_info "Stopping all services..."

    podman-compose down

    echo ""
    print_success "All services stopped"
}

restart_services() {
    print_header
    print_info "Restarting all services..."

    podman-compose restart

    echo ""
    print_success "All services restarted"
    echo ""

    show_status
}

show_status() {
    echo "📊 Service Status:"
    podman-compose ps
    echo ""
}

show_logs() {
    print_header
    print_info "Showing logs (Ctrl+C to exit)..."
    echo ""

    podman-compose logs -f
}

show_api_logs() {
    print_header
    print_info "Showing API Gateway logs (Ctrl+C to exit)..."
    echo ""

    podman-compose logs -f api-gateway
}

show_firebase_logs() {
    print_header
    print_info "Showing Firebase Emulator logs (Ctrl+C to exit)..."
    echo ""

    podman-compose logs -f firebase-emulator
}

build_services() {
    print_header
    print_info "Rebuilding containers..."

    podman-compose down
    podman-compose up -d --build

    echo ""
    print_success "Containers rebuilt successfully!"
    echo ""

    show_status
}

clean_all() {
    print_header
    print_warning "This will stop and remove all containers and volumes!"
    echo ""
    read -p "Are you sure? (y/N) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning up..."

        podman-compose down -v

        # Remove images
        print_info "Removing images..."
        podman rmi localhost/api_api-gateway:latest 2>/dev/null || true

        echo ""
        print_success "Cleanup complete!"
    else
        print_info "Cleanup cancelled"
    fi
}

check_health() {
    print_header
    print_info "Checking service health..."
    echo ""

    # Check API health
    echo -n "API Gateway (http://localhost:5003/health): "
    if curl -sf http://localhost:5003/health > /dev/null 2>&1; then
        print_success "Healthy"
    else
        print_error "Not responding"
    fi

    # Check Firebase UI
    echo -n "Firebase UI (http://localhost:5444): "
    if curl -sf http://localhost:5444 > /dev/null 2>&1; then
        print_success "Healthy"
    else
        print_error "Not responding"
    fi

    # Check Firestore
    echo -n "Firestore Emulator (localhost:5081): "
    if curl -sf http://localhost:5081 > /dev/null 2>&1; then
        print_success "Healthy"
    else
        print_error "Not responding"
    fi

    # Check Auth Emulator
    echo -n "Auth Emulator (localhost:5099): "
    if curl -sf http://localhost:5099 > /dev/null 2>&1; then
        print_success "Healthy"
    else
        print_error "Not responding"
    fi

    echo ""
}

show_service_urls() {
    echo "🔗 Service URLs:"
    echo "   API Gateway:      http://localhost:5003"
    echo "   Health Check:     http://localhost:5003/health"
    echo "   Firebase UI:      http://localhost:5444"
    echo "   Firestore:        localhost:5081"
    echo "   Auth Emulator:    localhost:5099"
    echo ""
    echo "📝 Useful commands:"
    echo "   View logs:        $SCRIPT_NAME logs"
    echo "   View API logs:    $SCRIPT_NAME logs-api"
    echo "   Stop services:    $SCRIPT_NAME stop"
    echo "   Restart:          $SCRIPT_NAME restart"
    echo "   Check health:     $SCRIPT_NAME health"
    echo ""
    echo "🧪 Test the API:"
    echo "   curl http://localhost:5003/health"
    echo ""
}

# Main command handler
case "$COMMAND" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        print_header
        show_status
        ;;
    logs)
        show_logs
        ;;
    logs-api)
        show_api_logs
        ;;
    logs-firebase)
        show_firebase_logs
        ;;
    build)
        build_services
        ;;
    clean)
        clean_all
        ;;
    health)
        check_health
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_usage
        exit 1
        ;;
esac
