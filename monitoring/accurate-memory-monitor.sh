#!/bin/bash

# 🔧 ACCURATE MEMORY MONITOR 
# แสดง Memory usage ที่ถูกต้อง (ไม่รวม disk cache)

set -e

echo "🔧 ACCURATE MEMORY MONITOR - Starting..."
echo "Time: $(date)"

echo ""
echo "📊 MEMORY BREAKDOWN:"

# ดึงข้อมูล Memory จาก /proc/meminfo
TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
FREE_KB=$(grep MemFree /proc/meminfo | awk '{print $2}')
AVAILABLE_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
CACHED_KB=$(grep "^Cached:" /proc/meminfo | awk '{print $2}')
BUFFERS_KB=$(grep Buffers /proc/meminfo | awk '{print $2}')
SRECLAIM_KB=$(grep SReclaimable /proc/meminfo | awk '{print $2}')

# คำนวณ Memory ที่ใช้จริง
USED_KB=$((TOTAL_KB - AVAILABLE_KB))
CACHE_KB=$((CACHED_KB + BUFFERS_KB + SRECLAIM_KB))

# แปลงเป็น MB
TOTAL_MB=$((TOTAL_KB / 1024))
USED_MB=$((USED_KB / 1024))
AVAILABLE_MB=$((AVAILABLE_KB / 1024))
CACHE_MB=$((CACHE_KB / 1024))

# คำนวณ %
USED_PERCENT=$((USED_MB * 100 / TOTAL_MB))
AVAILABLE_PERCENT=$((AVAILABLE_MB * 100 / TOTAL_MB))
CACHE_PERCENT=$((CACHE_MB * 100 / TOTAL_MB))

echo "💾 Total Memory:     ${TOTAL_MB}MB (4GB)"
echo "🔥 Used (Real):      ${USED_MB}MB (${USED_PERCENT}%)"
echo "✅ Available:        ${AVAILABLE_MB}MB (${AVAILABLE_PERCENT}%)"
echo "💿 Cache/Buffers:    ${CACHE_MB}MB (${CACHE_PERCENT}%)"

echo ""
echo "📈 MEMORY STATUS:"
if [ $USED_PERCENT -lt 50 ]; then
    echo "✅ EXCELLENT - Memory usage under 50%"
elif [ $USED_PERCENT -lt 70 ]; then
    echo "🟡 GOOD - Memory usage acceptable"  
elif [ $USED_PERCENT -lt 85 ]; then
    echo "🟠 WARNING - Memory usage high"
else
    echo "🚨 CRITICAL - Memory usage very high"
fi

echo ""
echo "🔍 TOP MEMORY CONSUMERS (Real Usage):"
ps aux --sort=-%mem | head -10 | awk '{printf "%-20s %5s %5s %10s %10s %s\n", $1, $2, $3, $4, $6, $11}'

echo ""
echo "📊 PROCESS BREAKDOWN:"
echo "Node.js processes:"
NODE_TOTAL=0
while read -r line; do
    if [[ $line == *"node"* ]]; then
        RSS=$(echo $line | awk '{print $6}')
        NODE_TOTAL=$((NODE_TOTAL + RSS))
        echo "  $line" | awk '{printf "  %-50s %8s KB\n", $11, $6}'
    fi
done <<< "$(ps aux)"

if [ $NODE_TOTAL -gt 0 ]; then
    NODE_MB=$((NODE_TOTAL / 1024))
    echo "  Total Node.js Memory: ${NODE_MB}MB"
fi

echo ""
echo "Database processes:"
PG_TOTAL=0
while read -r line; do
    if [[ $line == *"postgres"* ]]; then
        RSS=$(echo $line | awk '{print $6}')
        PG_TOTAL=$((PG_TOTAL + RSS))
        echo "  $line" | awk '{printf "  %-50s %8s KB\n", $11, $6}'
    fi
done <<< "$(ps aux)"

if [ $PG_TOTAL -gt 0 ]; then
    PG_MB=$((PG_TOTAL / 1024))
    echo "  Total PostgreSQL Memory: ${PG_MB}MB"
fi

echo ""
echo "💡 EXPLANATION:"
echo "  • 'Used (Real)' = Memory actually occupied by applications"
echo "  • 'Cache/Buffers' = Linux disk cache (automatically freed when needed)" 
echo "  • 'Available' = Memory available for applications (includes freeable cache)"
echo ""
echo "🎯 Your system is using only ${USED_MB}MB out of ${TOTAL_MB}MB"
echo "   The other ${CACHE_MB}MB is just disk cache for performance"

echo ""
echo "✅ Accurate memory monitoring complete!"
