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
    
    # Step 2: Install dependencies
    log_message "Installing dependencies..."
    if npm ci --production=false; then
        log_message "Dependencies installed successfully"
    else
        log_message "ERROR: Failed to install dependencies"
        send_notification "Deploy Failed" "Failed to install dependencies." "$COLOR_RED"
        exit 1
    fi
    
    # Step 3: Build application
    log_message "Building application..."
    if npm run build; then
        log_message "Build completed successfully"
    else
        log_message "ERROR: Build failed"
        send_notification "Deploy Failed" "Application build failed." "$COLOR_RED"
        exit 1
    fi
    
    # Step 4: Restart PM2
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
