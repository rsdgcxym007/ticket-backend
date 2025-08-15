#!/bin/bash

# 🎯 Local Development Deploy Script
# Deploy จาก local machine ไปยัง production server

set -e

# Configuration
SERVER_IP="43.229.133.51"
SERVER_USER="root"  # หรือ deployment user
PROJECT_DIR="/var/www/api-patongboxingstadiumticket.com"
APP_NAME="patong-boxing-stadium"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🎯 Deploy from Local to Production Server"
echo "Server: $SERVER_IP"
echo "Project: $PROJECT_DIR"
echo "============================================"

# Check if we have SSH access
log_info "Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP "echo 'SSH connection successful'" > /dev/null 2>&1; then
    log_error "Cannot connect to server. Please check:"
    echo "1. Server IP: $SERVER_IP"
    echo "2. SSH key is configured"
    echo "3. Server is accessible"
    exit 1
fi

log_success "SSH connection verified"

# Build locally first
log_info "Building project locally..."
npm ci
npm run build

# Create deployment package
log_info "Creating deployment package..."
DEPLOY_PACKAGE="/tmp/deploy-$(date +%Y%m%d_%H%M%S).tar.gz"

tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='uploads' \
    --exclude='.env.development' \
    --exclude='*.log' \
    -czf $DEPLOY_PACKAGE \
    . 

log_success "Deployment package created: $DEPLOY_PACKAGE"

# Upload to server
log_info "Uploading to server..."
scp $DEPLOY_PACKAGE $SERVER_USER@$SERVER_IP:/tmp/

# Extract and deploy on server
log_info "Deploying on server..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
set -e

APP_NAME="patong-boxing-stadium"
PROJECT_DIR="/var/www/api-patongboxingstadiumticket.com"
DEPLOY_PACKAGE=$(ls -t /tmp/deploy-*.tar.gz | head -1)

echo "📦 Extracting deployment package..."
sudo mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Create backup
if [ -d "dist" ]; then
    echo "🗄️ Creating backup..."
    sudo tar -czf "/var/backups/pre-deploy-backup-$(date +%Y%m%d_%H%M%S).tar.gz" dist/ .env.production 2>/dev/null || true
fi

# Extract new version
echo "📋 Extracting new version..."
sudo tar -xzf $DEPLOY_PACKAGE
sudo chown -R $(whoami):$(whoami) .

# Install dependencies (production only)
echo "📦 Installing dependencies..."
npm ci --production

# Check if .env.production exists, if not create it
if [ ! -f ".env.production" ]; then
    echo "⚙️ Creating .env.production..."
    cat > .env.production << 'ENVEOF'
NODE_ENV=production
PORT=4000
APP_URL=https://api-patongboxingstadiumticket.com
FRONTEND_URL=https://patongboxingstadiumticket.com
BACKEND_URL=https://api-patongboxingstadiumticket.com
API_URL=https://api-patongboxingstadiumticket.com/api

DATABASE_HOST=43.229.133.51
DATABASE_PORT=5432
DATABASE_USERNAME=boxing_user
DATABASE_PASSWORD=Password123!
DATABASE_NAME=patong_boxing_stadium
DATABASE_SSL=false
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false

REDIS_HOST=43.229.133.51
REDIS_PORT=6379

JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_EXPIRES_IN=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=info@patongboxingstadiumticket.com
EMAIL_FROM_NAME=Patong Boxing Stadium

NUXT_PUBLIC_APP_URL=https://patongboxingstadiumticket.com
NUXT_PUBLIC_API_BASE_URL=https://api-patongboxingstadiumticket.com

SWAGGER_ENABLED=true
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
ENVEOF
    echo "⚠️ Please update email credentials in .env.production"
fi

# Run migrations
echo "🗃️ Running migrations..."
npm run migration:run 2>/dev/null || echo "⚠️ No migrations to run"

# Restart PM2
echo "🔄 Restarting PM2..."
if pm2 describe $APP_NAME > /dev/null 2>&1; then
    pm2 restart $APP_NAME
else
    pm2 start ecosystem.config.js --env production
fi

pm2 save

# Quick health check
echo "🏥 Health check..."
sleep 5
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ API is responding"
else
    echo "❌ API not responding"
    pm2 logs $APP_NAME --lines 20
fi

# Clean up
rm -f $DEPLOY_PACKAGE

echo "🎉 Deployment completed on server!"
EOF

# Clean up local deployment package
rm -f $DEPLOY_PACKAGE

log_success "🎉 Deployment completed successfully!"

# Show server status
log_info "Getting server status..."
ssh $SERVER_USER@$SERVER_IP "pm2 status"

echo ""
echo "🔗 Test your deployment:"
echo "• https://api-patongboxingstadiumticket.com/health"
echo "• https://api-patongboxingstadiumticket.com/api"

echo ""
echo "📋 Remote commands:"
echo "• Check logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs $APP_NAME'"
echo "• Restart API: ssh $SERVER_USER@$SERVER_IP 'pm2 restart $APP_NAME'"
echo "• Server status: ssh $SERVER_USER@$SERVER_IP 'pm2 status'"
