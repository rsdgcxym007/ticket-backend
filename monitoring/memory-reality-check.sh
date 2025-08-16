#!/bin/bash

# 🔍 MEMORY REALITY CHECK - เปรียบเทียบ VPS monitoring กับความจริง
# แสดงให้เห็นความแตกต่างระหว่าง VPS panel และ actual usage

echo "🔍 MEMORY REALITY CHECK"
echo "Time: $(date)"
echo "=================================="

# Get memory info
TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
AVAILABLE_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
FREE_KB=$(grep MemFree /proc/meminfo | awk '{print $2}')
CACHED_KB=$(grep "^Cached:" /proc/meminfo | awk '{print $2}')
BUFFERS_KB=$(grep Buffers /proc/meminfo | awk '{print $2}')

USED_KB=$((TOTAL_KB - AVAILABLE_KB))
VPS_REPORTED_KB=$((TOTAL_KB - FREE_KB))

TOTAL_MB=$((TOTAL_KB / 1024))
USED_MB=$((USED_KB / 1024))
VPS_REPORTED_MB=$((VPS_REPORTED_KB / 1024))
CACHE_MB=$(((CACHED_KB + BUFFERS_KB) / 1024))

echo "📊 MEMORY COMPARISON:"
echo ""
echo "🎯 ACTUAL APPLICATION USAGE:"
echo "   Used by Applications: ${USED_MB}MB (${USED_KB} KB)"
echo "   Percentage of Total:  $((USED_MB * 100 / TOTAL_MB))%"
echo ""
echo "📈 VPS MONITORING SHOWS:"
echo "   Reported as 'Used':   ${VPS_REPORTED_MB}MB (${VPS_REPORTED_KB} KB)"
echo "   Percentage of Total:  $((VPS_REPORTED_MB * 100 / TOTAL_MB))%"
echo ""
echo "💿 DIFFERENCE (CACHE):"
echo "   Cache & Buffers:      ${CACHE_MB}MB"
echo "   This is disk cache for performance!"
echo ""
echo "🔍 PROCESS BREAKDOWN:"

echo "Node.js processes:"
NODE_TOTAL_KB=0
while IFS= read -r line; do
    if [[ $line == *"node"* ]] && [[ $line != *"grep"* ]]; then
        RSS=$(echo "$line" | awk '{print $6}')
        NODE_TOTAL_KB=$((NODE_TOTAL_KB + RSS))
        echo "  $(echo "$line" | awk '{printf "%-40s %8s KB\n", $11, $6}')"
    fi
done <<< "$(ps aux)"

if [ $NODE_TOTAL_KB -gt 0 ]; then
    NODE_MB=$((NODE_TOTAL_KB / 1024))
    echo "  Total Node.js: ${NODE_MB}MB"
fi

echo ""
echo "PostgreSQL processes:"
PG_TOTAL_KB=0
while IFS= read -r line; do
    if [[ $line == *"postgres"* ]] && [[ $line != *"grep"* ]]; then
        RSS=$(echo "$line" | awk '{print $6}')
        PG_TOTAL_KB=$((PG_TOTAL_KB + RSS))
    fi
done <<< "$(ps aux)"

if [ $PG_TOTAL_KB -gt 0 ]; then
    PG_MB=$((PG_TOTAL_KB / 1024))
    echo "  Total PostgreSQL: ${PG_MB}MB"
fi

echo ""
echo "🎯 SUMMARY:"
echo "  Real Applications:    ${USED_MB}MB"
echo "  VPS Panel Shows:      ${VPS_REPORTED_MB}MB"
echo "  Difference:           $((VPS_REPORTED_MB - USED_MB))MB (mostly cache)"
echo ""

if [ $((VPS_REPORTED_MB - USED_MB)) -gt 1000 ]; then
    echo "🚨 VPS monitoring is inflated by ${VPS_REPORTED_MB - USED_MB}MB of cache"
    echo "💡 Run permanent-memory-optimization.sh to fix this"
else
    echo "✅ VPS monitoring is reasonably accurate"
fi
