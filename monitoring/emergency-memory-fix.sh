#!/bin/bash

# 🚨 Emergency Memory Leak Fix Script
# Force restart with ultra-strict memory settings

set -e

echo "🔥 EMERGENCY MEMORY LEAK REPAIR - Starting..."
echo "Time: $(date)"

cd /var/www/backend/ticket-backend

# 1. Kill ALL Node.js processes
echo "💀 Killing all Node.js processes..."
sudo pkill -f node || echo "No Node.js processes to kill"
sudo pkill -f pm2 || echo "No PM2 processes to kill"

# 2. Clear system caches aggressively
echo "🧹 Clearing all system caches..."
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# 3. Reset PM2 completely
echo "🔄 Resetting PM2 completely..."
pm2 kill || echo "PM2 already stopped"
pm2 delete all || echo "No processes to delete"

# 4. Start with ultra-strict memory config
echo "🚀 Starting with ULTRA-STRICT memory limits..."
pm2 start ecosystem-memory-optimized.config.js --env production

# 5. Show memory usage
echo "📊 Current memory status:"
free -h
echo ""
echo "🔍 PM2 Status:"
pm2 list
pm2 monit --no-interaction &
sleep 3
pkill -f "pm2 monit"

echo ""
echo "✅ Emergency memory fix complete!"
echo "💡 Process restarted with 256MB heap limit"
echo "⚠️  Will auto-restart every 30 minutes"
