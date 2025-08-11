#!/bin/bash

# Auto-deployment Webhook Handler for Ticket Backend
# This script should be called by your webhook system when code is pushed

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/backend/ticket-backend"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
BRANCH="feature/newfunction"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1401766190879215697/2YJq7JXqFqLBOCCWxTDi9tGe4AgzhNL4ctVeBi7Br5ejUzYAyAhm_4_TKnymqUDJY2c4"

# Functions
notify() {
  echo -e "${BLUE}[WEBHOOK]${NC} $1"
  curl -H "Content-Type: application/json" -X POST -d "{\"content\": \"🔗 [Auto-Deploy] $1\"}" "$DISCORD_WEBHOOK" --silent 2>/dev/null || true
}

log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error_exit() {
  echo -e "${RED}[ERROR]${NC} $1"
  notify "❌ Auto-deployment failed: $1"
  exit 1
}

# Main auto-deployment process
main() {
  log "🔗 Starting auto-deployment from webhook..."
  notify "🚀 Auto-deployment triggered by git push"
  
  # Change to project directory
  cd "$PROJECT_DIR" || error_exit "Failed to change to project directory: $PROJECT_DIR"
  
  # Get current commit before pull
  OLD_COMMIT=$(git log -1 --pretty=format:"%h - %s" 2>/dev/null || echo "unknown")
  
  # Pull latest changes
  log "📥 Pulling latest changes..."
  git fetch origin || error_exit "Failed to fetch from origin"
  git reset --hard origin/$BRANCH || error_exit "Failed to reset to origin/$BRANCH"
  
  # Get new commit after pull
  NEW_COMMIT=$(git log -1 --pretty=format:"%h - %s")
  
  # Check if there are actually new changes
  if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
    log "ℹ️ No new changes detected, skipping deployment"
    notify "ℹ️ No new changes detected in repository"
    exit 0
  fi
  
  log "📝 Changes detected:"
  log "   Old: $OLD_COMMIT"
  log "   New: $NEW_COMMIT"
  
  # Make scripts executable (in case they changed)
  chmod +x "$SCRIPTS_DIR"/*.sh 2>/dev/null || log "Warning: Could not set script permissions"
  
  # Check if deploy script exists
  if [ ! -f "$SCRIPTS_DIR/deploy.sh" ]; then
    error_exit "Deploy script not found: $SCRIPTS_DIR/deploy.sh"
  fi
  
  # Run quick deployment
  log "🚀 Running quick deployment..."
  "$SCRIPTS_DIR/deploy.sh" quick || error_exit "Quick deployment failed"
  
  # Success notification with commit info
  notify "✅ Auto-deployment completed successfully! New commit: $NEW_COMMIT"
  log "✅ Auto-deployment completed successfully!"
}

# Run main function
main "$@"
