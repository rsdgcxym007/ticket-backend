#!/bin/bash

# 🔄 Quick Update & Restart Script
# สำหรับการอัปเดตเร็วหลังจาก deploy ครั้งแรกแล้ว

set -e

APP_NAME="patong-boxing-stadium"
PROJECT_DIR="/var/www/api-patongboxingstadiumticket.com"
DOMAIN="api-patongboxingstadiumticket.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "🔄 Quick Update & Restart..."

# Navigate to project directory
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found. Run deploy-complete.sh first."
    exit 1
fi

cd $PROJECT_DIR

# Create backup of current version
log_info "Creating quick backup..."
sudo tar -czf "/tmp/quick-backup-$(date +%H%M%S).tar.gz" dist/ .env.production 2>/dev/null || true

# Update code (git pull)
if [ -d ".git" ]; then
    log_info "Pulling latest changes..."
    git pull origin main || log_warning "Git pull failed - continuing with local files"
fi

# Copy new files from source (if running from development directory)
if [ "$PWD" != "$PROJECT_DIR" ]; then
    log_info "Copying updated files..."
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='uploads' --exclude='dist' ./ $PROJECT_DIR/
fi

# Install/update dependencies
log_info "Updating dependencies..."
npm ci --production=false

# Build project
log_info "Building project..."
npm run build

# Run migrations (if any new ones)
log_info "Running any new migrations..."
npm run migration:run 2>/dev/null || log_warning "No new migrations or migration failed"

# Restart PM2
log_info "Restarting PM2 process..."
pm2 restart $APP_NAME

# Wait a moment for restart
sleep 3

# Quick health check
log_info "Quick health check..."
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    log_success "✅ API is responding"
else
    echo "❌ API not responding. Check logs: pm2 logs $APP_NAME"
    exit 1
fi

# Reload Nginx (in case of config changes)
log_info "Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

log_success "🎉 Quick update completed!"

echo ""
echo "📊 Current Status:"
pm2 status

echo ""
echo "🔗 Test URLs:"
echo "• https://$DOMAIN/health"
echo "• https://$DOMAIN/api"

echo ""
echo "📋 Quick Commands:"
echo "• pm2 logs $APP_NAME"
echo "• pm2 restart $APP_NAME"
echo "• sudo tail -f /var/log/nginx/error.log"
