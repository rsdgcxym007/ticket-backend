#!/bin/bash
# Production Security Setup Script for patongboxingstadiumticket.com
# Author: GitHub Copilot - Safe Production Deployment
# Date: 2025-08-16

set -e  # Exit on any error

echo "🔐 Starting Production Security Setup..."

# Step 1: Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install required packages
echo "📦 Installing security packages..."
apt install -y nginx ufw fail2ban certbot python3-certbot-nginx htop curl wget unzip

# Step 3: Create non-root user for Node app
echo "👤 Creating secure user for Node application..."
if ! id "nodeapp" &>/dev/null; then
    useradd -m -s /bin/bash nodeapp
    usermod -aG sudo nodeapp
    echo "nodeapp user created"
fi

# Step 4: Setup UFW Firewall (strict rules)
echo "🔥 Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
ufw status verbose

# Step 5: Setup fail2ban
echo "🛡️ Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Step 6: Create secure nginx configuration
echo "🌐 Creating secure nginx configuration..."
cat > /etc/nginx/sites-available/patong-secure << 'EOF'
# Secure configuration for patongboxingstadiumticket.com
server {
    listen 80;
    server_name patongboxingstadiumticket.com www.patongboxingstadiumticket.com api.patongboxingstadiumticket.com app.patongboxingstadiumticket.com admin.patongboxingstadiumticket.com;
    
    # Force HTTPS redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name patongboxingstadiumticket.com www.patongboxingstadiumticket.com api.patongboxingstadiumticket.com app.patongboxingstadiumticket.com admin.patongboxingstadiumticket.com;

    # SSL Configuration (will be updated by certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/patong.access.log;
    error_log /var/log/nginx/patong.error.log;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/m;

    # Hide nginx version
    server_tokens off;

    # Main proxy to Node.js app
    location / {
        # Rate limiting for general requests
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:4000;
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

    # Strict rate limiting for login endpoints
    location ~* \/(login|auth|signin) {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~* \.(env|log|ini|conf|bak|old)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Enable our secure site
ln -sf /etc/nginx/sites-available/patong-secure /etc/nginx/sites-enabled/patong-secure

# Test nginx configuration
nginx -t

# Step 7: Setup PM2 with proper user
echo "⚙️ Configuring PM2 for nodeapp user..."
# Note: This should be run as nodeapp user, not root

# Step 8: Start services
echo "🚀 Starting services..."
systemctl restart nginx
systemctl enable nginx

echo "✅ Security setup completed!"
echo ""
echo "📋 Next steps to run manually:"
echo "1. Switch to nodeapp user: sudo su - nodeapp"
echo "2. Setup PM2: npm install -g pm2"
echo "3. Start your app: pm2 start /var/www/patong-boxing/backend/dist/main.js --name patong-api"
echo "4. Save PM2 config: pm2 save && pm2 startup"
echo "5. Get SSL certificates: sudo certbot --nginx -d patongboxingstadiumticket.com -d www.patongboxingstadiumticket.com -d api.patongboxingstadiumticket.com"
echo ""
echo "🔐 Security features enabled:"
echo "- UFW Firewall (strict rules)"
echo "- fail2ban (brute force protection)"
echo "- nginx reverse proxy"
echo "- Security headers"
echo "- Rate limiting"
echo "- SSL/HTTPS ready"
echo ""
echo "⚠️ IMPORTANT: Change SSH port and setup key-based auth for maximum security!"
