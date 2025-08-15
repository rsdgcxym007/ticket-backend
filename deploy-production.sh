#!/bin/bash

# ========================================
# 🥊 Patong Boxing Stadium - Production Deployment Script
# ========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="patong-boxing-stadium"
BACKEND_DIR="/var/www/api-patongboxingstadiumticket.com"
DOMAIN="api-patongboxingstadiumticket.com"
PORT=4000
NODE_VERSION="18"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi
}

# Check Node.js version
check_node() {
    log_header "🔍 Checking Node.js Version"
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_CURRENT -lt $NODE_VERSION ]]; then
        log_error "Node.js version $NODE_VERSION or higher is required"
        exit 1
    fi
    
    log_success "Node.js version: $(node -v)"
}

# Check PM2
check_pm2() {
    log_header "🔍 Checking PM2"
    
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 is not installed. Installing..."
        npm install -g pm2
    fi
    
    log_success "PM2 version: $(pm2 -v)"
}

# Backup current deployment
backup_current() {
    log_header "💾 Creating Backup"
    
    if [[ -d "$BACKEND_DIR" ]]; then
        BACKUP_DIR="/var/backups/${PROJECT_NAME}-$(date +%Y%m%d-%H%M%S)"
        sudo mkdir -p "$BACKUP_DIR"
        sudo cp -r "$BACKEND_DIR" "$BACKUP_DIR/"
        log_success "Backup created at: $BACKUP_DIR"
    else
        log_info "No existing deployment to backup"
    fi
}

# Create directory structure
create_directories() {
    log_header "📁 Setting up Directory Structure"
    
    sudo mkdir -p "$BACKEND_DIR"
    sudo chown -R $USER:$USER "$BACKEND_DIR"
    
    log_success "Directory structure created"
}

# Deploy application
deploy_app() {
    log_header "🚀 Deploying Application"
    
    # Copy files
    log_info "Copying application files..."
    cp -r ./* "$BACKEND_DIR/"
    
    # Navigate to app directory
    cd "$BACKEND_DIR"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --only=production
    
    # Build application
    log_info "Building application..."
    npm run build
    
    log_success "Application deployed successfully"
}

# Setup environment
setup_environment() {
    log_header "⚙️  Setting up Environment"
    
    # Copy production environment file
    if [[ -f ".env.production.example" ]]; then
        cp .env.production.example .env
        log_warning "Please edit .env file with your production values"
    else
        log_error ".env.production.example not found"
        exit 1
    fi
    
    # Set proper permissions
    chmod 600 .env
    
    log_success "Environment setup complete"
}

# Setup PM2
setup_pm2() {
    log_header "🔧 Setting up PM2"
    
    # Stop existing process if running
    pm2 stop "$PROJECT_NAME" 2>/dev/null || true
    pm2 delete "$PROJECT_NAME" 2>/dev/null || true
    
    # Start new process
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
    
    log_success "PM2 configuration complete"
}

# Setup Nginx
setup_nginx() {
    log_header "🌐 Setting up Nginx"
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # API proxy
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:$PORT/api/v1/health;
    }
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # File size limit
    client_max_body_size 10M;
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    sudo nginx -t
    
    if [[ $? -eq 0 ]]; then
        sudo systemctl reload nginx
        log_success "Nginx configuration updated"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log_header "🔒 Setting up SSL Certificate"
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_warning "Certbot not found. Installing..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    # Obtain SSL certificate
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email info@$DOMAIN
    
    # Setup auto-renewal
    sudo systemctl enable certbot.timer
    
    log_success "SSL certificate configured"
}

# Run tests
run_tests() {
    log_header "🧪 Running Tests"
    
    cd "$BACKEND_DIR"
    
    # Wait for app to start
    sleep 10
    
    # Run health check
    if curl -f -s https://$DOMAIN/api/v1/health > /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
    
    # Run email tests (optional)
    log_info "Running email system tests..."
    NODE_ENV=production node quick-test.js --url https://$DOMAIN
}

# Setup monitoring
setup_monitoring() {
    log_header "📊 Setting up Monitoring"
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/$PROJECT_NAME > /dev/null <<EOF
$BACKEND_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
    postrotate
        pm2 reload $PROJECT_NAME > /dev/null 2>&1 || true
    endscript
}
EOF
    
    log_success "Monitoring setup complete"
}

# Main deployment function
main() {
    log_header "🥊 Patong Boxing Stadium - Production Deployment"
    log_info "Starting deployment to $DOMAIN"
    
    # Pre-deployment checks
    check_root
    check_node
    check_pm2
    
    # Deployment steps
    backup_current
    create_directories
    deploy_app
    setup_environment
    setup_pm2
    setup_nginx
    setup_ssl
    run_tests
    setup_monitoring
    
    log_header "🎉 Deployment Complete!"
    log_success "✨ Patong Boxing Stadium API is now live at: https://$DOMAIN"
    log_success "📚 API Documentation: https://$DOMAIN/api/docs"
    log_success "💊 Health Check: https://$DOMAIN/api/v1/health"
    log_info "📋 Next steps:"
    echo "   1. Update DNS records to point to this server"
    echo "   2. Configure environment variables in .env"
    echo "   3. Test all API endpoints"
    echo "   4. Setup monitoring alerts"
    echo ""
    log_info "📱 PM2 Commands:"
    echo "   pm2 status"
    echo "   pm2 logs $PROJECT_NAME"
    echo "   pm2 restart $PROJECT_NAME"
    echo "   pm2 monit"
}

# Run deployment
main "$@"
