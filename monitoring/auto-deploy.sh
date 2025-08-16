#!/bin/bash

# GitHub Auto-Deploy Webhook Handler
# Handles automatic deployment when code is pushed to repository

set -euo pipefail

# Configuration
PROJECT_DIR="/var/www/backend/ticket-backend"
BRANCH="feature/newfunction"
PM2_APP_NAME="ticket-backend-prod"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
LOG_FILE="/var/log/auto-deploy.log"

# Colors
COLOR_GREEN=5763719
COLOR_YELLOW=16776960
COLOR_RED=15158332
COLOR_BLUE=3447003

# Get timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Logging
log_message() {
    echo "[$(get_timestamp)] $1" | tee -a "$LOG_FILE"
}

# Discord notification
send_notification() {
    local title="$1"
    local description="$2"
    local color="$3"
    local fields="${4:-}"
    
    local commit_hash=$(cd "$PROJECT_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local commit_msg=$(cd "$PROJECT_DIR" && git log -1 --pretty=format:"%s" 2>/dev/null || echo "No commit message")
    local author=$(cd "$PROJECT_DIR" && git log -1 --pretty=format:"%an" 2>/dev/null || echo "Unknown")
    
    local base_fields="{\"name\": \"Branch\", \"value\": \"$BRANCH\", \"inline\": true}, {\"name\": \"Commit\", \"value\": \"[$commit_hash](https://github.com/rsdgcxym007/ticket-backend/commit/$commit_hash)\", \"inline\": true}, {\"name\": \"Author\", \"value\": \"$author\", \"inline\": true}, {\"name\": \"Message\", \"value\": \"$commit_msg\", \"inline\": false}"
    
    if [ -n "$fields" ]; then
        base_fields="$base_fields, $fields"
    fi
    
    curl -H "Content-Type: application/json" \
         -X POST \
         --max-time 10 \
         -d "{
             \"embeds\": [{
                 \"title\": \"🚀 $title\",
                 \"description\": \"$description\",
                 \"color\": $color,
                 \"fields\": [$base_fields],
                 \"footer\": {
                     \"text\": \"Auto-Deploy System | $(get_timestamp)\"
                 }
             }]
         }" \
         "$DISCORD_WEBHOOK" &>/dev/null || log_message "Failed to send Discord notification"
}

# Deploy function
deploy() {
    log_message "Starting auto-deployment process..."
    send_notification "Auto-Deploy Started" "Automatic deployment process has been initiated." "$COLOR_BLUE"
    
    cd "$PROJECT_DIR" || {
        log_message "ERROR: Cannot access project directory: $PROJECT_DIR"
        send_notification "Deploy Failed" "Cannot access project directory." "$COLOR_RED"
        exit 1
    }
    
    # Step 1: Pull latest code
    log_message "Pulling latest code..."
    if git fetch origin && git checkout "$BRANCH" && git reset --hard "origin/$BRANCH"; then
        log_message "Code updated successfully"
    else
        log_message "ERROR: Failed to update code"
        send_notification "Deploy Failed" "Failed to pull latest code from repository." "$COLOR_RED"
        exit 1
    fi
    
    # Step 2: Check Node.js version compatibility
    log_message "Checking Node.js version compatibility..."
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    REQUIRED_NODE_VERSION=20
    
    if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
        log_message "ERROR: Node.js version $NODE_VERSION detected, but version $REQUIRED_NODE_VERSION or higher is required"
        send_notification "Deploy Failed" "Node.js version incompatibility. Current: v$NODE_VERSION, Required: v$REQUIRED_NODE_VERSION+" "$COLOR_RED"
        exit 1
    else
        log_message "Node.js version check passed: v$NODE_VERSION"
    fi
    
    # Step 3: Smart dependency installation
    log_message "Checking if dependencies need to be updated..."
    
    # Check if package.json or lock files changed
    PACKAGE_CHANGED=false
    if ! git diff HEAD~1 HEAD --name-only | grep -q "package\.json\|yarn\.lock\|package-lock\.json"; then
        log_message "No changes to package files detected"
        if [ -d "node_modules" ] && [ -f "yarn.lock" ]; then
            log_message "Existing dependencies found, skipping installation"
        else
            log_message "No node_modules found, performing installation"
            PACKAGE_CHANGED=true
        fi
    else
        log_message "Package files changed, performing fresh installation"
        PACKAGE_CHANGED=true
    fi
    
    if [ "$PACKAGE_CHANGED" = true ]; then
        # Clean installation for major changes only
        log_message "Cleaning previous installations..."
        rm -rf node_modules/ yarn.lock package-lock.json 2>/dev/null || true
        
        # Install dependencies with enhanced error handling
        log_message "Installing dependencies with npm and compatibility flags..."
        export NODE_OPTIONS="--max-old-space-size=2048"
        export NPM_CONFIG_ENGINE_STRICT=false
        export NPM_CONFIG_LEGACY_PEER_DEPS=true
        
        if npm ci --production=false --silent --no-audit --no-fund --legacy-peer-deps --force; then
            log_message "Dependencies installed successfully with npm ci (production)"
        else
            log_message "npm ci failed, trying npm install with compatibility options..."
            if npm install --production=false --silent --no-audit --no-fund --legacy-peer-deps --force --engine-strict=false; then
                log_message "Dependencies installed successfully with npm install (fallback)"
                else
                    log_message "ERROR: All dependency installation methods failed"
                    
                    # Check if it's a Node.js version issue
                    log_message "Checking for Node.js version compatibility issues..."
                    npm ls --depth=0 --silent 2>&1 | grep -i "EBADENGINE" && {
                        log_message "Node.js version compatibility issue detected"
                        send_notification "Deploy Failed" "Node.js version incompatibility detected during installation. Server may need Node.js upgrade." "$COLOR_RED"
                    } || {
                        send_notification "Deploy Failed" "Failed to install dependencies after trying all methods." "$COLOR_RED"
                    }
                    exit 1
                fi
        else
            log_message "ERROR: npm not available or installation failed"
            send_notification "Deploy Failed" "Package manager not available or installation failed." "$COLOR_RED"
            exit 1
        fi
    else
        log_message "Using existing dependencies (no package changes detected)"
    fi
    
    # Step 4: Build application with enhanced compatibility
    log_message "Building application with fresh build process..."
    
    # Clean previous build completely
    rm -rf dist/ 2>/dev/null || true
    
    # Try build with enhanced Node.js options
    log_message "Building with enhanced Node.js compatibility options..."
    export NODE_OPTIONS="--max-old-space-size=2048 --no-experimental-fetch"
    export NPM_CONFIG_ENGINE_STRICT=false
    export NPM_CONFIG_LEGACY_PEER_DEPS=true
    
    if npm run build --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"; then
        log_message "Build completed successfully with enhanced npm build"
    else
        log_message "Enhanced npm build failed, trying alternative build method..."
        
        # Alternative build with direct nestjs cli
        if npx @nestjs/cli build --no-cache 2>&1 | tee -a "$LOG_FILE"; then
            log_message "Build completed with direct NestJS CLI"
        else
            log_message "Direct NestJS CLI failed, trying basic build..."
            export NODE_OPTIONS="--max-old-space-size=1024"
            
            if npx nest build 2>&1 | tee -a "$LOG_FILE"; then
                log_message "Build completed with basic nest build"
            else
                log_message "ERROR: All build methods failed"
                
                # Check for specific build errors
                if [ -f "$LOG_FILE" ] && grep -q "EBADENGINE\|engine" "$LOG_FILE"; then
                    send_notification "Deploy Failed" "Build failed due to Node.js version incompatibility. Server needs Node.js 20+ upgrade." "$COLOR_RED"
                else
                    send_notification "Deploy Failed" "Application build failed with all available methods." "$COLOR_RED"
                fi
                exit 1
            fi
        fi
    fi
    
    # Verify build output
    if [ ! -f "dist/main.js" ]; then
        log_message "ERROR: Build verification failed - dist/main.js not found"
        if [ -d "dist/" ]; then
            log_message "Contents of dist directory:"
            ls -la dist/ | tee -a "$LOG_FILE"
        fi
        send_notification "Deploy Failed" "Build verification failed - main.js not found." "$COLOR_RED"
        exit 1
    fi
    
    # Step 5: Restart PM2
    log_message "Restarting PM2 application..."
    if pm2 restart "$PM2_APP_NAME"; then
        sleep 5
        
        # Check if application is online
        if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
            log_message "Application restarted successfully"
            
            local build_size=$(stat -c%s dist/main.js 2>/dev/null || echo "unknown")
            local uptime=$(pm2 show "$PM2_APP_NAME" 2>/dev/null | grep "uptime" | head -1 || echo "unknown")
            
            send_notification \
                "Deploy Successful" \
                "Application has been successfully deployed and is now running." \
                "$COLOR_GREEN" \
                "{\"name\": \"Build Size\", \"value\": \"$build_size bytes\", \"inline\": true}, {\"name\": \"Status\", \"value\": \"Online\", \"inline\": true}"
                
            # Send system status after deployment
            source /var/www/backend/ticket-backend/monitoring/system-monitor.sh health
            
        else
            log_message "ERROR: Application failed to start"
            send_notification "Deploy Failed" "Application failed to start after deployment." "$COLOR_RED"
            exit 1
        fi
    else
        log_message "ERROR: Failed to restart PM2"
        send_notification "Deploy Failed" "Failed to restart PM2 application." "$COLOR_RED"
        exit 1
    fi
    
    log_message "Auto-deployment completed successfully!"
}

# Health check after deploy
health_check_post_deploy() {
    sleep 10
    
    # Check application health
    local response=$(curl -s -o /dev/null -w "%{http_code}" "https://api.patongboxingstadiumticket.com/health" || echo "000")
    
    if [ "$response" = "200" ]; then
        send_notification \
            "Health Check Passed" \
            "Application is responding correctly after deployment." \
            "$COLOR_GREEN" \
            "{\"name\": \"Health Check\", \"value\": \"✅ Passed\", \"inline\": true}, {\"name\": \"Response Code\", \"value\": \"$response\", \"inline\": true}"
    else
        send_notification \
            "Health Check Failed" \
            "Application may not be responding correctly after deployment." \
            "$COLOR_YELLOW" \
            "{\"name\": \"Health Check\", \"value\": \"⚠️ Failed\", \"inline\": true}, {\"name\": \"Response Code\", \"value\": \"$response\", \"inline\": true}"
    fi
}

# Main execution
case "${1:-deploy}" in
    "deploy")
        deploy
        health_check_post_deploy
        ;;
    "health")
        health_check_post_deploy
        ;;
    *)
        echo "Usage: $0 {deploy|health}"
        exit 1
        ;;
esac
