#!/bin/bash

# 📊 MEMORY DASHBOARD - แสดงภาพรวม memory แบบเรียลไทม์

clear
echo "📊 PATONG BOXING STADIUM - MEMORY DASHBOARD"
echo "==========================================="
echo "Time: $(date)"
echo ""

# Memory Overview
echo "💾 MEMORY OVERVIEW:"
free -h

echo ""
echo "🎯 ACTUAL vs VPS MONITORING:"

# คำนวณค่าต่างๆ
TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
AVAILABLE_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
FREE_KB=$(grep MemFree /proc/meminfo | awk '{print $2}')
CACHED_KB=$(grep "^Cached:" /proc/meminfo | awk '{print $2}')
BUFFERS_KB=$(grep Buffers /proc/meminfo | awk '{print $2}')

USED_KB=$((TOTAL_KB - AVAILABLE_KB))
VPS_SHOWN_KB=$((TOTAL_KB - FREE_KB))
CACHE_KB=$((CACHED_KB + BUFFERS_KB))

TOTAL_MB=$((TOTAL_KB / 1024))
USED_MB=$((USED_KB / 1024))
VPS_SHOWN_MB=$((VPS_SHOWN_KB / 1024))
CACHE_MB=$((CACHE_KB / 1024))

echo "  🔥 Applications Actually Use: ${USED_MB}MB (${USED_PERCENT}%)"
echo "  📈 VPS Panel Shows:          ${VPS_SHOWN_MB}MB"  
echo "  💿 Cache for Performance:    ${CACHE_MB}MB"
echo ""

# Status แยกตาม level
if [ $CACHE_MB -lt 200 ]; then
    CACHE_STATUS="🐌 LOW (May be slow)"
elif [ $CACHE_MB -lt 500 ]; then
    CACHE_STATUS="⚡ GOOD (Balanced)"
elif [ $CACHE_MB -lt 1000 ]; then
    CACHE_STATUS="🚀 HIGH (Fast but VPS shows high)"
else
    CACHE_STATUS="🚨 EXCESSIVE (VPS monitoring inflated)"
fi

echo "📈 PERFORMANCE STATUS: $CACHE_STATUS"

echo ""
echo "🎯 TOP PROCESSES:"
ps aux --sort=-%mem | head -8 | awk 'NR==1 || NR>1 {printf "%-10s %5s %5s %8s %s\n", $1, $2, $4, $6, $11}'

echo ""
echo "🔍 APPLICATION BREAKDOWN:"

# Node.js
NODE_TOTAL_KB=0
NODE_COUNT=0
while IFS= read -r line; do
    if [[ $line == *"node"* ]] && [[ $line != *"grep"* ]]; then
        RSS=$(echo "$line" | awk '{print $6}')
        NODE_TOTAL_KB=$((NODE_TOTAL_KB + RSS))
        NODE_COUNT=$((NODE_COUNT + 1))
    fi
done <<< "$(ps aux)"

# PostgreSQL  
PG_TOTAL_KB=0
PG_COUNT=0
while IFS= read -r line; do
    if [[ $line == *"postgres"* ]] && [[ $line != *"grep"* ]]; then
        RSS=$(echo "$line" | awk '{print $6}')
        PG_TOTAL_KB=$((PG_TOTAL_KB + RSS))
        PG_COUNT=$((PG_COUNT + 1))
    fi
done <<< "$(ps aux)"

if [ $NODE_TOTAL_KB -gt 0 ]; then
    NODE_MB=$((NODE_TOTAL_KB / 1024))
    echo "  🚀 Node.js (${NODE_COUNT} processes): ${NODE_MB}MB"
fi

if [ $PG_TOTAL_KB -gt 0 ]; then
    PG_MB=$((PG_TOTAL_KB / 1024))
    echo "  🗄️ PostgreSQL (${PG_COUNT} processes): ${PG_MB}MB"
fi

echo ""
echo "📊 MONITORING ACCURACY:"
DIFF_MB=$((VPS_SHOWN_MB - USED_MB))
ACCURACY_PERCENT=$(((USED_MB * 100) / VPS_SHOWN_MB))

if [ $DIFF_MB -lt 200 ]; then
    echo "  ✅ EXCELLENT - VPS monitoring accurate (${ACCURACY_PERCENT}%)"
elif [ $DIFF_MB -lt 500 ]; then
    echo "  🟡 GOOD - Minor cache inflation (+${DIFF_MB}MB)"
else
    echo "  🔧 NEEDS ADJUSTMENT - Cache inflating by +${DIFF_MB}MB"
fi

echo ""
echo "💡 RECOMMENDATIONS:"
if [ $CACHE_MB -gt 800 ]; then
    echo "  • Run: ./monitoring/balanced-memory-manager.sh"
elif [ $CACHE_MB -lt 150 ]; then
    echo "  • Cache is low - performance may be reduced"
    echo "  • Consider stopping cache clearing cron jobs"
else
    echo "  • System is optimally balanced! 🎯"
fi

echo ""
echo "🔄 Auto-refresh in 10 seconds... (Ctrl+C to exit)"
