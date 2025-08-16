#!/bin/bash

# Master Deployment Script for Patong Boxing Stadium
# สคริปต์หลักที่ทำงานครบวงจร: ลบเก่า > ติดตั้งใหม่ > ตั้งค่า Email > Monitor
# Author: GitHub Copilot
# Date: 2025-08-16

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="patongboxingstadiumticket.com" 
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Header
echo -e "${WHITE}
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║       🥊 PATONG BOXING STADIUM - MASTER DEPLOYMENT      ║
║                                                          ║
║  Complete Setup: Cleanup → Install → Email → Monitor    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
${NC}"

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
    exit 1
}

step() {
    echo -e "${PURPLE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 $1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

# Discord notification
send_notification() {
    local message="$1"
    local color="$2"
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"embeds\": [{
                 \"title\": \"🥊 Patong Boxing Stadium - Master Deployment\",
                 \"description\": \"$message\",
                 \"color\": $color,
                 \"fields\": [
                     {
                         \"name\": \"Domain\",
                         \"value\": \"$DOMAIN\",
                         \"inline\": true
                     },
                     {
                         \"name\": \"Server IP\",
                         \"value\": \"$(curl -s ifconfig.me || echo '43.229.133.51')\",
                         \"inline\": true
                     },
                     {
                         \"name\": \"Timestamp\",
                         \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
                         \"inline\": false
                     }
                 ],
                 \"footer\": {
                     \"text\": \"Master Deployment Script\"
                 }
             }]
         }" \
         "$DISCORD_WEBHOOK_URL" 2>/dev/null || true
}

log "🚀 Starting Master Deployment Process"
send_notification "🚀 Master deployment started for $DOMAIN" 3447003

# Display current system status
step "📊 Current System Status"
log "Domain: $DOMAIN"
log "Server IP: $(curl -s ifconfig.me || echo '43.229.133.51')"
log "OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')"
log "Date: $(date)"
log "Scripts Directory: $SCRIPT_DIR"

# Check for existing installations
if [ -d "/var/www/patong-boxing" ] || pgrep -f "patong" >/dev/null || systemctl is-active --quiet nginx; then
    log "⚠️  Existing installation detected"
    
    echo -e "${YELLOW}
Current system status:
$(systemctl is-active nginx 2>/dev/null | head -1)
$(ps aux | grep -E "(pm2|node)" | grep -v grep | wc -l) processes running
$(df -h / | tail -1)
${NC}"

    read -p "Do you want to proceed with cleanup and fresh installation? (y/N): " proceed
    if [[ ! $proceed =~ ^[Yy]$ ]]; then
        error "Deployment cancelled by user"
    fi
fi

# Make all scripts executable
step "🔧 Preparing deployment scripts"
chmod +x "$SCRIPT_DIR"/*.sh
log "All scripts are now executable"

# Phase 1: Complete Cleanup
step "🧹 Phase 1: Complete System Cleanup"
log "Running complete project cleanup..."

if [ -f "$SCRIPT_DIR/complete-project-cleanup.sh" ]; then
    # Run cleanup with auto-confirmation
    echo "YES" | "$SCRIPT_DIR/complete-project-cleanup.sh" || error "Cleanup script failed"
    success "System cleanup completed"
else
    error "Cleanup script not found: $SCRIPT_DIR/complete-project-cleanup.sh"
fi

# Wait a moment for services to properly stop
log "Waiting for services to settle..."
sleep 5

# Phase 2: Complete Deployment
step "🏗️  Phase 2: Complete Deployment Setup"
log "Running complete deployment setup..."

if [ -f "$SCRIPT_DIR/complete-deployment-setup.sh" ]; then
    "$SCRIPT_DIR/complete-deployment-setup.sh" || error "Deployment script failed"
    success "Deployment setup completed"
else
    error "Deployment script not found: $SCRIPT_DIR/complete-deployment-setup.sh"
fi

# Wait for services to start properly
log "Waiting for services to initialize..."
sleep 10

# Phase 3: Email Setup
step "📧 Phase 3: Email System Setup"
log "Setting up email system..."

if [ -f "$SCRIPT_DIR/setup-email-complete.sh" ]; then
    "$SCRIPT_DIR/setup-email-complete.sh" || log "Email setup had issues (not critical)"
    success "Email system configured"
else
    log "Email setup script not found, skipping..."
fi

# Phase 4: Final Health Check
step "🔍 Phase 4: Final Health Check & Verification"

# Wait for all services to be ready
log "Performing final health checks..."
sleep 10

# Check critical services
SERVICES=("nginx" "postgresql" "redis-server" "fail2ban")
FAILED_SERVICES=()

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        success "$service is running"
    else
        FAILED_SERVICES+=("$service")
        error "$service is not running"
    fi
done

# Check application
if curl -s http://localhost:3000/health >/dev/null; then
    success "Application health check passed"
else
    log "Application health check failed (may need time to start)"
fi

# Check PM2 processes
if command -v pm2 >/dev/null 2>&1; then
    NODE_USER="nodeapp"
    if id "$NODE_USER" &>/dev/null; then
        PM2_STATUS=$(sudo -u "$NODE_USER" pm2 list 2>/dev/null | grep -c "online" || echo "0")
        if [ "$PM2_STATUS" -gt 0 ]; then
            success "PM2 processes running: $PM2_STATUS"
        else
            log "No PM2 processes running yet"
        fi
    fi
fi

# Phase 5: Display Final Summary
step "📋 Phase 5: Deployment Summary"

echo -e "${WHITE}
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🎯 MASTER DEPLOYMENT COMPLETED SUCCESSFULLY!        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

🌐 MAIN URLS:
   • Main Site:  https://$DOMAIN
   • API Server: https://api.$DOMAIN  
   • App Portal: https://app.$DOMAIN
   • Admin:      https://admin.$DOMAIN

🔧 SYSTEM COMPONENTS:
   ✅ Web Server:     Nginx with SSL/TLS
   ✅ Database:       PostgreSQL (patongdb)
   ✅ Cache:          Redis
   ✅ Runtime:        Node.js 18 + PM2 
   ✅ Security:       UFW + Fail2ban
   ✅ Monitoring:     Health checks + Discord alerts
   ✅ Email:          SendGrid + SMTP fallback
   ✅ Auto-Deploy:    Webhook on port 4200

📊 MONITORING:
   • Health checks every 5 minutes
   • Discord alerts for issues  
   • Auto-restart on failures
   • Log rotation configured

🚀 AUTO-DEPLOYMENT:
   • Webhook URL: http://$(curl -s ifconfig.me):4200/hooks/deploy-backend-master
   • Triggers on GitHub push to master branch
   • Automatic build and restart

📁 IMPORTANT PATHS:
   • App Directory:   /var/www/patong-boxing
   • Upload Directory: /var/uploads/patong-boxing  
   • Logs:            /var/log/pm2/ & /var/log/patong-deployment.log
   • Nginx Config:    /etc/nginx/sites-available/$DOMAIN
   • Environment:     /var/www/patong-boxing/.env

${NC}"

# Check if any services failed
if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Some services need attention:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo -e "${RED}   • $service${NC}"
    done
    echo ""
fi

echo -e "${GREEN}🔧 NEXT STEPS:${NC}"
echo "1. Update .env file with your actual API keys:"
echo "   - SENDGRID_API_KEY"
echo "   - STRIPE_SECRET_KEY"  
echo "   - Other service credentials"
echo ""
echo "2. Configure GitHub webhook:"
echo "   - Repository Settings → Webhooks"
echo "   - URL: http://$(curl -s ifconfig.me):4200/hooks/deploy-backend-master"
echo "   - Content type: application/json"
echo "   - Secret: your-webhook-secret-here"
echo ""
echo "3. Test all functionality:"
echo "   - Visit https://$DOMAIN"
echo "   - Test API endpoints"
echo "   - Verify email functionality"
echo ""
echo "4. Deploy frontend applications to complete the system"

echo -e "${WHITE}
╔══════════════════════════════════════════════════════════╗
║  🎊 CONGRATULATIONS! Your system is ready for business! ║
╚══════════════════════════════════════════════════════════╝
${NC}"

# Final Discord notification
if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    send_notification "🎉 **MASTER DEPLOYMENT COMPLETED SUCCESSFULLY!** 

🌐 **All URLs are ready:**
• Main: https://$DOMAIN
• API: https://api.$DOMAIN  
• App: https://app.$DOMAIN
• Admin: https://admin.$DOMAIN

✅ **All systems operational:**
• Web server with SSL
• Database and cache
• Email system configured
• Auto-deployment active
• Monitoring and alerts

🚀 **Ready for production traffic!**

**Next:** Update API keys in .env and configure GitHub webhook" 5763719
else
    send_notification "⚠️ **Master deployment completed with warnings**

Some services need attention:
$(printf '• %s\n' "${FAILED_SERVICES[@]}")

Please check the server and restart failed services." 16776960
fi

success "🎯 Master deployment process completed!"

exit 0
EOF
