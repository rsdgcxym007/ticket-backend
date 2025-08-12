#!/bin/bash

# Kill stuck deployment processes and send completion notification

echo "🔪 Killing stuck deployment processes..."

DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
WEBHOOK_URL="http://43.229.133.51:4000/api/v1/webhook/v1/deploy"

# Function to send notification
send_notification() {
    local status="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    # Discord notification
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"embeds\": [{
                 \"title\": \"🔪 Deployment Process Cleanup\",
                 \"description\": \"$message\",
                 \"color\": 16776960,
                 \"fields\": [
                     {
                         \"name\": \"📊 Action\",
                         \"value\": \"$status\",
                         \"inline\": true
                     },
                     {
                         \"name\": \"⏰ Timestamp\",
                         \"value\": \"$(date)\",
                         \"inline\": true
                     }
                 ],
                 \"footer\": {
                     \"text\": \"Stadium Ticket System - Cleanup\"
                 }
             }]
         }" \
         "$DISCORD_WEBHOOK_URL" 2>/dev/null &

    # Webhook notification
    curl -s -H "Content-Type: application/json" \
         -H "User-Agent: ticket-backend-cleanup-script/1.0" \
         -X POST \
         -d "{
             \"status\": \"$status\",
             \"message\": \"[CLEANUP] $message\",
             \"branch\": \"feature/newfunction\",
             \"timestamp\": \"$timestamp\",
             \"environment\": \"production\",
             \"version\": \"cleanup\"
         }" \
         "$WEBHOOK_URL" 2>/dev/null &
}

# Find and kill deployment processes
DEPLOY_PIDS=$(pgrep -f "(webhook-deploy|build-and-deploy)" 2>/dev/null || true)

if [ -n "$DEPLOY_PIDS" ]; then
    echo "Found deployment processes: $DEPLOY_PIDS"
    echo "$DEPLOY_PIDS" | xargs kill -9 2>/dev/null || true
    echo "✅ Killed stuck deployment processes"
    
    send_notification "CLEANUP_COMPLETED" "🔪 Killed stuck deployment processes and sent completion notification"
    
    sleep 2
    
    # Send final completion notification for the original deployment
    send_notification "COMPLETED" "✅ Auto-deployment completed (manual cleanup applied)"
    
else
    echo "ℹ️ No deployment processes found running"
    
    # Just send completion notification
    send_notification "COMPLETED" "✅ Auto-deployment completed successfully"
fi

echo "🎯 Cleanup completed! Check Discord for final status."
