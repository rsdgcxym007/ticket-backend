#!/bin/bash
# One-Click Deployment with Full Monitoring Setup
# This script will deploy the backend and setup complete monitoring system

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/backend/ticket-backend"
BRANCH="feature/newfunction"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error_exit() {
    echo -e "${RED}[ERROR]${NC} $1"
    send_notification "🚨 **Deployment Failed**\n\nError: $1\nPlease check the logs and try again." "critical"
    exit 1
}

send_notification() {
    local message="$1"
    local level="$2"
    
    case $level in
        "critical")
            emoji="🚨"
            color="15158332"
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
    
    local payload=$(cat <<EOF
{
    "embeds": [
        {
            "title": "$emoji One-Click Deployment",
            "description": "$message",
            "color": $color,
            "footer": {
                "text": "Ticket Backend Deployment System"
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

print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║               🚀 ONE-CLICK DEPLOYMENT SYSTEM                 ║"
    echo "║                                                              ║"
    echo "║  This script will:                                           ║"
    echo "║  ✅ Deploy the latest backend code                          ║"
    echo "║  ✅ Setup resource monitoring with Discord alerts           ║"
    echo "║  ✅ Setup auto-restart system                               ║"
    echo "║  ✅ Setup dependency health checks                          ║"
    echo "║  ✅ Configure cron jobs for automation                      ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_requirements() {
    log "🔍 Checking system requirements..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        error_exit "This script must be run with sudo privileges"
    fi
    
    # Check if git is installed
    if ! command -v git >/dev/null 2>&1; then
        error_exit "Git is not installed"
    fi
    
    # Check if curl is installed
    if ! command -v curl >/dev/null 2>&1; then
        error_exit "curl is not installed"
    fi
    
    log "✅ All requirements met"
}

setup_project_directory() {
    log "📁 Setting up project directory..."
    
    if [ ! -d "$PROJECT_DIR" ]; then
        log "Creating project directory at $PROJECT_DIR"
        mkdir -p "$PROJECT_DIR"
        
        log "Cloning repository..."
        git clone https://github.com/rsdgcxym007/ticket-backend.git "$PROJECT_DIR" || error_exit "Failed to clone repository"
        cd "$PROJECT_DIR"
        git checkout "$BRANCH" || error_exit "Failed to checkout branch $BRANCH"
    else
        log "Project directory exists, updating code..."
        cd "$PROJECT_DIR" || error_exit "Failed to change to project directory"
        git stash push -m "Auto-stash before one-click deployment $(date)" 2>/dev/null || true
        git pull origin "$BRANCH" || error_exit "Failed to pull latest code"
    fi
    
    # Set ownership
    chown -R $SUDO_USER:$SUDO_USER "$PROJECT_DIR" 2>/dev/null || true
    
    log "✅ Project directory ready"
}

install_system_dependencies() {
    log "📦 Installing system dependencies..."
    
    # Update package list
    apt update || error_exit "Failed to update package list"
    
    # Install basic system packages first
    apt install -y curl wget git postgresql postgresql-contrib redis-server jq htop build-essential || error_exit "Failed to install basic system packages"
    
    # Use our Node.js fix script for proper installation
    log "🔧 Installing Node.js using fix script..."
    cd "$PROJECT_DIR" || error_exit "Failed to change to project directory"
    ./scripts/fix-nodejs.sh --clean || error_exit "Failed to install Node.js"
    
    log "✅ System dependencies installed"
}

setup_services() {
    log "🔧 Setting up system services..."
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    # Start and enable Redis
    systemctl start redis-server
    systemctl enable redis-server
    
    # Setup database if not exists
    sudo -u postgres psql -c "CREATE USER boxing_user WITH PASSWORD 'Password123!';" 2>/dev/null || log "Database user already exists"
    sudo -u postgres psql -c "CREATE DATABASE boxing_ticket_db OWNER boxing_user;" 2>/dev/null || log "Database already exists"
    
    log "✅ System services configured"
}

build_and_deploy_application() {
    log "🔨 Building and deploying application..."
    
    cd "$PROJECT_DIR" || error_exit "Failed to change to project directory"
    
    # Install Node.js dependencies
    npm install --production || error_exit "Failed to install npm dependencies"
    
    # Build application
    npm run build || error_exit "Failed to build application"
    
    # Stop existing PM2 processes
    pm2 stop ticket-backend-prod 2>/dev/null || log "No existing process to stop"
    pm2 delete ticket-backend-prod 2>/dev/null || log "No existing process to delete"
    
    # Start application with PM2
    pm2 start ecosystem.config.js --env production || error_exit "Failed to start application with PM2"
    pm2 save || log "Failed to save PM2 configuration"
    
    # Enable PM2 startup
    pm2 startup || log "PM2 startup configuration may need manual setup"
    
    log "✅ Application deployed successfully"
}

setup_monitoring_system() {
    log "📊 Setting up monitoring system..."
    
    cd "$PROJECT_DIR" || error_exit "Failed to change to project directory"
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # Copy systemd service files
    cp scripts/ticket-monitor.service /etc/systemd/system/
    cp scripts/ticket-auto-restart.service /etc/systemd/system/
    
    # Reload systemd daemon
    systemctl daemon-reload
    
    # Enable and start monitoring services
    systemctl enable ticket-monitor.service
    systemctl enable ticket-auto-restart.service
    systemctl start ticket-monitor.service
    systemctl start ticket-auto-restart.service
    
    log "✅ Monitoring services started"
}

setup_cron_jobs() {
    log "⏰ Setting up cron jobs..."
    
    cd "$PROJECT_DIR" || error_exit "Failed to change to project directory"
    
    # Setup cron jobs using our script
    ./scripts/setup-cron.sh --setup || error_exit "Failed to setup cron jobs"
    
    log "✅ Cron jobs configured"
}

perform_health_checks() {
    log "🏥 Performing health checks..."
    
    # Wait for application to start
    sleep 10
    
    # Check PM2 status
    if ! pm2 list | grep -q "online"; then
        error_exit "PM2 application is not running"
    fi
    
    # Check HTTP health endpoint
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo "000")
        
        if [ "$response" = "200" ]; then
            log "✅ Application health check passed"
            break
        else
            log "Health check attempt $attempt/$max_attempts failed (HTTP $response)"
            if [ $attempt -eq $max_attempts ]; then
                error_exit "Application health check failed after $max_attempts attempts"
            fi
            sleep 5
            attempt=$((attempt + 1))
        fi
    done
    
    # Check monitoring services
    if ! systemctl is-active --quiet ticket-monitor.service; then
        error_exit "Monitoring service is not running"
    fi
    
    if ! systemctl is-active --quiet ticket-auto-restart.service; then
        error_exit "Auto-restart service is not running"
    fi
    
    log "✅ All health checks passed"
}

test_monitoring_system() {
    log "🧪 Testing monitoring system..."
    
    cd "$PROJECT_DIR" || error_exit "Failed to change to project directory"
    
    # Test Discord alert
    ./scripts/monitor.sh test-alert || error_exit "Failed to send test alert"
    
    # Test dependency check
    ./scripts/dependency-check.sh || error_exit "Dependency check failed"
    
    log "✅ Monitoring system tests passed"
}

show_deployment_summary() {
    local deployment_time=$(date '+%Y-%m-%d %H:%M:%S')
    local commit_hash=$(cd "$PROJECT_DIR" && git rev-parse --short HEAD)
    local commit_message=$(cd "$PROJECT_DIR" && git log -1 --pretty=format:"%s")
    
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    🎉 DEPLOYMENT SUCCESSFUL                  ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}📊 Deployment Summary:${NC}"
    echo -e "   • Time: $deployment_time"
    echo -e "   • Commit: $commit_hash - $commit_message"
    echo -e "   • Branch: $BRANCH"
    echo -e "   • Application: http://localhost:4000"
    echo -e "   • API Docs: http://localhost:4000/api/docs"
    echo ""
    echo -e "${GREEN}🔧 Monitoring System:${NC}"
    echo -e "   • Resource monitoring: ✅ Active"
    echo -e "   • Auto-restart: ✅ Active"
    echo -e "   • Dependency checks: ✅ Active (every 15 min)"
    echo -e "   • Discord alerts: ✅ Configured"
    echo ""
    echo -e "${GREEN}⚡ Quick Commands:${NC}"
    echo -e "   • Dashboard: npm run monitor"
    echo -e "   • Start alerts: npm run monitor:alert"
    echo -e "   • View logs: npm run monitor:logs"
    echo -e "   • Test alerts: npm run monitor:test"
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo -e "   1. Check Discord for test alert"
    echo -e "   2. Monitor the dashboard: npm run monitor"
    echo -e "   3. Review logs: pm2 logs ticket-backend-prod"
    echo ""
    
    # Send success notification
    send_notification "🎉 **Deployment Completed Successfully!**\n\n**Details:**\n• Time: $deployment_time\n• Commit: $commit_hash\n• Branch: $BRANCH\n\n**Services Active:**\n✅ Application\n✅ Resource Monitoring\n✅ Auto-restart\n✅ Dependency Checks\n\n**URLs:**\n• App: http://localhost:4000\n• Docs: http://localhost:4000/api/docs" "success"
}

# Main deployment process
main() {
    print_banner
    
    log "🚀 Starting one-click deployment..."
    send_notification "🚀 **One-Click Deployment Started**\n\nInitializing complete system deployment with monitoring..." "info"
    
    check_requirements
    setup_project_directory
    install_system_dependencies
    setup_services
    build_and_deploy_application
    setup_monitoring_system
    setup_cron_jobs
    perform_health_checks
    test_monitoring_system
    
    show_deployment_summary
    
    log "🎉 One-click deployment completed successfully!"
}

# Show help
show_help() {
    echo "One-Click Deployment Script for Ticket Backend"
    echo ""
    echo "This script will completely setup the backend with monitoring system."
    echo ""
    echo "Usage: sudo $0"
    echo ""
    echo "Requirements:"
    echo "  - Ubuntu/Debian based system"
    echo "  - Root privileges (run with sudo)"
    echo "  - Internet connection"
    echo ""
    echo "What this script does:"
    echo "  ✅ Install system dependencies (Node.js, PostgreSQL, Redis, etc.)"
    echo "  ✅ Clone/update the backend repository"
    echo "  ✅ Build and deploy the application"
    echo "  ✅ Setup PM2 process management"
    echo "  ✅ Configure resource monitoring with Discord alerts"
    echo "  ✅ Setup auto-restart system"
    echo "  ✅ Configure dependency health checks"
    echo "  ✅ Setup automated cron jobs"
    echo "  ✅ Perform comprehensive health checks"
    echo ""
}

# Parse arguments
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac
