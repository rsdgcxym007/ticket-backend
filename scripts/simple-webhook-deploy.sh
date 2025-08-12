#!/bin/bash

# Simple Webhook Deploy Script - Based on working production pattern
# Keep it simple, stupid!

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

notify() { 
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{\"content\": \"$1\"}" \
         "$DISCORD_WEBHOOK" 2>/dev/null || true
}

# Change to project directory
cd /var/www/backend/ticket-backend || { notify "❌ [Backend] Failed to access project directory"; exit 1; }

# Pull latest changes
git pull origin feature/newfunction || { notify "❌ [Backend] git pull fail"; exit 1; }

# Backup env file
cp .env.production .env.production.bak 2>/dev/null || true

# Install dependencies  
npm install || { notify "❌ [Backend] npm install fail"; exit 1; }

# Build application
npm run build || { notify "❌ [Backend] build fail"; exit 1; }

# Restart PM2
pm2 restart ticket-backend-prod || { notify "❌ [Backend] restart fail"; exit 1; }

# Success notification with commit info
COMMIT=$(git log -1 --pretty=format:"%h - %s by %an")
notify "✅ [Backend] Deploy success: $COMMIT"

echo "✅ Simple deployment completed successfully!"
