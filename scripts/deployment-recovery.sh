#!/bin/bash

# Quick Deployment Recovery Script
# Use this when deployment gets stuck during dependency installation

set -euo pipefail

echo "🚨 Quick Deployment Recovery"
echo "==========================="

PROJECT_DIR="/var/www/backend/ticket-backend"
cd "$PROJECT_DIR" || { echo "❌ Cannot access $PROJECT_DIR"; exit 1; }

# Function to kill hung processes
kill_hung_processes() {
    echo "🔍 Looking for hung npm/node processes..."
    
    # Kill any hung npm processes
    pkill -f "npm install" 2>/dev/null || true
    pkill -f "node.*install" 2>/dev/null || true
    
    # Wait a moment
    sleep 2
    
    echo "✅ Cleared hung processes"
}

# Function to clean everything
clean_all() {
    echo "🧹 Performing thorough cleanup..."
    
    # Remove node_modules and lock files
    rm -rf node_modules/ package-lock.json yarn.lock pnpm-lock.yaml .npm 2>/dev/null || true
    
    # Clear npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Clear any tmp directories
    rm -rf /tmp/npm-* 2>/dev/null || true
    
    echo "✅ Cleanup completed"
}

# Function to install with timeout
install_with_timeout() {
    local timeout_duration=300  # 5 minutes
    local install_cmd="$1"
    
    echo "⏱️  Installing with ${timeout_duration}s timeout: $install_cmd"
    
    # Use timeout to prevent hanging
    if timeout $timeout_duration bash -c "$install_cmd"; then
        echo "✅ Installation completed successfully"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo "❌ Installation timed out after ${timeout_duration}s"
        else
            echo "❌ Installation failed with exit code $exit_code"
        fi
        return $exit_code
    fi
}

# Main recovery process
echo "🔄 Starting recovery process..."

# Step 1: Kill hung processes
kill_hung_processes

# Step 2: Clean everything
clean_all

# Step 3: Set environment variables for better compatibility
export NODE_OPTIONS="--max-old-space-size=2048"
export NPM_CONFIG_ENGINE_STRICT=false
export NPM_CONFIG_LEGACY_PEER_DEPS=true
export NPM_CONFIG_TIMEOUT=300000
export NPM_CONFIG_FETCH_TIMEOUT=300000
export NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
export NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

echo "🔧 Environment configured for better compatibility"

# Step 4: Try different installation methods
echo "📦 Attempting installation with multiple methods..."

# Method 1: npm ci (fastest if package-lock exists)
if [ -f "package-lock.json" ]; then
    echo "🚀 Trying npm ci (fastest method)..."
    if install_with_timeout "npm ci --production=false --no-audit --no-fund"; then
        echo "✅ Success with npm ci"
        INSTALL_SUCCESS=true
    fi
fi

# Method 2: npm install with compatibility flags
if [ "${INSTALL_SUCCESS:-false}" = "false" ]; then
    echo "🚀 Trying npm install with compatibility flags..."
    if install_with_timeout "npm install --production=false --no-audit --no-fund --legacy-peer-deps"; then
        echo "✅ Success with npm install (compatibility mode)"
        INSTALL_SUCCESS=true
    fi
fi

# Method 3: npm install with force
if [ "${INSTALL_SUCCESS:-false}" = "false" ]; then
    echo "🚀 Trying npm install with force flag..."
    if install_with_timeout "npm install --production=false --no-audit --no-fund --legacy-peer-deps --force"; then
        echo "✅ Success with npm install (force mode)"
        INSTALL_SUCCESS=true
    fi
fi

# Method 4: Alternative registry
if [ "${INSTALL_SUCCESS:-false}" = "false" ]; then
    echo "🚀 Trying with alternative npm registry..."
    if install_with_timeout "npm install --production=false --no-audit --no-fund --legacy-peer-deps --registry https://registry.npmjs.org/"; then
        echo "✅ Success with alternative registry"
        INSTALL_SUCCESS=true
    fi
fi

# Check if any method succeeded
if [ "${INSTALL_SUCCESS:-false}" = "false" ]; then
    echo "❌ All installation methods failed"
    echo ""
    echo "🔧 Manual troubleshooting steps:"
    echo "1. Check network connectivity: curl -I https://registry.npmjs.org/"
    echo "2. Check disk space: df -h"
    echo "3. Check memory: free -h"
    echo "4. Try manual install: npm install --verbose"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"

# Step 5: Quick build test
echo "🔨 Testing build process..."
export NODE_ENV=production

if timeout 300 npm run build; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed or timed out"
    echo "💡 You may need to run the build step manually"
fi

# Step 6: Verify critical files
echo "🔍 Verifying installation..."
if [ -d "node_modules" ] && [ -f "dist/main.js" ]; then
    echo "✅ Installation and build verification passed"
    
    # Get some stats
    NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "unknown")
    DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1 || echo "unknown")
    
    echo ""
    echo "📊 Installation Summary:"
    echo "   • node_modules size: $NODE_MODULES_SIZE"
    echo "   • dist size: $DIST_SIZE"
    echo "   • Node.js: $(node --version)"
    echo "   • npm: $(npm --version)"
    
    echo ""
    echo "🚀 Ready for PM2 deployment!"
    echo "Run: pm2 restart ticket-backend-prod"
    
else
    echo "⚠️  Installation completed but verification failed"
    echo "🔍 Check these directories:"
    echo "   • node_modules: $([ -d node_modules ] && echo '✅ exists' || echo '❌ missing')"
    echo "   • dist: $([ -d dist ] && echo '✅ exists' || echo '❌ missing')"
    echo "   • dist/main.js: $([ -f dist/main.js ] && echo '✅ exists' || echo '❌ missing')"
fi

echo ""
echo "🎉 Recovery process completed!"
echo "Time: $(date)"
