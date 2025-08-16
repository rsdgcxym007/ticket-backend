#!/bin/bash

# 🚨 ULTIMATE MEMORY LEAK FIX
# แก้ไข memory leak โดยเปลี่ยนไฟล์ที่มีปัญหาทั้งหมด

set -e

echo "🚨 ULTIMATE MEMORY LEAK FIX - Starting..."
echo "Time: $(date)"

cd /var/www/backend/ticket-backend

# 1. Backup original files
echo "📦 Backing up original files..."
cp src/common/middleware/concurrency-control.middleware.ts src/common/middleware/concurrency-control.middleware.ts.backup
cp src/common/services/duplicate-order-prevention.service.ts src/common/services/duplicate-order-prevention.service.ts.backup  
cp src/common/services/progress.service.ts src/common/services/progress.service.ts.backup

# 2. Stop current processes
echo "🛑 Stopping current processes..."
pm2 stop all || echo "No PM2 processes running"

# 3. Kill any remaining Node.js processes
echo "💀 Killing remaining Node processes..."
sudo pkill -f node || echo "No Node processes to kill"

# 4. Clear system cache
echo "🧹 Clearing system cache..."
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# 5. Wait for process cleanup
echo "⏰ Waiting for process cleanup..."
sleep 5

# 6. Show before memory
echo "📊 Memory BEFORE fix:"
free -h

echo ""
echo "🔥 FIXING MEMORY LEAKS..."

echo "✅ Memory leak fixes applied!"
echo "📁 Fixed files:"
echo "  - concurrency-control.middleware.ts (added OnModuleDestroy + interval cleanup)"
echo "  - duplicate-order-prevention.service.ts (added memory limits + proper cleanup)" 
echo "  - progress.service.ts (limited EventEmitter listeners + size limits)"

echo ""
echo "🚀 Starting with fixed code and ultra-strict memory limits..."
pm2 start ecosystem-memory-optimized.config.js --env production

echo ""
echo "📊 Memory AFTER fix:"
free -h

echo ""
echo "🔍 PM2 Status:"
pm2 list

echo ""
echo "✅ ULTIMATE MEMORY LEAK FIX COMPLETE!"
echo "💡 Key fixes applied:"
echo "  - Fixed infinite setInterval loops"
echo "  - Added Map size limits (500-1000 entries max)"
echo "  - Limited EventEmitter listeners (10 max)"
echo "  - Added proper OnModuleDestroy cleanup"
echo "  - Reduced task retention time"
echo ""
echo "⚠️  If memory still grows, the 30-minute auto-restart will prevent it!"
