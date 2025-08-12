#!/bin/bash

# Emergency Fix Script for MODULE_NOT_FOUND errors
# Quick rebuild and restart without full deployment process

set -e

# Discord webhook URL
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Function to send Discord notification
send_discord_notification() {
    local message="$1"
    local color="$2"  # green=5763719, red=15158332, yellow=16776960
    local status="$3"
    
    if command -v curl >/dev/null 2>&1; then
        curl -H "Content-Type: application/json" \
             -X POST \
             -d "{
                 \"embeds\": [{
                     \"title\": \"🚨 Emergency Fix - Ticket Backend\",
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

echo "🚨 Emergency fix: Rebuilding application..."
send_discord_notification "🚨 Starting emergency fix for MODULE_NOT_FOUND error..." "16776960" "Emergency Fix"

# Clean and rebuild
rm -rf dist/
npm run build

# Verify build
if [ ! -f "dist/main.js" ]; then
    echo "❌ Build failed: main.js not found"
    send_discord_notification "❌ Emergency fix failed: Build unsuccessful" "15158332" "Failed"
    exit 1
fi

echo "✅ Build successful"
send_discord_notification "✅ Emergency fix build completed successfully" "5763719" "Build Success"

# Restart PM2
pm2 restart ticket-backend-prod

echo "✅ Application restarted"
send_discord_notification "✅ Emergency fix completed! Application restarted successfully." "5763719" "Success"
pm2 status
