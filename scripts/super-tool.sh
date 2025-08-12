#!/bin/bash
# 🚀 TICKET BACKEND SUPER TOOL 🚀
# All-in-one script for monitoring, deployment, fixes, and management
# Version: 1.0.0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/backend/ticket-backend"
PM2_APP_NAME="ticket-backend-prod"
BRANCH="feature/newfunction"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
CPU_THRESHOLD=50
MEMORY_THRESHOLD=50
DISK_THRESHOLD=80
ALERT_COOLDOWN=300
ALERT_FILE="/tmp/monitor_alerts"
LOG_FILE="/var/log/ticket-super-tool.log"

# Create necessary files
touch "$ALERT_FILE" 2>/dev/null || true
touch "$LOG_FILE" 2>/dev/null || true

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                🚀 TICKET BACKEND SUPER TOOL 🚀               ║"
    echo "║                                                              ║"
    echo "║  All-in-one tool for:                                        ║"
    echo "║  📊 Monitoring & Alerts                                      ║"
    echo "║  🔧 Emergency Fixes                                          ║"
    echo "║  🚀 Deployment & Setup                                       ║"
    echo "║  🔄 Auto-restart & Health Checks                            ║"
    echo "║  📦 Node.js & Dependency Management                         ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp]${NC} $message"
    echo "[$timestamp] $message" >> "$LOG_FILE" 2>/dev/null || true
}

error() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[ERROR $timestamp]${NC} $message"
    echo "[ERROR $timestamp] $message" >> "$LOG_FILE" 2>/dev/null || true
}

warning() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[WARNING $timestamp]${NC} $message"
    echo "[WARNING $timestamp] $message" >> "$LOG_FILE" 2>/dev/null || true
}

info() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[INFO $timestamp]${NC} $message"
    echo "[INFO $timestamp] $message" >> "$LOG_FILE" 2>/dev/null || true
}

# =============================================================================
# DISCORD NOTIFICATION FUNCTIONS
# =============================================================================

send_discord_notification() {
    local message="$1"
    local level="$2"
    
    case $level in
        "critical")
            emoji="🚨"
            color="15158332"
            ;;
        "warning")
            emoji="⚠️"
            color="16776960"
            ;;
        "success")
            emoji="✅"
            color="5763719"
            ;;
        "info")
            emoji="ℹ️"
            color="3447003"
            ;;
        *)
            emoji="📊"
            color="3447003"
            ;;
    esac
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    local hostname=$(hostname 2>/dev/null || echo "unknown")
    
    local payload=$(cat <<EOF
{
    "embeds": [
        {
            "title": "$emoji Ticket Backend Super Tool",
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
                "text": "Ticket Backend Super Tool v1.0.0"
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

# =============================================================================
# SYSTEM MONITORING FUNCTIONS
# =============================================================================

get_cpu_usage() {
    if command -v top >/dev/null 2>&1; then
        top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || \
        top -bn1 | grep "%Cpu" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || \
        iostat -c 1 1 | tail -1 | awk '{print 100-$6}' 2>/dev/null || \
        vmstat 1 2 | tail -1 | awk '{print 100-$15}' 2>/dev/null || \
        echo "0"
    else
        echo "0"
    fi
}

get_memory_usage() {
    if command -v free >/dev/null 2>&1; then
        free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}'
    else
        cat /proc/meminfo | awk '
        /MemTotal/ {total = $2}
        /MemAvailable/ {available = $2}
        END {
            used = total - available
            printf "%.1f", (used/total) * 100.0
        }' 2>/dev/null || echo "0"
    fi
}

get_disk_usage() {
    df / | tail -1 | awk '{print $5}' | sed 's/%//' 2>/dev/null || echo "0"
}

get_pm2_status() {
    if command -v pm2 >/dev/null 2>&1; then
        pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "unknown"
    else
        echo "pm2_not_installed"
    fi
}

get_pm2_memory() {
    if command -v pm2 >/dev/null 2>&1; then
        pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .monit.memory" 2>/dev/null | \
        awk '{printf "%.1f", $1/1024/1024}' || echo "0"
    else
        echo "0"
    fi
}

get_pm2_cpu() {
    if command -v pm2 >/dev/null 2>&1; then
        pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .monit.cpu" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Alert cooldown management
should_alert() {
    local alert_type="$1"
    local current_time=$(date +%s)
    local last_alert=$(grep "^$alert_type:" "$ALERT_FILE" 2>/dev/null | cut -d: -f2)
    
    if [ -z "$last_alert" ]; then
        return 0
    fi
    
    local time_diff=$((current_time - last_alert))
    if [ $time_diff -gt $ALERT_COOLDOWN ]; then
        return 0
    else
        return 1
    fi
}

record_alert() {
    local alert_type="$1"
    local current_time=$(date +%s)
    
    grep -v "^$alert_type:" "$ALERT_FILE" > "${ALERT_FILE}.tmp" 2>/dev/null || true
    mv "${ALERT_FILE}.tmp" "$ALERT_FILE" 2>/dev/null || true
    echo "$alert_type:$current_time" >> "$ALERT_FILE"
}

# =============================================================================
# MONITORING & DASHBOARD FUNCTIONS
# =============================================================================

show_dashboard() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    TICKET BACKEND DASHBOARD                  ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # System Resources
    local cpu_usage=$(get_cpu_usage)
    local memory_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)
    local pm2_status=$(get_pm2_status)
    local pm2_memory=$(get_pm2_memory)
    local pm2_cpu=$(get_pm2_cpu)
    
    echo -e "${BLUE}💻 System Resources:${NC}"
    echo -e "  CPU Usage: ${cpu_usage}%"
    echo -e "  Memory Usage: ${memory_usage}%"
    echo -e "  Disk Usage: ${disk_usage}%"
    echo ""
    
    echo -e "${BLUE}🚀 Application Status:${NC}"
    echo -e "  PM2 Status: ${pm2_status}"
    echo -e "  PM2 Memory: ${pm2_memory} MB"
    echo -e "  PM2 CPU: ${pm2_cpu}%"
    echo ""
    
    # Health Check
    echo -e "${BLUE}🏥 Health Check:${NC}"
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health --max-time 5 2>/dev/null || echo "000")
    if [ "$health_response" = "200" ]; then
        echo -e "${GREEN}✅ Application is healthy (HTTP $health_response)${NC}"
    else
        echo -e "${RED}❌ Application health check failed (HTTP $health_response)${NC}"
    fi
    echo ""
    
    # Node.js Info
    echo -e "${BLUE}📦 Node.js Environment:${NC}"
    if command -v node >/dev/null 2>&1; then
        echo -e "  Node.js: $(node --version)"
    else
        echo -e "  Node.js: ❌ Not installed"
    fi
    
    if command -v npm >/dev/null 2>&1; then
        echo -e "  npm: $(npm --version)"
    else
        echo -e "  npm: ❌ Not installed"
    fi
    echo ""
    
    # Recent Logs
    echo -e "${BLUE}📄 Recent Logs (last 5 lines):${NC}"
    if command -v pm2 >/dev/null 2>&1; then
        pm2 logs "$PM2_APP_NAME" --lines 5 --nostream 2>/dev/null || echo "No logs available"
    else
        echo "PM2 not available"
    fi
}

start_monitoring() {
    log "🔍 Starting resource monitoring with alerts..."
    send_discord_notification "🚀 **Resource Monitoring Started**\n\nThresholds:\n• CPU: ${CPU_THRESHOLD}%\n• Memory: ${MEMORY_THRESHOLD}%\n• Disk: ${DISK_THRESHOLD}%" "info"
    
    while true; do
        monitor_resources
        sleep 60
    done
}

monitor_resources() {
    local cpu_usage=$(get_cpu_usage)
    local memory_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)
    local pm2_status=$(get_pm2_status)
    local pm2_memory=$(get_pm2_memory)
    local pm2_cpu=$(get_pm2_cpu)
    
    # Convert to integers for comparison
    local cpu_int=$(echo "$cpu_usage" | cut -d. -f1)
    local memory_int=$(echo "$memory_usage" | cut -d. -f1)
    local disk_int=$(echo "$disk_usage" | cut -d. -f1)
    
    log "Resources: CPU=${cpu_usage}%, Memory=${memory_usage}%, Disk=${disk_usage}%, PM2=${pm2_status}"
    
    # Check thresholds
    if [ "$cpu_int" -gt "$CPU_THRESHOLD" ]; then
        if should_alert "cpu"; then
            send_discord_notification "🔥 **HIGH CPU USAGE**\n\nCurrent: **${cpu_usage}%**\nThreshold: ${CPU_THRESHOLD}%\nPM2 CPU: ${pm2_cpu}%" "critical"
            record_alert "cpu"
        fi
    fi
    
    if [ "$memory_int" -gt "$MEMORY_THRESHOLD" ]; then
        if should_alert "memory"; then
            send_discord_notification "💾 **HIGH MEMORY USAGE**\n\nCurrent: **${memory_usage}%**\nThreshold: ${MEMORY_THRESHOLD}%\nPM2 Memory: ${pm2_memory}MB" "critical"
            record_alert "memory"
        fi
    fi
    
    if [ "$disk_int" -gt "$DISK_THRESHOLD" ]; then
        if should_alert "disk"; then
            send_discord_notification "💿 **HIGH DISK USAGE**\n\nCurrent: **${disk_usage}%**\nThreshold: ${DISK_THRESHOLD}%" "warning"
            record_alert "disk"
        fi
    fi
    
    if [ "$pm2_status" != "online" ]; then
        if should_alert "pm2_status"; then
            send_discord_notification "🔴 **APPLICATION DOWN**\n\nApp: ${PM2_APP_NAME}\nStatus: **${pm2_status}**" "critical"
            record_alert "pm2_status"
        fi
    fi
}

# =============================================================================
# NODE.JS MANAGEMENT FUNCTIONS
# =============================================================================

force_remove_node_modules() {
    log "🧹 Force removing node_modules..."
    
    if [ ! -d "node_modules" ]; then
        return 0
    fi
    
    # Multiple removal strategies
    chmod -R 755 node_modules 2>/dev/null || true
    
    # Kill processes using the directory
    lsof +D node_modules 2>/dev/null | awk 'NR>1 {print $2}' | xargs -r kill -9 2>/dev/null || true
    sleep 2
    
    # Try normal removal
    rm -rf node_modules 2>/dev/null && return 0
    
    # Move to temp and remove in background
    local temp_dir="/tmp/node_modules_$(date +%s)"
    mv node_modules "$temp_dir" 2>/dev/null && {
        (rm -rf "$temp_dir" 2>/dev/null &)
        return 0
    }
    
    # Last resort with sudo
    if command -v sudo >/dev/null 2>&1 && [ "$EUID" -eq 0 ]; then
        sudo rm -rf node_modules 2>/dev/null || true
    fi
    
    return 0
}

fix_nodejs_installation() {
    if [ "$EUID" -ne 0 ]; then
        error "Node.js installation fix requires root privileges"
        return 1
    fi
    
    log "🔧 Fixing Node.js installation..."
    
    # Remove conflicting packages
    apt remove --purge -y nodejs npm node 2>/dev/null || true
    apt autoremove -y 2>/dev/null || true
    
    # Install via NodeSource
    log "Installing Node.js 20.x from NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && {
        apt-get install -y nodejs && {
            log "✅ NodeSource installation successful"
            npm install -g pm2
            return 0
        }
    }
    
    # Fallback to manual installation
    log "Trying manual installation..."
    cd /tmp
    wget https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz && \
    tar -xf node-v20.10.0-linux-x64.tar.xz && \
    cp -r node-v20.10.0-linux-x64/* /usr/local/ && \
    ln -sf /usr/local/bin/node /usr/bin/node && \
    ln -sf /usr/local/bin/npm /usr/bin/npm && \
    rm -rf /tmp/node-v20.10.0-linux-x64* && {
        log "✅ Manual installation successful"
        npm install -g pm2
        return 0
    }
    
    error "All Node.js installation methods failed"
    return 1
}

fix_dependencies() {
    log "🔧 Fixing dependencies..."
    
    cd "$PROJECT_DIR" || return 1
    
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    
    # Force clean approach
    force_remove_node_modules
    rm -f package-lock.json yarn.lock
    npm cache clean --force 2>/dev/null || true
    
    # Reinstall
    npm install --production --no-audit --no-fund --prefer-offline=false
    
    if [ $? -eq 0 ]; then
        log "✅ Dependencies fixed successfully"
        pm2 start ecosystem.config.js --env production 2>/dev/null || true
        send_discord_notification "✅ **Dependencies Fixed**\n\nDependencies reinstalled and application restarted" "success"
        return 0
    else
        error "Failed to fix dependencies"
        return 1
    fi
}

# =============================================================================
# EMERGENCY FIX FUNCTIONS
# =============================================================================

emergency_diagnostics() {
    echo -e "${CYAN}=== EMERGENCY DIAGNOSTICS ===${NC}"
    
    echo -e "${BLUE}System Resources:${NC}"
    echo "CPU: $(get_cpu_usage)%"
    echo "Memory: $(get_memory_usage)%"
    echo "Disk: $(get_disk_usage)%"
    echo ""
    
    echo -e "${BLUE}Node.js Status:${NC}"
    if command -v node >/dev/null 2>&1; then
        echo "Node.js: ✅ $(node --version)"
    else
        echo "Node.js: ❌ Not installed"
    fi
    
    if command -v npm >/dev/null 2>&1; then
        echo "npm: ✅ $(npm --version)"
    else
        echo "npm: ❌ Not installed"
    fi
    echo ""
    
    echo -e "${BLUE}PM2 Status:${NC}"
    if command -v pm2 >/dev/null 2>&1; then
        pm2 list 2>/dev/null || echo "PM2: ❌ No processes"
    else
        echo "PM2: ❌ Not installed"
    fi
    echo ""
    
    echo -e "${BLUE}Application Health:${NC}"
    local health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")
    if [ "$health" = "200" ]; then
        echo "Health: ✅ OK"
    else
        echo "Health: ❌ Failed (HTTP $health)"
    fi
}

emergency_module_fix() {
    log "🚨 Emergency MODULE_NOT_FOUND fix..."
    fix_dependencies
}

emergency_pm2_fix() {
    log "🚨 Emergency PM2 fix..."
    
    pm2 kill 2>/dev/null || true
    rm -rf ~/.pm2/logs/* ~/.pm2/pids/* 2>/dev/null || true
    
    cd "$PROJECT_DIR" || return 1
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    send_discord_notification "🔄 **PM2 Processes Restarted**\n\nAll PM2 processes have been restarted" "success"
}

emergency_resource_fix() {
    if [ "$EUID" -ne 0 ]; then
        error "Resource fix requires root privileges"
        return 1
    fi
    
    log "🚨 Emergency resource optimization..."
    
    # Clear caches
    sync
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    
    # Restart with memory limit
    cd "$PROJECT_DIR" || return 1
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    pm2 start ecosystem.config.js --env production -- --max-old-space-size=512
    
    send_discord_notification "⚡ **Resource Usage Optimized**\n\nMemory cleared and application restarted with limits" "success"
}

# =============================================================================
# DEPLOYMENT FUNCTIONS
# =============================================================================

quick_deploy() {
    log "🚀 Starting quick deployment..."
    
    cd "$PROJECT_DIR" || {
        error "Cannot access project directory"
        return 1
    }
    
    git pull origin "$BRANCH" || {
        error "Git pull failed"
        return 1
    }
    
    npm install --production || {
        error "npm install failed"
        fix_dependencies
        return $?
    }
    
    npm run build || {
        error "Build failed"
        return 1
    }
    
    pm2 restart "$PM2_APP_NAME" || pm2 start ecosystem.config.js --env production
    
    log "✅ Quick deployment completed"
    send_discord_notification "🚀 **Quick Deployment Successful**\n\nLatest code deployed and application restarted" "success"
}

full_deploy() {
    if [ "$EUID" -ne 0 ]; then
        error "Full deployment requires root privileges"
        return 1
    fi
    
    log "🚀 Starting full deployment..."
    
    # Install system dependencies
    apt update && apt install -y curl wget git postgresql postgresql-contrib redis-server jq htop build-essential
    
    # Fix Node.js if needed
    if ! command -v node >/dev/null 2>&1; then
        fix_nodejs_installation
    fi
    
    # Setup project
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR" || return 1
    
    if [ ! -d ".git" ]; then
        git clone https://github.com/rsdgcxym007/ticket-backend.git . || return 1
    fi
    
    git pull origin "$BRANCH"
    
    # Dependencies and build
    fix_dependencies
    npm run build
    
    # Start services
    systemctl start postgresql redis-server 2>/dev/null || true
    systemctl enable postgresql redis-server 2>/dev/null || true
    
    # PM2
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup 2>/dev/null || true
    
    log "✅ Full deployment completed"
    send_discord_notification "🎉 **Full Deployment Successful**\n\nComplete system setup and application deployment completed" "success"
}

# =============================================================================
# AUTO-RESTART FUNCTIONS
# =============================================================================

auto_restart_monitor() {
    log "🔄 Starting auto-restart monitoring..."
    
    while true; do
        local status=$(get_pm2_status)
        
        if [ "$status" != "online" ]; then
            log "🚨 Application down, attempting restart..."
            
            # Try to fix dependencies first
            if check_for_module_errors; then
                fix_dependencies
            fi
            
            # Restart
            cd "$PROJECT_DIR" || continue
            pm2 restart "$PM2_APP_NAME" || pm2 start ecosystem.config.js --env production
            
            sleep 10
            
            if [ "$(get_pm2_status)" = "online" ]; then
                log "✅ Auto-restart successful"
                send_discord_notification "🔄 **Auto-Restart Successful**\n\nApplication was down and has been automatically restarted" "success"
            else
                error "Auto-restart failed"
                send_discord_notification "🚨 **Auto-Restart Failed**\n\nApplication restart attempt failed, manual intervention required" "critical"
            fi
        fi
        
        sleep 30
    done
}

check_for_module_errors() {
    if command -v pm2 >/dev/null 2>&1; then
        pm2 logs "$PM2_APP_NAME" --lines 10 --nostream 2>/dev/null | grep -q "MODULE_NOT_FOUND\|Cannot find module"
    else
        return 1
    fi
}

# =============================================================================
# MAIN MENU FUNCTIONS
# =============================================================================

show_main_menu() {
    echo ""
    echo -e "${CYAN}📋 MAIN MENU - Select an option:${NC}"
    echo ""
    echo -e "${GREEN}🔍 MONITORING & DIAGNOSTICS${NC}"
    echo "  1. Show Dashboard"
    echo "  2. Start Resource Monitoring (with alerts)"
    echo "  3. Emergency Diagnostics"
    echo "  4. Test Discord Alert"
    echo ""
    echo -e "${YELLOW}🚨 EMERGENCY FIXES${NC}"
    echo "  5. Fix MODULE_NOT_FOUND Error"
    echo "  6. Fix Node.js Installation Issues"
    echo "  7. Fix PM2 Process Issues"
    echo "  8. Fix High Resource Usage"
    echo "  9. Complete System Reset"
    echo ""
    echo -e "${BLUE}🚀 DEPLOYMENT & MANAGEMENT${NC}"
    echo " 10. Quick Deploy (git pull + restart)"
    echo " 11. Full Deploy (complete setup)"
    echo " 12. Start Auto-restart Monitor"
    echo ""
    echo -e "${PURPLE}📦 DEPENDENCY MANAGEMENT${NC}"
    echo " 13. Check Dependencies"
    echo " 14. Fix Dependencies"
    echo " 15. Fix Node.js Installation"
    echo ""
    echo -e "${CYAN}📄 LOGS & INFO${NC}"
    echo " 16. View PM2 Logs"
    echo " 17. View System Logs"
    echo " 18. Show Help"
    echo ""
    echo " 0. Exit"
    echo ""
    read -p "Enter your choice [0-18]: " choice
    
    handle_menu_choice "$choice"
}

handle_menu_choice() {
    local choice="$1"
    
    case $choice in
        1) show_dashboard ;;
        2) start_monitoring ;;
        3) emergency_diagnostics ;;
        4) test_discord_alert ;;
        5) emergency_module_fix ;;
        6) fix_nodejs_installation ;;
        7) emergency_pm2_fix ;;
        8) emergency_resource_fix ;;
        9) complete_system_reset ;;
        10) quick_deploy ;;
        11) full_deploy ;;
        12) auto_restart_monitor ;;
        13) check_dependencies ;;
        14) fix_dependencies ;;
        15) fix_nodejs_installation ;;
        16) view_pm2_logs ;;
        17) view_system_logs ;;
        18) show_help ;;
        0) exit 0 ;;
        *) 
            echo "Invalid choice: $choice"
            sleep 2
            show_main_menu
            ;;
    esac
    
    if [ "$choice" != "2" ] && [ "$choice" != "12" ] && [ "$choice" != "0" ]; then
        echo ""
        read -p "Press Enter to continue..."
        show_main_menu
    fi
}

# =============================================================================
# ADDITIONAL FUNCTIONS
# =============================================================================

test_discord_alert() {
    log "🧪 Sending test alert to Discord..."
    send_discord_notification "🧪 **Test Alert**\n\nThis is a test notification from the Super Tool.\nIf you receive this, the alert system is working!" "info"
    log "✅ Test alert sent"
}

complete_system_reset() {
    log "🚨 Performing complete system reset..."
    
    cd "$PROJECT_DIR" || return 1
    
    pm2 kill 2>/dev/null || true
    force_remove_node_modules
    rm -f package-lock.json yarn.lock
    npm cache clean --force 2>/dev/null || true
    
    npm install --production
    npm run build
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    log "✅ System reset completed"
    send_discord_notification "🔄 **Complete System Reset**\n\nAll processes killed, dependencies reinstalled, application restarted" "success"
}

check_dependencies() {
    log "🔍 Checking dependencies..."
    
    cd "$PROJECT_DIR" || return 1
    
    if [ ! -d "node_modules" ]; then
        warning "node_modules directory missing"
        return 1
    fi
    
    local critical_deps=("@nestjs/core" "@nestjs/common" "express" "typeorm" "pg")
    local missing_deps=()
    
    for dep in "${critical_deps[@]}"; do
        if [ ! -d "node_modules/$dep" ]; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        warning "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    log "✅ All critical dependencies present"
    return 0
}

view_pm2_logs() {
    if command -v pm2 >/dev/null 2>&1; then
        pm2 logs "$PM2_APP_NAME" --lines 50
    else
        error "PM2 not installed"
    fi
}

view_system_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -n 50 "$LOG_FILE"
    else
        echo "No system logs found"
    fi
}

show_help() {
    echo -e "${CYAN}🚀 TICKET BACKEND SUPER TOOL HELP${NC}"
    echo ""
    echo "This all-in-one tool provides comprehensive management for your Ticket Backend:"
    echo ""
    echo -e "${GREEN}Key Features:${NC}"
    echo "• Real-time resource monitoring with Discord alerts"
    echo "• Emergency fix procedures for common issues"
    echo "• Automated deployment and setup"
    echo "• Dependency management and Node.js fixes"
    echo "• Auto-restart functionality"
    echo "• Complete system diagnostics"
    echo ""
    echo -e "${YELLOW}Command Line Usage:${NC}"
    echo "$0 [option]"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  --dashboard       Show system dashboard"
    echo "  --monitor         Start resource monitoring"
    echo "  --emergency       Emergency diagnostics"
    echo "  --fix-modules     Fix MODULE_NOT_FOUND error"
    echo "  --fix-nodejs      Fix Node.js installation"
    echo "  --deploy-quick    Quick deployment"
    echo "  --deploy-full     Full deployment (requires sudo)"
    echo "  --auto-restart    Start auto-restart monitor"
    echo "  --test-alert      Send test Discord alert"
    echo "  --help            Show this help"
    echo ""
    echo -e "${PURPLE}Configuration:${NC}"
    echo "• Discord Webhook: Configured"
    echo "• CPU Threshold: ${CPU_THRESHOLD}%"
    echo "• Memory Threshold: ${MEMORY_THRESHOLD}%"
    echo "• Disk Threshold: ${DISK_THRESHOLD}%"
    echo ""
    echo -e "${RED}Emergency Contacts:${NC}"
    echo "• All alerts are sent to Discord"
    echo "• Logs are saved to: $LOG_FILE"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Handle command line arguments
case "$1" in
    --dashboard)
        show_dashboard
        ;;
    --monitor)
        start_monitoring
        ;;
    --emergency)
        emergency_diagnostics
        ;;
    --fix-modules)
        emergency_module_fix
        ;;
    --fix-nodejs)
        fix_nodejs_installation
        ;;
    --deploy-quick)
        quick_deploy
        ;;
    --deploy-full)
        full_deploy
        ;;
    --auto-restart)
        auto_restart_monitor
        ;;
    --test-alert)
        test_discord_alert
        ;;
    --help)
        show_help
        ;;
    "")
        # Interactive mode
        print_banner
        show_main_menu
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
