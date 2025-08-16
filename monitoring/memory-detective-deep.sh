#!/bin/bash

# 🔍 MEMORY DETECTIVE - ตรวจหาตัวจริงที่กิน Memory
# ค้นหาสาเหตุที่แท้จริงของ Memory leak

set -e

echo "🔍 MEMORY DETECTIVE - Finding Real Memory Culprit..."
echo "Time: $(date)"

cd /var/www/backend/ticket-backend

echo ""
echo "📊 Current Memory Status:"
free -h

echo ""
echo "🔍 Top Memory Consumers:"
ps aux --sort=-%mem | head -15

echo ""
echo "🧠 Memory by Process Type:"
echo "Node.js processes:"
ps aux | grep node | grep -v grep || echo "No Node.js processes"

echo ""
echo "Database processes:"
ps aux | grep postgres | grep -v grep || echo "No PostgreSQL processes"

echo ""
echo "Web server processes:"
ps aux | grep nginx | grep -v grep || echo "No Nginx processes"

echo ""
echo "📈 System Memory Info:"
cat /proc/meminfo | head -20

echo ""
echo "🔍 Memory Mapped Files:"
ls -lah /proc/*/maps 2>/dev/null | wc -l || echo "Cannot access memory maps"

echo ""
echo "💾 Swap Usage:"
swapon -s || echo "No swap configured"

echo ""
echo "📊 Disk Cache Usage:"
cat /proc/meminfo | grep -E "Cached|Buffers|SReclaimable"

echo ""
echo "🔍 Large Files in Memory:"
lsof +L1 2>/dev/null | head -10 || echo "Cannot list open files"

echo ""
echo "🚨 SUSPECTED MEMORY LEAKS:"
echo "1. Check if PostgreSQL shared_buffers is too high"
echo "2. Check if Nginx worker_connections is too high"  
echo "3. Check if system cache is holding too much"
echo "4. Check if there are zombie processes"

echo ""
echo "🔧 NEXT STEPS:"
echo "1. Run nuclear-reset.sh to clean everything"
echo "2. Deploy minimal configuration"
echo "3. Monitor memory step by step"

echo ""
echo "✅ Memory detective investigation complete!"
