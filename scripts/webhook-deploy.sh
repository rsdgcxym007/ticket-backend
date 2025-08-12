#!/bin/bash

# Webhook Auto-Deployment Script for Stadium Backend
# This script is called automatically when webhook receives GitHub push

set -e  # Exit on any error

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
BRANCH="feature/newfunction"
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

# Cleanup function for emergency recovery
cleanup_and_recovery() {
    print_warning "🚨 EMERGENCY CLEANUP: Starting recovery procedures..."
    
    cd "$PROJECT_DIR" || return 1
    
    # Kill any hanging npm processes
    print_status "Killing hanging npm/node processes..."
    pkill -f npm || true
    pkill -f node || true
    
    # Remove corrupted node_modules
    if [ -d "node_modules" ]; then
        print_status "Removing corrupted node_modules..."
        rm -rf node_modules
    fi
    
    # Clear npm cache
    print_status "Clearing npm cache..."
    npm cache clean --force || true
    
    # Reset git to clean state
    print_status "Resetting git to clean state..."
    git reset --hard HEAD || true
    git clean -fd || true
    
    # Stop any running PM2 processes
    print_status "Stopping PM2 processes..."
    pm2 stop all || true
    pm2 delete all || true
    
    print_success "Emergency cleanup completed"
}

# Trap for emergency cleanup on script interruption
trap 'cleanup_and_recovery; exit 1' INT TERM

# Function to send notification to our webhook endpoint (which handles Discord)
send_notification() {
    local status="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local commit_hash=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
    
    # Skip notifications if running from webhook controller (prevents loops)
    if [ "$SKIP_NOTIFICATIONS" = "true" ]; then
        print_status "Skipping notification (controlled by webhook)"
        return 0
    fi
    
    curl -s -H "Content-Type: application/json" \
         -H "User-Agent: ticket-backend-deploy-script/1.0" \
         -X POST \
         -d "{
             \"status\": \"$status\",
             \"message\": \"[AUTO] $message\",
             \"branch\": \"$BRANCH\",
             \"commit\": \"${commit_hash:0:8}\",
             \"timestamp\": \"$timestamp\",
             \"environment\": \"production\",
             \"source\": \"webhook-deploy\"
         }" \
         "$WEBHOOK_URL" 2>/dev/null || true
}

# Change to project directory
cd "$PROJECT_DIR" || {
    print_error "Failed to change to project directory: $PROJECT_DIR"
    send_notification "failed" "Failed to access project directory: $PROJECT_DIR"
    exit 1
}

print_status "Starting auto-deployment from webhook..."
send_notification "started" "🤖 Auto-deployment initiated from GitHub webhook"

# Check if git repo exists
if [ ! -d ".git" ]; then
    print_error "Not a git repository: $PROJECT_DIR"
    send_notification "failed" "Project directory is not a git repository"
    exit 1
fi

print_status "Step 1: Pulling latest changes from GitHub..."
if ! git fetch origin; then
    print_error "Failed to fetch from origin"
    send_notification "failed" "Failed to fetch latest changes from GitHub"
    exit 1
fi

if ! git checkout "$BRANCH"; then
    print_error "Failed to checkout branch: $BRANCH"
    send_notification "failed" "Failed to checkout branch $BRANCH"
    exit 1
fi

# Handle potential merge conflicts by stashing local changes
print_status "Checking for local changes..."
if ! git diff --quiet || ! git diff --cached --quiet; then
    print_warning "Local changes detected, stashing them..."
    git stash push -m "auto-deploy-stash-$(date +%Y%m%d-%H%M%S)"
fi

# Reset to clean state if needed
if ! git reset --hard origin/"$BRANCH" 2>/dev/null; then
    print_warning "Reset failed, trying fetch and reset..."
    git fetch origin "$BRANCH"
    git reset --hard origin/"$BRANCH"
fi

if ! git pull origin "$BRANCH"; then
    print_error "Failed to pull from branch: $BRANCH"
    send_notification "failed" "Failed to pull latest changes"
    exit 1
fi

print_success "Code updated successfully"

print_status "Step 2: Running comprehensive build and deployment..."
# Use the more robust build-and-deploy script instead of basic npm commands
if [ -f "scripts/build-and-deploy.sh" ]; then
    print_status "Using build-and-deploy.sh for robust deployment..."
    chmod +x scripts/build-and-deploy.sh
    SKIP_NOTIFICATIONS=true ./scripts/build-and-deploy.sh
else
    print_warning "build-and-deploy.sh not found, falling back to basic build..."
    
    print_status "Installing dependencies..."
    if ! npm ci --production=false; then
        print_error "Failed to install dependencies"
        send_notification "failed" "npm install failed"
        exit 1
    fi

    print_status "Building application..."
    if ! npm run build; then
        print_error "Build failed"
        send_notification "failed" "Build process failed"
        exit 1
    fi

    # Verify the build
    if [ ! -f "dist/main.js" ]; then
        print_error "Build verification failed: dist/main.js not found"
        send_notification "failed" "Build verification failed"
        exit 1
    fi

    print_success "Build completed successfully"

    print_status "Restarting application with PM2..."
    pm2 stop ticket-backend-prod 2>/dev/null || true
    pm2 delete ticket-backend-prod 2>/dev/null || true
    pm2 start ecosystem.config.js --env production

# Wait for PM2 to stabilize
sleep 5

print_status "Step 3: Checking deployment status..."
# Check PM2 status
pm2 list | grep ticket-backend-prod > /dev/null
if [ $? -eq 0 ]; then
    print_success "Application is running successfully"
    send_notification "success" "🎉 Auto-deployment completed successfully! Application is online."
else
    print_error "Application failed to start"
    send_notification "failed" "Application failed to start after deployment"
    exit 1
fi
else
    print_warning "Graceful restart failed, attempting force restart..."
    
    # Force stop and delete if exists
    pm2 stop ticket-backend-prod --force 2>/dev/null || true
    pm2 delete ticket-backend-prod --force 2>/dev/null || true
    
    # Start fresh with timeout
    print_status "Starting fresh PM2 process..."
    if timeout 60s pm2 start ecosystem.config.js --env production; then
        print_success "Fresh PM2 start successful"
    else
        print_error "Failed to start application with PM2"
        send_notification "failed" "Failed to restart application - PM2 timeout"
        exit 1
    fi
fi

print_status "Step 5: Verifying deployment..."
sleep 3

# Check if application is running with timeout
RETRY_COUNT=0
MAX_RETRIES=10
APP_RUNNING=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if pm2 describe ticket-backend-prod 2>/dev/null | grep -q "online"; then
        print_success "Application is running successfully"
        APP_RUNNING=true
        break
    else
        print_status "Waiting for application to start... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        sleep 3
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ "$APP_RUNNING" = false ]; then
    print_error "Application failed to start after $MAX_RETRIES attempts"
    
    # Show recent logs for debugging
    print_error "Recent PM2 logs:"
    pm2 logs ticket-backend-prod --lines 10 --nostream 2>/dev/null || true
    
    send_notification "failed" "Application failed to start after deployment - timeout after ${MAX_RETRIES} attempts"
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

send_notification "success" "🎉 Auto-deployment completed successfully! Commit: ${COMMIT_HASH:0:8}"

# Optional: Run post-deployment health check
print_status "Step 6: Running health check..."
sleep 2

# Check application health with shorter timeout
HEALTH_URL="http://43.229.133.51:4000/api/v1"
HEALTH_STATUS="unknown"

print_status "Testing application health at $HEALTH_URL"
if timeout 10s curl -f -s "$HEALTH_URL" >/dev/null 2>&1; then
    print_success "Health check passed - Application is responding"
    HEALTH_STATUS="healthy"
elif timeout 10s curl -f -s "http://43.229.133.51:4000" >/dev/null 2>&1; then
    print_success "Application is responding (alternate endpoint)"
    HEALTH_STATUS="responding"
else
    print_warning "Health check failed, but deployment was successful"
    HEALTH_STATUS="deployed"
fi

# Final success notification with complete status
FINAL_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
send_notification "completed" "✅ Auto-deployment workflow completed! Status: $HEALTH_STATUS, Time: $FINAL_TIMESTAMP"

print_success "=== AUTO-DEPLOYMENT COMPLETED ==="
print_status "Summary:"
print_status "- Commit: ${COMMIT_HASH:0:8}"
print_status "- Message: $COMMIT_MSG"
print_status "- Health: $HEALTH_STATUS"
print_status "- Completed: $FINAL_TIMESTAMP"
print_success "Auto-deployment script finished successfully!"

exit 0
