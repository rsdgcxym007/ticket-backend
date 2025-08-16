#!/bin/bash

# 🔧 System Performance Fix Script
# แก้ไขปัญหา CPU และ Memory สูง

echo "🔧 System Performance Fix - $(date)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. 📊 ตรวจสอบสถานะปัจจุบัน
print_status "Current system status:"
echo "   CPU Load: $(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1 | xargs)"
echo "   Memory: $(free -m | grep 'Mem:' | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "   Disk: $(df -h / | tail -1 | awk '{print $5}')"
echo ""

# 2. 🔍 ตรวจสอบ Node.js processes
print_status "Node.js processes consuming resources:"
ps aux | grep node | grep -v grep | awk '{printf "PID: %-8s CPU: %-6s MEM: %-6s CMD: %s\n", $2, $3"%", $4"%", $11}'
echo ""

# 3. 🧹 ล้าง Memory caches
print_status "Clearing system caches..."
echo 1 > /proc/sys/vm/drop_caches
echo 2 > /proc/sys/vm/drop_caches  
echo 3 > /proc/sys/vm/drop_caches
sync
print_success "System caches cleared"

# 4. 🔄 Force garbage collection สำหรับ Node.js
print_status "Triggering Node.js garbage collection..."
NODE_PIDS=$(pgrep -f "ticket-backend")
for pid in $NODE_PIDS; do
    if [ -n "$pid" ]; then
        kill -USR2 "$pid" 2>/dev/null || true
        print_status "Sent GC signal to PID: $pid"
    fi
done

# 5. 📊 ตรวจสอบและจำกัด PM2 memory
print_status "Optimizing PM2 processes..."

# รีสตาร์ท app ถ้า memory เกิน 500MB
pm2 status ticket-backend-prod --no-header | while read line; do
    memory=$(echo "$line" | awk '{print $6}' | sed 's/mb//' | sed 's/gb/000/')
    if [ "$memory" -gt 500 ] 2>/dev/null; then
        print_warning "High memory usage detected: ${memory}MB"
        print_status "Restarting application to free memory..."
        pm2 restart ticket-backend-prod
    fi
done

# 6. 🛡️ ตั้งค่า limits
print_status "Applying resource limits..."

# Set nice priority for PM2 processes (lower priority)
NODE_PIDS=$(pgrep -f "PM2")
for pid in $NODE_PIDS; do
    renice +5 "$pid" > /dev/null 2>&1 || true
done

# 7. 🧪 ลบไฟล์ temporary
print_status "Cleaning temporary files..."
find /tmp -name "npm-*" -mtime +1 -delete 2>/dev/null || true
find /tmp -name ".npm" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
find /var/www/backend/ticket-backend -name "*.log" -mtime +7 -delete 2>/dev/null || true

# 8. 🔍 ตรวจสอบ background processes ที่อาจค้าง
print_status "Checking for stuck processes..."
STUCK_PROCESSES=$(ps aux | grep -E "(build|npm|node)" | grep -v grep | grep -v PM2 | wc -l)
if [ "$STUCK_PROCESSES" -gt 0 ]; then
    print_warning "Found $STUCK_PROCESSES potentially stuck processes"
    ps aux | grep -E "(build|npm|node)" | grep -v grep | grep -v PM2
    
    # ให้ผู้ใช้ตัดสินใจ
    echo ""
    print_warning "Kill stuck processes? (y/N)"
    read -t 10 -r response || response="n"
    if [[ "$response" =~ ^[Yy]$ ]]; then
        pkill -f "npm run build" 2>/dev/null || true
        pkill -f "nest build" 2>/dev/null || true
        print_success "Killed stuck build processes"
    fi
fi

# 9. ⚡ ปรับแต่ง Node.js environment
print_status "Optimizing Node.js environment variables..."
export NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size"
pm2 set pm2:memory_limit 600M

# 10. 📊 แสดงผลลัพธ์หลังแก้ไข
sleep 3
print_success "Performance fix completed!"
echo ""
print_status "System status after optimization:"
echo "   CPU Load: $(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1 | xargs)"
echo "   Memory: $(free -m | grep 'Mem:' | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo ""

print_status "PM2 Status:"
pm2 status ticket-backend-prod 2>/dev/null || print_error "PM2 app not found"

print_success "🎉 Performance optimization completed!"
print_status "Monitor with: watch -n 1 'free -m && uptime'"
