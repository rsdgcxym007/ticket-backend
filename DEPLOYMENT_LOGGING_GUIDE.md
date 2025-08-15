# 📋 Deployment Logging Guide

## การปรับปรุงการ Logging ที่เพิ่มขึ้น

### ✅ ความสามารถใหม่ที่เพิ่ม:

1. **📅 Timestamp ทุกข้อความ**
   - ทุก log จะมี timestamp แบบ `[2025-08-13 10:30:45]`
   - สามารถติดตามเวลาที่แต่ละขั้นตอนทำงาน

2. **📋 Step Tracking**
   - แต่ละขั้นตอนหลักจะมี `STEP 1`, `STEP 2`, etc.
   - Sub-steps จะแสดงเป็น `└─ sub-task`

3. **🎨 Color Coding**
   - 🔵 Blue: ข้อมูลทั่วไป
   - 🟢 Green: สำเร็จ
   - 🟡 Yellow: คำเตือน
   - 🔴 Red: ข้อผิดพลาด
   - 🟣 Purple: Step หลัก
   - 🔵 Cyan: Sub-steps

4. **📁 Log Files**
   - `/tmp/webhook-deploy.log` - สำหรับ webhook-deploy.sh
   - `/tmp/build-deploy.log` - สำหรับ build-and-deploy.sh
   - `/tmp/deploy.log` - สำหรับ deploy.sh

5. **🔍 Command Tracking**
   - แสดงคำสั่งที่กำลังรันก่อนที่จะรัน
   - เช่น `└─ Executing: npm install --production=false`

## 📊 ตัวอย่าง Output

```bash
[2025-08-13 10:30:45] 📋 STEP 1: Initializing project directory
[2025-08-13 10:30:45]   └─ Changing to project directory: /var/www/backend/ticket-backend
[2025-08-13 10:30:45]   └─ Executing: cd /var/www/backend/ticket-backend
[2025-08-13 10:30:45] ✅ WEBHOOK: Successfully changed to project directory

[2025-08-13 10:30:46] 📋 STEP 2: Starting webhook deployment flow
[2025-08-13 10:30:46]   └─ Project directory: /var/www/backend/ticket-backend
[2025-08-13 10:30:46]   └─ Target branch: feature/newfunction
[2025-08-13 10:30:46]   └─ Discord webhook: https://discord.com/api/webhooks/1404715794205511752...
[2025-08-13 10:30:46]   └─ GitHub webhook: http://43.229.133.51:4200/hooks/deploy-backend-master
[2025-08-13 10:30:46] ✅ WEBHOOK: Webhook deployment flow initialized

[2025-08-13 10:30:47] 📋 STEP 3: Installing dependencies
[2025-08-13 10:30:47]   └─ Using npm install for maximum compatibility
[2025-08-13 10:30:47]   └─ Executing: npm install --production=false
[2025-08-13 10:31:23] ✅ WEBHOOK: Dependencies installed with npm install
```

## 🔧 ฟีเจอร์ที่ปรับปรุงใน Scripts:

### webhook-deploy.sh
- ✅ Enhanced step tracking (8 main steps)
- ✅ Command logging with timestamps
- ✅ Build verification with file size info
- ✅ PM2 status checking with detailed output
- ✅ Comprehensive error messages

### build-and-deploy.sh
- ✅ Node.js and npm version checking
- ✅ Retry logic tracking (attempt 1/2/3)
- ✅ Build file analysis
- ✅ Quick application testing
- ✅ PM2 process management logging

### deploy.sh
- ✅ Webhook parameter analysis
- ✅ Branch detection and validation
- ✅ Git operation step-by-step tracking
- ✅ Environment variable logging

## 📁 การติดตาม Log Files

### Real-time monitoring:
```bash
# ดู log แบบ real-time
tail -f /tmp/webhook-deploy.log
tail -f /tmp/build-deploy.log
tail -f /tmp/deploy.log

# ดู log ทั้งหมด
cat /tmp/webhook-deploy.log
cat /tmp/build-deploy.log
cat /tmp/deploy.log

# หา error
grep -i error /tmp/webhook-deploy.log
grep -i failed /tmp/build-deploy.log
```

## 🎯 การใช้งาน

เมื่อมีปัญหาหรือต้องการตรวจสอบ:

1. **ดู Console Output** - จะเห็นทันทีว่าติดขั้นตอนไหน
2. **ตรวจสอบ Log Files** - ดูรายละเอียดเพิ่มเติม
3. **ติดตาม Step Numbers** - รู้ว่าไปถึงขั้นตอนไหนแล้ว
4. **ดู Command Output** - รู้ว่าคำสั่งไหนล้มเหลว
5. **ตรวจสอบ Timestamp** - วิเคราะห์เวลาที่ใช้ในแต่ละขั้นตอน

## 🚨 Error Troubleshooting

เมื่อเจอ error จะได้ข้อมูลดังนี้:
- 🕐 เวลาที่เกิด error
- 📍 Step และ substep ที่เกิดปัญหา
- 🔧 คำสั่งที่ล้มเหลว
- 📝 ข้อความ error แบบละเอียด
- 💡 คำแนะนำแก้ไข (ถ้ามี)

ตัวอย่าง error message:
```bash
[2025-08-13 10:35:22] ❌ WEBHOOK: BUILD FAILED
[2025-08-13 10:35:22] ERROR:    • npm run build command failed
[2025-08-13 10:35:22]   └─ Checking TypeScript compilation issues
[2025-08-13 10:35:22]   └─ Executing: npx tsc --noEmit
```

การ logging ใหม่นี้จะช่วยให้คุณติดตามและแก้ไขปัญหาได้อย่างมีประสิทธิภาพมากขึ้น! 🎉
