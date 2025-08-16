#!/bin/bash

# 🎯 REAL MEMORY USAGE MONITOR
# สำหรับ cron job และ continuous monitoring

LOG_FILE="/var/log/accurate-memory.log"

# ดึงข้อมูล Memory
TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
AVAILABLE_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
USED_KB=$((TOTAL_KB - AVAILABLE_KB))

# แปลงเป็น MB
TOTAL_MB=$((TOTAL_KB / 1024))
USED_MB=$((USED_KB / 1024))
USED_PERCENT=$((USED_MB * 100 / TOTAL_MB))

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# บันทึก log
echo "${TIMESTAMP} - Real Memory Usage: ${USED_MB}MB/${TOTAL_MB}MB (${USED_PERCENT}%)" >> $LOG_FILE

# แสดงผล
echo "📊 Real Memory Usage: ${USED_MB}MB/${TOTAL_MB}MB (${USED_PERCENT}%)"

# เตือนถ้า Memory ใช้มาก
if [ $USED_PERCENT -gt 80 ]; then
    echo "🚨 WARNING: High memory usage!"
    # ส่ง Discord notification (ถ้าต้องการ)
fi
