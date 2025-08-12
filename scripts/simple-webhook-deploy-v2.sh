#!/bin/bash

# Simple Production-Ready Webhook Deploy Script
# Based on proven working patterns

set -euo pipefail  # Exit on any error, unset var, or failed pipe

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
BRANCH="${BRANCH:-feature/newfunction}"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}🚀 DEPLOY: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ DEPLOY: $1${NC}"
}

print_error() {
    echo -e "${RED}❌ DEPLOY: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  DEPLOY: $1${NC}"
}

# Discord notification function
notify() { 
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{\"content\": \"$1\"}" \
         "$DISCORD_WEBHOOK" 2>/dev/null || true
}

# Change to project directory
cd "$PROJECT_DIR" || { notify "❌ [Backend] Failed to access project directory"; exit 1; }

print_status "Starting simple webhook deployment..."

# Ensure clean up-to-date checkout
print_status "Syncing branch $BRANCH..."
git fetch origin || { notify "❌ [Backend] git fetch fail"; exit 1; }
git checkout "$BRANCH" || { notify "❌ [Backend] git checkout $BRANCH fail"; exit 1; }
git reset --hard "origin/$BRANCH" || { notify "❌ [Backend] git reset --hard origin/$BRANCH fail"; exit 1; }
git pull --ff-only origin "$BRANCH" || { notify "❌ [Backend] git pull --ff-only fail"; exit 1; }

# Backup env file
print_status "Backing up environment file..."
cp .env.production .env.production.bak 2>/dev/null || true

# Install dependencies  
print_status "Installing dependencies..."
npm install || { notify "❌ [Backend] npm install fail"; exit 1; }

# Build application
print_status "Building application..."
npm run build || { notify "❌ [Backend] build fail"; exit 1; }

# Restart PM2 (start if missing)
print_status "Restarting application..."
if pm2 list | grep -q "ticket-backend-prod"; then
    pm2 restart ticket-backend-prod || { notify "❌ [Backend] restart fail"; exit 1; }
else
    pm2 start ecosystem.config.js --env production || { notify "❌ [Backend] pm2 start fail"; exit 1; }
fi

# Wait for restart
sleep 3

# Check if app is running
print_status "Checking application status..."
if pm2 list | grep -q "ticket-backend-prod.*online"; then
    # Success notification with commit info
    COMMIT=$(git log -1 --pretty=format:"%h - %s by %an")
    notify "✅ [Backend] Deploy success: $COMMIT"
    print_success "Deployment completed successfully!"
    print_status "Application is running: $COMMIT"
else
    notify "❌ [Backend] Application not running after restart"
    print_error "Application failed to start"
    exit 1
fi

print_success "Simple webhook deployment completed!"
exit 0
