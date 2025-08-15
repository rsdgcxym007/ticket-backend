#!/bin/bash

# SSL Certificate Setup Script for Patong Boxing Stadium
# Domain: patongboxingstadiumticket.com
# API Domain: api-patongboxingstadiumticket.com

set -e

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

# Configuration
MAIN_DOMAIN="patongboxingstadiumticket.com"
API_DOMAIN="api-patongboxingstadiumticket.com"
WWW_DOMAIN="www.patongboxingstadiumticket.com"
ADMIN_DOMAIN="admin.patongboxingstadiumticket.com"
APP_DOMAIN="app.patongboxingstadiumticket.com"
EMAIL="info@patongboxingstadiumticket.com"

log_info "Starting SSL Certificate setup for Patong Boxing Stadium domains..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Update system
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install Certbot
log_info "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
log_info "Stopping Nginx temporarily..."
systemctl stop nginx

# Check if domains are accessible
log_info "Checking domain accessibility..."
domains=("$MAIN_DOMAIN" "$API_DOMAIN" "$WWW_DOMAIN")

for domain in "${domains[@]}"; do
    log_info "Checking $domain..."
    if nslookup "$domain" > /dev/null 2>&1; then
        log_success "$domain DNS is configured correctly"
    else
        log_warning "$domain DNS might not be propagated yet"
    fi
done

# Generate SSL certificates
log_info "Generating SSL certificates..."

# Method 1: Try standalone first (recommended when nginx is stopped)
log_info "Attempting standalone certificate generation..."
if certbot certonly --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$MAIN_DOMAIN" \
    -d "$WWW_DOMAIN" \
    -d "$API_DOMAIN" \
    -d "$ADMIN_DOMAIN" \
    -d "$APP_DOMAIN" \
    --non-interactive; then
    
    log_success "SSL certificates generated successfully!"
    
else
    log_warning "Standalone method failed. Trying individual domain certificates..."
    
    # Try each domain individually
    for domain in "$MAIN_DOMAIN" "$API_DOMAIN" "$WWW_DOMAIN"; do
        log_info "Generating certificate for $domain..."
        if certbot certonly --standalone \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$domain" \
            --non-interactive; then
            log_success "Certificate for $domain generated successfully!"
        else
            log_error "Failed to generate certificate for $domain"
        fi
    done
fi

# Create Nginx configuration for SSL
log_info "Creating Nginx SSL configuration..."

# Main domain configuration
cat > /etc/nginx/sites-available/patongboxingstadiumticket.com << 'EOL'
# Redirect HTTP to HTTPS for main domain
server {
    listen 80;
    server_name patongboxingstadiumticket.com www.patongboxingstadiumticket.com;
    return 301 https://patongboxingstadiumticket.com$request_uri;
}

# HTTPS configuration for main domain (frontend)
server {
    listen 443 ssl http2;
    server_name patongboxingstadiumticket.com www.patongboxingstadiumticket.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/patongboxingstadiumticket.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/patongboxingstadiumticket.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend application (adjust path as needed)
    root /var/www/patongboxingstadiumticket.com;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ @fallback;
    }

    location @fallback {
        # If frontend is not deployed yet, proxy to backend for testing
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
EOL

# API domain configuration
cat > /etc/nginx/sites-available/api-patongboxingstadiumticket.com << 'EOL'
# Redirect HTTP to HTTPS for API domain
server {
    listen 80;
    server_name api-patongboxingstadiumticket.com;
    return 301 https://api-patongboxingstadiumticket.com$request_uri;
}

# HTTPS configuration for API domain (backend)
server {
    listen 443 ssl http2;
    server_name api-patongboxingstadiumticket.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api-patongboxingstadiumticket.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api-patongboxingstadiumticket.com/privkey.pem;
    
    # If individual certificate failed, use main domain certificate
    # ssl_certificate /etc/letsencrypt/live/patongboxingstadiumticket.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/patongboxingstadiumticket.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS Headers for API
    add_header Access-Control-Allow-Origin "https://patongboxingstadiumticket.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    add_header Access-Control-Allow-Credentials true always;

    # Handle preflight requests
    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://patongboxingstadiumticket.com";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Access-Control-Allow-Credentials true;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        # Proxy to Node.js backend
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # File upload size
    client_max_body_size 10M;
}
EOL

# Enable sites
log_info "Enabling Nginx sites..."
ln -sf /etc/nginx/sites-available/patongboxingstadiumticket.com /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api-patongboxingstadiumticket.com /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
log_info "Testing Nginx configuration..."
if nginx -t; then
    log_success "Nginx configuration is valid"
else
    log_error "Nginx configuration has errors"
    exit 1
fi

# Start Nginx
log_info "Starting Nginx..."
systemctl start nginx
systemctl enable nginx

# Setup automatic certificate renewal
log_info "Setting up automatic certificate renewal..."
crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet --nginx"; } | crontab -

# Test certificate renewal
log_info "Testing certificate renewal..."
certbot renew --dry-run

log_success "SSL Certificate setup completed!"

# Display certificate information
log_info "Certificate information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for domain in "$MAIN_DOMAIN" "$API_DOMAIN"; do
    if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        echo "✅ Certificate for $domain:"
        openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -text -noout | grep -E "(Subject:|Not After)"
        echo "Certificate file: /etc/letsencrypt/live/$domain/fullchain.pem"
        echo
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test HTTPS endpoints
log_info "Testing HTTPS endpoints..."
sleep 5

test_urls=(
    "https://$MAIN_DOMAIN"
    "https://$API_DOMAIN/health"
    "https://$API_DOMAIN/api"
)

for url in "${test_urls[@]}"; do
    log_info "Testing $url..."
    if curl -f -s -k "$url" > /dev/null; then
        log_success "$url is accessible"
    else
        log_warning "$url might not be fully configured yet"
    fi
done

log_success "SSL setup completed! Your domains are now secured with HTTPS."
log_info "Next steps:"
echo "1. Deploy your backend application: cd /var/www/api-patongboxingstadiumticket.com && pm2 start ecosystem.config.js --env production"
echo "2. Deploy your frontend application to: /var/www/patongboxingstadiumticket.com"
echo "3. Test your domains:"
echo "   - https://patongboxingstadiumticket.com"
echo "   - https://api-patongboxingstadiumticket.com/health"
echo "   - https://api-patongboxingstadiumticket.com/api"
