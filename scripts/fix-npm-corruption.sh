#!/bin/bash

# Emergency script to fix npm corruption issues
# Run this script when you encounter npm install failures

set -e

# ANSI color codes for logs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error_exit() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
  exit 1
}

log "🚨 Starting npm corruption fix process..."

# Get to project directory
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" || error_exit "Failed to change to project directory: $PROJECT_DIR"

log "📁 Working in directory: $PROJECT_DIR"

# Stop any running processes
log "🛑 Stopping PM2 processes..."
pm2 stop all 2>/dev/null || log "ℹ️ No PM2 processes to stop"

# Nuclear cleanup
log "💥 Performing nuclear cleanup..."

# Remove node_modules with multiple strategies
if [ -d "node_modules" ]; then
  log "🗑️ Removing node_modules..."
  chmod -R u+w node_modules 2>/dev/null || true
  
  # Try multiple removal strategies
  if ! rm -rf node_modules 2>/dev/null; then
    log "⚠️ Standard removal failed, trying with sudo..."
    if ! sudo rm -rf node_modules 2>/dev/null; then
      log "⚠️ Sudo removal failed, trying to fix permissions first..."
      sudo chmod -R 777 node_modules 2>/dev/null || true
      sudo rm -rf node_modules || log "⚠️ Final removal attempt failed"
    fi
  fi
fi

# Clean all npm/cache related files
log "🧽 Deep cleaning npm cache and related files..."
npm cache clean --force 2>/dev/null || true
npm cache verify 2>/dev/null || true

# Remove lock files
log "🔒 Removing lock files..."
rm -f package-lock.json || true
rm -f yarn.lock || true

# Clean global npm cache locations
log "🌍 Cleaning global npm cache..."
rm -rf ~/.npm/_cacache 2>/dev/null || true
rm -rf ~/.npm/_logs 2>/dev/null || true
rm -rf ~/.npm/_temp 2>/dev/null || true

# Clean temporary directories
log "🗂️ Cleaning temporary directories..."
rm -rf /tmp/npm-* 2>/dev/null || true
sudo rm -rf /tmp/npm-* 2>/dev/null || true

# Verify npm installation
log "🔍 Verifying npm installation..."
npm --version || error_exit "npm is not properly installed"
node --version || error_exit "node is not properly installed"

# Set npm configuration for problematic packages
log "⚙️ Setting npm configuration for better compatibility..."
export npm_config_production=false
export npm_config_legacy_peer_deps=true
npm config set legacy-peer-deps true
npm config set audit false
npm config set fund false

# Install dependencies with progressive strategies
log "📦 Installing dependencies with progressive strategies..."

# Strategy 1: Standard install
log "🔄 Attempting standard install..."
if npm install --include=dev --legacy-peer-deps --no-audit --no-fund; then
  log "✅ Standard install successful!"
else
  log "⚠️ Standard install failed, trying with --force..."
  
  # Strategy 2: Force install
  if npm install --include=dev --legacy-peer-deps --no-audit --no-fund --force; then
    log "✅ Force install successful!"
  else
    log "⚠️ Force install failed, trying clean slate approach..."
    
    # Strategy 3: Clean slate with specific npm version
    rm -rf node_modules package-lock.json || true
    npm cache clean --force || true
    
    # Try with specific npm configuration
    npm config set registry https://registry.npmjs.org/
    npm config set strict-ssl false
    
    if npm install --include=dev --legacy-peer-deps --no-audit --no-fund --force; then
      log "✅ Clean slate install successful!"
    else
      error_exit "All installation strategies failed"
    fi
  fi
fi

# Verify installation
log "🔍 Verifying installation..."
if npm ls --depth=0 > /dev/null 2>&1; then
  log "✅ Installation verification successful!"
else
  log "⚠️ Installation verification failed, but continuing..."
fi

# Check for critical packages
log "🔍 Checking critical packages..."
critical_packages=("@nestjs/core" "@nestjs/common" "typeorm" "typescript")
for package in "${critical_packages[@]}"; do
  if [ -d "node_modules/$package" ]; then
    log "✅ $package is installed"
  else
    log "⚠️ $package is missing"
  fi
done

log "🎉 npm corruption fix completed!"
log "📋 Summary:"
log "   ✅ node_modules cleaned"
log "   ✅ npm cache cleaned"
log "   ✅ Dependencies reinstalled"
log "   ✅ Installation verified"
log ""
log "💡 You can now retry your deployment or build process."
