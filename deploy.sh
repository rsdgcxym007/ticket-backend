#!/bin/bash

# Main Deploy Script for Webhook Integration
# Called by webhook from /etc/webhook/hooks.json
# Path: /var/www/backend/ticket-backend/deploy.sh
# Supports any branch deployment

set -euo pipefail

# Extract branch from webhook argument if provided
WEBHOOK_REF="${1:-}"
if [[ "$WEBHOOK_REF" =~ ^refs/heads/(.+)$ ]]; then
  BRANCH_FROM_WEBHOOK="${BASH_REMATCH[1]}"
else
  BRANCH_FROM_WEBHOOK=""
fi

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
# Use branch from webhook, current git branch, or default
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "feature/newfunction")
BRANCH="${BRANCH_FROM_WEBHOOK:-${BRANCH:-$CURRENT_BRANCH}}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Enhanced logging functions with timestamp and step tracking
STEP_NUMBER=0
get_timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

log()    { 
  echo -e "${BLUE}[$(get_timestamp)] 🚀 DEPLOY: $*${NC}"
  echo "[$(get_timestamp)] INFO: $*" >> /tmp/deploy.log 2>/dev/null || true
}

success(){ 
  echo -e "${GREEN}[$(get_timestamp)] ✅ DEPLOY: $*${NC}"
  echo "[$(get_timestamp)] SUCCESS: $*" >> /tmp/deploy.log 2>/dev/null || true
}

warn()   { 
  echo -e "${YELLOW}[$(get_timestamp)] ⚠️  DEPLOY: $*${NC}"
  echo "[$(get_timestamp)] WARNING: $*" >> /tmp/deploy.log 2>/dev/null || true
}

error()  { 
  echo -e "${RED}[$(get_timestamp)] ❌ DEPLOY: $*${NC}"
  echo "[$(get_timestamp)] ERROR: $*" >> /tmp/deploy.log 2>/dev/null || true
}

step() {
  STEP_NUMBER=$((STEP_NUMBER + 1))
  echo -e "${PURPLE}[$(get_timestamp)] 📋 STEP $STEP_NUMBER: $*${NC}"
  echo "[$(get_timestamp)] STEP $STEP_NUMBER: $*" >> /tmp/deploy.log 2>/dev/null || true
}

substep() {
  echo -e "${CYAN}[$(get_timestamp)]   └─ $*${NC}"
  echo "[$(get_timestamp)] SUBSTEP: $*" >> /tmp/deploy.log 2>/dev/null || true
}

log_command() {
  local cmd="$1"
  substep "Executing: $cmd"
  echo "[$(get_timestamp)] COMMAND: $cmd" >> /tmp/deploy.log 2>/dev/null || true
}

notify() {
  local msg="$1"
  curl -s -H "Content-Type: application/json" \
       -X POST \
       -d "{\"content\": \"$msg\"}" \
       "$DISCORD_WEBHOOK" >/dev/null 2>&1 || true
}

# Ensure pm2 and node are on PATH
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || true
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/sbin:$HOME/.npm-global/bin:$HOME/bin:$PATH"

# Go to project directory
step "Initializing deployment environment"
substep "Webhook reference: ${WEBHOOK_REF:-'none'}"
substep "Branch from webhook: ${BRANCH_FROM_WEBHOOK:-'none'}"
substep "Current git branch: $CURRENT_BRANCH"
substep "Target deployment branch: $BRANCH"
substep "Project directory: $PROJECT_DIR"

substep "Changing to project directory"
log_command "cd $PROJECT_DIR"
cd "$PROJECT_DIR" || { 
  error "Cannot access project directory: $PROJECT_DIR"
  notify "❌ [Backend] Failed to access project directory $PROJECT_DIR"; 
  exit 1; 
}
success "Successfully changed to project directory"

step "Starting deployment process"
log "Deploy script started from webhook (branch: $BRANCH)"
notify "🚀 [Backend] Deploy started from webhook (branch: $BRANCH)"

# Ensure git repo exists
step "Verifying git repository"
substep "Checking for .git directory"
if [ ! -d .git ]; then
  error "Not a git repository: $PROJECT_DIR"
  notify "❌ [Backend] Not a git repo at $PROJECT_DIR"
  error "Not a git repository: $PROJECT_DIR"
  exit 1
fi

# Pull latest code
log "Step 1: Updating code from branch $BRANCH"
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
success "✅ Code updated to latest $BRANCH"

# Install dependencies (npm install only, no npm ci)
log "Step 2: Installing dependencies"
rm -rf node_modules/ || true
npm cache clean --force 2>/dev/null || true

if ! npm install --production=false --no-audit --no-fund; then
  warn "First npm install failed, retrying with legacy flags..."
  if ! npm install --production=false --no-audit --no-fund --legacy-peer-deps; then
    notify "❌ [Backend] npm install failed"
    error "npm install failed"
    exit 1
  else
    success "✅ Dependencies installed with npm install --legacy-peer-deps"
  fi
else
  success "✅ Dependencies installed with npm install"
fi

# Build
log "Step 3: Building application"
rm -rf dist/ || true
rm -f tsconfig.build.tsbuildinfo || true

if ! npm run build; then
  notify "❌ [Backend] build failed"
  error "Build failed"
  exit 1
fi

# Verify build
if [ ! -f dist/main.js ]; then
  notify "❌ [Backend] build verification failed (dist/main.js missing)"
  error "Build verification failed"
  exit 1
fi
success "✅ Application built successfully"

# PM2 restart/start
log "Step 4: Restarting PM2 process"
if pm2 list | grep -q "ticket-backend-prod"; then
  if pm2 restart ticket-backend-prod; then
    success "✅ PM2 restarted successfully"
  else
    warn "PM2 restart failed, trying fresh start"
    pm2 delete ticket-backend-prod 2>/dev/null || true
    pm2 start ecosystem.config.js --env production || {
      notify "❌ [Backend] PM2 start failed"
      error "PM2 start failed"
      exit 1
    }
    success "✅ PM2 started fresh successfully"
  fi
else
  if pm2 start ecosystem.config.js --env production; then
    success "✅ PM2 started successfully"
  else
    notify "❌ [Backend] PM2 start failed"
    error "PM2 start failed"
    exit 1
  fi
fi

sleep 3

# Verify deployment
log "Step 5: Verifying deployment"
if pm2 list | grep -q "ticket-backend-prod.*online"; then
  COMMIT=$(git log -1 --pretty=format:"%h - %s by %an")
  notify "✅ [Backend] DEPLOYMENT SUCCESS: $COMMIT"
  success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY"
  success "   • Branch: $BRANCH"
  success "   • Commit: $COMMIT"
  success "   • PM2: Online"
  log "Deploy script completed successfully"
  exit 0
else
  notify "❌ [Backend] DEPLOYMENT FAILED - Application not online"
  error "DEPLOYMENT FAILED - PM2 application not online"
  error "Check logs: pm2 logs ticket-backend-prod"
  exit 1
fi
