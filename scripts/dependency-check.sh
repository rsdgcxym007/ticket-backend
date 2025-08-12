#!/bin/bash
# Dependency Health Check Script
# Checks for missing Node.js dependencies and fixes them

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
PROJECT_DIR="/var/www/backend/ticket-backend"
PM2_APP_NAME="ticket-backend-prod"
LOG_FILE="/var/log/dependency-check.log"

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
            "title": "$emoji Dependency Health Check",
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
                "text": "Ticket Backend Dependency Monitor"
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

# Check if critical dependencies exist
check_critical_dependencies() {
    local missing_deps=()
    
    cd "$PROJECT_DIR" || return 1
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_message "node_modules directory is missing"
        return 1
    fi
    
    # List of critical dependencies
    local critical_deps=(
        "@nestjs/core"
        "@nestjs/common"
        "@nestjs/platform-express"
        "express"
        "typeorm"
        "pg"
        "redis"
    )
    
    for dep in "${critical_deps[@]}"; do
        if [ ! -d "node_modules/$dep" ]; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_message "Missing critical dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    return 0
}

# Check if package.json exists and is valid
check_package_json() {
    cd "$PROJECT_DIR" || return 1
    
    if [ ! -f "package.json" ]; then
        log_message "package.json is missing"
        return 1
    fi
    
    # Try to parse package.json
    if ! jq empty package.json 2>/dev/null; then
        log_message "package.json is corrupted"
        return 1
    fi
    
    return 0
}

# Fix dependencies
fix_dependencies() {
    local fix_method="$1"
    
    cd "$PROJECT_DIR" || return 1
    
    log_message "Attempting to fix dependencies using method: $fix_method"
    
    case $fix_method in
        "install")
            log_message "Running npm install..."
            npm install --production --no-audit --no-fund
            ;;
        "clean-install")
            log_message "Cleaning and reinstalling dependencies..."
            force_remove_node_modules
            rm -f package-lock.json
            npm install --production --no-audit --no-fund
            ;;
        "cache-clean")
            log_message "Cleaning npm cache and reinstalling..."
            npm cache clean --force
            force_remove_node_modules
            rm -f package-lock.json
            npm install --production --no-audit --no-fund
            ;;
        "force-clean")
            log_message "Force cleaning everything and reinstalling..."
            force_remove_node_modules
            rm -f package-lock.json yarn.lock
            npm cache clean --force
            # Clear npm cache directory
            rm -rf ~/.npm 2>/dev/null || true
            npm install --production --no-audit --no-fund --prefer-offline=false
            ;;
        *)
            log_message "Unknown fix method: $fix_method"
            return 1
            ;;
    esac
    
    return $?
}

# Force remove node_modules with multiple strategies
force_remove_node_modules() {
    log_message "Force removing node_modules directory..."
    
    if [ ! -d "node_modules" ]; then
        log_message "node_modules directory does not exist"
        return 0
    fi
    
    # Strategy 1: Normal rm
    log_message "Trying normal rm..."
    rm -rf node_modules 2>/dev/null
    
    if [ ! -d "node_modules" ]; then
        log_message "Successfully removed node_modules with normal rm"
        return 0
    fi
    
    # Strategy 2: Change permissions and try again
    log_message "Trying with permission changes..."
    chmod -R 755 node_modules 2>/dev/null || true
    rm -rf node_modules 2>/dev/null
    
    if [ ! -d "node_modules" ]; then
        log_message "Successfully removed node_modules after permission change"
        return 0
    fi
    
    # Strategy 3: Kill any processes that might be using the files
    log_message "Killing processes that might be using node_modules..."
    lsof +D node_modules 2>/dev/null | grep -v COMMAND | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
    sleep 2
    rm -rf node_modules 2>/dev/null
    
    if [ ! -d "node_modules" ]; then
        log_message "Successfully removed node_modules after killing processes"
        return 0
    fi
    
    # Strategy 4: Use find to remove files individually
    log_message "Trying to remove files individually..."
    find node_modules -type f -exec rm -f {} \; 2>/dev/null || true
    find node_modules -type d -empty -delete 2>/dev/null || true
    rm -rf node_modules 2>/dev/null
    
    if [ ! -d "node_modules" ]; then
        log_message "Successfully removed node_modules with individual file removal"
        return 0
    fi
    
    # Strategy 5: Move to temp and remove in background
    log_message "Moving to temp directory for background removal..."
    local temp_dir="/tmp/node_modules_$(date +%s)"
    mv node_modules "$temp_dir" 2>/dev/null || true
    
    if [ ! -d "node_modules" ]; then
        log_message "Successfully moved node_modules to temp"
        # Remove in background
        (rm -rf "$temp_dir" 2>/dev/null &)
        return 0
    fi
    
    # Strategy 6: Last resort - use sudo if available
    if command -v sudo >/dev/null 2>&1; then
        log_message "Trying with sudo as last resort..."
        sudo rm -rf node_modules 2>/dev/null || true
        
        if [ ! -d "node_modules" ]; then
            log_message "Successfully removed node_modules with sudo"
            return 0
        fi
    fi
    
    log_message "Failed to remove node_modules directory completely"
    return 1
}

# Check PM2 logs for dependency errors
check_pm2_logs() {
    if ! command -v pm2 >/dev/null 2>&1; then
        return 0
    fi
    
    # Get recent logs and check for MODULE_NOT_FOUND errors
    local recent_logs=$(pm2 logs "$PM2_APP_NAME" --lines 20 --nostream 2>/dev/null)
    
    if echo "$recent_logs" | grep -q "MODULE_NOT_FOUND\|Cannot find module"; then
        log_message "MODULE_NOT_FOUND error detected in PM2 logs"
        return 1
    fi
    
    return 0
}

# Main health check function
run_dependency_health_check() {
    log_message "Starting dependency health check..."
    
    local issues_found=0
    local fix_needed=false
    
    # Check 1: package.json validity
    if ! check_package_json; then
        issues_found=$((issues_found + 1))
        send_notification "🚨 **package.json Issue Detected**\n\npackage.json is missing or corrupted\nLocation: $PROJECT_DIR" "critical"
        return 1
    fi
    
    # Check 2: Critical dependencies
    if ! check_critical_dependencies; then
        issues_found=$((issues_found + 1))
        fix_needed=true
        log_message "Critical dependencies are missing"
    fi
    
    # Check 3: PM2 logs for dependency errors
    if ! check_pm2_logs; then
        issues_found=$((issues_found + 1))
        fix_needed=true
        log_message "Dependency errors found in PM2 logs"
    fi
    
    if [ $issues_found -eq 0 ]; then
        log_message "All dependency checks passed"
        return 0
    fi
    
    if [ "$fix_needed" = true ]; then
        log_message "Attempting to fix dependency issues..."
        send_notification "⚠️ **Dependency Issues Detected**\n\nMissing or corrupted dependencies found\nAttempting automatic fix..." "warning"
        
        # Try different fix methods
        local fix_methods=("install" "clean-install" "cache-clean")
        local fix_successful=false
        
        for method in "${fix_methods[@]}"; do
            if fix_dependencies "$method"; then
                log_message "Dependencies fixed using method: $method"
                
                # Restart PM2 application
                log_message "Restarting PM2 application..."
                pm2 restart "$PM2_APP_NAME" >/dev/null 2>&1
                
                # Wait a moment and check again
                sleep 10
                if check_critical_dependencies && check_pm2_logs; then
                    fix_successful=true
                    send_notification "✅ **Dependencies Fixed Successfully**\n\nMethod used: $method\nApplication restarted\nAll checks now passing" "success"
                    break
                fi
            fi
        done
        
        if [ "$fix_successful" = false ]; then
            log_message "Failed to fix dependency issues automatically"
            send_notification "🚨 **CRITICAL: Failed to Fix Dependencies**\n\nAll automatic fix methods failed\nManual intervention required\n\nPlease check:\n- Node.js installation\n- npm configuration\n- Network connectivity\n- Disk space" "critical"
            return 1
        fi
    fi
    
    return 0
}

# Show help
show_help() {
    echo "Dependency Health Check Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -c, --check    Run dependency check (default)"
    echo "  -f, --fix      Force dependency fix"
    echo "  -l, --logs     Show check logs"
    echo "  --clear-logs   Clear check logs"
    echo ""
}

# Force fix dependencies
force_fix() {
    log_message "Force fixing dependencies..."
    
    cd "$PROJECT_DIR" || exit 1
    
    if fix_dependencies "cache-clean"; then
        log_message "Force fix completed successfully"
        pm2 restart "$PM2_APP_NAME" >/dev/null 2>&1
        send_notification "🔧 **Force Dependency Fix Completed**\n\nDependencies have been forcefully reinstalled\nApplication restarted" "success"
    else
        log_message "Force fix failed"
        send_notification "🚨 **Force Fix Failed**\n\nFailed to reinstall dependencies\nManual intervention required" "critical"
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
    -f|--fix)
        force_fix
        exit 0
        ;;
    -l|--logs)
        show_logs
        exit 0
        ;;
    --clear-logs)
        clear_logs
        exit 0
        ;;
    -c|--check|"")
        run_dependency_health_check
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
