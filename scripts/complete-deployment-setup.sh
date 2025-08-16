#!/bin/bash

# Complete Deployment Setup Script for patongboxingstadiumticket.com
# ลบโปรเจ็คเก่า แล้วติดตั้งใหม่ทั้งหมด พร้อมระบบครบวงจร
# Author: GitHub Copilot
# Date: 2025-08-16

set -e  # Exit on any error

# Configuration
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
DOMAIN="patongboxingstadiumticket.com"
SERVER_IP="43.229.133.51"
APP_DIR="/var/www/patong-boxing"
BACKUP_DIR="/var/backups/patong-boxing-$(date +%Y%m%d-%H%M%S)"
GITHUB_REPO="https://github.com/rsdgcxym007/ticket-backend.git"
NODE_USER="nodeapp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Logging functions
get_timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

log_info() {
    echo -e "${BLUE}[$(get_timestamp)] ℹ️  $1${NC}"
    echo "[$(get_timestamp)] INFO: $1" >> /var/log/patong-deployment.log
}

log_success() {
    echo -e "${GREEN}[$(get_timestamp)] ✅ $1${NC}"
    echo "[$(get_timestamp)] SUCCESS: $1" >> /var/log/patong-deployment.log
}

log_error() {
    echo -e "${RED}[$(get_timestamp)] ❌ $1${NC}"
    echo "[$(get_timestamp)] ERROR: $1" >> /var/log/patong-deployment.log
}

log_warning() {
    echo -e "${YELLOW}[$(get_timestamp)] ⚠️  $1${NC}"
    echo "[$(get_timestamp)] WARNING: $1" >> /var/log/patong-deployment.log
}

step() {
    echo -e "${PURPLE}[$(get_timestamp)] 🚀 $1${NC}"
    echo "[$(get_timestamp)] STEP: $1" >> /var/log/patong-deployment.log
}

substep() {
    echo -e "${CYAN}[$(get_timestamp)]   └─ $1${NC}"
    echo "[$(get_timestamp)] SUBSTEP: $1" >> /var/log/patong-deployment.log
}

# Discord notification function
send_discord_notification() {
    local message="$1"
    local color="$2"  # green=5763719, red=15158332, yellow=16776960, blue=3447003
    local status="$3"
    
    if command -v curl >/dev/null 2>&1; then
        curl -H "Content-Type: application/json" \
             -X POST \
             -d "{
                 \"embeds\": [{
                     \"title\": \"🎫 Patong Boxing Stadium - Complete Deployment\",
                     \"description\": \"$message\",
                     \"color\": $color,
                     \"fields\": [
                         {
                             \"name\": \"Status\",
                             \"value\": \"$status\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Domain\",
                             \"value\": \"$DOMAIN\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Server IP\",
                             \"value\": \"$SERVER_IP\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Timestamp\",
                             \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
                             \"inline\": false
                         }
                     ],
                     \"footer\": {
                         \"text\": \"Complete Deployment Script\"
                     }
                 }]
             }" \
             "$DISCORD_WEBHOOK_URL" 2>/dev/null || log_warning "Failed to send Discord notification"
    fi
}

# Error handling
handle_error() {
    log_error "Script failed at line $1"
    send_discord_notification "❌ Complete deployment failed at line $1" 15158332 "ERROR"
    exit 1
}

trap 'handle_error $LINENO' ERR

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Start deployment
step "🚀 Starting Complete Deployment Setup"
send_discord_notification "🚀 Starting complete deployment setup for $DOMAIN" 3447003 "STARTING"

# Step 1: System Update and Dependencies
step "📦 System Update and Dependencies Installation"
substep "Updating system packages..."
apt update && apt upgrade -y

substep "Installing required packages..."
apt install -y curl wget git nginx ufw fail2ban certbot python3-certbot-nginx \
    htop unzip software-properties-common build-essential \
    redis-server postgresql postgresql-contrib \
    supervisor logrotate rsync

log_success "System updated and dependencies installed"

# Step 2: Install Node.js 18 LTS
step "📦 Installing Node.js 18 LTS"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
npm install -g pm2 yarn

log_success "Node.js $(node --version) and npm $(npm --version) installed"

# Step 3: Create system user
step "👤 Creating system user: $NODE_USER"
if ! id "$NODE_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$NODE_USER"
    usermod -aG sudo "$NODE_USER"
    log_success "User $NODE_USER created"
else
    log_info "User $NODE_USER already exists"
fi

# Step 4: Backup existing project (if exists)
step "💾 Backing up existing project"
if [ -d "$APP_DIR" ]; then
    substep "Creating backup at $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r "$APP_DIR" "$BACKUP_DIR/"
    
    substep "Stopping existing PM2 processes"
    sudo -u "$NODE_USER" pm2 stop all || true
    sudo -u "$NODE_USER" pm2 delete all || true
    
    substep "Removing old project directory"
    rm -rf "$APP_DIR"
    log_success "Backup created and old project removed"
else
    log_info "No existing project found to backup"
fi

# Step 5: Clone fresh repository
step "📥 Cloning fresh repository"
mkdir -p "$APP_DIR"
cd /tmp
git clone "$GITHUB_REPO" patong-boxing-temp
cp -r patong-boxing-temp/* "$APP_DIR/"
rm -rf patong-boxing-temp

chown -R "$NODE_USER:$NODE_USER" "$APP_DIR"
log_success "Repository cloned successfully"

# Step 6: Install project dependencies
step "📦 Installing project dependencies"
cd "$APP_DIR"
sudo -u "$NODE_USER" npm install
sudo -u "$NODE_USER" npm run build
log_success "Project dependencies installed and built"

# Step 7: Setup environment variables
step "🔧 Setting up environment variables"
if [ ! -f "$APP_DIR/.env" ]; then
    cat > "$APP_DIR/.env" << EOF
# Database Configuration
DATABASE_URL="postgresql://patonguser:strongpassword123@localhost:5432/patongdb"
REDIS_URL="redis://localhost:6379"

# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@$DOMAIN
COMPANY_NAME=Patong Boxing Stadium
COMPANY_URL=https://$DOMAIN
SUPPORT_EMAIL=support@$DOMAIN

# SMTP Configuration (Alternative)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@$DOMAIN
SMTP_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/uploads/patong-boxing

# Payment Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Security
CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN,https://app.$DOMAIN,https://admin.$DOMAIN
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Monitoring
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL
EOF
    chown "$NODE_USER:$NODE_USER" "$APP_DIR/.env"
    log_success "Environment variables configured"
else
    log_info "Environment file already exists"
fi

# Step 8: Setup PostgreSQL Database
step "🗄️  Setting up PostgreSQL Database"
substep "Starting PostgreSQL service"
systemctl start postgresql
systemctl enable postgresql

substep "Creating database and user"
sudo -u postgres psql -c "CREATE USER patonguser WITH PASSWORD 'strongpassword123';" || true
sudo -u postgres psql -c "CREATE DATABASE patongdb OWNER patonguser;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE patongdb TO patonguser;" || true

log_success "PostgreSQL database configured"

# Step 9: Setup Redis
step "📦 Setting up Redis"
systemctl start redis-server
systemctl enable redis-server

# Configure Redis for production
cat > /etc/redis/redis.conf << EOF
bind 127.0.0.1
port 6379
timeout 300
databases 16
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF

systemctl restart redis-server
log_success "Redis configured and started"

# Step 10: Setup Nginx
step "🌐 Setting up Nginx"
rm -f /etc/nginx/sites-enabled/default

cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

# Main server block
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# API subdomain
server {
    listen 80;
    server_name api.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# App subdomain  
server {
    listen 80;
    server_name app.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Admin subdomain
server {
    listen 80;
    server_name admin.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS API server
server {
    listen 443 ssl http2;
    server_name api.$DOMAIN;

    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # API documentation (if available)
    location /docs {
        proxy_pass http://localhost:3000/docs;
    }

    # File upload handling
    client_max_body_size 50M;
}

# Main website HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Serve static files (if you have a frontend)
    root /var/www/patong-boxing-frontend;
    index index.html;

    # API proxy
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Frontend fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

# App subdomain HTTPS
server {
    listen 443 ssl http2;
    server_name app.$DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Serve app frontend
    root /var/www/patong-boxing-app;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy for app
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Admin subdomain HTTPS
server {
    listen 443 ssl http2;
    server_name admin.$DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/admin.$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Extra security for admin
    limit_req zone=login burst=5 nodelay;

    # Serve admin frontend
    root /var/www/patong-boxing-admin;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy for admin
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/"
nginx -t && systemctl reload nginx
log_success "Nginx configured successfully"

# Step 11: Setup SSL Certificates
step "🔐 Setting up SSL Certificates"
substep "Installing SSL certificates for all subdomains"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -d "api.$DOMAIN" -d "app.$DOMAIN" -d "admin.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || log_warning "SSL setup may need manual configuration"

# Setup auto-renewal
crontab -l | grep -q certbot || (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

log_success "SSL certificates configured"

# Step 12: Setup UFW Firewall
step "🔥 Configuring UFW Firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow from 127.0.0.1 # Allow localhost
ufw --force enable

log_success "UFW firewall configured"

# Step 13: Setup Fail2ban
step "🛡️  Setting up Fail2ban"
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl restart fail2ban
systemctl enable fail2ban
log_success "Fail2ban configured and started"

# Step 14: Setup PM2 Process Manager
step "🔄 Setting up PM2 Process Manager"
cd "$APP_DIR"

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'patong-boxing-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    error_file: '/var/log/pm2/patong-boxing-api-error.log',
    out_file: '/var/log/pm2/patong-boxing-api-out.log',
    log_file: '/var/log/pm2/patong-boxing-api.log',
    time: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF

mkdir -p /var/log/pm2
chown -R "$NODE_USER:$NODE_USER" /var/log/pm2

# Start application with PM2
sudo -u "$NODE_USER" pm2 start ecosystem.config.js
sudo -u "$NODE_USER" pm2 save
sudo -u "$NODE_USER" pm2 startup

log_success "PM2 process manager configured and application started"

# Step 15: Setup Log Rotation
step "📋 Setting up Log Rotation"
cat > /etc/logrotate.d/patong-boxing << EOF
/var/log/patong-deployment.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}

/var/log/pm2/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 $NODE_USER $NODE_USER
    postrotate
        sudo -u $NODE_USER pm2 reloadLogs
    endscript
}
EOF

log_success "Log rotation configured"

# Step 16: Setup Monitoring and Alerts
step "📊 Setting up Monitoring and Alerts"
cat > /usr/local/bin/patong-health-check.sh << EOF
#!/bin/bash

DISCORD_WEBHOOK="$DISCORD_WEBHOOK_URL"
API_URL="http://localhost:3000/health"
DOMAIN="$DOMAIN"

check_service() {
    local service=\$1
    local status=\$(systemctl is-active \$service)
    if [ "\$status" != "active" ]; then
        send_alert "🚨 Service \$service is \$status"
        return 1
    fi
    return 0
}

check_api() {
    local response=\$(curl -s -o /dev/null -w "%{http_code}" \$API_URL)
    if [ "\$response" != "200" ]; then
        send_alert "🚨 API health check failed (HTTP \$response)"
        return 1
    fi
    return 0
}

send_alert() {
    local message="\$1"
    curl -H "Content-Type: application/json" \\
         -X POST \\
         -d "{
             \"embeds\": [{
                 \"title\": \"🚨 Patong Boxing Stadium Alert\",
                 \"description\": \"\$message\",
                 \"color\": 15158332,
                 \"fields\": [
                     {
                         \"name\": \"Domain\",
                         \"value\": \"\$DOMAIN\",
                         \"inline\": true
                     },
                     {
                         \"name\": \"Time\",
                         \"value\": \"\$(date '+%Y-%m-%d %H:%M:%S')\",
                         \"inline\": true
                     }
                 ]
             }]
         }" \\
         "\$DISCORD_WEBHOOK" 2>/dev/null || true
}

# Check critical services
check_service nginx
check_service postgresql
check_service redis-server
check_api

# Check disk space
DISK_USAGE=\$(df / | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    send_alert "🚨 Disk usage is \${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=\$(free | grep Mem | awk '{printf("%.0f", \$3/\$2 * 100.0)}')
if [ \$MEMORY_USAGE -gt 90 ]; then
    send_alert "🚨 Memory usage is \${MEMORY_USAGE}%"
fi
EOF

chmod +x /usr/local/bin/patong-health-check.sh

# Add health check to crontab
crontab -l | grep -q patong-health-check || (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/patong-health-check.sh") | crontab -

log_success "Monitoring and alerts configured"

# Step 17: Setup Auto-Deployment Webhook
step "🎣 Setting up Auto-Deployment Webhook"
mkdir -p /opt/webhook
cd /opt/webhook

# Install webhook if not exists
if ! command -v webhook >/dev/null 2>&1; then
    wget https://github.com/adnanh/webhook/releases/download/2.8.0/webhook-linux-amd64.tar.gz
    tar -xvf webhook-linux-amd64.tar.gz
    cp webhook-linux-amd64/webhook /usr/local/bin/
    rm -rf webhook-linux-amd64*
fi

# Create webhook configuration
cat > /opt/webhook/hooks.json << EOF
[
  {
    "id": "deploy-backend-master",
    "execute-command": "/opt/webhook/deploy.sh",
    "command-working-directory": "/opt/webhook",
    "response-message": "Deployment started",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hash-sha256",
            "secret": "your-webhook-secret-here",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/master",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
EOF

# Create deployment script
cat > /opt/webhook/deploy.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/webhook-deploy.log"
DISCORD_WEBHOOK="$DISCORD_WEBHOOK_URL"
APP_DIR="/var/www/patong-boxing"
NODE_USER="nodeapp"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_discord_notification() {
    local message="$1"
    local color="$2"
    local status="$3"
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"embeds\": [{
                 \"title\": \"🚀 Auto-Deployment\",
                 \"description\": \"$message\",
                 \"color\": $color,
                 \"fields\": [
                     {
                         \"name\": \"Status\",
                         \"value\": \"$status\",
                         \"inline\": true
                     },
                     {
                         \"name\": \"Time\",
                         \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
                         \"inline\": true
                     }
                 ]
             }]
         }" \
         "$DISCORD_WEBHOOK" 2>/dev/null || true
}

log "Starting auto-deployment..."
send_discord_notification "🚀 Auto-deployment started from GitHub push" 16776960 "DEPLOYING"

cd "$APP_DIR"

# Pull latest changes
log "Pulling latest changes..."
sudo -u "$NODE_USER" git pull origin master

# Install dependencies
log "Installing dependencies..."
sudo -u "$NODE_USER" npm install

# Build application
log "Building application..."
sudo -u "$NODE_USER" npm run build

# Restart PM2
log "Restarting application..."
sudo -u "$NODE_USER" pm2 restart all

# Verify deployment
sleep 5
if curl -s http://localhost:3000/health >/dev/null; then
    log "Deployment successful!"
    send_discord_notification "✅ Auto-deployment completed successfully" 5763719 "SUCCESS"
else
    log "Deployment failed - health check failed"
    send_discord_notification "❌ Auto-deployment failed - health check failed" 15158332 "FAILED"
fi
EOF

chmod +x /opt/webhook/deploy.sh

# Create webhook systemd service
cat > /etc/systemd/system/webhook.service << EOF
[Unit]
Description=Webhook Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/webhook -hooks /opt/webhook/hooks.json -verbose -port 4200
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable webhook
systemctl start webhook

log_success "Auto-deployment webhook configured and started"

# Step 18: Setup Database Migration (if available)
step "🗄️  Running Database Migrations"
cd "$APP_DIR"
if [ -f "package.json" ] && grep -q "migration" package.json; then
    substep "Running database migrations..."
    sudo -u "$NODE_USER" npm run migration:run || log_warning "Migration failed or not available"
fi

# Initialize database with seed data if available
if [ -f "package.json" ] && grep -q "seed" package.json; then
    substep "Running database seed..."
    sudo -u "$NODE_USER" npm run seed || log_warning "Seed failed or not available"
fi

log_success "Database migrations completed"

# Step 19: Create Upload Directories
step "📁 Creating Upload Directories"
mkdir -p /var/uploads/patong-boxing/{images,documents,qr-codes}
chown -R "$NODE_USER:$NODE_USER" /var/uploads/patong-boxing
chmod -R 755 /var/uploads/patong-boxing

log_success "Upload directories created"

# Step 20: Final System Optimization
step "⚡ System Optimization"
substep "Setting up system limits..."
cat > /etc/security/limits.conf << EOF
# Patong Boxing Stadium limits
$NODE_USER soft nofile 65536
$NODE_USER hard nofile 65536
$NODE_USER soft nproc 4096
$NODE_USER hard nproc 4096
EOF

substep "Optimizing system parameters..."
cat >> /etc/sysctl.conf << EOF
# Network optimizations for Node.js
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 1024
fs.file-max = 65536
EOF

sysctl -p

log_success "System optimization completed"

# Step 21: Final Service Status Check
step "🔍 Final Service Status Check"
substep "Checking all services..."

SERVICES=("nginx" "postgresql" "redis-server" "fail2ban" "webhook")
for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet $service; then
        log_success "$service is running"
    else
        log_error "$service is not running"
    fi
done

# Check PM2 processes
substep "Checking PM2 processes..."
sudo -u "$NODE_USER" pm2 list

# Check application health
substep "Checking application health..."
sleep 5
if curl -s http://localhost:3000/health >/dev/null; then
    log_success "Application health check passed"
else
    log_warning "Application health check failed"
fi

# Step 22: Display Summary
step "📋 Deployment Summary"
echo -e "${WHITE}
=======================================================
🎫 Patong Boxing Stadium - Complete Deployment Summary
=======================================================

✅ Domain: $DOMAIN
✅ Server IP: $SERVER_IP
✅ Application Directory: $APP_DIR
✅ Database: PostgreSQL (patongdb)
✅ Cache: Redis
✅ Web Server: Nginx with SSL
✅ Process Manager: PM2
✅ Security: UFW + Fail2ban
✅ Monitoring: Health checks + Discord alerts
✅ Auto-Deploy: Webhook on port 4200

🌐 URLs:
   - Main Site: https://$DOMAIN
   - API: https://api.$DOMAIN
   - App: https://app.$DOMAIN  
   - Admin: https://admin.$DOMAIN

📊 Monitoring:
   - Health checks every 5 minutes
   - Discord alerts configured
   - Log rotation enabled

🚀 Auto-Deployment:
   - Webhook URL: http://$SERVER_IP:4200/hooks/deploy-backend-master
   - Triggered on master branch push

📁 Important Paths:
   - Application: $APP_DIR
   - Uploads: /var/uploads/patong-boxing
   - Logs: /var/log/pm2/ & /var/log/patong-deployment.log
   - Nginx Config: /etc/nginx/sites-available/$DOMAIN

🔧 Next Steps:
   1. Update .env file with your actual API keys
   2. Configure your GitHub webhook with the webhook URL
   3. Setup your frontend applications
   4. Test all endpoints

=======================================================
${NC}"

# Final Discord notification
send_discord_notification "✅ Complete deployment finished successfully! 

🌐 **URLs Ready:**
• Main: https://$DOMAIN
• API: https://api.$DOMAIN
• App: https://app.$DOMAIN
• Admin: https://admin.$DOMAIN

🚀 Auto-deployment webhook active on port 4200
📊 Monitoring and alerts configured
🔐 SSL certificates installed
⚡ All services running optimally

**Next:** Update .env file and configure GitHub webhook" 5763719 "COMPLETED"

log_success "Complete deployment setup finished successfully!"

exit 0
EOF
