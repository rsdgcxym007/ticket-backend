#!/bin/bash

# Immediate Fix for Hanging Deployment
# Run this to kill hung processes and restart deployment

echo "🚨 Fixing Hanging Deployment"
echo "============================"

# Kill any hung npm processes
echo "🔄 Killing hung npm processes..."
pkill -f "npm install" 2>/dev/null && echo "✅ Killed npm install processes" || echo "ℹ️  No npm processes to kill"
pkill -f "node.*npm" 2>/dev/null && echo "✅ Killed node npm processes" || echo "ℹ️  No node npm processes to kill"

# Wait for processes to terminate
sleep 3

# Go to project directory
cd /var/www/backend/ticket-backend || { echo "❌ Cannot access project directory"; exit 1; }

# Quick cleanup
echo "🧹 Quick cleanup..."
rm -rf node_modules/.npm node_modules/.cache 2>/dev/null || true

# Check current status
echo "🔍 Current status:"
echo "   • Project directory: $(pwd)"
echo "   • Node.js version: $(node --version 2>/dev/null || echo 'not found')"
echo "   • npm version: $(npm --version 2>/dev/null || echo 'not found')"
echo "   • Disk space: $(df -h . | tail -1 | awk '{print $4}') available"

# Set environment for quick install
export NPM_CONFIG_TIMEOUT=120000  # 2 minutes
export NODE_OPTIONS="--max-old-space-size=1024"

echo ""
echo "🚀 Attempting quick installation..."
echo "   (This will timeout after 2 minutes if it hangs)"

# Try quick install with timeout
if timeout 120 npm install --production=false --no-audit --no-fund --legacy-peer-deps --prefer-offline; then
    echo "✅ Quick installation successful!"
    
    # Quick build
    echo "🔨 Quick build test..."
    if timeout 60 npm run build; then
        echo "✅ Build successful!"
        
        # Check main.js
        if [ -f "dist/main.js" ]; then
            echo "✅ dist/main.js exists - ready for PM2"
            echo ""
            echo "🎯 Next steps:"
            echo "   pm2 restart ticket-backend-prod"
            echo "   pm2 status"
        else
            echo "❌ dist/main.js not found after build"
        fi
    else
        echo "⚠️  Build timed out or failed"
        echo "💡 You may need to run: npm run build"
    fi
    
else
    echo "❌ Quick installation failed or timed out"
    echo ""
    echo "🔧 Next steps to try:"
    echo "1. Run the full recovery script:"
    echo "   bash scripts/deployment-recovery.sh"
    echo ""
    echo "2. Or try manual installation:"
    echo "   npm cache clean --force"
    echo "   rm -rf node_modules"
    echo "   npm install --legacy-peer-deps"
    echo ""
    echo "3. Check system resources:"
    echo "   free -h    # Check memory"
    echo "   df -h      # Check disk space"
    echo "   top        # Check CPU usage"
fi

echo ""
echo "⏰ $(date)"
