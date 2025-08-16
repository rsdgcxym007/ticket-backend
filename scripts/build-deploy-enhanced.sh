#!/bin/bash

# Enhanced Build and Deploy Script - SIGPIPE Safe Version
# Fixed for deployment issues and enhanced error handling

set -euo pipefail

# Ignore SIGPIPE to prevent exit code 141
trap '' SIGPIPE

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
WEBHOOK_URL="http://43.229.133.51:4200/hooks/deploy-backend-master"
PM2_APP_NAME="ticket-backend-prod"
LOG_FILE="/tmp/build-deploy-$(date +%Y%m%d-%H%M%S).log"

# Ensure we're in the project directory
cd "$PROJECT_DIR"

# Enhanced logging
get_timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

print_status() {
    echo -e "\033[1;34m[$(get_timestamp)] 📋 $1\033[0m"
    echo "[$(get_timestamp)] INFO: $1" >> "$LOG_FILE" 2>/dev/null || true
}

print_success() {
    echo -e "\033[1;32m[$(get_timestamp)] ✅ $1\033[0m"
    echo "[$(get_timestamp)] SUCCESS: $1" >> "$LOG_FILE" 2>/dev/null || true
}

print_error() {
    echo -e "\033[1;31m[$(get_timestamp)] ❌ $1\033[0m"
    echo "[$(get_timestamp)] ERROR: $1" >> "$LOG_FILE" 2>/dev/null || true
}

print_warning() {
    echo -e "\033[1;33m[$(get_timestamp)] ⚠️  $1\033[0m"
    echo "[$(get_timestamp)] WARNING: $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Safe command execution
safe_execute() {
    local cmd="$1"
    local description="$2"
    
    print_status "$description"
    echo "[$(get_timestamp)] EXECUTING: $cmd" >> "$LOG_FILE" 2>/dev/null || true
    
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        print_success "$description completed"
        return 0
    else
        local exit_code=$?
        print_error "$description failed (exit code: $exit_code)"
        return $exit_code
    fi
}

# Discord notification function
send_discord_notification() {
    local message="$1"
    local color="$2"
    local status="$3"
    local branch=$(git branch --show-current 2>/dev/null || echo 'unknown')
    local commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
    local commit_msg=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo 'No commit message')
    
    curl -sSL -H "Content-Type: application/json" \
         -X POST \
         --max-time 15 \
         -d "{
             \"embeds\": [{
                 \"title\": \"🚀 Ticket Backend Deployment\",
                 \"description\": \"$message\",
                 \"color\": $color,
                 \"fields\": [
                     {\"name\": \"Status\", \"value\": \"$status\", \"inline\": true},
                     {\"name\": \"Branch\", \"value\": \"$branch\", \"inline\": true},
                     {\"name\": \"Commit\", \"value\": \"[$commit_hash](https://github.com/rsdgcxym007/ticket-backend/commit/$commit_hash)\", \"inline\": true},
                     {\"name\": \"Message\", \"value\": \"$commit_msg\", \"inline\": false},
                     {\"name\": \"Timestamp\", \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\", \"inline\": true},
                     {\"name\": \"Server\", \"value\": \"Production (43.229.133.51)\", \"inline\": true}
                 ],
                 \"footer\": {\"text\": \"Enhanced Build & Deploy Script v2.1\"}
             }]
         }" \
         "$DISCORD_WEBHOOK_URL" >/dev/null 2>&1 || print_warning "Discord notification failed"
}

# Cleanup on exit
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ] && [ $exit_code -ne 141 ]; then
        print_error "Script failed with exit code $exit_code"
        send_discord_notification "❌ Deployment failed with exit code $exit_code" "15158332" "Failed"
    elif [ $exit_code -eq 141 ]; then
        print_warning "SIGPIPE detected (exit 141) - this is usually harmless"
        # Don't treat SIGPIPE as a failure
        exit_code=0
    fi
    print_status "Cleanup completed. Log: $LOG_FILE"
    exit $exit_code
}

trap cleanup EXIT

echo "🚀 Enhanced Build and Deploy Process Started"
echo "============================================"
send_discord_notification "🚀 Starting enhanced deployment process..." "16776960" "In Progress"

# Step 1: Validate environment
print_status "Step 1: Validating environment"
if [ ! -f "package.json" ]; then
    print_error "package.json not found"
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js not found"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    print_error "npm not found"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Environment validated - Node.js $NODE_VERSION"

# Step 2: Check Node.js compatibility
print_status "Step 2: Checking Node.js compatibility"
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
    print_warning "Node.js version $NODE_VERSION detected, v20+ recommended"
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NPM_CONFIG_ENGINE_STRICT=false
    export NPM_CONFIG_LEGACY_PEER_DEPS=true
fi

# Step 3: Clean and install dependencies
print_status "Step 3: Installing dependencies"
safe_execute "rm -rf node_modules package-lock.json yarn.lock" "Cleaning previous installations"

if ! safe_execute "npm install --production=false --no-audit --no-fund --legacy-peer-deps" "Installing dependencies"; then
    print_warning "Standard install failed, trying with force flag"
    if ! safe_execute "npm install --production=false --no-audit --no-fund --legacy-peer-deps --force" "Force installing dependencies"; then
        print_error "All dependency installation attempts failed"
        exit 1
    fi
fi

# Step 4: Build application
print_status "Step 4: Building application"
safe_execute "rm -rf dist" "Cleaning previous build"

# Set build environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048 ${NODE_OPTIONS:-}"

if ! safe_execute "npm run build" "Building with npm run build"; then
    print_warning "npm run build failed, trying alternatives"
    if ! safe_execute "npx nest build" "Building with npx nest build"; then
        print_error "All build methods failed"
        exit 1
    fi
fi

# Step 5: Verify build
print_status "Step 5: Verifying build"
if [ ! -f "dist/main.js" ]; then
    print_error "Build verification failed - dist/main.js not found"
    if [ -d "dist" ]; then
        print_status "Build directory contents:"
        ls -la dist/ 2>/dev/null || true
    fi
    exit 1
fi

BUILD_SIZE=$(stat -c%s "dist/main.js" 2>/dev/null || stat -f%z "dist/main.js" 2>/dev/null || echo "unknown")
print_success "Build verified - main.js ($BUILD_SIZE bytes)"

# Step 6: Deploy with PM2
print_status "Step 6: Deploying with PM2"
if ! command -v pm2 >/dev/null 2>&1; then
    print_error "PM2 not found"
    exit 1
fi

# Stop existing process if running
pm2 stop "$PM2_APP_NAME" >/dev/null 2>&1 || true
pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true

if ! safe_execute "pm2 start ecosystem.config.js --env production" "Starting PM2 application"; then
    print_error "Failed to start PM2 application"
    pm2 logs "$PM2_APP_NAME" --lines 10 2>/dev/null || true
    exit 1
fi

# Step 7: Verify deployment
print_status "Step 7: Verifying deployment"
sleep 5

if pm2 status 2>/dev/null | grep -q "$PM2_APP_NAME.*online"; then
    print_success "✅ Deployment successful - Application is online"
    
    # Get deployment info
    UPTIME=$(pm2 show "$PM2_APP_NAME" 2>/dev/null | grep "uptime" | head -1 || echo "uptime: unknown")
    MEMORY=$(pm2 show "$PM2_APP_NAME" 2>/dev/null | grep "memory usage" | head -1 || echo "memory: unknown")
    
    send_discord_notification "✅ Deployment successful! Application is running." "5763719" "Success"
    
    echo ""
    echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo "====================================="
    echo "✅ Application: $PM2_APP_NAME"
    echo "✅ Status: Online"
    echo "✅ Build Size: $BUILD_SIZE bytes"
    echo "✅ Node.js: $NODE_VERSION"
    echo "✅ $UPTIME"
    echo "✅ $MEMORY"
    echo ""
    echo "📊 Monitor: pm2 logs $PM2_APP_NAME"
    echo "📋 Status: pm2 status"
    echo "🌐 Health: https://api.patongboxingstadiumticket.com/health"
    
else
    print_error "Deployment verification failed - Application not online"
    pm2 status 2>/dev/null || true
    pm2 logs "$PM2_APP_NAME" --lines 20 2>/dev/null || true
    exit 1
fi

echo "🚀 Enhanced deployment process completed at $(date)"
