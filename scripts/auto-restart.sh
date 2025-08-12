#!/bin/bash
# Auto-restart script for Ticket Backend
# This script monitors and automatically restarts the backend when it goes down

# Configuration
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
PM2_APP_NAME="ticket-backend-prod"
PROJECT_DIR="/var/www/backend/ticket-backend"
MAX_RESTART_ATTEMPTS=3
RESTART_COOLDOWN=30  # seconds
LOG_FILE="/var/log/ticket-auto-restart.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

# Send Discord notification
send_notification() {
    local message="$1"
    local level="$2"
    
    case $level in
        "critical")
            emoji="🚨"
            color="15158332"  # Red
            ;;
        "warning")
            emoji="⚠️"
            color="16776960"  # Yellow
            ;;
        "success")
            emoji="✅"
            color="5763719"   # Green
            ;;
        *)
            emoji="ℹ️"
            color="3447003"   # Blue
            ;;
    esac
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    local hostname=$(hostname)
    
    local payload=$(cat <<EOF
{
    "embeds": [
        {
            "title": "$emoji Auto-Restart System",
            "description": "$message",
            "color": $color,
            "fields": [
                {
                    "name": "Server",
                    "value": "$hostname",
                    "inline": true
                },
                {
                    "name": "Time",
                    "value": "$timestamp",
                    "inline": true
                }
            ],
            "footer": {
                "text": "Ticket Backend Auto-Restart System"
            }
        }
    ]
}
EOF
)
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "$payload" \
         "$DISCORD_WEBHOOK" \
         --silent 2>/dev/null || true
}

# Check if application is running
check_app_status() {
    local status=$(pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    echo "$status"
}

# Check if application is responding to HTTP requests
check_app_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health --max-time 10 2>/dev/null || echo "000")
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Install missing dependencies
fix_dependencies() {
    log_message "Attempting to fix missing dependencies..."
    
    cd "$PROJECT_DIR" || return 1
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/@nestjs/core/package.json" ]; then
        log_message "Installing missing dependencies..."
        npm install --production
        
        if [ $? -eq 0 ]; then
            log_message "Dependencies installed successfully"
            return 0
        else
            log_message "Failed to install dependencies"
            return 1
        fi
    fi
    
    return 0
}

# Restart the application
restart_app() {
    local attempt="$1"
    
    log_message "Attempting to restart application (attempt $attempt/$MAX_RESTART_ATTEMPTS)..."
    
    # Stop the application
    pm2 stop "$PM2_APP_NAME" >/dev/null 2>&1
    sleep 5
    
    # Check for missing dependencies first
    if ! fix_dependencies; then
        log_message "Failed to fix dependencies"
        return 1
    fi
    
    # Start the application
    cd "$PROJECT_DIR" || return 1
    pm2 start ecosystem.config.js --env production >/dev/null 2>&1
    
    # Wait a moment for startup
    sleep 10
    
    # Check if it started successfully
    local status=$(check_app_status)
    if [ "$status" = "online" ]; then
        # Double check with health endpoint
        if check_app_health; then
            log_message "Application restarted successfully"
            send_notification "✅ **Application Restarted Successfully**\n\nApplication: $PM2_APP_NAME\nAttempt: $attempt/$MAX_RESTART_ATTEMPTS\nStatus: Online and responding" "success"
            return 0
        else
            log_message "Application started but not responding to health checks"
            return 1
        fi
    else
        log_message "Failed to restart application - status: $status"
        return 1
    fi
}

# Main monitoring loop
monitor_and_restart() {
    local consecutive_failures=0
    local restart_attempts=0
    
    log_message "Starting auto-restart monitoring for $PM2_APP_NAME"
    send_notification "🚀 **Auto-Restart Monitor Started**\n\nMonitoring application: $PM2_APP_NAME\nMax restart attempts: $MAX_RESTART_ATTEMPTS" "info"
    
    while true; do
        local status=$(check_app_status)
        
        if [ "$status" = "online" ]; then
            # Check if application is responding
            if check_app_health; then
                consecutive_failures=0
                restart_attempts=0
                log_message "Application is running and healthy"
            else
                consecutive_failures=$((consecutive_failures + 1))
                log_message "Application is online but not responding to health checks ($consecutive_failures/3)"
                
                if [ $consecutive_failures -ge 3 ]; then
                    log_message "Application is unresponsive, triggering restart"
                    send_notification "⚠️ **Application Unresponsive**\n\nApplication: $PM2_APP_NAME\nStatus: Online but not responding\nAction: Triggering restart" "warning"
                    consecutive_failures=0
                    
                    restart_attempts=$((restart_attempts + 1))
                    if [ $restart_attempts -le $MAX_RESTART_ATTEMPTS ]; then
                        if restart_app "$restart_attempts"; then
                            restart_attempts=0
                        else
                            sleep $RESTART_COOLDOWN
                        fi
                    else
                        log_message "Maximum restart attempts reached. Manual intervention required."
                        send_notification "🚨 **CRITICAL: Maximum Restart Attempts Reached**\n\nApplication: $PM2_APP_NAME\nAttempts: $restart_attempts/$MAX_RESTART_ATTEMPTS\nStatus: Failed to restart\n\n**Manual intervention required!**" "critical"
                        exit 1
                    fi
                fi
            fi
        else
            log_message "Application is down (status: $status)"
            send_notification "🔴 **Application Down Detected**\n\nApplication: $PM2_APP_NAME\nStatus: $status\nAction: Attempting restart" "critical"
            
            restart_attempts=$((restart_attempts + 1))
            if [ $restart_attempts -le $MAX_RESTART_ATTEMPTS ]; then
                if restart_app "$restart_attempts"; then
                    restart_attempts=0
                else
                    sleep $RESTART_COOLDOWN
                fi
            else
                log_message "Maximum restart attempts reached. Manual intervention required."
                send_notification "🚨 **CRITICAL: Maximum Restart Attempts Reached**\n\nApplication: $PM2_APP_NAME\nAttempts: $restart_attempts/$MAX_RESTART_ATTEMPTS\nStatus: Failed to restart\n\n**Manual intervention required!**" "critical"
                exit 1
            fi
        fi
        
        sleep 30  # Check every 30 seconds
    done
}

# Help function
show_help() {
    echo "Auto-Restart Script for Ticket Backend"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -s, --start    Start monitoring (default)"
    echo "  -t, --test     Test restart functionality"
    echo "  -l, --logs     Show restart logs"
    echo "  -c, --clear    Clear restart logs"
    echo ""
}

# Test restart functionality
test_restart() {
    echo "Testing restart functionality..."
    send_notification "🧪 **Testing Auto-Restart System**\n\nThis is a test of the auto-restart functionality." "info"
    
    if restart_app "1"; then
        echo "Test restart successful!"
    else
        echo "Test restart failed!"
        exit 1
    fi
}

# Show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -n 50 "$LOG_FILE"
    else
        echo "No log file found at $LOG_FILE"
    fi
}

# Clear logs
clear_logs() {
    if [ -f "$LOG_FILE" ]; then
        > "$LOG_FILE"
        echo "Logs cleared"
    else
        echo "No log file to clear"
    fi
}

# Parse command line arguments
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    -t|--test)
        test_restart
        exit 0
        ;;
    -l|--logs)
        show_logs
        exit 0
        ;;
    -c|--clear)
        clear_logs
        exit 0
        ;;
    -s|--start|"")
        monitor_and_restart
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
