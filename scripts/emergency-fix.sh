#!/bin/bash
# Emergency Fix Script for Production Issues
# Quick fixes for common production problems

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/backend/ticket-backend"
PM2_APP_NAME="ticket-backend-prod"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

send_notification() {
    local message="$1"
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{\"content\": \"🚨 **Emergency Fix Applied**: $message\"}" \
         "$DISCORD_WEBHOOK" \
         --silent 2>/dev/null || true
}

print_banner() {
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🚨 EMERGENCY FIX SCRIPT                   ║"
    echo "║                                                              ║"
    echo "║  Quick fixes for production issues:                          ║"
    echo "║  • Backend down (MODULE_NOT_FOUND)                          ║"
    echo "║  • Node.js installation problems                             ║"
    echo "║  • PM2 process issues                                        ║"
    echo "║  • High resource usage                                       ║"
    echo "║  • Dependency corruption                                     ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Fix 1: MODULE_NOT_FOUND error
fix_module_not_found() {
    log "🔧 Fixing MODULE_NOT_FOUND error..."
    
    cd "$PROJECT_DIR" || { error "Cannot access project directory"; return 1; }
    
    # Stop PM2 app
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    
    # Remove node_modules and package-lock.json
    rm -rf node_modules package-lock.json
    
    # Clear npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Reinstall dependencies
    npm install --production --no-audit --no-fund
    
    if [ $? -eq 0 ]; then
        log "✅ Dependencies reinstalled successfully"
        
        # Restart PM2 app
        pm2 start ecosystem.config.js --env production
        send_notification "Dependencies fixed and application restarted"
        return 0
    else
        error "Failed to reinstall dependencies"
        return 1
    fi
}

# Fix 2: Node.js installation issues
fix_nodejs_issues() {
    log "🔧 Fixing Node.js installation issues..."
    
    if [ "$EUID" -ne 0 ]; then
        error "Node.js fix requires root privileges. Run with sudo."
        return 1
    fi
    
    cd "$PROJECT_DIR" || { error "Cannot access project directory"; return 1; }
    
    # Use our fix script
    ./scripts/fix-nodejs.sh --force
    
    if [ $? -eq 0 ]; then
        send_notification "Node.js installation fixed"
        return 0
    else
        error "Failed to fix Node.js installation"
        return 1
    fi
}

# Fix 3: PM2 process issues
fix_pm2_issues() {
    log "🔧 Fixing PM2 process issues..."
    
    cd "$PROJECT_DIR" || { error "Cannot access project directory"; return 1; }
    
    # Kill all PM2 processes
    pm2 kill 2>/dev/null || true
    
    # Remove PM2 logs and pid files
    rm -rf ~/.pm2/logs/* 2>/dev/null || true
    rm -rf ~/.pm2/pids/* 2>/dev/null || true
    
    # Start fresh PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    if pm2 list | grep -q "online"; then
        log "✅ PM2 processes fixed"
        send_notification "PM2 processes restarted successfully"
        return 0
    else
        error "Failed to restart PM2 processes"
        return 1
    fi
}

# Fix 4: High resource usage
fix_high_resource_usage() {
    log "🔧 Fixing high resource usage..."
    
    # Kill high CPU processes (except essential ones)
    local high_cpu_pids=$(ps aux | awk '$3 > 80 && $11 !~ /systemd|kernel|kthread/ {print $2}')
    
    if [ -n "$high_cpu_pids" ]; then
        warning "Found high CPU processes: $high_cpu_pids"
        # Don't automatically kill, just warn
        echo "High CPU processes found. Consider killing manually if needed."
    fi
    
    # Clear system caches
    sync
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    
    # Restart backend with limited resources
    cd "$PROJECT_DIR" || return 1
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    pm2 start ecosystem.config.js --env production -- --max-old-space-size=512
    
    log "✅ Resource usage optimized"
    send_notification "High resource usage addressed"
}

# Fix 5: Complete system reset
complete_system_reset() {
    log "🔧 Performing complete system reset..."
    
    cd "$PROJECT_DIR" || { error "Cannot access project directory"; return 1; }
    
    # Stop all services
    pm2 kill 2>/dev/null || true
    
    # Clean up
    rm -rf node_modules package-lock.json
    npm cache clean --force 2>/dev/null || true
    
    # Reinstall everything
    npm install --production
    npm run build
    
    # Restart
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    log "✅ Complete system reset completed"
    send_notification "Complete system reset performed - all services restarted"
}

# Fix 6: Database connection issues
fix_database_issues() {
    log "🔧 Fixing database connection issues..."
    
    # Restart PostgreSQL
    systemctl restart postgresql 2>/dev/null || service postgresql restart 2>/dev/null || true
    
    # Restart Redis
    systemctl restart redis-server 2>/dev/null || service redis-server restart 2>/dev/null || true
    
    # Wait for services to start
    sleep 5
    
    # Test connections
    if systemctl is-active --quiet postgresql 2>/dev/null; then
        log "✅ PostgreSQL is running"
    else
        warning "PostgreSQL may not be running properly"
    fi
    
    if systemctl is-active --quiet redis-server 2>/dev/null; then
        log "✅ Redis is running"
    else
        warning "Redis may not be running properly"
    fi
    
    send_notification "Database services restarted"
}

# Quick diagnostics
quick_diagnostics() {
    echo -e "${CYAN}=== QUICK DIAGNOSTICS ===${NC}"
    
    # System resources
    echo -e "${BLUE}System Resources:${NC}"
    echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' || echo 'Unknown')"
    echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $5}')"
    
    # Node.js status
    echo -e "${BLUE}Node.js Status:${NC}"
    if command -v node >/dev/null 2>&1; then
        echo "Node.js: $(node --version)"
    else
        echo "Node.js: ❌ Not installed"
    fi
    
    if command -v npm >/dev/null 2>&1; then
        echo "npm: $(npm --version)"
    else
        echo "npm: ❌ Not installed"
    fi
    
    # PM2 status
    echo -e "${BLUE}PM2 Status:${NC}"
    if command -v pm2 >/dev/null 2>&1; then
        pm2 list 2>/dev/null || echo "PM2: ❌ No processes"
    else
        echo "PM2: ❌ Not installed"
    fi
    
    # Application health
    echo -e "${BLUE}Application Health:${NC}"
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")
    if [ "$health_response" = "200" ]; then
        echo "Health endpoint: ✅ OK"
    else
        echo "Health endpoint: ❌ Failed (HTTP $health_response)"
    fi
    
    # Recent errors
    echo -e "${BLUE}Recent Errors:${NC}"
    if command -v pm2 >/dev/null 2>&1; then
        pm2 logs "$PM2_APP_NAME" --lines 5 --nostream 2>/dev/null | grep -i error || echo "No recent errors in PM2 logs"
    fi
}

# Interactive menu
show_menu() {
    echo ""
    echo -e "${CYAN}Select an emergency fix:${NC}"
    echo "1. Fix MODULE_NOT_FOUND error"
    echo "2. Fix Node.js installation issues (requires sudo)"
    echo "3. Fix PM2 process issues"
    echo "4. Fix high resource usage (requires sudo)"
    echo "5. Fix database connection issues (requires sudo)"
    echo "6. Complete system reset"
    echo "7. Run quick diagnostics"
    echo "8. Run all fixes (nuclear option - requires sudo)"
    echo "0. Exit"
    echo ""
    read -p "Enter your choice [0-8]: " choice
    
    case $choice in
        1) fix_module_not_found ;;
        2) fix_nodejs_issues ;;
        3) fix_pm2_issues ;;
        4) fix_high_resource_usage ;;
        5) fix_database_issues ;;
        6) complete_system_reset ;;
        7) quick_diagnostics ;;
        8) run_all_fixes ;;
        0) exit 0 ;;
        *) echo "Invalid choice" && show_menu ;;
    esac
}

# Run all fixes (nuclear option)
run_all_fixes() {
    if [ "$EUID" -ne 0 ]; then
        error "Running all fixes requires root privileges. Run with sudo."
        return 1
    fi
    
    warning "Running ALL emergency fixes - this is the nuclear option!"
    read -p "Are you sure? This will restart everything. (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        log "🚨 Running ALL emergency fixes..."
        
        fix_database_issues
        fix_nodejs_issues
        fix_pm2_issues
        fix_module_not_found
        fix_high_resource_usage
        
        log "🎉 All emergency fixes completed"
        send_notification "ALL emergency fixes applied - system should be fully operational"
    else
        log "Nuclear option cancelled"
    fi
}

# Show help
show_help() {
    echo "Emergency Fix Script for Production Issues"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help"
    echo "  -d, --diagnostics   Run quick diagnostics"
    echo "  -1, --module-fix    Fix MODULE_NOT_FOUND error"
    echo "  -2, --nodejs-fix    Fix Node.js issues (requires sudo)"
    echo "  -3, --pm2-fix       Fix PM2 issues"
    echo "  -4, --resource-fix  Fix high resource usage (requires sudo)"
    echo "  -5, --db-fix        Fix database issues (requires sudo)"
    echo "  -6, --reset         Complete system reset"
    echo "  -a, --all           Run all fixes (requires sudo)"
    echo ""
    echo "Without options, runs interactive menu."
}

# Main execution
case "$1" in
    -h|--help)
        show_help
        ;;
    -d|--diagnostics)
        quick_diagnostics
        ;;
    -1|--module-fix)
        fix_module_not_found
        ;;
    -2|--nodejs-fix)
        fix_nodejs_issues
        ;;
    -3|--pm2-fix)
        fix_pm2_issues
        ;;
    -4|--resource-fix)
        fix_high_resource_usage
        ;;
    -5|--db-fix)
        fix_database_issues
        ;;
    -6|--reset)
        complete_system_reset
        ;;
    -a|--all)
        run_all_fixes
        ;;
    "")
        print_banner
        quick_diagnostics
        show_menu
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
