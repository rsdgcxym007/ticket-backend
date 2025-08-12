#!/bin/bash

# Webhook Auto-Deployment Script for Stadium Backend
# This script is called automatically when webhook receives GitHub push

set -e  # Exit on any error

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
BRANCH="feature/newfunction"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
WEBHOOK_URL="http://43.229.133.51:4000/api/v1/webhook/deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}🤖 AUTO-DEPLOY: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ AUTO-DEPLOY: $1${NC}"
}

print_error() {
    echo -e "${RED}❌ AUTO-DEPLOY: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  AUTO-DEPLOY: $1${NC}"
}

# Function to send webhook notification
send_webhook_notification() {
    local status="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    curl -s -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"status\": \"$status\",
             \"message\": \"[AUTO] $message\",
             \"branch\": \"$BRANCH\",
             \"commit\": \"$(git rev-parse HEAD 2>/dev/null || echo 'unknown')\",
             \"timestamp\": \"$timestamp\",
             \"environment\": \"production\",
             \"version\": \"auto-deploy\"
         }" \
         "$WEBHOOK_URL" 2>/dev/null || true
}

# Change to project directory
cd "$PROJECT_DIR" || {
    print_error "Failed to change to project directory: $PROJECT_DIR"
    send_webhook_notification "failed" "Failed to access project directory"
    exit 1
}

print_status "Starting auto-deployment from webhook..."
send_webhook_notification "started" "🤖 Auto-deployment initiated from GitHub webhook"

# Check if git repo exists
if [ ! -d ".git" ]; then
    print_error "Not a git repository: $PROJECT_DIR"
    send_webhook_notification "failed" "Project directory is not a git repository"
    exit 1
fi

print_status "Step 1: Pulling latest changes from GitHub..."
if ! git fetch origin; then
    print_error "Failed to fetch from origin"
    send_webhook_notification "failed" "Failed to fetch latest changes from GitHub"
    exit 1
fi

if ! git checkout "$BRANCH"; then
    print_error "Failed to checkout branch: $BRANCH"
    send_webhook_notification "failed" "Failed to checkout branch $BRANCH"
    exit 1
fi

if ! git pull origin "$BRANCH"; then
    print_error "Failed to pull from branch: $BRANCH"
    send_webhook_notification "failed" "Failed to pull latest changes"
    exit 1
fi

print_success "Code updated successfully"

print_status "Step 2: Installing dependencies..."
if ! npm ci --production=false; then
    print_error "Failed to install dependencies"
    send_webhook_notification "failed" "npm install failed"
    exit 1
fi

print_status "Step 3: Building application..."
if ! npm run build; then
    print_error "Build failed"
    send_webhook_notification "failed" "Build process failed"
    exit 1
fi

# Verify the build
if [ ! -f "dist/main.js" ]; then
    print_error "Build verification failed: dist/main.js not found"
    send_webhook_notification "failed" "Build verification failed"
    exit 1
fi

print_success "Build completed successfully"

print_status "Step 4: Restarting application with PM2..."
if ! pm2 restart ticket-backend-prod; then
    print_warning "PM2 restart failed, attempting to start fresh..."
    
    # Stop and delete if exists
    pm2 stop ticket-backend-prod 2>/dev/null || true
    pm2 delete ticket-backend-prod 2>/dev/null || true
    
    # Start fresh
    if ! pm2 start ecosystem.config.js --env production; then
        print_error "Failed to start application"
        send_webhook_notification "failed" "Failed to restart application"
        exit 1
    fi
fi

print_status "Step 5: Verifying deployment..."
sleep 5

# Check if application is running
if pm2 describe ticket-backend-prod | grep -q "online"; then
    print_success "Application is running successfully"
else
    print_error "Application failed to start"
    send_webhook_notification "failed" "Application failed to start after deployment"
    exit 1
fi

# Get deployment info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')

print_success "Auto-deployment completed successfully!"
print_status "Commit: ${COMMIT_HASH:0:8}"
print_status "Message: $COMMIT_MSG"
print_status "Time: $DEPLOY_TIME"

send_webhook_notification "success" "🎉 Auto-deployment completed successfully! Commit: ${COMMIT_HASH:0:8}"

# Optional: Run post-deployment health check
print_status "Step 6: Running health check..."
sleep 3

if curl -f -s http://localhost:3001/api/health >/dev/null; then
    print_success "Health check passed"
    send_webhook_notification "success" "✅ Health check passed - Application is healthy"
else
    print_warning "Health check failed, but deployment completed"
    send_webhook_notification "warning" "⚠️ Deployment completed but health check failed"
fi

print_success "🤖 Auto-deployment process completed!"
echo "=============================================="
echo "📊 Deployment Summary:"
echo "   Branch: $BRANCH"
echo "   Commit: ${COMMIT_HASH:0:8}"
echo "   Time: $DEPLOY_TIME"
echo "   Status: ✅ SUCCESS"
echo "=============================================="
