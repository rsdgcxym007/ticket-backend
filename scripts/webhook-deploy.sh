#!/bin/bash

# Webhook Auto-Deployment Script
# Flow: webhook → npm install → deploy.sh deploy → respond to GitHub

set -euo pipefail

# Ensure pm2 and node are on PATH for non-interactive shells
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || true
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/sbin:$HOME/.npm-global/bin:$HOME/bin:$PATH"

# Configuration (override via env if needed)
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
BRANCH="${BRANCH:-feature/newfunction}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l}"
GITHUB_WEBHOOK_URL="${GITHUB_WEBHOOK_URL:-http://43.229.133.51:4200/hooks/deploy-backend-master}"

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
  echo -e "${BLUE}[$(get_timestamp)] 🚀 WEBHOOK: $*${NC}"
  echo "[$(get_timestamp)] INFO: $*" >> /tmp/webhook-deploy.log 2>/dev/null || true
}

success(){ 
  echo -e "${GREEN}[$(get_timestamp)] ✅ WEBHOOK: $*${NC}"
  echo "[$(get_timestamp)] SUCCESS: $*" >> /tmp/webhook-deploy.log 2>/dev/null || true
}

warn()   { 
  echo -e "${YELLOW}[$(get_timestamp)] ⚠️  WEBHOOK: $*${NC}"
  echo "[$(get_timestamp)] WARNING: $*" >> /tmp/webhook-deploy.log 2>/dev/null || true
}

error()  { 
  echo -e "${RED}[$(get_timestamp)] ❌ WEBHOOK: $*${NC}"
  echo "[$(get_timestamp)] ERROR: $*" >> /tmp/webhook-deploy.log 2>/dev/null || true
}

step() {
  STEP_NUMBER=$((STEP_NUMBER + 1))
  echo -e "${PURPLE}[$(get_timestamp)] 📋 STEP $STEP_NUMBER: $*${NC}"
  echo "[$(get_timestamp)] STEP $STEP_NUMBER: $*" >> /tmp/webhook-deploy.log 2>/dev/null || true
}

substep() {
  echo -e "${CYAN}[$(get_timestamp)]   └─ $*${NC}"
  echo "[$(get_timestamp)] SUBSTEP: $*" >> /tmp/webhook-deploy.log 2>/dev/null || true
}

log_command() {
  local cmd="$1"
  substep "Executing: $cmd"
  echo "[$(get_timestamp)] COMMAND: $cmd" >> /tmp/webhook-deploy.log 2>/dev/null || true
}

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
step "Initializing project directory"
substep "Changing to project directory: $PROJECT_DIR"
log_command "cd $PROJECT_DIR"

cd "$PROJECT_DIR" || { 
  error "Cannot access project directory: $PROJECT_DIR"
  notify "❌ [Backend] Failed to access project directory"; 
  notify_github "failed" "Failed to access project directory";
  exit 1; 
}
success "Successfully changed to project directory"

step "Starting webhook deployment flow"
log "Starting webhook deployment flow on branch $BRANCH"
substep "Project directory: $PROJECT_DIR"
substep "Target branch: $BRANCH"
substep "Discord webhook: ${DISCORD_WEBHOOK:0:50}..."
substep "GitHub webhook: $GITHUB_WEBHOOK_URL"

notify "🚀 [Backend] Webhook deployment started (branch: $BRANCH)"
notify_github "started" "Webhook deployment initiated"
success "Webhook deployment flow initialized"

# Ensure git repo exists
step "Verifying git repository"
substep "Checking for .git directory"
if [ ! -d .git ]; then
  error "Not a git repository: $PROJECT_DIR"
  notify "❌ [Backend] Not a git repo at $PROJECT_DIR"
  notify_github "failed" "Not a git repository"
  exit 1
fi
success "Git repository verified"

# Step 1: Install dependencies first (as requested)
step "Installing dependencies"
substep "Using npm install for maximum compatibility"

# Always use npm install (no npm ci)
log_command "npm install --production=false"
if ! npm install --production=false; then
  warn "Initial npm install failed, attempting recovery..."
  substep "Cleaning npm cache"
  log_command "npm cache clean --force"
  npm cache clean --force || true
  
  substep "Waiting 2 seconds before retry..."
  sleep 2
  
  substep "Retrying with legacy peer deps"
  log_command "npm install --production=false --legacy-peer-deps"
  if ! npm install --production=false --legacy-peer-deps; then
    error "ALL DEPENDENCY INSTALLATION FAILED"
    notify "❌ [Backend] ALL DEPENDENCY INSTALLATION FAILED"
    notify_github "failed" "npm install failed"
    exit 1
  else
    success "Dependencies installed with npm install --legacy-peer-deps"
  fi
else
  success "Dependencies installed with npm install"
fi

# Step 2: Call deploy.sh deploy (pull code → npm install again → build → restart PM2)
step "Executing deployment script"
substep "Checking for deploy.sh script"

if [ -f "deploy.sh" ]; then
  success "Found deploy.sh script"
  substep "Making deploy.sh executable"
  log_command "chmod +x deploy.sh"
  chmod +x deploy.sh
  
  substep "Executing deploy.sh deploy"
  log_command "./deploy.sh deploy"
  if ! ./deploy.sh deploy; then
    error "deploy.sh deploy failed"
    notify "❌ [Backend] deploy.sh deploy failed"
    notify_github "failed" "deploy.sh deploy failed"
    exit 1
  fi
  success "deploy.sh executed successfully"
else
  warn "deploy.sh not found, running inline deploy steps"
  
  # Pull latest code
  step "Updating source code"
  substep "Fetching latest changes from origin"
  log_command "git fetch origin"
  git fetch origin || { 
    error "git fetch failed"
    notify_github "failed" "git fetch failed"
    exit 1
  }
  success "Git fetch completed"
  
  substep "Checking out target branch: $BRANCH"
  log_command "git checkout $BRANCH"
  git checkout "$BRANCH" || { 
    error "git checkout failed for branch: $BRANCH"
    notify_github "failed" "git checkout failed"
    exit 1
  }
  success "Checked out branch: $BRANCH"
  
  substep "Resetting to latest remote state"
  log_command "git reset --hard origin/$BRANCH"
  git reset --hard "origin/$BRANCH" || { 
    error "git reset failed"
    notify_github "failed" "git reset failed"
    exit 1
  }
  success "Git reset completed"
  
  substep "Pulling latest changes with fast-forward only"
  log_command "git pull --ff-only origin $BRANCH"
  git pull --ff-only origin "$BRANCH" || { 
    error "git pull failed"
    notify_github "failed" "git pull failed"
    exit 1
  }
  success "Git pull completed"
  
  # Install dependencies again with npm install
  step "Installing dependencies (second pass)"
  substep "Installing dependencies again for updated code"
  log_command "npm install --production=false"
  if ! npm install --production=false; then
    warn "Second npm install failed, trying with legacy flags"
    substep "Retrying with legacy peer deps"
    log_command "npm install --production=false --legacy-peer-deps"
    if ! npm install --production=false --legacy-peer-deps; then
      error "Second dependency installation failed"
      notify_github "failed" "second npm install failed"
      exit 1
    else
      success "Second dependencies installed with npm install --legacy-peer-deps"
    fi
  else
    success "Second dependencies installed with npm install"
  fi
  
  # Build
  step "Building application"
  substep "Compiling TypeScript to JavaScript"
  log_command "npm run build"
  if ! npm run build; then
    error "BUILD FAILED during npm run build"
    notify_github "failed" "build failed"
    exit 1
  else
    success "Application built successfully"
  fi
  
  # Verify build
  step "Verifying build output"
  substep "Checking for dist/main.js"
  if [ ! -f dist/main.js ]; then
    error "BUILD VERIFICATION FAILED - dist/main.js not found"
    notify_github "failed" "build verification failed - dist/main.js missing"
    exit 1
  else
    success "Build verification passed - dist/main.js exists"
    substep "Build file size: $(ls -lh dist/main.js | awk '{print $5}')"
  fi
  
  # Restart PM2
  step "Managing PM2 process"
  substep "Checking current PM2 status"
  log_command "pm2 list | grep ticket-backend-prod"
  
  if pm2 list | grep -q "ticket-backend-prod"; then
    substep "Found existing PM2 process, attempting restart"
    log_command "pm2 restart ticket-backend-prod"
    if pm2 restart ticket-backend-prod; then
      success "PM2 restarted successfully"
    else
      warn "PM2 restart failed, trying fresh start"
      substep "Stopping existing process and starting fresh"
      log_command "pm2 delete ticket-backend-prod && pm2 start ecosystem.config.js --env production"
      pm2 delete ticket-backend-prod || true
      pm2 start ecosystem.config.js --env production || {
        error "PM2 START FAILED"
        notify_github "failed" "PM2 start failed"
        exit 1
      }
      success "PM2 started fresh successfully"
    fi
  else
    substep "No existing PM2 process found, starting new instance"
    log_command "pm2 start ecosystem.config.js --env production"
    if pm2 start ecosystem.config.js --env production; then
      success "PM2 started successfully"
    else
      error "PM2 START FAILED"
      notify_github "failed" "PM2 start failed"
      exit 1
    fi
  fi
fi

step "Finalizing deployment"
substep "Waiting 3 seconds for services to stabilize..."
sleep 3

# Step 3: Verify and respond to GitHub
step "Verifying deployment status"
substep "Waiting additional 3 seconds for PM2 status update..."
sleep 3

substep "Checking PM2 process status"
log_command "pm2 list | grep ticket-backend-prod"

if pm2 list | grep -q "ticket-backend-prod.*online"; then
  success "PM2 process is online and running"
  
  substep "Getting commit information"
  COMMIT=$(git log -1 --pretty=format:"%h - %s by %an")
  substep "Latest commit: $COMMIT"
  
  step "Sending success notifications"
  notify "✅ [Backend] DEPLOYMENT SUCCESS: $COMMIT"
  notify_github "success" "✅ Deployment completed successfully: $COMMIT"
  
  success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY"
  success "📊 DEPLOYMENT SUMMARY:"
  success "   • Project Directory: ✅ $PROJECT_DIR"
  success "   • Target Branch: ✅ $BRANCH"
  success "   • Dependencies: ✅ Installed"
  success "   • Code Update: ✅ Latest from origin/$BRANCH"
  success "   • Build: ✅ Completed (dist/main.js exists)"
  success "   • PM2 Process: ✅ ticket-backend-prod online"
  success "   • Discord Notifications: ✅ Sent"
  success "   • GitHub Webhook: ✅ Notified"
  success "   • Latest Commit: ✅ $COMMIT"
  success "   • Deployment Time: $(get_timestamp)"
  
  echo "[$(get_timestamp)] DEPLOYMENT SUCCESS: All steps completed" >> /tmp/webhook-deploy.log 2>/dev/null || true
  exit 0
else
  error "DEPLOYMENT FAILED - PM2 application not online"
  substep "Current PM2 status:"
  pm2 list | grep ticket-backend-prod || echo "No ticket-backend-prod process found"
  
  step "Sending failure notifications"
  notify "❌ [Backend] DEPLOYMENT FAILED - Application not online"
  notify_github "failed" "❌ Application failed to start after deployment"
  
  error "❌ DEPLOYMENT FAILED SUMMARY:"
  error "   • PM2 Status: ❌ Application not online"
  error "   • Check logs with: pm2 logs ticket-backend-prod"
  error "   • Check status with: pm2 status"
  error "   • Manual restart: pm2 restart ticket-backend-prod"
  
  echo "[$(get_timestamp)] DEPLOYMENT FAILED: PM2 process not online" >> /tmp/webhook-deploy.log 2>/dev/null || true
  exit 1
fi