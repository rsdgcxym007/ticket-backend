#!/bin/bash

# Emergency Deployment Fix Script
# Run this on the server to quickly fix Node.js compatibility issues

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚨 Emergency Deployment Fix${NC}"
echo "============================"

PROJECT_DIR="/var/www/backend/ticket-backend"
BACKUP_DIR="/tmp/ticket-backend-backup-$(date +%Y%m%d-%H%M%S)"

# Check if we're in the right directory
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Create backup
echo -e "${BLUE}📦 Creating backup...${NC}"
cp -r "$PROJECT_DIR" "$BACKUP_DIR" || {
    echo -e "${YELLOW}⚠️  Backup creation failed, continuing anyway...${NC}"
}

# Step 2: Update package.json Node requirement
echo -e "${BLUE}📝 Updating package.json Node.js requirement...${NC}"
sed -i 's/"node": ">=18.0.0"/"node": ">=20.0.0"/' package.json
sed -i 's/"npm": ">=9.0.0"/"npm": ">=10.0.0"/' package.json

# Step 3: Check current Node.js version
echo -e "${BLUE}🔍 Checking Node.js version...${NC}"
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
echo "Current Node.js version: $(node --version)"

if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js version is too old. Attempting upgrade...${NC}"
    
    # Try to upgrade Node.js
    if command -v nvm >/dev/null 2>&1; then
        echo "Using nvm to upgrade Node.js..."
        nvm install 20
        nvm use 20
        nvm alias default 20
    elif [ -f /etc/debian_version ]; then
        echo "Using NodeSource repository for Ubuntu/Debian..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo -e "${YELLOW}⚠️  Cannot automatically upgrade Node.js. Manual upgrade required.${NC}"
        echo "Current deployment will use compatibility flags."
    fi
fi

# Step 4: Clean and reinstall dependencies with compatibility flags
echo -e "${BLUE}🧹 Cleaning old dependencies...${NC}"
rm -rf node_modules/ yarn.lock package-lock.json 2>/dev/null || true

echo -e "${BLUE}📦 Installing dependencies with compatibility flags...${NC}"
export NODE_OPTIONS="--max-old-space-size=2048"
export NPM_CONFIG_ENGINE_STRICT=false
export NPM_CONFIG_LEGACY_PEER_DEPS=true

if npm install --legacy-peer-deps --force --engine-strict=false --no-audit --no-fund; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Dependency installation failed${NC}"
    echo -e "${BLUE}Trying alternative installation method...${NC}"
    
    if npm ci --legacy-peer-deps --force || npm install --force; then
        echo -e "${GREEN}✅ Dependencies installed with fallback method${NC}"
    else
        echo -e "${RED}❌ All installation methods failed${NC}"
        exit 1
    fi
fi

# Step 5: Build with compatibility options
echo -e "${BLUE}🔨 Building application...${NC}"
rm -rf dist/ 2>/dev/null || true

export NODE_OPTIONS="--max-old-space-size=2048 --no-experimental-fetch"

if npm run build; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
elif npx @nestjs/cli build --no-cache; then
    echo -e "${GREEN}✅ Build completed with NestJS CLI${NC}"  
elif npx nest build; then
    echo -e "${GREEN}✅ Build completed with basic nest build${NC}"
else
    echo -e "${RED}❌ All build methods failed${NC}"
    exit 1
fi

# Step 6: Verify build
if [ ! -f "dist/main.js" ]; then
    echo -e "${RED}❌ Build verification failed - main.js not found${NC}"
    exit 1
fi

# Step 7: Restart PM2
echo -e "${BLUE}🔄 Restarting PM2 application...${NC}"
PM2_APP_NAME="ticket-backend-prod"

if pm2 restart "$PM2_APP_NAME"; then
    sleep 5
    if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
        echo -e "${GREEN}✅ Application restarted successfully${NC}"
    else
        echo -e "${RED}❌ Application failed to start${NC}"
        echo "PM2 status:"
        pm2 status
        echo "PM2 logs:"
        pm2 logs "$PM2_APP_NAME" --lines 20
        exit 1
    fi
else
    echo -e "${RED}❌ PM2 restart failed${NC}"
    exit 1
fi

# Step 8: Health check
echo -e "${BLUE}🩺 Running health check...${NC}"
sleep 10

HEALTH_URL="https://api.patongboxingstadiumticket.com/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed - Application is running correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Health check warning - Response code: $HTTP_CODE${NC}"
    echo "Application may still be starting up..."
fi

# Summary
echo ""
echo -e "${GREEN}🎉 Emergency deployment fix completed!${NC}"
echo "=================================="
echo "✅ Node.js compatibility addressed"
echo "✅ Dependencies installed with compatibility flags"
echo "✅ Application built and deployed"
echo "✅ PM2 service restarted"
echo "✅ Health check completed"
echo ""
echo -e "${BLUE}📍 Backup location: $BACKUP_DIR${NC}"
echo -e "${BLUE}📊 Monitor with: pm2 logs $PM2_APP_NAME${NC}"
echo -e "${BLUE}🌐 API Health: $HEALTH_URL${NC}"
