#!/bin/bash

# 🚀 BALANCED PERFORMANCE MEMORY MANAGER
# จัดการ memory ให้กราฟตรง แต่ยังคงประสิทธิภาพสูง

set -e

echo "🚀 BALANCED PERFORMANCE MEMORY MANAGER"
echo "Time: $(date)"

# ตั้งค่า optimal cache limits
OPTIMAL_CACHE_MB=600    # Cache พอใช้เพื่อความเร็ว
MAX_CACHE_MB=800        # ขีดจำกัดสูงสุด
AGGRESSIVE_CLEAR_MB=1200 # เคลียร์แบบ aggressive

# อ่านข้อมูล memory ปัจจุบัน
CACHED_KB=$(grep "^Cached:" /proc/meminfo | awk '{print $2}')
BUFFERS_KB=$(grep Buffers /proc/meminfo | awk '{print $2}')
TOTAL_CACHE_KB=$((CACHED_KB + BUFFERS_KB))
TOTAL_CACHE_MB=$((TOTAL_CACHE_KB / 1024))

echo "📊 Current cache: ${TOTAL_CACHE_MB}MB"

if [ $TOTAL_CACHE_MB -gt $AGGRESSIVE_CLEAR_MB ]; then
    echo "🚨 Cache too high (${TOTAL_CACHE_MB}MB), aggressive clear..."
    sync
    echo 3 > /proc/sys/vm/drop_caches
    echo "✅ Full cache clear completed"
    
elif [ $TOTAL_CACHE_MB -gt $MAX_CACHE_MB ]; then
    echo "⚠️ Cache above optimal (${TOTAL_CACHE_MB}MB), gentle clear..."
    sync  
    echo 1 > /proc/sys/vm/drop_caches  # เคลียร์ page cache อย่างเดียว
    echo "✅ Page cache cleared"
    
elif [ $TOTAL_CACHE_MB -gt $OPTIMAL_CACHE_MB ]; then
    echo "🔧 Cache acceptable (${TOTAL_CACHE_MB}MB), minor adjustment..."
    sync
    # เคลียร์เฉพาะ inode/dentry cache (น้อยที่สุด)
    echo 2 > /proc/sys/vm/drop_caches
    echo "✅ Minor cache adjustment"
    
else
    echo "✅ Cache optimal (${TOTAL_CACHE_MB}MB), no action needed"
fi

# แสดงผลหลังปรับ
echo ""
echo "📊 Memory after adjustment:"
free -h

# คำนวณ performance impact
CACHED_KB_AFTER=$(grep "^Cached:" /proc/meminfo | awk '{print $2}')
BUFFERS_KB_AFTER=$(grep Buffers /proc/meminfo | awk '{print $2}')
TOTAL_CACHE_KB_AFTER=$((CACHED_KB_AFTER + BUFFERS_KB_AFTER))
TOTAL_CACHE_MB_AFTER=$((TOTAL_CACHE_KB_AFTER / 1024))

echo ""
echo "📈 Performance Status:"
if [ $TOTAL_CACHE_MB_AFTER -gt 300 ]; then
    echo "🚀 EXCELLENT - Cache ${TOTAL_CACHE_MB_AFTER}MB (High Performance)"
elif [ $TOTAL_CACHE_MB_AFTER -gt 150 ]; then  
    echo "⚡ GOOD - Cache ${TOTAL_CACHE_MB_AFTER}MB (Good Performance)"
else
    echo "🐌 BASIC - Cache ${TOTAL_CACHE_MB_AFTER}MB (Basic Performance)"
fi

echo "🎯 VPS Monitoring should now show realistic memory usage"
