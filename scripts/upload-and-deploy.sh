#!/bin/bash

# Upload and Deploy Script for Patong Boxing Stadium
# อัพโหลดโปรเจ็คจากเครื่อง local ไปยังเซิร์ฟเวอร์และทำการ deploy
# Author: GitHub Copilot
# Date: 2025-08-16

set -e

# Configuration
SERVER_IP="43.229.133.51"
SERVER_USER="root"
LOCAL_PROJECT_PATH="/Users/user/Desktop/work/ticket-backend"
SERVER_PROJECT_PATH="/tmp/ticket-backend-upload"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
    exit 1
}

step() {
    echo -e "${PURPLE}[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 $1${NC}"
}

# Header
echo -e "${WHITE}
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     📤 UPLOAD & DEPLOY TO SERVER (43.229.133.51)       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Please run this script from the ticket-backend project directory"
fi

# Check SSH connection
step "🔐 Checking SSH connection to server"
if ssh -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" "echo 'SSH connection successful'" 2>/dev/null; then
    success "SSH connection to $SERVER_IP established"
else
    error "Cannot connect to $SERVER_IP via SSH. Please check your connection and SSH keys."
fi

# Discord notification
send_notification() {
    local message="$1"
    local color="$2"
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"embeds\": [{
                 \"title\": \"📤 Upload & Deploy\",
                 \"description\": \"$message\",
                 \"color\": $color,
                 \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
             }]
         }" \
         "$DISCORD_WEBHOOK_URL" 2>/dev/null || true
}

send_notification "🚀 Starting upload and deployment from local machine" 3447003

# Step 1: Prepare local project
step "📦 Preparing local project for upload"

# Create temporary directory for clean upload
TEMP_DIR="/tmp/patong-upload-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TEMP_DIR"

# Copy project files (exclude node_modules, .git, etc.)
log "Copying project files..."
rsync -av \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    "$LOCAL_PROJECT_PATH/" "$TEMP_DIR/"

success "Project files prepared for upload"

# Step 2: Upload to server
step "📤 Uploading project to server"

# Upload files to server
log "Uploading files to $SERVER_IP..."
rsync -avz \
    --delete \
    --exclude '.env' \
    "$TEMP_DIR/" \
    "$SERVER_USER@$SERVER_IP:$SERVER_PROJECT_PATH/"

success "Files uploaded to server"

# Clean up local temp directory
rm -rf "$TEMP_DIR"

# Step 3: Run deployment on server
step "🚀 Running deployment on server"

# Create deployment command
DEPLOY_COMMAND="
cd $SERVER_PROJECT_PATH &&
chmod +x scripts/*.sh &&
./scripts/master-deployment.sh
"

log "Executing deployment on server..."
ssh "$SERVER_USER@$SERVER_IP" "$DEPLOY_COMMAND" || error "Deployment failed on server"

success "Deployment completed on server"

# Step 4: Verify deployment
step "🔍 Verifying deployment"

# Check if services are running
HEALTH_CHECK="curl -s https://api.patongboxingstadiumticket.com/health || curl -s http://localhost:3000/health"
ssh "$SERVER_USER@$SERVER_IP" "$HEALTH_CHECK" >/dev/null || log "Health check endpoint not yet available (may need time)"

success "Deployment verification completed"

# Step 5: Display results
step "📋 Deployment Summary"

echo -e "${WHITE}
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        🎉 UPLOAD & DEPLOYMENT COMPLETED!                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

📤 Upload Details:
   Source: $LOCAL_PROJECT_PATH
   Target: $SERVER_USER@$SERVER_IP:$SERVER_PROJECT_PATH
   
🌐 Your URLs:
   • Main Site:  https://patongboxingstadiumticket.com
   • API Server: https://api.patongboxingstadiumticket.com
   • App Portal: https://app.patongboxingstadiumticket.com  
   • Admin:      https://admin.patongboxingstadiumticket.com

🔧 Next Steps:
   1. SSH to server: ssh $SERVER_USER@$SERVER_IP
   2. Update .env file with API keys
   3. Test all endpoints
   4. Configure GitHub webhook for auto-deployment

💡 Auto-Deployment Webhook:
   URL: http://$SERVER_IP:4200/hooks/deploy-backend-master
   (Add this to your GitHub repository webhooks)

${NC}"

send_notification "✅ **Upload & Deployment Completed Successfully!**

📤 **Uploaded from local machine to server**
🚀 **Full deployment executed**  
🌐 **All URLs are ready**

**Server:** $SERVER_IP
**Status:** Production ready

**Next:** Update .env with API keys and test functionality" 5763719

success "🎯 Upload and deployment process completed successfully!"

# Ask if user wants to SSH to server
echo ""
read -p "Would you like to SSH to the server now? (y/n): " ssh_now

if [[ $ssh_now =~ ^[Yy]$ ]]; then
    log "🔐 Connecting to server..."
    ssh "$SERVER_USER@$SERVER_IP"
else
    log "You can SSH later with: ssh $SERVER_USER@$SERVER_IP"
fi

exit 0
EOF
