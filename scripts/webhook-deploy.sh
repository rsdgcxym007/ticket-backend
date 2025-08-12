#!/bin/bash

# Thin wrapper to always use the latest, simple deployment flow.
# Falls back to a safe minimal deploy if the new scripts are missing.

set -euo pipefail

# Configuration (can be overridden by env vars)
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
BRANCH="${BRANCH:-feature/newfunction}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${BLUE}🤖 AUTO-DEPLOY: $*${NC}"; }
success(){ echo -e "${GREEN}✅ AUTO-DEPLOY: $*${NC}"; }
warn()   { echo -e "${YELLOW}⚠️  AUTO-DEPLOY: $*${NC}"; }
error()  { echo -e "${RED}❌ AUTO-DEPLOY: $*${NC}"; }

cd "$PROJECT_DIR" || { error "Cannot cd to $PROJECT_DIR"; exit 1; }

log "Delegation wrapper started (prefers simple-webhook-deploy-v2.sh)"

# Prefer the newest simple script if present
if [ -f "scripts/simple-webhook-deploy-v2.sh" ]; then
    chmod +x scripts/simple-webhook-deploy-v2.sh || true
    log "Using scripts/simple-webhook-deploy-v2.sh"
    exec ./scripts/simple-webhook-deploy-v2.sh
fi

# Fallback to the first-generation simple script
if [ -f "scripts/simple-webhook-deploy.sh" ]; then
    chmod +x scripts/simple-webhook-deploy.sh || true
    log "Using scripts/simple-webhook-deploy.sh"
    exec ./scripts/simple-webhook-deploy.sh
fi

# Last-resort minimal deploy (kept very small and safe)
warn "Simple scripts not found. Running minimal fallback deploy."

if [ ! -d .git ]; then
    error "Project directory is not a git repository: $PROJECT_DIR"
    exit 1
fi

log "Updating code on branch $BRANCH"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git pull --ff-only origin "$BRANCH"

log "Installing dependencies"
if ! npm ci --production=false; then
    warn "npm ci failed — retrying with npm install --legacy-peer-deps"
    npm cache clean --force || true
    npm install --legacy-peer-deps
fi

log "Building application"
npm run build

log "Starting/Restarting PM2 process"
if pm2 list | grep -q "ticket-backend-prod"; then
    pm2 restart ticket-backend-prod || pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env production
fi

sleep 3
if pm2 list | grep -q "ticket-backend-prod"; then
    success "Deployment completed (fallback path)"
    exit 0
else
    error "PM2 failed to start the application"
    exit 1
fi
