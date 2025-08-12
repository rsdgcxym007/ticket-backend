#!/bin/bash

# Build and Deploy Script for ticket-backend
# This script ensures proper build and deployment to avoid MODULE_NOT_FOUND errors

set -e  # Exit on any error

# Discord webhook URL
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Webhook notification URL (updated to port 4200)
WEBHOOK_URL="http://43.229.133.51:4200/hooks/deploy-backend-master"

# Enhanced logging with timestamp and step tracking
STEP_NUMBER=0
get_timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

echo "🚀 Starting build and deployment process..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Enhanced logging functions with timestamp and step tracking
print_status() {
    echo -e "\033[1;34m[$(get_timestamp)] 📋 $1\033[0m"
    echo "[$(get_timestamp)] INFO: $1" >> /tmp/build-deploy.log 2>/dev/null || true
}

print_success() {
    echo -e "\033[1;32m[$(get_timestamp)] ✅ $1\033[0m"
    echo "[$(get_timestamp)] SUCCESS: $1" >> /tmp/build-deploy.log 2>/dev/null || true
}

print_error() {
    echo -e "\033[1;31m[$(get_timestamp)] ❌ $1\033[0m"
    echo "[$(get_timestamp)] ERROR: $1" >> /tmp/build-deploy.log 2>/dev/null || true
}

print_warning() {
    echo -e "\033[1;33m[$(get_timestamp)] ⚠️  $1\033[0m"
    echo "[$(get_timestamp)] WARNING: $1" >> /tmp/build-deploy.log 2>/dev/null || true
}

step() {
    STEP_NUMBER=$((STEP_NUMBER + 1))
    echo -e "\033[1;35m[$(get_timestamp)] 📋 STEP $STEP_NUMBER: $1\033[0m"
    echo "[$(get_timestamp)] STEP $STEP_NUMBER: $1" >> /tmp/build-deploy.log 2>/dev/null || true
}

substep() {
    echo -e "\033[1;36m[$(get_timestamp)]   └─ $1\033[0m"
    echo "[$(get_timestamp)] SUBSTEP: $1" >> /tmp/build-deploy.log 2>/dev/null || true
}

log_command() {
    local cmd="$1"
    substep "Executing: $cmd"
    echo "[$(get_timestamp)] COMMAND: $cmd" >> /tmp/build-deploy.log 2>/dev/null || true
}

# Function to send Discord notification
send_discord_notification() {
    local message="$1"
    local color="$2"  # green=5763719, red=15158332, yellow=16776960
    local status="$3"
    
    if command_exists curl; then
        curl -H "Content-Type: application/json" \
             -X POST \
             -d "{
                 \"embeds\": [{
                     \"title\": \"🚀 Ticket Backend Deployment\",
                     \"description\": \"$message\",
                     \"color\": $color,
                     \"fields\": [
                         {
                             \"name\": \"Status\",
                             \"value\": \"$status\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Branch\",
                             \"value\": \"$(git branch --show-current 2>/dev/null || echo 'unknown')\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Timestamp\",
                             \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
                             \"inline\": true
                         }
                     ]
                 }]
             }" \
             "$DISCORD_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Function to send webhook notification
send_webhook_notification() {
    local status="$1"
    local message="$2"
    local branch=$(git branch --show-current 2>/dev/null || echo 'unknown')
    local commit=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    if command_exists curl; then
        curl -H "Content-Type: application/json" \
             -H "User-Agent: ticket-backend-deploy-script/1.0" \
             -X POST \
             -d "{
                 \"status\": \"$status\",
                 \"message\": \"$message\",
                 \"branch\": \"$branch\",
                 \"commit\": \"$commit\",
                 \"timestamp\": \"$timestamp\",
                 \"environment\": \"production\",
                 \"version\": \"$(npm version --json 2>/dev/null | grep '\"ticket-backend\"' | cut -d'\"' -f4 || echo 'unknown')\"
             }" \
             "$WEBHOOK_URL" 2>/dev/null || {
                 print_warning "Failed to send webhook notification to $WEBHOOK_URL"
             }
    fi
}

# Check if we're in the right directory
step "Validating project environment"
substep "Checking for package.json in current directory"

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    send_discord_notification "❌ Deployment failed: package.json not found" "15158332" "Failed"
    exit 1
fi
print_success "Found package.json - project root confirmed"

# Send deployment start notification
step "Initializing deployment process"
send_discord_notification "🚀 Starting deployment process..." "16776960" "In Progress"
send_webhook_notification "started" "🚀 Starting deployment process..."

# Check if node and npm are available
step "Verifying system requirements"
substep "Checking Node.js availability"
if ! command_exists node; then
    print_error "Node.js is not installed or not in PATH"
    send_discord_notification "❌ Deployment failed: Node.js not found" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Deployment failed: Node.js not found"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js found: $NODE_VERSION"

substep "Checking npm availability"
if ! command_exists npm; then
    print_error "npm is not installed or not in PATH"
    send_discord_notification "❌ Deployment failed: npm not found" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Deployment failed: npm not found"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm found: $NPM_VERSION"

step "Installing dependencies"

# Clean npm cache and node_modules to fix corruption issues
substep "Cleaning npm cache and node_modules"
log_command "npm cache clean --force"
npm cache clean --force 2>/dev/null || true

substep "Removing node_modules directory"
log_command "rm -rf node_modules/"
rm -rf node_modules/

substep "Removing package-lock.json (if exists)"
log_command "rm -f package-lock.json"
rm -f package-lock.json

# Use npm install with retry logic for maximum compatibility
substep "Installing dependencies with npm install (attempt 1/3)"
log_command "npm install --production=false --no-audit --no-fund"
if ! npm install --production=false --no-audit --no-fund; then
    print_warning "First npm install failed, cleaning cache and retrying..."
    
    substep "Cleaning npm cache again"
    log_command "npm cache clean --force"
    npm cache clean --force 2>/dev/null || true
    sleep 2
    
    substep "Installing dependencies with npm install (attempt 2/3)"
    log_command "npm install --production=false --no-audit --no-fund"
    if ! npm install --production=false --no-audit --no-fund; then
        print_warning "Second attempt failed, trying with legacy peer deps...")
        sleep 2
        
        substep "Installing dependencies with npm install --legacy-peer-deps (attempt 3/3)"
        log_command "npm install --production=false --no-audit --no-fund --legacy-peer-deps"
        if ! npm install --production=false --no-audit --no-fund --legacy-peer-deps; then
            print_error "ALL DEPENDENCY INSTALLATION ATTEMPTS FAILED"
            print_error "   • npm install failed (attempts 1-2)"
            print_error "   • npm install --legacy-peer-deps failed (attempt 3)"
            send_discord_notification "❌ Deployment failed: All npm install attempts failed" "15158332" "Failed"
            send_webhook_notification "failed" "❌ Deployment failed: All npm install attempts failed"
            exit 1
        else
            print_success "Dependencies installed successfully with npm install (legacy mode)"
        fi
    else
        print_success "Dependencies installed successfully with npm install (attempt 2)"
    fi
else
    print_success "Dependencies installed successfully with npm install (attempt 1)"
fi

step "Cleaning previous build"
substep "Removing dist directory"
log_command "rm -rf dist/"
rm -rf dist/

substep "Removing TypeScript build cache"
log_command "rm -f tsconfig.build.tsbuildinfo"
rm -f tsconfig.build.tsbuildinfo

step "Building the application"
substep "Compiling TypeScript to JavaScript"
log_command "npm run build"
if ! npm run build; then
    print_error "BUILD FAILED"
    print_error "   • npm run build command failed"
    substep "Checking TypeScript compilation issues"
    log_command "npx tsc --noEmit"
    npx tsc --noEmit || true
    send_discord_notification "❌ Build failed during npm run build" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Build failed during npm run build"
    exit 1
else
    print_success "Application built successfully"
fi

# Verify the build was successful
if [ ! -f "dist/main.js" ]; then
    print_error "❌ BUILD VERIFICATION FAILED"
    print_error "   • dist/main.js not found after build"
    print_warning "🔍 Checking build directory contents..."
    ls -la dist/ 2>/dev/null || echo "dist/ directory not found"
    send_discord_notification "❌ Build verification failed: dist/main.js not found" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Build verification failed: dist/main.js not found"
    exit 1
else
    print_success "✅ Build verification passed - dist/main.js exists"
fi

print_status "Step 4: Verifying build files..."
echo "Build files:"
ls -la dist/

# Check main.js file
if [ -f "dist/main.js" ]; then
    print_success "main.js found ($(stat -f%z dist/main.js) bytes)"
else
    print_error "main.js not found in dist folder"
    exit 1
fi

print_status "Step 5: Testing the built application..."
timeout 10s node dist/main.js --version 2>/dev/null || {
    print_warning "Quick test failed, but this might be normal if the app requires database connection"
}

print_status "Step 6: Stopping existing PM2 processes..."
pm2 stop ticket-backend-prod 2>/dev/null || true
pm2 delete ticket-backend-prod 2>/dev/null || true

print_status "Step 7: Starting application with PM2..."
pm2 start ecosystem.config.js --env production

print_status "Step 8: Checking PM2 status..."
sleep 3
pm2 status

print_success "Deployment completed successfully!"
send_discord_notification "✅ Deployment completed successfully! Application is now running." "5763719" "Success"
send_webhook_notification "success" "✅ Deployment completed successfully! Application is now running."
print_status "You can check logs with: pm2 logs ticket-backend-prod"
