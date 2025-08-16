#!/bin/bash

# Setup Auto-Deployment with Discord Notifications
# This script sets up webhook configuration on VPS

SERVER_IP="43.229.133.51"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

echo "🚀 Setting up Auto-Deployment with Discord Notifications..."

# Create webhook configuration file on VPS
ssh root@$SERVER_IP 'cat > /etc/webhook.conf << "EOF"
[
  {
    "id": "deploy-backend-master",
    "execute-command": "/var/www/patong-boxing/scripts/auto-deploy.sh",
    "command-working-directory": "/var/www/patong-boxing",
    "response-message": "🚀 Deploying from master...",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hash-sha1",
            "secret": "patong-boxing-webhook-secret-2024",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/feature/newfunction",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
EOF'

echo "✅ Webhook config created"

# Create auto-deploy script on VPS
ssh root@$SERVER_IP 'cat > /var/www/patong-boxing/scripts/auto-deploy.sh << "EOF"
#!/bin/bash

DEPLOY_LOG="/var/log/auto-deploy-$(date +%Y%m%d).log"
DISCORD_WEBHOOK="'"$DISCORD_WEBHOOK"'"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$DEPLOY_LOG"
}

send_discord() {
    local title="$1"
    local description="$2"
    local color="$3"
    local fields="$4"
    
    curl -s -H "Content-Type: application/json" \
    -X POST \
    -d "{
        \"embeds\": [
            {
                \"title\": \"$title\",
                \"description\": \"$description\",
                \"color\": ${color:-5763719},
                \"fields\": [
                    $fields
                ],
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
            }
        ]
    }" \
    "$DISCORD_WEBHOOK" > /dev/null 2>&1
}

# Start deployment
log_message "Auto-deployment started"

# Send start notification
send_discord "🚀 Auto-Deployment Started" \
            "Automatic deployment triggered by Git push" \
            "3447003" \
            "{\"name\": \"📂 Repository\", \"value\": \"ticket-backend\", \"inline\": true}, {\"name\": \"🌿 Branch\", \"value\": \"feature/newfunction\", \"inline\": true}, {\"name\": \"⏰ Status\", \"value\": \"Pulling latest code...\", \"inline\": false}"

cd /var/www/patong-boxing

# Pull latest code
log_message "Pulling latest code from Git"
git fetch origin
git reset --hard origin/feature/newfunction

# Install dependencies (if package.json changed)
if git diff HEAD~1 --name-only | grep -q "package.json"; then
    log_message "Package.json changed, installing dependencies"
    npm install
fi

# Build application
log_message "Building application"
npm run build

# Restart PM2 processes
log_message "Restarting PM2 processes"
pm2 restart patong-boxing-api

# Wait for services to stabilize
sleep 10

# Verify deployment
API_STATUS=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:4000/ --max-time 5)
WEBHOOK_STATUS=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:4200/hooks/deploy-backend-master -X POST --max-time 5)

if [[ "$API_STATUS" =~ ^[2-4][0-9][0-9]$ ]]; then
    API_HEALTH="🟢 Online"
else
    API_HEALTH="🔴 Offline"
fi

if [[ "$WEBHOOK_STATUS" =~ ^[2-4][0-9][0-9]$ ]]; then
    WEBHOOK_HEALTH="🟢 Online"
else
    WEBHOOK_HEALTH="🔴 Offline"
fi

# Get system info
MEMORY_USAGE=$(free -m | awk "NR==2{printf \"%.0f%%\", \$3*100/\$2}")
PM2_PROCESSES=$(pm2 list | grep -c "online")

# Send completion notification
send_discord "✅ Auto-Deployment Completed" \
            "Deployment finished successfully" \
            "5763719" \
            "{\"name\": \"🌐 Service Status\", \"value\": \"API: $API_HEALTH\\nWebhook: $WEBHOOK_HEALTH\", \"inline\": true}, {\"name\": \"📊 System Health\", \"value\": \"Memory: $MEMORY_USAGE\\nPM2 Processes: $PM2_PROCESSES\", \"inline\": true}, {\"name\": \"⏱️ Deployment Time\", \"value\": \"$(date '+%H:%M:%S')\", \"inline\": true}"

log_message "Auto-deployment completed successfully"
EOF'

echo "✅ Auto-deploy script created"

# Make scripts executable
ssh root@$SERVER_IP "chmod +x /var/www/patong-boxing/scripts/auto-deploy.sh"

# Restart webhook service
ssh root@$SERVER_IP "pm2 restart webhook-deploy-service"

echo "✅ Webhook service restarted"
echo ""
echo "🎉 Auto-deployment setup completed!"
echo "📝 Test with: curl -X POST http://43.229.133.51:4200/hooks/deploy-backend-master"
echo "📱 Discord notifications will be sent automatically"
