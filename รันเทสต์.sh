#!/bin/bash

# ========================================
# 🧪 วิธีการรันเทสต์ระบบจองตั๋ว
# ========================================

echo "🎯 กำลังเริ่มเทสต์ระบบจองตั๋ว..."
echo ""

# เช็คว่าโปรเจคพร้อมรันมั้ย
echo "📋 ตรวจสอบความพร้อม..."
if ! command -v npm &> /dev/null; then
    echo "❌ ไม่พบ npm กรุณาติดตั้ง Node.js ก่อน"
    exit 1
fi

echo "✅ npm พร้อมใช้งาน"

# ติดตั้ง dependencies ถ้ายังไม่มี
if [ ! -d "node_modules" ]; then
    echo "📦 กำลังติดตั้ง dependencies..."
    npm install
fi

echo ""
echo "========================================="
echo "🧪 เมนูการเทสต์"
echo "========================================="
echo "1. เทสต์พื้นฐาน (Unit Tests)"
echo "2. เทสต์ API (E2E Tests)" 
echo "3. เทสต์ทุกอย่าง (ครบทุกเคส)"
echo "4. เทสต์เฉพาะ Order Service"
echo "5. ดูสถานะการคอมไพล์"
echo "========================================="

read -p "เลือกหมายเลข (1-5): " choice

case $choice in
    1)
        echo "🧪 กำลังรัน Unit Tests..."
        npm run test
        ;;
    2)
        echo "🌐 กำลังรัน E2E Tests..."
        echo "⚠️  หมายเหตุ: ต้องมีฐานข้อมูลเทสต์"
        npm run test:e2e
        ;;
    3)
        echo "🚀 กำลังรันเทสต์ทุกเคส..."
        echo "1️⃣ ตรวจสอบการคอมไพล์..."
        npm run build
        
        echo "2️⃣ รัน Unit Tests..."
        npm run test
        
        echo "3️⃣ รัน E2E Tests..."
        npm run test:e2e
        
        echo "✅ เทสต์เสร็จสิ้น!"
        ;;
    4)
        echo "📦 กำลังเทสต์ Order Service..."
        npm run test -- --testPathPattern=order.service
        ;;
    5)
        echo "🔍 ตรวจสอบการคอมไพล์..."
        npx tsc --noEmit --skipLibCheck
        if [ $? -eq 0 ]; then
            echo "✅ คอมไพล์ผ่าน ไม่มีข้อผิดพลาด"
        else
            echo "❌ มีข้อผิดพลาดในการคอมไพล์"
        fi
        ;;
    *)
        echo "❌ กรุณาเลือกหมายเลข 1-5"
        ;;
esac

echo ""
echo "🎉 เทสต์เสร็จสิ้น!"
