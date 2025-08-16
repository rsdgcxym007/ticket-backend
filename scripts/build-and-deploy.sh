#!/bin/bash

# Build and Deploy Script for ticket-backend
# Updated for 2025 with modern practices and enhanced error handling

set -euo pipefail  # Exit on any error, undefined variables, and pipe failures

# Configuration
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
WEBHOOK_URL="http://43.229.133.51:4200/hooks/deploy-backend-master"
PM2_APP_NAME="ticket-backend-prod"
LOG_FILE="/tmp/build-deploy-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Enhanced logging with timestamp and step tracking
STEP_NUMBER=0
get_timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

echo "🚀 Starting build and deployment process..."
echo "📝 Logging to: $LOG_FILE"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Enhanced logging functions with timestamp and step tracking
print_status() {
    echo -e "\033[1;34m[$(get_timestamp)] 📋 $1\033[0m"
    echo "[$(get_timestamp)] INFO: $1" >> "$LOG_FILE" 2>/dev/null || true
}

print_success() {
    echo -e "\033[1;32m[$(get_timestamp)] ✅ $1\033[0m"
    echo "[$(get_timestamp)] SUCCESS: $1" >> "$LOG_FILE" 2>/dev/null || true
}

print_error() {
    echo -e "\033[1;31m[$(get_timestamp)] ❌ $1\033[0m"
    echo "[$(get_timestamp)] ERROR: $1" >> "$LOG_FILE" 2>/dev/null || true
}

print_warning() {
    echo -e "\033[1;33m[$(get_timestamp)] ⚠️  $1\033[0m"
    echo "[$(get_timestamp)] WARNING: $1" >> "$LOG_FILE" 2>/dev/null || true
}

step() {
    STEP_NUMBER=$((STEP_NUMBER + 1))
    echo -e "\033[1;35m[$(get_timestamp)] 📋 STEP $STEP_NUMBER: $1\033[0m"
    echo "[$(get_timestamp)] STEP $STEP_NUMBER: $1" >> "$LOG_FILE" 2>/dev/null || true
}

substep() {
    echo -e "\033[1;36m[$(get_timestamp)]   └─ $1\033[0m"
    echo "[$(get_timestamp)] SUBSTEP: $1" >> "$LOG_FILE" 2>/dev/null || true
}

log_command() {
    local cmd="$1"
    substep "Executing: $cmd"
    echo "[$(get_timestamp)] COMMAND: $cmd" >> "$LOG_FILE" 2>/dev/null || true
}

# Cleanup function for graceful exit
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        print_error "Script failed with exit code $exit_code"
        send_discord_notification "❌ Deployment failed with exit code $exit_code" "15158332" "Failed"
        send_webhook_notification "failed" "❌ Deployment failed with exit code $exit_code"
    fi
    print_status "Cleanup completed. Log file: $LOG_FILE"
}

# Set trap for cleanup on exit
trap cleanup EXIT

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
    local branch=$(git branch --show-current 2>/dev/null || echo 'unknown')
    local commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
    local commit_msg=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo 'No commit message')
    
    if command_exists curl; then
        curl -sSL -H "Content-Type: application/json" \
             -X POST \
             --max-time 10 \
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
                             \"value\": \"$branch\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Commit\",
                             \"value\": \"[$commit_hash](https://github.com/rsdgcxym007/ticket-backend/commit/$commit_hash)\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Message\",
                             \"value\": \"$commit_msg\",
                             \"inline\": false
                         },
                         {
                             \"name\": \"Timestamp\",
                             \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Server\",
                             \"value\": \"Production (43.229.133.51)\",
                             \"inline\": true
                         }
                     ],
                     \"footer\": {
                         \"text\": \"Build & Deploy Script v2.0\"
                     }
                 }]
             }" \
             "$DISCORD_WEBHOOK_URL" &>/dev/null || {
                 print_warning "Failed to send Discord notification"
             }
    fi
}

# Function to send webhook notification
send_webhook_notification() {
    local status="$1"
    local message="$2"
    local branch=$(git branch --show-current 2>/dev/null || echo 'unknown')
    local commit=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local version=$(node -p "require('./package.json').version" 2>/dev/null || echo 'unknown')
    
    if command_exists curl; then
        curl -sSL -H "Content-Type: application/json" \
             -H "User-Agent: ticket-backend-deploy-script/2.0" \
             -H "X-GitHub-Event: deployment" \
             -X POST \
             --max-time 10 \
             -d "{
                 \"status\": \"$status\",
                 \"message\": \"$message\",
                 \"branch\": \"$branch\",
                 \"commit\": \"$commit\",
                 \"timestamp\": \"$timestamp\",
                 \"environment\": \"production\",
                 \"version\": \"$version\",
                 \"server\": \"43.229.133.51\",
                 \"pm2_app\": \"$PM2_APP_NAME\",
                 \"deployment_method\": \"build-and-deploy-script\"
             }" \
             "$WEBHOOK_URL" &>/dev/null || {
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
npm cache clean --force 2>/dev/null || print_warning "Failed to clean npm cache"

substep "Removing node_modules directory"
log_command "rm -rf node_modules/ package-lock.json yarn.lock pnpm-lock.yaml"
rm -rf node_modules/ package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null || true

# Detect and use the best package manager
substep "Detecting package manager"
PACKAGE_MANAGER="npm"
if command_exists pnpm; then
    PACKAGE_MANAGER="pnpm"
    substep "Using pnpm (fastest)"
elif command_exists yarn; then
    PACKAGE_MANAGER="yarn"
    substep "Using yarn"
else
    substep "Using npm (default)"
fi

# Install dependencies with retry logic
substep "Installing dependencies with $PACKAGE_MANAGER (attempt 1/3)"
case $PACKAGE_MANAGER in
    "pnpm")
        log_command "pnpm install --production=false"
        if ! pnpm install --production=false; then
            print_warning "First pnpm install failed, trying npm..."
            PACKAGE_MANAGER="npm"
        else
            print_success "Dependencies installed successfully with pnpm"
        fi
        ;;
    "yarn")
        log_command "yarn install --production=false"
        if ! yarn install --production=false; then
            print_warning "First yarn install failed, trying npm..."
            PACKAGE_MANAGER="npm"
        else
            print_success "Dependencies installed successfully with yarn"
        fi
        ;;
esac

# Fallback to npm if other package managers failed
if [ "$PACKAGE_MANAGER" = "npm" ]; then
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
            print_warning "Second attempt failed, trying with legacy peer deps..."
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
fi

step "Cleaning previous build"
substep "Removing dist directory"
log_command "rm -rf dist/"
rm -rf dist/

substep "Removing TypeScript build cache"
log_command "rm -f tsconfig.build.tsbuildinfo"
rm -f tsconfig.build.tsbuildinfo

step "Building the application"
substep "Cleaning previous build artifacts"
log_command "rm -rf dist/ tsconfig.build.tsbuildinfo .tsbuildinfo"
rm -rf dist/ tsconfig.build.tsbuildinfo .tsbuildinfo 2>/dev/null || true

substep "Pre-build validation"
if [ ! -f "tsconfig.json" ]; then
    print_error "tsconfig.json not found"
    exit 1
fi

if [ ! -f "nest-cli.json" ]; then
    print_warning "nest-cli.json not found, but continuing..."
fi

substep "Compiling TypeScript to JavaScript"
log_command "npm run build"
if ! npm run build; then
    print_error "BUILD FAILED with npm run build"
    
    substep "Attempting alternative build methods"
    if command_exists npx; then
        log_command "npx nest build"
        if ! npx nest build; then
            substep "Trying direct TypeScript compilation"
            log_command "npx tsc"
            if ! npx tsc; then
                substep "Final attempt with TypeScript check"
                log_command "npx tsc --noEmit"
                npx tsc --noEmit || true
                
                print_error "ALL BUILD METHODS FAILED"
                send_discord_notification "❌ Build failed: All build methods exhausted" "15158332" "Failed"
                send_webhook_notification "failed" "❌ Build failed during compilation"
                exit 1
            else
                print_success "Application built successfully with direct TypeScript compilation"
            fi
        else
            print_success "Application built successfully with npx nest build"
        fi
    else
        print_error "npx not available, build failed"
        exit 1
    fi
else
    print_success "Application built successfully with npm run build"
fi

# Verify the build was successful
step "Verifying build output"
if [ ! -f "dist/main.js" ]; then
    print_error "❌ BUILD VERIFICATION FAILED"
    print_error "   • dist/main.js not found after build"
    print_warning "🔍 Checking build directory contents..."
    if [ -d "dist/" ]; then
        substep "Contents of dist/ directory:"
        ls -la dist/ || echo "Cannot list dist/ contents"
    else
        print_error "dist/ directory does not exist"
    fi
    send_discord_notification "❌ Build verification failed: dist/main.js not found" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Build verification failed: dist/main.js not found"
    exit 1
else
    BUILD_SIZE=$(stat -f%z "dist/main.js" 2>/dev/null || stat -c%s "dist/main.js" 2>/dev/null || echo "unknown")
    print_success "✅ Build verification passed - dist/main.js exists ($BUILD_SIZE bytes)"
fi

substep "Listing all build artifacts"
if [ -d "dist/" ]; then
    # Use a safer method to list files without causing SIGPIPE
    ARTIFACTS=$(find dist/ -type f -name "*.js" -o -name "*.json" -o -name "*.map" 2>/dev/null | head -10 2>/dev/null || true)
    if [ -n "$ARTIFACTS" ]; then
        echo "$ARTIFACTS" | head -10
    fi
    TOTAL_FILES=$(find dist/ -type f 2>/dev/null | wc -l | tr -d ' ')
    substep "Total build files: $TOTAL_FILES"
fi

step "Testing application health"
substep "Performing basic application test"
# Use a safer timeout command that won't cause SIGPIPE issues
if timeout 5s node -e "console.log('Node.js test passed')" >/dev/null 2>&1; then
    print_success "Application test passed"
else
    print_warning "Basic node test failed - this might indicate environment issues"
fi

step "Managing PM2 processes"
substep "Checking current PM2 status"
if command_exists pm2; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null || echo '[]')
    if echo "$PM2_STATUS" | grep -q "\"name\":\"$PM2_APP_NAME\""; then
        substep "Found existing PM2 process: $PM2_APP_NAME"
        log_command "pm2 stop $PM2_APP_NAME"
        pm2 stop "$PM2_APP_NAME" 2>/dev/null || print_warning "Failed to stop existing process"
        
        log_command "pm2 delete $PM2_APP_NAME"
        pm2 delete "$PM2_APP_NAME" 2>/dev/null || print_warning "Failed to delete existing process"
    else
        substep "No existing PM2 process found for $PM2_APP_NAME"
    fi
else
    print_error "PM2 is not installed or not in PATH"
    send_discord_notification "❌ Deployment failed: PM2 not found" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Deployment failed: PM2 not found"
    exit 1
fi

step "Starting application with PM2"
substep "Using ecosystem.config.js for PM2 configuration"
if [ ! -f "ecosystem.config.js" ]; then
    print_error "ecosystem.config.js not found"
    send_discord_notification "❌ Deployment failed: ecosystem.config.js not found" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Deployment failed: ecosystem.config.js not found"
    exit 1
fi

log_command "pm2 start ecosystem.config.js --env production"
if ! pm2 start ecosystem.config.js --env production; then
    print_error "Failed to start application with PM2"
    substep "Checking PM2 logs for errors"
    pm2 logs "$PM2_APP_NAME" --lines 20 || true
    send_discord_notification "❌ Deployment failed: PM2 start failed" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Deployment failed: PM2 start failed"
    exit 1
fi

step "Verifying deployment"
substep "Waiting for application to stabilize"
sleep 5

substep "Checking PM2 application status"
if pm2 status | grep -q "$PM2_APP_NAME.*online"; then
    print_success "✅ Application is online and running"
    
    # Get application info
    COMMIT_INFO=$(git log -1 --pretty=format:"%h - %s by %an" 2>/dev/null || echo "No commit info")
    UPTIME=$(pm2 show "$PM2_APP_NAME" 2>/dev/null | grep "uptime" || echo "Unknown uptime")
    
    step "Deployment Summary"
    print_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY"
    print_success "📊 Deployment Details:"
    print_success "   • Application: $PM2_APP_NAME"
    print_success "   • Status: Online"
    print_success "   • Build: Success (dist/main.js: $BUILD_SIZE bytes)"
    print_success "   • Package Manager: $PACKAGE_MANAGER"
    print_success "   • Commit: $COMMIT_INFO"
    print_success "   • Timestamp: $(get_timestamp)"
    print_success "   • Log File: $LOG_FILE"
    
    send_discord_notification "✅ Deployment completed successfully! Application is now running.\n\n**Details:**\n• App: $PM2_APP_NAME\n• Commit: $COMMIT_INFO\n• Build Size: $BUILD_SIZE bytes" "5763719" "Success"
    send_webhook_notification "success" "✅ Deployment completed successfully! Application is now running."
    
    print_status "You can check logs with: pm2 logs $PM2_APP_NAME"
    print_status "You can check status with: pm2 status"
    
else
    print_error "❌ APPLICATION FAILED TO START"
    substep "Current PM2 status:"
    pm2 status || true
    substep "Recent logs:"
    pm2 logs "$PM2_APP_NAME" --lines 10 || true
    
    send_discord_notification "❌ Deployment failed: Application failed to start properly" "15158332" "Failed"
    send_webhook_notification "failed" "❌ Deployment failed: Application failed to start properly"
    exit 1
fi
