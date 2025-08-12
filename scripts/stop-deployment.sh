#!/bin/bash

# Script เพื่อหยุด deployment ที่ค้างอยู่
# Stop stuck deployment script

echo "🛑 กำลังหยุด deployment script ที่ค้างอยู่..."

# ค้นหา process ของ webhook-deploy.sh
DEPLOY_PIDS=$(pgrep -f "webhook-deploy.sh" 2>/dev/null || true)

if [ -n "$DEPLOY_PIDS" ]; then
    echo "📍 พบ deployment processes ที่กำลังทำงาน:"
    ps aux | grep "webhook-deploy.sh" | grep -v grep
    
    echo ""
    echo "🔄 กำลังหยุด processes..."
    
    # หยุด processes อย่างสุภาพก่อน
    for pid in $DEPLOY_PIDS; do
        echo "⏹️  หยุด process $pid (SIGTERM)..."
        kill -TERM "$pid" 2>/dev/null || true
    done
    
    # รอ 5 วินาที
    sleep 5
    
    # ตรวจสอบว่ายังทำงานอยู่หรือไม่
    REMAINING_PIDS=$(pgrep -f "webhook-deploy.sh" 2>/dev/null || true)
    
    if [ -n "$REMAINING_PIDS" ]; then
        echo "⚠️  ยังมี processes ที่ทำงานอยู่ กำลังใช้ force kill..."
        for pid in $REMAINING_PIDS; do
            echo "💀 Force kill process $pid (SIGKILL)..."
            kill -KILL "$pid" 2>/dev/null || true
        done
    fi
    
    sleep 2
    
    # ตรวจสอบผลลัพธ์
    FINAL_CHECK=$(pgrep -f "webhook-deploy.sh" 2>/dev/null || true)
    
    if [ -z "$FINAL_CHECK" ]; then
        echo "✅ หยุด deployment scripts สำเร็จแล้ว!"
    else
        echo "❌ ยังมี processes ที่ทำงานอยู่:"
        ps aux | grep "webhook-deploy.sh" | grep -v grep
    fi
else
    echo "✅ ไม่พบ deployment script ที่กำลังทำงาน"
fi

# ตรวจสอบสถานะ PM2
echo ""
echo "📊 สถานะ PM2 ปัจจุบัน:"
pm2 status ticket-backend-prod 2>/dev/null || echo "❌ PM2 process ไม่พบ"

# ตรวจสอบสถานะแอปพลิเคชัน
echo ""
echo "🌐 ตรวจสอบสถานะแอปพลิเคชัน:"
if curl -f -s "http://localhost:4000/api/v1" >/dev/null 2>&1; then
    echo "✅ แอปพลิเคชันทำงานปกติ (HTTP 200)"
elif curl -f -s "http://localhost:4000" >/dev/null 2>&1; then
    echo "✅ แอปพลิเคชันตอบสนอง"
else
    echo "❌ แอปพลิเคชันไม่ตอบสนอง"
fi

echo ""
echo "🎯 การทำงานเสร็จสิ้น!"
