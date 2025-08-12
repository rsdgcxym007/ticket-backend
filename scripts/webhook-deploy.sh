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
GITHUB_WEBHOOK_URL="${GITHUB_WEBHOOK_URL:-http://43.229.133.51:4400/hooks/deploy-backend-master}"

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
  warn "❌ npm ci failed — cleaning cache and retrying with npm install --legacy-peer-deps"
  npm cache clean --force || true
  sleep 2
  if ! npm install --legacy-peer-deps; then
    notify "❌ [Backend] ALL DEPENDENCY INSTALLATION FAILED"
    notify_github "failed" "npm ci and npm install both failed"
    error "❌ DEPENDENCY INSTALLATION FAILED (both npm ci and npm install failed)"
    exit 1
  else
    success "✅ Dependencies installed with npm install --legacy-peer-deps (fallback)"
  fi
else
  success "✅ Dependencies installed with npm ci"
fi

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
  if ! npm ci --production=false; then
    warn "Second npm ci failed, trying npm install"
    if ! npm install --production=false --legacy-peer-deps; then
      notify_github "failed" "second npm ci and npm install both failed"
      error "❌ Second dependency installation failed"
      exit 1
    else
      success "✅ Second dependencies installed with npm install"
    fi
  else
    success "✅ Second dependencies installed with npm ci"
  fi
  
  # Build
  log "Building application..."
  if ! npm run build; then
    notify_github "failed" "build failed"
    error "❌ BUILD FAILED during npm run build"
    exit 1
  else
    success "✅ Application built successfully"
  fi
  
  # Verify build
  if [ ! -f dist/main.js ]; then
    notify_github "failed" "build verification failed - dist/main.js missing"
    error "❌ BUILD VERIFICATION FAILED - dist/main.js not found"
    exit 1
  else
    success "✅ Build verification passed - dist/main.js exists"
  fi
  
  # Restart PM2
  log "Restarting PM2..."
  if pm2 list | grep -q "ticket-backend-prod"; then
    if pm2 restart ticket-backend-prod; then
      success "✅ PM2 restarted successfully"
    else
      warn "PM2 restart failed, trying fresh start"
      pm2 start ecosystem.config.js --env production || {
        notify_github "failed" "PM2 start failed"
        error "❌ PM2 START FAILED"
        exit 1
      }
      success "✅ PM2 started fresh successfully"
    fi
  else
    if pm2 start ecosystem.config.js --env production; then
      success "✅ PM2 started successfully"
    else
      notify_github "failed" "PM2 start failed"
      error "❌ PM2 START FAILED"
      exit 1
    fi
  fi
fi

sleep 3

# Step 3: Verify and respond to GitHub
log "Step 3: Verifying deployment and responding to GitHub"
sleep 3
if pm2 list | grep -q "ticket-backend-prod.*online"; then
  COMMIT=$(git log -1 --pretty=format:"%h - %s by %an")
  notify "✅ [Backend] DEPLOYMENT SUCCESS: $COMMIT"
  notify_github "success" "✅ Deployment completed successfully: $COMMIT"
  success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY: $COMMIT"
  success "   • Dependencies: ✅ Installed"
  success "   • Code: ✅ Updated to latest"
  success "   • Build: ✅ Completed"
  success "   • PM2: ✅ Online"
  success "   • Notifications: ✅ Sent"
  exit 0
else
  notify "❌ [Backend] DEPLOYMENT FAILED - Application not online"
  notify_github "failed" "❌ Application failed to start after deployment"
  error "❌ DEPLOYMENT FAILED - PM2 application not online"
  error "   Please check: pm2 logs ticket-backend-prod"
  exit 1
fi