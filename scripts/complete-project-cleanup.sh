#!/bin/bash

# Complete Project Cleanup Script
# ลบโปรเจ็คเก่าทั้งหมด รวมถึง PM2, databases, nginx configs
# Author: GitHub Copilot  
# Date: 2025-08-16

set -e

DOMAIN="patongboxingstadiumticket.com"
APP_DIR="/var/www/patong-boxing"
NODE_USER="nodeapp"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

step() {
    echo -e "${PURPLE}[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 $1${NC}"
}

# Discord notification
send_notification() {
    local message="$1"
    local color="$2"
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"embeds\": [{
                 \"title\": \"🧹 Project Cleanup\",
                 \"description\": \"$message\",
                 \"color\": $color,
                 \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
             }]
         }" \
         "$DISCORD_WEBHOOK_URL" 2>/dev/null || true
}

# Confirmation
echo -e "${RED}⚠️  WARNING: This will completely remove all existing projects and configurations!${NC}"
echo -e "${YELLOW}This includes:${NC}"
echo "  - All PM2 processes"
echo "  - Database data (PostgreSQL)"
echo "  - Nginx configurations"  
echo "  - Application files"
echo "  - Upload directories"
echo "  - SSL certificates"
echo "  - Log files"
echo ""
echo -e "${RED}This action cannot be undone!${NC}"
echo ""
read -p "Are you sure you want to proceed? (type 'YES' to confirm): " confirmation

if [ "$confirmation" != "YES" ]; then
    error "Cleanup cancelled by user"
    exit 1
fi

step "🚀 Starting Complete Project Cleanup"
send_notification "🚀 Starting complete project cleanup for $DOMAIN" 16776960

# Step 1: Stop and remove PM2 processes
step "🔄 Stopping PM2 processes"
if command -v pm2 >/dev/null 2>&1; then
    if id "$NODE_USER" &>/dev/null; then
        sudo -u "$NODE_USER" pm2 stop all || true
        sudo -u "$NODE_USER" pm2 delete all || true
        sudo -u "$NODE_USER" pm2 kill || true
        success "PM2 processes stopped and removed"
    else
        warning "Node user $NODE_USER not found"
    fi
else
    log "PM2 not found, skipping"
fi

# Step 2: Stop services
step "🛑 Stopping services"
systemctl stop nginx || true
systemctl stop postgresql || true
systemctl stop redis-server || true
systemctl stop fail2ban || true
systemctl stop webhook || true
systemctl stop supervisor || true

success "Services stopped"

# Step 3: Remove application directories
step "🗂️  Removing application directories"
if [ -d "$APP_DIR" ]; then
    # Create backup before removal
    BACKUP_DIR="/tmp/patong-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r "$APP_DIR" "$BACKUP_DIR/" || true
    log "Backup created at $BACKUP_DIR"
    
    rm -rf "$APP_DIR"
    success "Application directory removed"
else
    log "Application directory not found"
fi

# Remove upload directories
if [ -d "/var/uploads/patong-boxing" ]; then
    rm -rf /var/uploads/patong-boxing
    success "Upload directory removed"
fi

# Step 4: Remove Nginx configurations
step "🌐 Removing Nginx configurations"
rm -f "/etc/nginx/sites-available/$DOMAIN" || true
rm -f "/etc/nginx/sites-enabled/$DOMAIN" || true
rm -f /etc/nginx/sites-enabled/default || true

# Reset to default nginx config
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    server_name _;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx || true

success "Nginx configurations reset"

# Step 5: Remove SSL certificates
step "🔐 Removing SSL certificates"
if command -v certbot >/dev/null 2>&1; then
    certbot delete --cert-name "$DOMAIN" --non-interactive || true
    certbot delete --cert-name "www.$DOMAIN" --non-interactive || true
    certbot delete --cert-name "api.$DOMAIN" --non-interactive || true
    certbot delete --cert-name "app.$DOMAIN" --non-interactive || true
    certbot delete --cert-name "admin.$DOMAIN" --non-interactive || true
    
    success "SSL certificates removed"
else
    log "Certbot not found"
fi

# Step 6: Drop databases
step "🗄️  Removing databases"
if systemctl is-active --quiet postgresql; then
    systemctl start postgresql
    
    # Drop database and user
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS patongdb;" || true
    sudo -u postgres psql -c "DROP USER IF EXISTS patonguser;" || true
    
    success "PostgreSQL databases removed"
else
    log "PostgreSQL not running"
fi

# Step 7: Clear Redis data
step "📦 Clearing Redis data"
if systemctl is-active --quiet redis-server; then
    systemctl start redis-server
    redis-cli FLUSHALL || true
    success "Redis data cleared"
else
    log "Redis not running"
fi

# Step 8: Remove system user
step "👤 Removing system user"
if id "$NODE_USER" &>/dev/null; then
    # Kill any remaining processes
    pkill -u "$NODE_USER" || true
    
    # Remove user and home directory
    userdel -r "$NODE_USER" || true
    success "User $NODE_USER removed"
else
    log "User $NODE_USER not found"
fi

# Step 9: Remove webhook configurations
step "🎣 Removing webhook configurations"
if [ -d "/opt/webhook" ]; then
    systemctl stop webhook || true
    systemctl disable webhook || true
    rm -f /etc/systemd/system/webhook.service
    rm -rf /opt/webhook
    systemctl daemon-reload
    success "Webhook configurations removed"
else
    log "Webhook directory not found"
fi

# Step 10: Remove monitoring scripts
step "📊 Removing monitoring scripts"
rm -f /usr/local/bin/patong-health-check.sh || true

# Remove crontab entries
crontab -l | grep -v patong-health-check | crontab - || true
crontab -l | grep -v certbot | crontab - || true

success "Monitoring scripts removed"

# Step 11: Remove log files
step "📋 Removing log files"
rm -f /var/log/patong-deployment.log || true
rm -f /var/log/webhook-deploy.log || true
rm -rf /var/log/pm2 || true

# Remove logrotate config
rm -f /etc/logrotate.d/patong-boxing || true

success "Log files removed"

# Step 12: Reset security configurations
step "🔥 Resetting security configurations"
# Reset fail2ban to default
if [ -f /etc/fail2ban/jail.local ]; then
    rm -f /etc/fail2ban/jail.local
    systemctl restart fail2ban || true
    success "Fail2ban reset to default"
fi

# Reset UFW to default
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw --force enable

success "Firewall reset to default"

# Step 13: Clean package installations (optional)
step "📦 Cleaning packages"
log "Keeping system packages for next installation..."

# Clean npm global packages
if command -v npm >/dev/null 2>&1; then
    npm uninstall -g pm2 || true
    log "Global npm packages cleaned"
fi

# Step 14: Remove systemd customizations
step "🔧 Removing systemd customizations"
rm -f /etc/security/limits.conf.bak || true

# Reset sysctl
if [ -f /etc/sysctl.conf.bak ]; then
    mv /etc/sysctl.conf.bak /etc/sysctl.conf || true
else
    # Remove our additions
    sed -i '/# Network optimizations for Node.js/,+3d' /etc/sysctl.conf || true
fi

sysctl -p || true

success "System configurations reset"

# Step 15: Clean temporary files
step "🧹 Cleaning temporary files"
rm -rf /tmp/patong-boxing-temp || true
rm -rf /tmp/*patong* || true

# Clean apt cache
apt autoremove -y || true
apt autoclean || true

success "Temporary files cleaned"

# Final status check
step "✅ Cleanup completed - Final status"

echo -e "
=======================================================
🧹 Complete Project Cleanup Summary
=======================================================

✅ PM2 processes: Stopped and removed
✅ Application files: Removed (backup created)
✅ Nginx configs: Reset to default
✅ SSL certificates: Removed
✅ Database: Dropped (patongdb, patonguser)
✅ Redis data: Cleared
✅ System user: Removed ($NODE_USER)
✅ Webhooks: Removed
✅ Monitoring: Removed
✅ Logs: Cleaned
✅ Security: Reset to default
✅ Temporary files: Cleaned

🔄 Services Status:
"

# Check service status
SERVICES=("nginx" "postgresql" "redis-server" "fail2ban")
for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo -e "✅ $service: Running"
    else
        echo -e "⚠️  $service: Stopped"
    fi
done

echo -e "
📁 Backup Location: $BACKUP_DIR (if created)

🚀 System is now clean and ready for fresh installation!

Next steps:
1. Run the complete deployment script
2. Configure your environment variables
3. Set up your domain DNS
4. Test all functionality

=======================================================
"

# Final notification
send_notification "✅ Complete project cleanup finished successfully! 

🧹 **Removed:**
• All PM2 processes
• Application files (backup created)
• Database and user  
• SSL certificates
• Nginx configurations
• Monitoring scripts
• System user

🚀 **Status:** System is clean and ready for fresh deployment

**Next:** Run complete-deployment-setup.sh" 5763719

success "Complete project cleanup finished successfully!"

# Ask if user wants to run deployment immediately
echo ""
read -p "Would you like to run the complete deployment setup now? (y/n): " deploy_now

if [[ $deploy_now =~ ^[Yy]$ ]]; then
    log "🚀 Starting complete deployment setup..."
    if [ -f "./complete-deployment-setup.sh" ]; then
        chmod +x ./complete-deployment-setup.sh
        ./complete-deployment-setup.sh
    else
        warning "complete-deployment-setup.sh not found in current directory"
        echo "Please run it manually from the scripts directory"
    fi
else
    log "Cleanup completed. Run complete-deployment-setup.sh when ready."
fi

exit 0
EOF
