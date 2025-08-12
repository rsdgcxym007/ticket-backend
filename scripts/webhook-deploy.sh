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

# Attempt to build the project with robust fallbacks
attempt_build() {
  log "🔨 เริ่มต้นกระบวนการ build..."
  notify "🔨 Starting build process..."
  
  # Prebuild clean if script exists
  if npm run | grep -q "prebuild"; then
    log "🧹 Running prebuild script..."
    notify "🧹 Cleaning previous build..."
    npm run prebuild || log "⚠️ prebuild failed, continuing"
  fi

  # Build application using robust fallback chain
  log "📦 Building application with NestJS CLI..."
  notify "📦 Building application..."
  NEST_CLI_PATH="./node_modules/.bin/nest"
  
  if [ -x "$NEST_CLI_PATH" ]; then
    log "✅ Using local NestJS CLI..."
    if "$NEST_CLI_PATH" build; then
      log "✅ Build successful with local NestJS CLI!"
      notify "✅ Build completed successfully!"
      return 0
    fi
  fi

  if [ -f "./node_modules/@nestjs/cli/bin/nest.js" ]; then
    log "🔄 Retrying build via node Nest CLI binary..."
    notify "🔄 Trying alternative build method..."
    if node ./node_modules/@nestjs/cli/bin/nest.js build; then
      log "✅ Build successful with node CLI!"
      notify "✅ Build completed with fallback method!"
      return 0
    fi
  fi

  log "🔄 Retrying build via npx @nestjs/cli..."
  notify "🔄 Trying npx build method..."
  if npx --yes @nestjs/cli build; then
    log "✅ Build successful with npx!"
    notify "✅ Build completed with npx!"
    return 0
  fi

  log "🔄 Final fallback: building with TypeScript compiler (tsc)..."
  notify "🔄 Using TypeScript compiler as final attempt..."
  if ./node_modules/.bin/tsc -p tsconfig.build.json; then
    log "✅ Build successful with TypeScript compiler!"
    notify "✅ Build completed with TypeScript compiler!"
    return 0
  fi

  log "❌ All build methods failed!"
  notify "❌ BUILD FAILED - All methods exhausted"
  return 1
}

# Main auto-deployment process
main() {
  log "🚀 Starting auto-deployment from webhook..."
  notify "🚀 Auto-deployment triggered by git push"
  
  # Change to project directory
  log "📁 Changing to project directory: $PROJECT_DIR"
  cd "$PROJECT_DIR" || error_exit "Failed to change to project directory: $PROJECT_DIR"
  
  # Get current commit before pull
  OLD_COMMIT=$(git log -1 --pretty=format:"%h - %s" 2>/dev/null || echo "unknown")
  log "📝 Current commit: $OLD_COMMIT"
  
  # Pull latest changes
  log "⬇️ Pulling latest changes from $BRANCH..."
  notify "⬇️ Pulling latest changes..."
  git fetch origin || error_exit "Failed to fetch from origin"
  git reset --hard origin/$BRANCH || error_exit "Failed to reset to origin/$BRANCH"
  
  # Get new commit after pull
  NEW_COMMIT=$(git log -1 --pretty=format:"%h - %s" 2>/dev/null || echo "unknown")
  
  # Show what changed
  log "📋 Changes detected:"
  log "   📝 Old: $OLD_COMMIT"
  log "   📝 New: $NEW_COMMIT"
  notify "📋 Updated to commit: $NEW_COMMIT"
  
  # Make scripts executable (in case they changed)
  chmod +x "$SCRIPTS_DIR"/*.sh 2>/dev/null || log "⚠️ Warning: Could not set script permissions"
  
  # Install dependencies and build manually for webhook deployment
  log "📦 Installing dependencies (including devDependencies for build)..."
  notify "📦 Installing dependencies..."
  npm cache clean --force || log "⚠️ Cache clean failed"
  # Ensure devDependencies are installed even if production env is set
  export npm_config_production=false
  npm install --include=dev || error_exit "npm install failed"
  log "✅ Dependencies installed successfully!"
  notify "✅ Dependencies installed!"
  
  # First build attempt
  log "🚀 Starting first build attempt..."
  notify "🚀 First build attempt..."
  if ! attempt_build; then
    log "⚠️ Build failed - cleaning up and retrying once..."
    notify "⚠️ Build failed - starting recovery process..."
    # Clean artifacts and reinstall dependencies
    log "🧹 Cleaning dist directory..."
    rm -rf dist || true
    log "🧹 Cleaning node_modules..."
    rm -rf node_modules || true
    log "🧹 Cleaning npm cache..."
    npm cache clean --force || true
    log "📦 Reinstalling dependencies..."
    notify "📦 Reinstalling dependencies for recovery..."
    export npm_config_production=false
    npm install --include=dev || error_exit "Recovery npm install failed"
    log "✅ Recovery dependencies installed!"

    # Retry build once more
    log "🔄 Starting recovery build attempt..."
    notify "🔄 Recovery build attempt..."
    if ! attempt_build; then
      error_exit "Build failed after recovery"
    fi
  fi
  
  log "✅ Build process completed successfully!"
  notify "✅ Build process completed!"
  
  # Restart PM2 process
  log "🔄 Restarting application with PM2..."
  notify "🔄 Restarting application..."
  pm2 stop "$PM2_APP_NAME" 2>/dev/null || log "ℹ️ No running process to stop"
  
  # Check if we're in production environment
  if [[ "$PROJECT_DIR" == "/var/www/backend/ticket-backend" ]]; then
    # Production environment
    log "🚀 Starting production environment..."
    notify "🚀 Starting in production mode..."
    pm2 start ecosystem.config.js --env production || error_exit "PM2 start failed"
    log "✅ Production application started!"
  else
    # Development environment - start with simpler config
    log "🚀 Starting development environment..."
    notify "🚀 Starting in development mode..."
    pm2 start dist/main.js --name "$PM2_APP_NAME" || error_exit "PM2 start failed"
    log "✅ Development application started!"
  fi
  
  pm2 save || log "⚠️ PM2 save failed"
  log "💾 PM2 configuration saved!"
  
  # Show PM2 status
  log "📊 Current PM2 status:"
  pm2 status
  
  # Success notification with commit info
  notify "🎉 [SUCCESS] Auto-deployment completed successfully! New commit: $NEW_COMMIT"
  log "🎉 [SUCCESS] Auto-deployment completed successfully!"
  log "📋 Deployment Summary:"
  log "   📝 Old commit: $OLD_COMMIT"
  log "   📝 New commit: $NEW_COMMIT"
  log "   🕐 Completed at: $(date +'%Y-%m-%d %H:%M:%S')"
}

# Run main function
main "$@"
