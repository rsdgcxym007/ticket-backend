#!/bin/bash

# Quick deployment script for Patong Boxing Stadium API
# Usage: ./deploy-quick.sh

set -e

echo "🚀 Starting Patong Boxing Stadium API Deployment..."

# Configuration
PROJECT_NAME="patong-boxing-stadium"
DOMAIN="api-patongboxingstadiumticket.com"
PROJECT_DIR="/var/www/$DOMAIN"
BACKUP_DIR="/var/backups/api-deployments"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as correct user
if [ "$EUID" -eq 0 ]; then
    log_error "Don't run this script as root. Run as your regular user with sudo access."
    exit 1
fi

# Create backup directory
log_info "Creating backup directory..."
sudo mkdir -p $BACKUP_DIR

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Project directory $PROJECT_DIR does not exist. Please run the full deployment guide first."
    exit 1
fi

# Navigate to project directory
log_info "Navigating to project directory..."
cd $PROJECT_DIR

# Create backup of current deployment
log_info "Creating backup of current deployment..."
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
sudo tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C $PROJECT_DIR .
log_success "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"

# Pull latest changes
log_info "Pulling latest changes from repository..."
git fetch origin
git pull origin main

# Install dependencies
log_info "Installing dependencies..."
npm ci --production

# Build application
log_info "Building application..."
npm run build

# Check if PM2 process exists
if pm2 describe $PROJECT_NAME > /dev/null 2>&1; then
    log_info "Restarting PM2 process..."
    pm2 restart $PROJECT_NAME
else
    log_info "Starting new PM2 process..."
    pm2 start ecosystem.config.js --env production
fi

# Save PM2 configuration
pm2 save

# Test application
log_info "Testing application health..."
sleep 5

# Check if application is running
if pm2 describe $PROJECT_NAME | grep -q "online"; then
    log_success "Application is running"
else
    log_error "Application failed to start"
    pm2 logs $PROJECT_NAME --lines 20
    exit 1
fi

# Test HTTP endpoint
log_info "Testing HTTP endpoint..."
if curl -f -s http://localhost:4000/health > /dev/null; then
    log_success "HTTP endpoint is responding"
else
    log_warning "HTTP endpoint test failed - this might be normal if HTTPS-only"
fi

# Test HTTPS endpoint if domain is configured
log_info "Testing HTTPS endpoint..."
if curl -f -s https://$DOMAIN/health > /dev/null; then
    log_success "HTTPS endpoint is responding"
else
    log_warning "HTTPS endpoint test failed - check SSL configuration"
fi

# Reload Nginx to ensure latest configuration
log_info "Reloading Nginx..."
sudo systemctl reload nginx

# Display PM2 status
log_info "Current PM2 status:"
pm2 status

# Display recent logs
log_info "Recent application logs:"
pm2 logs $PROJECT_NAME --lines 10 --nostream

# Cleanup old backups (keep last 10)
log_info "Cleaning up old backups..."
sudo find $BACKUP_DIR -name "backup-*.tar.gz" -type f -mtime +30 -delete 2>/dev/null || true
BACKUP_COUNT=$(sudo find $BACKUP_DIR -name "backup-*.tar.gz" -type f | wc -l)
if [ $BACKUP_COUNT -gt 10 ]; then
    sudo find $BACKUP_DIR -name "backup-*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | head -n -10 | cut -d' ' -f2- | sudo xargs rm -f
fi

# Final status check
log_info "Final deployment status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Project: $PROJECT_NAME"
echo "🌐 Domain: $DOMAIN"
echo "📁 Directory: $PROJECT_DIR"
echo "💾 Backup: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "🕐 Deployed: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test URLs
echo ""
log_info "Test these URLs:"
echo "🔍 Health Check: https://$DOMAIN/health"
echo "📚 API Documentation: https://$DOMAIN/api"
echo "⚡ System Status: pm2 status"
echo "📋 Application Logs: pm2 logs $PROJECT_NAME"

log_success "Deployment completed successfully! 🎉"

# Optional: Run a quick API test
read -p "Would you like to run a quick API test? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Running quick API test..."
    
    echo "Testing health endpoint..."
    curl -s https://$DOMAIN/health | jq . || echo "Health endpoint response received"
    
    echo "Testing API documentation..."
    if curl -s -I https://$DOMAIN/api | grep -q "200 OK"; then
        log_success "API documentation is accessible"
    else
        log_warning "API documentation might not be accessible"
    fi
    
    echo "Testing CORS headers..."
    CORS_RESPONSE=$(curl -s -I -H "Origin: https://patongboxingstadiumticket.com" https://$DOMAIN/api/events | grep -i "access-control-allow-origin" || echo "No CORS header found")
    echo "CORS Response: $CORS_RESPONSE"
fi

echo ""
log_success "All done! Your API is deployed and ready to serve traffic. 🚀"
