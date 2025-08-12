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
  
  # Show PM2 status for debugging
  log "📊 PM2 status for debugging:"
  pm2 status || true
  pm2 logs --lines 10 || true
  
  exit 1
}

# Check if PM2 is responsive
check_pm2_health() {
  log "🔍 Checking PM2 health..."
  
  if ! command -v pm2 >/dev/null 2>&1; then
    log "❌ PM2 not found in PATH"
    return 1
  fi
  
  # Test PM2 responsiveness with timeout
  if timeout 10 pm2 list >/dev/null 2>&1; then
    log "✅ PM2 is responsive"
    return 0
  else
    log "⚠️ PM2 appears unresponsive"
    return 1
  fi
}

# Check for common npm corruption issues
check_npm_health() {
  log "🔍 Checking npm and node_modules health..."
  
  local issues_found=false
  
  # Check for common corruption indicators
  if [ -d "node_modules" ]; then
    # Check for incomplete TypeORM installation (common issue from logs)
    if [ -d "node_modules/typeorm" ] && [ ! -f "node_modules/typeorm/package.json" ]; then
      log "⚠️ Detected corrupted TypeORM installation"
      issues_found=true
    fi
    
    # Check for incomplete @swc/helpers (from error log)
    if [ -d "node_modules/@swc/helpers" ] && [ ! -f "node_modules/@swc/helpers/package.json" ]; then
      log "⚠️ Detected corrupted @swc/helpers installation"
      issues_found=true
    fi
    
    # Check for directories that should not be empty but are
    for dir in node_modules/@swc/helpers node_modules/typeorm; do
      if [ -d "$dir" ] && [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
        log "⚠️ Detected empty critical directory: $dir"
        issues_found=true
      fi
    done
  fi
  
  # Check package-lock.json integrity
  if [ -f "package-lock.json" ]; then
    if ! npm ls --depth=0 > /dev/null 2>&1; then
      log "⚠️ Package-lock.json appears to be inconsistent with node_modules"
      issues_found=true
    fi
  fi
  
  if [ "$issues_found" = true ]; then
    log "🚨 npm corruption detected - will perform clean installation"
    return 1
  else
    log "✅ npm environment appears healthy"
    return 0
  fi
}

# Attempt to build the project with robust fallbacks
attempt_build() {
  log "🔨 เริ่มต้นกระบวนการ build..."
  notify "🔨 Starting build process..."
  
  # Clean previous build directory first
  log "🗑️ Cleaning previous build artifacts..."
  if [ -d "dist" ]; then
    rm -rf dist || {
      log "⚠️ Failed to remove dist directory, trying with sudo..."
      sudo rm -rf dist || log "⚠️ Could not remove dist directory"
    }
    log "✅ Previous build artifacts cleaned"
  else
    log "ℹ️ No previous build artifacts found"
  fi
  
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
  
  # Check npm health before attempting installation
  if ! check_npm_health; then
    log "🧹 Pre-emptive cleanup due to corruption detection..."
    if [ -d "node_modules" ]; then
      chmod -R u+w node_modules 2>/dev/null || true
      rm -rf node_modules || {
        log "⚠️ Standard removal failed, using sudo..."
        sudo rm -rf node_modules || log "⚠️ Sudo removal failed, continuing..."
      }
    fi
    rm -f package-lock.json || true
    npm cache clean --force || true
  fi

  # Enhanced dependency installation with corruption handling
  log "📦 Installing dependencies (including devDependencies for build)..."
  notify "📦 Installing dependencies..."
  
  # Clean up any corrupted files first
  log "🧹 Cleaning up potential corrupted files..."
  
  # Remove any partially extracted or corrupted node_modules
  if [ -d "node_modules" ]; then
    log "🗑️ Removing existing node_modules..."
    # Use more aggressive removal for corrupted directories
    chmod -R u+w node_modules 2>/dev/null || true
    rm -rf node_modules || {
      log "⚠️ Standard removal failed, using sudo..."
      sudo rm -rf node_modules || log "⚠️ Sudo removal also failed, continuing..."
    }
  fi
  
  # Clean npm cache thoroughly
  log "🧽 Cleaning npm cache thoroughly..."
  npm cache clean --force || log "⚠️ Cache clean failed"
  npm cache verify || log "⚠️ Cache verify failed"
  
  # Clean package-lock.json to avoid version conflicts
  if [ -f "package-lock.json" ]; then
    log "🔄 Backing up and regenerating package-lock.json..."
    cp package-lock.json package-lock.json.backup || true
    rm -f package-lock.json || true
  fi
  
  # Ensure devDependencies are installed even if production env is set
  export npm_config_production=false
  export npm_config_legacy_peer_deps=true
  
  # Install with more robust options
  log "📦 Installing dependencies with enhanced options..."
  npm install --include=dev --legacy-peer-deps --no-audit --no-fund || {
    log "⚠️ First install attempt failed, trying with --force..."
    npm install --include=dev --legacy-peer-deps --no-audit --no-fund --force || error_exit "npm install failed"
  }
  
  log "✅ Dependencies installed successfully!"
  notify "✅ Dependencies installed!"
  
  # First build attempt
  log "🚀 Starting first build attempt..."
  notify "🚀 First build attempt..."
  if ! attempt_build; then
    log "⚠️ Build failed - cleaning up and retrying once..."
    notify "⚠️ Build failed - starting recovery process..."
    
    # Enhanced cleanup and recovery
    log "🧹 Starting enhanced cleanup process..."
    
    # Clean build artifacts
    log "🗑️ Removing dist directory..."
    rm -rf dist || true
    
    # Clean node_modules more aggressively
    log "🗑️ Removing node_modules completely..."
    if [ -d "node_modules" ]; then
      chmod -R u+w node_modules 2>/dev/null || true
      rm -rf node_modules || {
        log "⚠️ Standard removal failed, using sudo for recovery..."
        sudo rm -rf node_modules || log "⚠️ Sudo removal failed, continuing..."
      }
    fi
    
    # Clean all npm/cache related files
    log "� Deep cleaning npm cache and lock files..."
    npm cache clean --force || true
    rm -f package-lock.json || true
    rm -rf ~/.npm/_cacache || true
    rm -rf ~/.npm/_logs || true
    
    # Recovery installation with enhanced options
    log "📦 Recovery installation with enhanced options..."
    notify "📦 Reinstalling dependencies for recovery..."
    export npm_config_production=false
    export npm_config_legacy_peer_deps=true
    
    # Try multiple installation strategies
    if ! npm install --include=dev --legacy-peer-deps --no-audit --no-fund; then
      log "🔄 Standard recovery failed, trying with --force..."
      if ! npm install --include=dev --legacy-peer-deps --no-audit --no-fund --force; then
        log "🔄 Force install failed, trying with clean slate..."
        # Last resort: completely clean start
        rm -rf node_modules package-lock.json || true
        npm cache clean --force || true
        npm install --include=dev --legacy-peer-deps --no-audit --no-fund --force || error_exit "Recovery npm install failed"
      fi
    fi
    
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
  
  # Check PM2 health before attempting restart
  if ! check_pm2_health; then
    log "⚠️ PM2 health check failed - attempting to recover..."
    
    # Try to restart PM2 daemon
    log "🔄 Restarting PM2 daemon..."
    pm2 kill || true
    sleep 3
    pm2 ping || log "⚠️ PM2 ping failed after restart"
  fi
  
  # Restart PM2 process using safe restart script
  log "🔄 Restarting application with safe restart script..."
  notify "🔄 Restarting application..."
  
  # Use our safe restart script
  if [[ -f "$SCRIPTS_DIR/safe-restart.sh" ]]; then
    chmod +x "$SCRIPTS_DIR/safe-restart.sh"
    if "$SCRIPTS_DIR/safe-restart.sh" "$PM2_APP_NAME" "$PROJECT_DIR"; then
      log "✅ Safe restart completed successfully!"
      notify "✅ Application restarted successfully!"
    else
      error_exit "Safe restart failed"
    fi
  else
    # Fallback to manual restart with enhanced timeouts
    log "⚠️ Safe restart script not found, using fallback method..."
    
    # Stop existing process with timeout
    log "⏹️ Stopping existing PM2 process..."
    if timeout 10 pm2 list 2>/dev/null | grep -q "$PM2_APP_NAME"; then
      timeout 30 pm2 stop "$PM2_APP_NAME" || {
        log "⚠️ Stop timeout - force deleting process..."
        timeout 15 pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
      }
    else
      log "ℹ️ No running process found"
    fi
    
    # Wait for cleanup
    sleep 3
    
    # Start application with timeout
    log "🚀 Starting application..."
    if [[ "$PROJECT_DIR" == "/var/www/backend/ticket-backend" ]]; then
      # Production environment
      notify "🚀 Starting in production mode..."
      timeout 60 pm2 start ecosystem.config.js --env production || {
        log "❌ Production start failed, trying fallback..."
        NODE_ENV=production timeout 60 pm2 start dist/main.js --name "$PM2_APP_NAME" || error_exit "All start methods failed"
      }
    else
      # Development environment
      notify "🚀 Starting in development mode..."
      timeout 60 pm2 start dist/main.js --name "$PM2_APP_NAME" || {
        log "❌ Development start failed, trying with node..."
        timeout 60 pm2 start "node dist/main.js" --name "$PM2_APP_NAME" || error_exit "All start methods failed"
      }
    fi
    
    log "✅ Application started successfully!"
  fi
  
  # Save PM2 configuration with timeout
  timeout 10 pm2 save || log "⚠️ PM2 save timeout or failed"
  log "💾 PM2 configuration saved!"
  
  # Show PM2 status with timeout
  log "📊 Current PM2 status:"
  timeout 10 pm2 status || log "⚠️ PM2 status timeout"
  
  # Success notification with commit info
  notify "🎉 [SUCCESS] Auto-deployment completed successfully! New commit: $NEW_COMMIT"
  log "🎉 [SUCCESS] Auto-deployment completed successfully!"
  log "📋 Deployment Summary:"
  log "   📝 Old commit: $OLD_COMMIT"
  log "   📝 New commit: $NEW_COMMIT"
  log "   🕐 Completed at: $(date +'%Y-%m-%d %H:%M:%S')"
  
  # Final health check
  log "🔍 Performing final health check..."
  sleep 5
  
  if timeout 10 pm2 status | grep -q "$PM2_APP_NAME.*online"; then
    log "✅ Application is running successfully!"
    notify "✅ Final verification: Application is healthy and running!"
  else
    log "⚠️ Warning: Application may not be running properly"
    notify "⚠️ Warning: Final health check failed - please verify manually"
    timeout 10 pm2 logs "$PM2_APP_NAME" --lines 5 || true
  fi
}

# Handle script termination gracefully
cleanup() {
  log "🧹 Cleaning up on script termination..."
  # Don't exit with error on cleanup
  exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Run main function
main "$@"
