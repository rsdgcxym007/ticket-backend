#!/bin/bash

# Emergency Fix Script for ticket-backend
# Use this when npm install fails or deployment is stuck

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}🔧 EMERGENCY FIX: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ EMERGENCY FIX: $1${NC}"
}

print_error() {
    echo -e "${RED}❌ EMERGENCY FIX: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  EMERGENCY FIX: $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Starting emergency fix process..."

# Step 1: Kill any hanging npm processes
print_status "Step 1: Killing hanging npm processes..."
pkill -f npm || true
pkill -f node || true
sleep 2

# Step 2: Force stop PM2 processes
print_status "Step 2: Force stopping PM2 processes..."
pm2 kill 2>/dev/null || true
sleep 2

# Step 3: Clean everything
print_status "Step 3: Deep cleaning npm and node_modules..."
rm -rf node_modules/
rm -f package-lock.json
rm -f yarn.lock
rm -rf .npm/
rm -rf ~/.npm/_cacache/
npm cache clean --force
npm cache verify

# Step 4: Remove problematic directories
print_status "Step 4: Removing problematic build artifacts..."
rm -rf dist/
rm -rf build/
rm -f tsconfig.build.tsbuildinfo
rm -rf .next/ 2>/dev/null || true

# Step 5: Clear PM2 logs and data
print_status "Step 5: Clearing PM2 data..."
rm -rf ~/.pm2/logs/* 2>/dev/null || true
pm2 flush 2>/dev/null || true

# Step 6: Reinstall dependencies with different strategies
print_status "Step 6: Reinstalling dependencies..."

# Try npm install with different flags
if npm install --no-audit --no-fund --legacy-peer-deps; then
    print_success "Dependencies installed successfully with legacy peer deps"
elif npm install --no-audit --no-fund --force; then
    print_success "Dependencies installed successfully with force flag"
elif npm ci --legacy-peer-deps; then
    print_success "Dependencies installed successfully with npm ci"
else
    print_error "All npm install attempts failed"
    print_warning "Trying yarn as fallback..."
    
    # Try yarn as fallback
    if command -v yarn >/dev/null 2>&1; then
        yarn install --ignore-engines
        print_success "Dependencies installed successfully with yarn"
    else
        print_error "Yarn not available. Manual intervention required."
        exit 1
    fi
fi

# Step 7: Build the application
print_status "Step 7: Building the application..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Step 8: Start PM2
print_status "Step 8: Starting PM2 application..."
pm2 start ecosystem.config.js --env production
sleep 5

# Step 9: Check status
print_status "Step 9: Checking application status..."
pm2 status

if pm2 list | grep -q "ticket-backend-prod.*online"; then
    print_success "✅ Emergency fix completed! Application is running."
    print_status "You can check logs with: pm2 logs ticket-backend-prod"
else
    print_error "Application is not running properly"
    print_warning "Check PM2 logs for details: pm2 logs ticket-backend-prod"
    exit 1
fi

print_success "🎉 Emergency fix process completed successfully!"
