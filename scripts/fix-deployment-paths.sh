#!/bin/bash

# Fix Deployment Path Issues
# This script fixes the webhook deployment path problems

set -e

echo "🔧 Fixing Auto-Deployment Path Issues"
echo "====================================="

# Find the actual project directory
POSSIBLE_PATHS=(
    "/var/www/backend/ticket-backend"
    "/var/www/ticket-backend" 
    "/opt/ticket-backend"
    "/home/ubuntu/ticket-backend"
    "$(pwd)"
)

ACTUAL_PROJECT_DIR=""

echo "🔍 Looking for project directory..."
for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path/package.json" ] && [ -d "$path/.git" ]; then
        ACTUAL_PROJECT_DIR="$path"
        echo "✅ Found project at: $ACTUAL_PROJECT_DIR"
        break
    fi
done

if [ -z "$ACTUAL_PROJECT_DIR" ]; then
    echo "❌ Could not find project directory!"
    echo "Please make sure the project is properly deployed."
    exit 1
fi

echo ""
echo "📁 Using project directory: $ACTUAL_PROJECT_DIR"

# Copy webhook script to the correct location
echo ""
echo "📄 Copying webhook deployment script..."
if [ ! -d "$ACTUAL_PROJECT_DIR/scripts" ]; then
    mkdir -p "$ACTUAL_PROJECT_DIR/scripts"
fi

# Copy from current location to actual project location
cp "$(pwd)/scripts/webhook-deploy.sh" "$ACTUAL_PROJECT_DIR/scripts/" 2>/dev/null || {
    echo "⚠️  webhook-deploy.sh not found in current directory"
    echo "Creating new webhook-deploy.sh in project directory..."
}

# Ensure script exists and is executable
if [ ! -f "$ACTUAL_PROJECT_DIR/scripts/webhook-deploy.sh" ]; then
    echo "📝 Creating webhook-deploy.sh script..."
    cat > "$ACTUAL_PROJECT_DIR/scripts/webhook-deploy.sh" << 'EOF'
#!/bin/bash

# Webhook Auto-Deployment Script for Stadium Backend
set -e

# Configuration  
PROJECT_DIR="${PROJECT_DIR:-/var/www/backend/ticket-backend}"
BRANCH="feature/newfunction"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
WEBHOOK_URL="http://43.229.133.51:4000/api/webhook/v1/deploy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m' 
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}🤖 AUTO-DEPLOY: $1${NC}"; }
print_success() { echo -e "${GREEN}✅ AUTO-DEPLOY: $1${NC}"; }
print_error() { echo -e "${RED}❌ AUTO-DEPLOY: $1${NC}"; }

# Send webhook notification
send_webhook_notification() {
    local status="$1"
    local message="$2"
    curl -s -H "Content-Type: application/json" -X POST \
         -d "{\"status\":\"$status\",\"message\":\"[AUTO] $message\",\"branch\":\"$BRANCH\",\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"}" \
         "$WEBHOOK_URL" 2>/dev/null || true
}

cd "$PROJECT_DIR" || { print_error "Failed to cd to $PROJECT_DIR"; exit 1; }

print_status "Starting auto-deployment..."
send_webhook_notification "started" "Auto-deployment initiated"

# Pull latest changes
print_status "Pulling latest changes..."
git fetch origin && git checkout "$BRANCH" && git pull origin "$BRANCH" || {
    print_error "Git operations failed"
    send_webhook_notification "failed" "Git pull failed"
    exit 1
}

# Install dependencies and build
print_status "Installing dependencies..."
npm ci --production=false || {
    print_error "npm install failed" 
    send_webhook_notification "failed" "npm install failed"
    exit 1
}

print_status "Building application..."
npm run build || {
    print_error "Build failed"
    send_webhook_notification "failed" "Build failed"
    exit 1
}

# Restart PM2
print_status "Restarting application..."
pm2 restart ticket-backend-prod || {
    print_error "PM2 restart failed"
    send_webhook_notification "failed" "PM2 restart failed"
    exit 1
}

print_success "Auto-deployment completed!"
send_webhook_notification "success" "Auto-deployment completed successfully"
EOF
fi

chmod +x "$ACTUAL_PROJECT_DIR/scripts/webhook-deploy.sh"
echo "✅ webhook-deploy.sh is ready and executable"

# Update ecosystem.config.js with correct PROJECT_DIR
echo ""
echo "⚙️  Updating ecosystem.config.js..."
if [ -f "$ACTUAL_PROJECT_DIR/ecosystem.config.js" ]; then
    # Update PROJECT_DIR in ecosystem config
    sed -i "s|PROJECT_DIR: '.*'|PROJECT_DIR: '$ACTUAL_PROJECT_DIR'|g" "$ACTUAL_PROJECT_DIR/ecosystem.config.js" 2>/dev/null || {
        echo "⚠️  Could not automatically update ecosystem.config.js"
        echo "Please manually add: PROJECT_DIR: '$ACTUAL_PROJECT_DIR'"
    }
    echo "✅ ecosystem.config.js updated"
else
    echo "⚠️  ecosystem.config.js not found"
fi

# Test script execution
echo ""
echo "🧪 Testing script..."
if [ -x "$ACTUAL_PROJECT_DIR/scripts/webhook-deploy.sh" ]; then
    echo "✅ Script is executable"
else
    echo "❌ Script is not executable"
    chmod +x "$ACTUAL_PROJECT_DIR/scripts/webhook-deploy.sh"
fi

# Restart PM2 with new environment
echo ""
echo "🚀 Restarting PM2 with updated configuration..."
cd "$ACTUAL_PROJECT_DIR"
pm2 stop ticket-backend-prod 2>/dev/null || true
pm2 delete ticket-backend-prod 2>/dev/null || true
PROJECT_DIR="$ACTUAL_PROJECT_DIR" pm2 start ecosystem.config.js --env production

echo ""
echo "✅ Path Issues Fixed!"
echo "=========================="
echo "📁 Project Directory: $ACTUAL_PROJECT_DIR"
echo "📄 Webhook Script: $ACTUAL_PROJECT_DIR/scripts/webhook-deploy.sh"
echo "🌍 Environment Variable: PROJECT_DIR=$ACTUAL_PROJECT_DIR"
echo ""
echo "🧪 Test the webhook:"
echo "curl -X POST http://localhost:4000/api/webhook/test"
echo ""
echo "🚀 Auto-deployment should now work correctly!"
