#!/bin/bash
# Setup Cron Jobs for Monitoring System

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/var/www/backend/ticket-backend"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error_exit() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Create cron jobs
setup_cron_jobs() {
    log "Setting up cron jobs for monitoring system..."
    
    # Make scripts executable
    chmod +x "$PROJECT_DIR/scripts/dependency-check.sh"
    chmod +x "$PROJECT_DIR/scripts/monitor.sh"
    
    # Create cron jobs
    local cron_content="# Ticket Backend Monitoring Cron Jobs
# Check dependencies every 15 minutes
*/15 * * * * /var/www/backend/ticket-backend/scripts/dependency-check.sh >/dev/null 2>&1

# Send health report every 6 hours
0 */6 * * * /var/www/backend/ticket-backend/scripts/monitor.sh dashboard >/dev/null 2>&1

# Clean old logs daily at 2 AM
0 2 * * * find /var/log -name '*ticket*' -type f -mtime +7 -delete >/dev/null 2>&1

# Clean alert cooldown file daily at 3 AM
0 3 * * * rm -f /tmp/monitor_alerts >/dev/null 2>&1
"
    
    # Add cron jobs to root crontab
    (crontab -l 2>/dev/null | grep -v "Ticket Backend Monitoring"; echo "$cron_content") | crontab -
    
    log "✅ Cron jobs installed successfully"
}

# Remove cron jobs
remove_cron_jobs() {
    log "Removing monitoring cron jobs..."
    
    # Remove cron jobs from root crontab
    crontab -l 2>/dev/null | grep -v "Ticket Backend Monitoring" | grep -v "dependency-check.sh" | grep -v "monitor.sh" | crontab -
    
    log "✅ Cron jobs removed successfully"
}

# Show current cron jobs
show_cron_jobs() {
    log "Current cron jobs:"
    crontab -l 2>/dev/null | grep -A 10 -B 2 "Ticket Backend"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    local logrotate_config="/etc/logrotate.d/ticket-backend"
    
    cat > "$logrotate_config" << 'EOF'
/var/log/ticket-auto-restart.log
/var/log/dependency-check.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        systemctl reload-or-restart rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF
    
    log "✅ Log rotation configured"
}

# Test cron job
test_cron() {
    log "Testing dependency check cron job..."
    "$PROJECT_DIR/scripts/dependency-check.sh"
    
    if [ $? -eq 0 ]; then
        log "✅ Dependency check test passed"
    else
        log "❌ Dependency check test failed"
    fi
}

# Main setup function
setup_monitoring_cron() {
    if [ "$EUID" -ne 0 ]; then
        error_exit "This script must be run as root"
    fi
    
    log "🔧 Setting up monitoring cron jobs and log rotation..."
    
    setup_cron_jobs
    setup_log_rotation
    
    # Start cron service if not running
    systemctl enable cron
    systemctl start cron
    
    log "✅ Monitoring cron setup completed"
    log "📊 Dependency checks will run every 15 minutes"
    log "📈 Health reports will be sent every 6 hours"
    log "🧹 Logs will be cleaned automatically"
}

# Show help
show_help() {
    echo "Monitoring Cron Setup Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -s, --setup    Setup monitoring cron jobs (default)"
    echo "  -r, --remove   Remove monitoring cron jobs"
    echo "  -l, --list     Show current cron jobs"
    echo "  -t, --test     Test dependency check"
    echo ""
    echo "Examples:"
    echo "  sudo $0                # Setup cron jobs"
    echo "  sudo $0 --setup        # Setup cron jobs"
    echo "  sudo $0 --remove       # Remove cron jobs"
    echo "  $0 --list              # Show current jobs"
    echo "  $0 --test              # Test dependency check"
}

# Parse command line arguments
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    -r|--remove)
        if [ "$EUID" -ne 0 ]; then
            error_exit "This operation requires root privileges"
        fi
        remove_cron_jobs
        exit 0
        ;;
    -l|--list)
        show_cron_jobs
        exit 0
        ;;
    -t|--test)
        test_cron
        exit 0
        ;;
    -s|--setup|"")
        setup_monitoring_cron
        exit 0
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
