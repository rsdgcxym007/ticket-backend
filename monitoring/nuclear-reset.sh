#!/bin/bash

# 🚨 NUCLEAR RESET - ลบทุกอย่าง เริ่มใหม่
# แก้ Memory leak แบบจริงจัง

set -e

echo "🚨 NUCLEAR RESET - Starting Complete System Reset..."
echo "Time: $(date)"

# 1. แสดง Memory ก่อนลบ
echo "📊 Memory BEFORE nuclear reset:"
free -h
echo ""

# 2. ลบทุก Node.js process
echo "💀 KILLING ALL NODE.JS PROCESSES..."
sudo pkill -9 node || echo "No Node processes to kill"
sudo pkill -9 pm2 || echo "No PM2 processes to kill"

# 3. ลบทุก PM2 ของทุก user
echo "🗑️ REMOVING ALL PM2 DATA..."
pm2 kill || echo "PM2 already stopped"
pm2 delete all || echo "No processes to delete"
rm -rf /root/.pm2 || echo "No root PM2 data"
rm -rf /home/nodeapp/.pm2 || echo "No nodeapp PM2 data"

# 4. หยุด services ที่ไม่จำเป็น
echo "🛑 STOPPING UNNECESSARY SERVICES..."
systemctl stop fail2ban || echo "Fail2ban not running"
systemctl stop dovecot || echo "Dovecot not running"
systemctl stop postfix || echo "Postfix not running"

# 5. ลบ cache ทั้งหมด
echo "🧹 CLEARING ALL CACHES..."
sudo sync
echo 3 | sudo tee /proc/sys/vm/drop_caches
sudo sysctl vm.drop_caches=3
apt-get clean || echo "APT clean failed"
journalctl --vacuum-size=50M || echo "Journal clean failed"

# 6. ลบ log files เก่า
echo "📝 CLEANING LOG FILES..."
find /var/log -type f -name "*.log" -mtime +1 -delete || echo "Log cleanup failed"
find /var/log -type f -name "*.log.*" -delete || echo "Old log cleanup failed"

# 7. ลบ temp files
echo "🗂️ CLEANING TEMP FILES..."
rm -rf /tmp/* || echo "Temp cleanup failed"
rm -rf /var/tmp/* || echo "Var temp cleanup failed"

# 8. รอให้ระบบ settle
echo "⏰ Waiting for system to settle..."
sleep 10

# 9. แสดง Memory หลังลบ
echo "📊 Memory AFTER cleanup:"
free -h
echo ""

# 10. ตรวจสอบ process ที่เหลือ
echo "🔍 Remaining processes:"
ps aux --sort=-%mem | head -10

echo ""
echo "✅ NUCLEAR RESET COMPLETE!"
echo "🚀 Ready for clean deployment..."
