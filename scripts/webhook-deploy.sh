#!/bin/bash

# Webhook Auto-Deployment Script
# Flow: webhook → npm ci → deploy.sh deploy → respond to GitHub

set -euo pipefail

# Ensure pm2 and node are on PATH for non-interactive shells
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || true
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/sbin:$HOME/.npm-global/bin:$HOME/bin:$PATH"

# Configuration (override via env if needed)
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
BRANCH="${BRANCH:-feature/newfunction}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l}"
GITHUB_WEBHOOK_URL="${GITHUB_WEBHOOK_URL:-http://43.229.133.51:4100/hooks/deploy-backend-master}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${BLUE}🚀 WEBHOOK: $*${NC}"; }
success(){ echo -e "${GREEN}✅ WEBHOOK: $*${NC}"; }
warn()   { echo -e "${YELLOW}⚠️  WEBHOOK: $*${NC}"; }
error()  { echo -e "${RED}❌ WEBHOOK: $*${NC}"; }

notify() {
  local msg="$1"
  curl -s -H "Content-Type: application/json" \
       -X POST \
       -d "{\"content\": \"$msg\"}" \
       "$DISCORD_WEBHOOK" >/dev/null 2>&1 || true
}

notify_github() {
  local status="$1"
  local message="$2"
  local commit=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  
  curl -s -H "Content-Type: application/json" \
       -H "User-Agent: ticket-backend-webhook/1.0" \
       -X POST \
       -d "{
           \"status\": \"$status\",
           \"message\": \"$message\",
           \"branch\": \"$BRANCH\",
           \"commit\": \"${commit:0:8}\",
           \"timestamp\": \"$timestamp\",
           \"environment\": \"production\"
       }" \
       "$GITHUB_WEBHOOK_URL" >/dev/null 2>&1 || true
}

# Go to project directory
cd "$PROJECT_DIR" || { 
  notify "❌ [Backend] Failed to access project directory"; 
  notify_github "failed" "Failed to access project directory";
  error "Cannot cd to $PROJECT_DIR"; 
  exit 1; 
}

log "Starting webhook deployment flow on branch $BRANCH"
notify "🚀 [Backend] Webhook deployment started (branch: $BRANCH)"
notify_github "started" "Webhook deployment initiated"

# Ensure git repo exists
if [ ! -d .git ]; then
  notify "❌ [Backend] Not a git repo at $PROJECT_DIR"
  notify_github "failed" "Not a git repository"
  error "Not a git repository: $PROJECT_DIR"
  exit 1
fi

# Step 1: Install dependencies first (as requested)
log "Step 1: Installing dependencies (npm ci --production=false)"
if ! npm ci --production=false; then
  warn "npm ci failed — cleaning cache and retrying with npm install --legacy-peer-deps"
  npm cache clean --force || true
  if ! npm install --legacy-peer-deps; then
    notify "❌ [Backend] npm ci failed"
    notify_github "failed" "npm install failed"
    error "npm install failed"
    exit 1
  fi
fi
success "Dependencies installed successfully"

# Step 2: Call deploy.sh deploy (pull code → npm ci again → build → restart PM2)
log "Step 2: Calling deploy.sh deploy"
if [ -f "deploy.sh" ]; then
  chmod +x deploy.sh
  if ! ./deploy.sh deploy; then
    notify "❌ [Backend] deploy.sh deploy failed"
    notify_github "failed" "deploy.sh deploy failed"
    error "deploy.sh deploy failed"
    exit 1
  fi
else
  warn "deploy.sh not found, running inline deploy steps"
  
  # Pull latest code
  log "Pulling latest code..."
  git fetch origin || { notify_github "failed" "git fetch failed"; exit 1; }
  git checkout "$BRANCH" || { notify_github "failed" "git checkout failed"; exit 1; }
  git reset --hard "origin/$BRANCH" || { notify_github "failed" "git reset failed"; exit 1; }
  git pull --ff-only origin "$BRANCH" || { notify_github "failed" "git pull failed"; exit 1; }
  
  # npm ci again
  log "Running npm ci again..."
  npm ci --production=false || { notify_github "failed" "second npm ci failed"; exit 1; }
  
  # Build
  log "Building application..."
  npm run build || { notify_github "failed" "build failed"; exit 1; }
  
  # Restart PM2
  log "Restarting PM2..."
  if pm2 list | grep -q "ticket-backend-prod"; then
    pm2 restart ticket-backend-prod || pm2 start ecosystem.config.js --env production
  else
    pm2 start ecosystem.config.js --env production
  fi
fi

sleep 3

# Step 3: Verify and respond to GitHub
log "Step 3: Verifying deployment and responding to GitHub"
if pm2 list | grep -q "ticket-backend-prod.*online"; then
  COMMIT=$(git log -1 --pretty=format:"%h - %s by %an")
  notify "✅ [Backend] Deploy success: $COMMIT"
  notify_github "success" "Deployment completed successfully: $COMMIT"
  success "Deployment completed successfully: $COMMIT"
  exit 0
else
  notify "❌ [Backend] Application failed to start after deploy"
  notify_github "failed" "Application failed to start after deployment"
  error "PM2 application not online"
  exit 1
fi