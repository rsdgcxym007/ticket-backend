#!/bin/bash

# Auto-deployment script for webhook triggers
# This script should be called by your webhook system when code is pushed

set -e  # Exit on any error

# Configuration
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
BRANCH="feature/newfunction"
PM2_APP_NAME="ticket-backend-prod"

# Discord webhook for notifications (optional)
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1401766190879215697/2YJq7JXqFqLBOCCWxTDi9tGe4AgzhNL4ctVeBi7Br5ejUzYAyAhm_4_TKnymqUDJY2c4"

# ANSI color codes for logs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Enhanced logging with timestamp and colors
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

notify() {
  echo -e "${BLUE}[WEBHOOK]${NC} $1"
  
  # Send Discord notification if webhook URL is configured
  if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
    curl -s -H "Content-Type: application/json" \
         -X POST \
         -d "{\"content\": \"$1\"}" \
         "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
  fi
}

error_exit() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
  notify "AUTO-DEPLOYMENT FAILED: $1"
  exit 1
}

# Main auto-deployment process
main() {
  log "Starting auto-deployment from webhook..."
  notify "Auto-deployment triggered by git push"
  
  # Change to project directory
  cd "$PROJECT_DIR" || error_exit "Failed to change to project directory: $PROJECT_DIR"
  
  # Get current commit before pull
  OLD_COMMIT=$(git log -1 --pretty=format:"%h - %s" 2>/dev/null || echo "unknown")
  
  # Pull latest changes
  log "Pulling latest changes..."
  git fetch origin || error_exit "Failed to fetch from origin"
  git reset --hard origin/$BRANCH || error_exit "Failed to reset to origin/$BRANCH"
  
  # Get new commit after pull
  NEW_COMMIT=$(git log -1 --pretty=format:"%h - %s" 2>/dev/null || echo "unknown")
  
  # Show what changed
  log "Changes detected:"
  log "   Old: $OLD_COMMIT"
  log "   New: $NEW_COMMIT"
  
  # Make scripts executable (in case they changed)
  chmod +x "$SCRIPTS_DIR"/*.sh 2>/dev/null || log "Warning: Could not set script permissions"
  
  # Install dependencies and build manually for webhook deployment
  log "Installing dependencies..."
  npm cache clean --force || log "Cache clean failed"
  npm install || error_exit "npm install failed"
  
  # Build application using npm script (recommended approach)
  log "Building application..."
  npm run build || error_exit "Build failed - npm run build failed"
  
  # Restart PM2 process
  log "Restarting application..."
  pm2 stop "$PM2_APP_NAME" 2>/dev/null || log "No running process to stop"
  
  # Check if we're in production environment
  if [[ "$PROJECT_DIR" == "/var/www/backend/ticket-backend" ]]; then
    # Production environment
    pm2 start ecosystem.config.js --env production || error_exit "PM2 start failed"
  else
    # Development environment - start with simpler config
    pm2 start dist/main.js --name "$PM2_APP_NAME" || error_exit "PM2 start failed"
  fi
  
  pm2 save || log "PM2 save failed"
  
  # Success notification with commit info
  notify "[SUCCESS] Auto-deployment completed successfully! New commit: $NEW_COMMIT"
  log "[SUCCESS] Auto-deployment completed successfully!"
}

# Run main function
main "$@"
