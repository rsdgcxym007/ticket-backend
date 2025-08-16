#!/bin/bash

# 🚀 Fast Production Deploy Script
# Optimized for minimal downtime and resource usage

set -e

echo "🔧 Fast Production Deploy Started - $(date)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
APP_DIR="/var/www/backend/ticket-backend"
APP_NAME="ticket-backend-prod"
BACKUP_DIR="/var/www/backend/backups"
BUILD_TIMEOUT=300 # 5 minutes max

print_status "Starting optimized deployment..."

cd "$APP_DIR" || exit 1

# 1. 📊 Pre-deployment system check
print_status "Checking system resources..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
CPU_LOAD=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1 | xargs)

echo "   Memory Usage: ${MEMORY_USAGE}%"
echo "   CPU Load: ${CPU_LOAD}"

if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    print_warning "High memory usage detected. Running cleanup..."
    # Clear system caches
    echo 1 > /proc/sys/vm/drop_caches
    sleep 2
fi

# 2. 🎯 Smart dependency check (only if package.json changed)
print_status "Checking for dependency changes..."
PACKAGE_HASH_OLD=""
if [ -f ".deploy_hash" ]; then
    PACKAGE_HASH_OLD=$(cat .deploy_hash)
fi

PACKAGE_HASH_NEW=$(md5sum package.json package-lock.json 2>/dev/null | md5sum | cut -d' ' -f1)

if [ "$PACKAGE_HASH_OLD" != "$PACKAGE_HASH_NEW" ]; then
    print_status "Dependencies changed. Installing..."
    
    # Use npm ci for faster, reliable installs
    npm ci --only=production --silent || {
        print_error "npm ci failed, falling back to npm install"
        npm install --only=production --silent
    }
    
    echo "$PACKAGE_HASH_NEW" > .deploy_hash
    print_success "Dependencies updated"
else
    print_success "No dependency changes detected - skipping npm install"
fi

# 3. 🏗️ Fast build with timeout
print_status "Building application..."
timeout $BUILD_TIMEOUT npm run build || {
    print_error "Build failed or timed out"
    exit 1
}
print_success "Build completed"

# 4. 🔄 Smart PM2 reload (zero-downtime if possible)
print_status "Deploying to PM2..."

if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    # App exists - use reload for zero downtime
    print_status "Reloading existing application..."
    pm2 reload "$APP_NAME" --update-env
else
    # App doesn't exist - start fresh
    print_status "Starting new application..."
    pm2 start ecosystem.config.js --env production
fi

# 5. 🧹 Post-deployment cleanup
print_status "Running post-deployment cleanup..."

# Clear old logs
find /var/log/pm2 -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Clear Node.js caches
[ -d "/tmp/.npm" ] && rm -rf /tmp/.npm/_cacache/* 2>/dev/null || true

# Force garbage collection after 30 seconds
(sleep 30 && kill -USR2 $(pgrep -f "$APP_NAME") 2>/dev/null || true) &

print_success "Cleanup completed"

# 6. 📊 Health check with retry
print_status "Performing health check..."
HEALTH_CHECK_URL="http://localhost:4000/api/v1"
RETRY_COUNT=0
MAX_RETRIES=10

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s --max-time 5 "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        print_success "Health check passed"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        print_status "Health check attempt $RETRY_COUNT/$MAX_RETRIES..."
        sleep 2
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Health check failed after $MAX_RETRIES attempts"
    pm2 logs "$APP_NAME" --lines 10 --nostream
    exit 1
fi

# 7. 📈 Final system status
print_status "Final system status:"
pm2 status | grep -E "(name|$APP_NAME)"
echo ""

MEMORY_FINAL=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
echo "   Final Memory Usage: ${MEMORY_FINAL}%"

# Calculate deployment time
END_TIME=$(date +%s)
DEPLOY_TIME=$((END_TIME - ${START_TIME:-END_TIME}))
echo "   Deployment Time: ${DEPLOY_TIME}s"

print_success "🎉 Fast deployment completed successfully!"
print_status "Monitor logs with: pm2 logs $APP_NAME"

# 8. 🔔 Optional Discord notification (if webhook URL is set)
if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
    curl -s -H "Content-Type: application/json" \
         -d "{\"content\": \"🚀 **Fast Deploy Complete**\n✅ App: $APP_NAME\n⏱️ Time: ${DEPLOY_TIME}s\n💾 Memory: ${MEMORY_FINAL}%\"}" \
         "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
fi
