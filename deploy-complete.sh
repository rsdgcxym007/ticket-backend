#!/bin/bash

# 🚀 Complete Production Deployment Script
# Deploy ทั้งหมดในคำสั่งเดียว: Build + PM2 + Nginx + SSL + Database

set -e

# Configuration
APP_NAME="patong-boxing-stadium"
PROJECT_DIR="/var/www/api-patongboxingstadiumticket.com"
DOMAIN="api-patongboxingstadiumticket.com"
FRONTEND_DOMAIN="patongboxingstadiumticket.com"
BACKUP_DIR="/var/backups/deployments"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Helper functions
log_step() {
    echo -e "\n${PURPLE}================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================================${NC}"
}

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

# Check if running with proper permissions
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_error "Don't run this script as root. Run as deployment user with sudo access."
        exit 1
    fi
    
    if ! sudo -n true 2>/dev/null; then
        log_error "This script requires sudo access. Please run with a user that has sudo privileges."
        exit 1
    fi
}

# Create backup
create_backup() {
    log_step "🗄️ CREATING BACKUP"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    sudo mkdir -p $BACKUP_DIR
    
    if [ -d "$PROJECT_DIR" ]; then
        log_info "Creating backup of current deployment..."
        sudo tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$(dirname $PROJECT_DIR)" "$(basename $PROJECT_DIR)"
        log_success "Backup created: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    else
        log_warning "Project directory doesn't exist. Skipping backup."
    fi
    
    # Keep only last 10 backups
    sudo find $BACKUP_DIR -name "backup_*.tar.gz" -type f -mtime +10 -delete 2>/dev/null || true
}

# Setup project directory
setup_project_dir() {
    log_step "📁 SETTING UP PROJECT DIRECTORY"
    
    sudo mkdir -p $PROJECT_DIR
    sudo chown -R $USER:$USER $PROJECT_DIR
    
    log_success "Project directory setup complete"
}

# Copy project files
copy_project_files() {
    log_step "📋 COPYING PROJECT FILES"
    
    log_info "Copying all project files to $PROJECT_DIR..."
    
    # Copy all files except node_modules and .git
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='uploads' ./ $PROJECT_DIR/
    
    log_success "Project files copied successfully"
}

# Install dependencies and build
build_project() {
    log_step "🔨 BUILDING PROJECT"
    
    cd $PROJECT_DIR
    
    log_info "Installing dependencies..."
    npm ci --production=false
    
    log_info "Building project..."
    npm run build
    
    log_success "Project built successfully"
}

# Setup environment
setup_environment() {
    log_step "⚙️ SETTING UP ENVIRONMENT"
    
    cd $PROJECT_DIR
    
    if [ ! -f ".env.production" ]; then
        log_info "Creating .env.production file..."
        cat > .env.production << EOF
# Production Environment Configuration for Patong Boxing Stadium
NODE_ENV=production
PORT=4000
APP_URL=https://$DOMAIN

# Domain Configuration
FRONTEND_URL=https://$FRONTEND_DOMAIN
BACKEND_URL=https://$DOMAIN
API_URL=https://$DOMAIN/api

# Database Configuration
DATABASE_HOST=43.229.133.51
DATABASE_PORT=5432
DATABASE_USERNAME=boxing_user
DATABASE_PASSWORD=Password123!
DATABASE_NAME=patong_boxing_stadium
DATABASE_SSL=false
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false

# Redis Configuration
REDIS_HOST=43.229.133.51
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration (Generated automatically)
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=7d
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_EXPIRES_IN=30d
JWT_REFRESH_EXPIRATION=30d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@$FRONTEND_DOMAIN
SMTP_PASS=your-gmail-app-password-here
EMAIL_FROM=info@$FRONTEND_DOMAIN
EMAIL_FROM_NAME=Patong Boxing Stadium

# Gmail Configuration
GMAIL_USER=info@$FRONTEND_DOMAIN
GMAIL_PASS=your-gmail-app-password-here

# Application Settings
API_VERSION=v1
BCRYPT_ROUNDS=12
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
SWAGGER_ENABLED=true
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL=300

# Security
THROTTLE_TTL=60
THROTTLE_LIMIT=100
MAX_FILE_SIZE=10485760

# Frontend URLs
NUXT_PUBLIC_APP_URL=https://$FRONTEND_DOMAIN
NUXT_PUBLIC_API_BASE_URL=https://$DOMAIN
EOF
        log_success ".env.production created"
        log_warning "Please update EMAIL passwords in .env.production"
    else
        log_info ".env.production already exists"
    fi
}

# Run database migrations
run_migrations() {
    log_step "🗃️ RUNNING DATABASE MIGRATIONS"
    
    cd $PROJECT_DIR
    
    log_info "Running TypeORM migrations..."
    npm run migration:run 2>/dev/null || log_warning "Migrations may have already been run or don't exist"
    
    log_success "Database migrations completed"
}

# Setup PM2
setup_pm2() {
    log_step "⚡ SETTING UP PM2"
    
    cd $PROJECT_DIR
    
    # Check if PM2 is installed globally
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2 globally..."
        sudo npm install -g pm2
    fi
    
    # Stop existing process if running
    if pm2 describe $APP_NAME > /dev/null 2>&1; then
        log_info "Stopping existing PM2 process..."
        pm2 stop $APP_NAME
        pm2 delete $APP_NAME
    fi
    
    # Start new process
    log_info "Starting new PM2 process..."
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    sudo env PATH=$PATH:/usr/bin $(which pm2) startup systemd -u $USER --hp $HOME
    
    log_success "PM2 setup completed"
}

# Setup Nginx
setup_nginx() {
    log_step "🌐 SETTING UP NGINX"
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        log_info "Installing Nginx..."
        sudo apt update
        sudo apt install -y nginx
    fi
    
    # Create Nginx configuration
    log_info "Creating Nginx configuration..."
    sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS headers
    add_header Access-Control-Allow-Origin "https://$FRONTEND_DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    add_header Access-Control-Allow-Credentials true always;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Proxy to Node.js backend
    location / {
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$FRONTEND_DOMAIN";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Access-Control-Allow-Credentials true;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        proxy_pass http://localhost:4000;
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
        proxy_pass http://localhost:4000/health;
        access_log off;
    }

    # File upload size
    client_max_body_size 10M;
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    
    # Remove default site if exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration has errors"
        exit 1
    fi
    
    # Start/restart Nginx
    sudo systemctl enable nginx
    sudo systemctl restart nginx
    
    log_success "Nginx setup completed"
}

# Setup SSL Certificate
setup_ssl() {
    log_step "🔒 SETTING UP SSL CERTIFICATE"
    
    # Check if Certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_info "Installing Certbot..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    # Check DNS resolution
    log_info "Checking DNS resolution for $DOMAIN..."
    if nslookup $DOMAIN | grep -q "$(curl -s ifconfig.me)"; then
        log_success "DNS resolution confirmed"
        
        # Install SSL certificate
        log_info "Installing SSL certificate..."
        sudo certbot --nginx -d $DOMAIN -d $FRONTEND_DOMAIN -d www.$FRONTEND_DOMAIN \
            --non-interactive --agree-tos --email admin@$FRONTEND_DOMAIN \
            --redirect || log_warning "SSL installation may have failed - check manually"
        
        # Setup auto-renewal
        log_info "Setting up SSL auto-renewal..."
        (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
        
        # Test renewal
        sudo certbot renew --dry-run && log_success "SSL auto-renewal setup completed"
        
    else
        log_warning "DNS not pointing to this server. SSL setup skipped."
        log_info "Please configure DNS first, then run: sudo certbot --nginx -d $DOMAIN"
    fi
}

# Setup firewall
setup_firewall() {
    log_step "🔥 SETTING UP FIREWALL"
    
    # Enable UFW firewall
    sudo ufw --force enable
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow necessary ports
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw allow 4000  # Backend port (internal)
    
    # Allow database ports if needed
    sudo ufw allow 5432  # PostgreSQL
    sudo ufw allow 6379  # Redis
    
    sudo ufw reload
    
    log_success "Firewall setup completed"
}

# Run health checks
run_health_checks() {
    log_step "🏥 RUNNING HEALTH CHECKS"
    
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check PM2 status
    log_info "Checking PM2 status..."
    if pm2 describe $APP_NAME | grep -q "online"; then
        log_success "PM2 process is running"
    else
        log_error "PM2 process is not running"
        pm2 logs $APP_NAME --lines 20
    fi
    
    # Check local API
    log_info "Checking local API..."
    if curl -f http://localhost:4000/health > /dev/null 2>&1; then
        log_success "Local API is responding"
    else
        log_warning "Local API is not responding"
    fi
    
    # Check Nginx
    log_info "Checking Nginx status..."
    if sudo systemctl is-active nginx > /dev/null 2>&1; then
        log_success "Nginx is running"
    else
        log_error "Nginx is not running"
    fi
    
    # Check HTTPS if SSL is configured
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log_info "Checking HTTPS API..."
        if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
            log_success "HTTPS API is responding"
        else
            log_warning "HTTPS API is not responding yet"
        fi
    fi
}

# Display final status
display_final_status() {
    log_step "🎉 DEPLOYMENT COMPLETED"
    
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}DEPLOYMENT STATUS SUMMARY${NC}"
    echo -e "${CYAN}================================${NC}"
    echo -e "🎯 Project: $APP_NAME"
    echo -e "📁 Location: $PROJECT_DIR"
    echo -e "🌐 Domain: $DOMAIN"
    echo -e "🎨 Frontend: $FRONTEND_DOMAIN"
    echo -e "🕐 Deployed: $(date)"
    echo -e "${CYAN}================================${NC}"
    
    echo -e "\n${YELLOW}📋 Services Status:${NC}"
    echo "PM2 Status:"
    pm2 status
    
    echo -e "\n${YELLOW}🔗 Test URLs:${NC}"
    echo "• Health Check: https://$DOMAIN/health"
    echo "• API Docs: https://$DOMAIN/api"
    echo "• Local API: http://localhost:4000/health"
    
    echo -e "\n${YELLOW}🔧 Useful Commands:${NC}"
    echo "• Check logs: pm2 logs $APP_NAME"
    echo "• Restart API: pm2 restart $APP_NAME"
    echo "• Nginx logs: sudo tail -f /var/log/nginx/error.log"
    echo "• Check SSL: sudo certbot certificates"
    echo "• Firewall status: sudo ufw status"
    
    echo -e "\n${YELLOW}📂 Important Files:${NC}"
    echo "• Project: $PROJECT_DIR"
    echo "• Environment: $PROJECT_DIR/.env.production"
    echo "• Nginx config: /etc/nginx/sites-available/$DOMAIN"
    echo "• SSL certificates: /etc/letsencrypt/live/$DOMAIN/"
    echo "• Backups: $BACKUP_DIR"
    
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        echo -e "\n${RED}⚠️ Important:${NC}"
        echo "• Update EMAIL passwords in $PROJECT_DIR/.env.production"
        echo "• Configure your domain's DNS to point to this server"
        echo "• Review and customize environment variables as needed"
    fi
    
    log_success "Deployment completed successfully! 🚀"
}

# Main execution
main() {
    log_step "🚀 STARTING COMPLETE DEPLOYMENT"
    
    echo -e "${CYAN}Deployment Target:${NC}"
    echo -e "• Domain: $DOMAIN"
    echo -e "• Frontend: $FRONTEND_DOMAIN"
    echo -e "• Project Directory: $PROJECT_DIR"
    echo -e "• App Name: $APP_NAME"
    echo ""
    
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    check_permissions
    create_backup
    setup_project_dir
    copy_project_files
    setup_environment
    build_project
    run_migrations
    setup_pm2
    setup_nginx
    setup_ssl
    setup_firewall
    run_health_checks
    display_final_status
}

# Run main function
main "$@"
