#!/bin/bash

# Webhook Auto-Deployment Script (self-contained)
# Simple, robust, and finishes everything within this file.

set -euo pipefail

# Ensure pm2 and node are on PATH for non-interactive shells
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || true
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/sbin:$HOME/.npm-global/bin:$HOME/bin:$PATH"

# Configuration (override via env if needed)
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
BRANCH="${BRANCH:-feature/newfunction}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${BLUE}🚀 DEPLOY: $*${NC}"; }
success(){ echo -e "${GREEN}✅ DEPLOY: $*${NC}"; }
warn()   { echo -e "${YELLOW}⚠️  DEPLOY: $*${NC}"; }
error()  { echo -e "${RED}❌ DEPLOY: $*${NC}"; }

notify() {
    local msg="$1"
    curl -s -H "Content-Type: application/json" \
             -X POST \
             -d "{\"content\": \"$msg\"}" \
             "$DISCORD_WEBHOOK" >/dev/null 2>&1 || true
}

# Go to project directory
cd "$PROJECT_DIR" || { notify "❌ [Backend] Failed to access project directory"; error "Cannot cd to $PROJECT_DIR"; exit 1; }

log "Starting self-contained auto-deployment on branch $BRANCH"
notify "🚀 [Backend] Auto-deploy started (branch: $BRANCH)"

# Ensure git repo exists
if [ ! -d .git ]; then
    notify "❌ [Backend] Not a git repo at $PROJECT_DIR"
    error "Not a git repository: $PROJECT_DIR"
    exit 1
fi

# Sync to latest clean state
log "Syncing repository..."
if ! git fetch origin; then
    notify "❌ [Backend] git fetch failed"
    error "git fetch failed"
    exit 1
fi

if ! git checkout "$BRANCH" 2>/dev/null; then
    warn "Checkout failed, trying to create local branch tracking origin/$BRANCH"
    git fetch origin "$BRANCH":"$BRANCH" || true
    git checkout "$BRANCH" || { notify "❌ [Backend] git checkout $BRANCH failed"; exit 1; }
fi

git reset --hard "origin/$BRANCH" || { notify "❌ [Backend] git reset --hard origin/$BRANCH failed"; exit 1; }
git pull --ff-only origin "$BRANCH" || { notify "❌ [Backend] git pull --ff-only failed"; exit 1; }

# Backup env
cp .env.production .env.production.bak 2>/dev/null || true

# Install dependencies with fallback
log "Installing dependencies (npm ci)"
if ! npm ci --production=false; then
    warn "npm ci failed — cleaning cache and retrying with npm install --legacy-peer-deps"
    npm cache clean --force || true
    if ! npm install --legacy-peer-deps; then
        notify "❌ [Backend] npm install failed"
        error "npm install failed"
        exit 1
    fi
fi

# Build
log "Building application"
if ! npm run build; then
    notify "❌ [Backend] build failed"
    error "Build failed"
    exit 1
fi

# Verify dist
if [ ! -f dist/main.js ]; then
    notify "❌ [Backend] build verification failed (dist/main.js missing)"
    error "Build verification failed"
    exit 1
fi

# PM2 restart/start
log "Restarting PM2 process"
if pm2 list | grep -q "ticket-backend-prod"; then
    pm2 restart ticket-backend-prod || pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env production
fi

sleep 5

# Verify PM2 status
if pm2 list | grep -q "ticket-backend-prod.*online"; then
    COMMIT=$(git log -1 --pretty=format:"%h - %s by %an")
    notify "✅ [Backend] Deploy success: $COMMIT"
    success "Application running: $COMMIT"
    log "Done"
    exit 0
else
    notify "❌ [Backend] Application failed to start after deploy"
    error "PM2 application not online"
    exit 1
fi
