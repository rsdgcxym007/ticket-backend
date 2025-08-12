#!/bin/bash

# Safe PM2 restart script with timeout and fallback mechanisms
# This script ensures PM2 operations don't hang

set -e

# Configuration
PM2_APP_NAME="${1:-ticket-backend-prod}"
PROJECT_DIR="${2:-$(pwd)}"
MAX_WAIT_TIME=60
RESTART_TIMEOUT=30

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PM2 process is responsive
is_pm2_responsive() {
  timeout 10 pm2 list >/dev/null 2>&1
}

# Force kill hanging PM2 processes
force_cleanup() {
  log "🔥 Force cleaning PM2 processes..."
  
  # Find and kill PM2 processes
  pgrep -f "PM2" | xargs -r kill -9 2>/dev/null || true
  pgrep -f "$PM2_APP_NAME" | xargs -r kill -9 2>/dev/null || true
  
  # Clean PM2 files
  rm -f ~/.pm2/pm2.pid 2>/dev/null || true
  rm -f ~/.pm2/rpc.sock 2>/dev/null || true
  rm -f ~/.pm2/pub.sock 2>/dev/null || true
  
  sleep 3
  
  # Start fresh PM2 daemon
  log "🔄 Starting fresh PM2 daemon..."
  pm2 ping >/dev/null 2>&1 || true
  sleep 2
}

# Safe PM2 restart with multiple fallback strategies
safe_restart() {
  log "🔄 Starting safe PM2 restart process..."
  
  # Strategy 1: Standard PM2 operations with timeout
  log "📝 Strategy 1: Standard PM2 restart..."
  if is_pm2_responsive; then
    if timeout $RESTART_TIMEOUT pm2 restart "$PM2_APP_NAME" 2>/dev/null; then
      log "✅ Standard restart successful!"
      return 0
    fi
    warn "Standard restart failed or timed out"
  else
    warn "PM2 not responsive, skipping standard restart"
  fi
  
  # Strategy 2: Stop and start separately
  log "📝 Strategy 2: Stop and start separately..."
  if is_pm2_responsive; then
    if timeout 15 pm2 stop "$PM2_APP_NAME" 2>/dev/null; then
      sleep 2
      if timeout 30 pm2 start "$PM2_APP_NAME" 2>/dev/null; then
        log "✅ Stop/start restart successful!"
        return 0
      fi
    fi
    warn "Stop/start strategy failed"
  fi
  
  # Strategy 3: Delete and recreate
  log "📝 Strategy 3: Delete and recreate process..."
  if is_pm2_responsive; then
    timeout 15 pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
    sleep 2
    
    # Check if we have ecosystem config
    if [[ -f "$PROJECT_DIR/ecosystem.config.js" ]]; then
      if timeout 30 pm2 start "$PROJECT_DIR/ecosystem.config.js" --env production 2>/dev/null; then
        log "✅ Recreate with ecosystem config successful!"
        return 0
      fi
    fi
    
    # Fallback to simple start
    if [[ -f "$PROJECT_DIR/dist/main.js" ]]; then
      if timeout 30 pm2 start "$PROJECT_DIR/dist/main.js" --name "$PM2_APP_NAME" 2>/dev/null; then
        log "✅ Recreate with simple start successful!"
        return 0
      fi
    fi
    warn "Delete/recreate strategy failed"
  fi
  
  # Strategy 4: Force cleanup and fresh start
  log "📝 Strategy 4: Force cleanup and fresh start..."
  force_cleanup
  
  # Try starting after cleanup
  if [[ -f "$PROJECT_DIR/ecosystem.config.js" ]]; then
    if timeout 30 pm2 start "$PROJECT_DIR/ecosystem.config.js" --env production 2>/dev/null; then
      log "✅ Fresh start with ecosystem config successful!"
      return 0
    fi
  fi
  
  if [[ -f "$PROJECT_DIR/dist/main.js" ]]; then
    if timeout 30 pm2 start "$PROJECT_DIR/dist/main.js" --name "$PM2_APP_NAME" 2>/dev/null; then
      log "✅ Fresh start with simple config successful!"
      return 0
    fi
  fi
  
  error "❌ All restart strategies failed!"
  return 1
}

# Verify the application is running
verify_app() {
  log "🔍 Verifying application status..."
  
  # Wait a moment for the app to stabilize
  sleep 5
  
  local max_attempts=6
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    log "📊 Verification attempt $attempt/$max_attempts..."
    
    if timeout 10 pm2 status 2>/dev/null | grep -q "$PM2_APP_NAME.*online"; then
      log "✅ Application is running and healthy!"
      
      # Save PM2 configuration
      timeout 10 pm2 save 2>/dev/null || warn "Failed to save PM2 config"
      
      # Show final status
      timeout 10 pm2 status || warn "Failed to show PM2 status"
      
      return 0
    fi
    
    warn "Application not ready yet, waiting..."
    sleep 5
    ((attempt++))
  done
  
  error "❌ Application verification failed after $max_attempts attempts"
  
  # Show logs for debugging
  log "📋 Recent application logs:"
  timeout 10 pm2 logs "$PM2_APP_NAME" --lines 10 2>/dev/null || warn "Failed to retrieve logs"
  
  return 1
}

# Main execution
main() {
  log "🚀 Starting safe PM2 restart for: $PM2_APP_NAME"
  log "📁 Project directory: $PROJECT_DIR"
  
  # Change to project directory
  cd "$PROJECT_DIR" || {
    error "Failed to change to project directory: $PROJECT_DIR"
    exit 1
  }
  
  # Perform safe restart
  if safe_restart; then
    log "✅ Restart completed successfully!"
  else
    error "❌ Restart failed!"
    exit 1
  fi
  
  # Verify application is working
  if verify_app; then
    log "🎉 Safe restart completed successfully!"
    echo "✅ Application is running and verified healthy"
    exit 0
  else
    error "❌ Application verification failed!"
    exit 1
  fi
}

# Run main function
main "$@"
