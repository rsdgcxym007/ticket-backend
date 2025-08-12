#!/bin/bash

# Discord Notification Test Script
# Tests the Discord webhook integration

DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

echo "🧪 Testing Discord webhook notifications..."

# Function to send Discord notification
send_discord_notification() {
    local message="$1"
    local color="$2"  # green=5763719, red=15158332, yellow=16776960, blue=3447003
    local status="$3"
    
    if command -v curl >/dev/null 2>&1; then
        curl -H "Content-Type: application/json" \
             -X POST \
             -d "{
                 \"embeds\": [{
                     \"title\": \"🧪 Test Notification - Ticket Backend\",
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
                         },
                         {
                             \"name\": \"Server\",
                             \"value\": \"$(hostname)\",
                             \"inline\": true
                         }
                     ]
                 }]
             }" \
             "$DISCORD_WEBHOOK_URL" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✅ Discord notification sent successfully!"
        else
            echo "❌ Failed to send Discord notification"
        fi
    else
        echo "❌ curl not found - cannot send Discord notification"
    fi
}

# Test different notification types
echo "Sending test notifications..."

send_discord_notification "🧪 This is a test notification to verify Discord webhook integration is working properly." "3447003" "Test"

sleep 2

send_discord_notification "✅ Success notification test - All systems operational!" "5763719" "Success"

sleep 2

send_discord_notification "⚠️ Warning notification test - This is just a test warning." "16776960" "Warning"

sleep 2

send_discord_notification "❌ Error notification test - This is just a test error." "15158332" "Error"

echo "🧪 Test notifications sent to Discord!"
echo "Check your Discord channel to verify the notifications were received."
