# 🚀 Super Tool - Quick Start Guide

## ✨ สิ่งที่รวมอยู่ใน Super Tool

**Super Tool** เป็น all-in-one script ที่รวมทุกฟีเจอร์ที่เคยแยกกันเป็น 8 files มาเป็นไฟล์เดียว:

### 🔧 ฟีเจอร์ที่รวมอยู่:
- ✅ **Resource Monitoring** - ตรวจสอบ CPU/RAM/Disk พร้อม Discord alerts
- ✅ **Auto-restart System** - restart อัตโนมัติเมื่อ backend ล่ม
- ✅ **Emergency Fixes** - แก้ปัญหาเร่งด่วนทุกประเภท
- ✅ **Node.js Management** - แก้ปัญหา installation conflicts
- ✅ **Dependency Management** - แก้ปัญหา MODULE_NOT_FOUND
- ✅ **Deployment System** - deploy quick/full
- ✅ **Dashboard & Diagnostics** - ดูสถานะระบบ real-time
- ✅ **Discord Integration** - แจ้งเตือนครบถ้วน

## 🚀 การใช้งาน

### Interactive Mode (แนะนำ)
```bash
# เรียกใช้ Super Tool แบบ interactive
./scripts/super-tool.sh

# หรือ
npm run super-tool
```

### Command Line Mode
```bash
# ดู dashboard
npm run monitor
# หรือ ./scripts/super-tool.sh --dashboard

# เริ่ม monitoring พร้อม alerts
npm run monitor:alert
# หรือ ./scripts/super-tool.sh --monitor

# Emergency diagnostics
npm run emergency
# หรือ ./scripts/super-tool.sh --emergency

# แก้ MODULE_NOT_FOUND
npm run fix-modules
# หรือ ./scripts/super-tool.sh --fix-modules

# แก้ Node.js issues
npm run fix-nodejs
# หรือ sudo ./scripts/super-tool.sh --fix-nodejs

# Quick deploy
npm run deploy-quick
# หรือ ./scripts/super-tool.sh --deploy-quick

# Full deploy (สำหรับ VPS ใหม่)
npm run deploy-full
# หรือ sudo ./scripts/super-tool.sh --deploy-full

# ทดสอบ Discord alerts
npm run test-alert
# หรือ ./scripts/super-tool.sh --test-alert

# Auto-restart monitor
npm run auto-restart
# หรือ ./scripts/super-tool.sh --auto-restart
```

## 📋 Interactive Menu

เมื่อรัน `./scripts/super-tool.sh` จะเจอ menu แบบนี้:

```
🔍 MONITORING & DIAGNOSTICS
  1. Show Dashboard
  2. Start Resource Monitoring (with alerts)
  3. Emergency Diagnostics
  4. Test Discord Alert

🚨 EMERGENCY FIXES
  5. Fix MODULE_NOT_FOUND Error
  6. Fix Node.js Installation Issues
  7. Fix PM2 Process Issues
  8. Fix High Resource Usage
  9. Complete System Reset

🚀 DEPLOYMENT & MANAGEMENT
 10. Quick Deploy (git pull + restart)
 11. Full Deploy (complete setup)
 12. Start Auto-restart Monitor

📦 DEPENDENCY MANAGEMENT
 13. Check Dependencies
 14. Fix Dependencies
 15. Fix Node.js Installation

📄 LOGS & INFO
 16. View PM2 Logs
 17. View System Logs
 18. Show Help
```

## ⚡ คำสั่งที่ใช้บ่อย

### สำหรับปัญหาที่เกิดขึ้นบ่อย:

```bash
# Backend ล่ม (MODULE_NOT_FOUND)
npm run fix-modules

# ดูสถานะเร็วๆ
npm run emergency

# Node.js มีปัญหา
npm run fix-nodejs

# Deploy code ใหม่
npm run deploy-quick

# ดู dashboard
npm run monitor

# ทดสอบ Discord alerts
npm run test-alert
```

### สำหรับ VPS Setup:

```bash
# Setup ครั้งแรก (ต้องใช้ sudo)
npm run deploy-full

# หรือถ้ามี dependency conflicts
sudo ./scripts/super-tool.sh --fix-nodejs
sudo ./scripts/super-tool.sh --deploy-full
```

## 🎯 Scenarios การใช้งาน

### 1. Backend ล่มเพราะ MODULE_NOT_FOUND
```bash
npm run fix-modules
```

### 2. CPU/RAM สูงเกินไป
```bash
# ดูสถานะ
npm run emergency

# ถ้าสูงมาก (ต้องใช้ sudo)
sudo ./scripts/super-tool.sh --emergency
# เลือก option 8 (Fix High Resource Usage)
```

### 3. Node.js installation conflicts
```bash
npm run fix-nodejs
```

### 4. ต้องการ monitor ระบบต่อเนื่อง
```bash
# Start monitoring (จะรันต่อเนื่อง)
npm run monitor:alert

# Start auto-restart (จะรันต่อเนื่อง)
npm run auto-restart
```

### 5. Deploy code ใหม่
```bash
# Quick deploy
npm run deploy-quick

# ถ้ามีปัญหา dependencies
npm run fix-modules
npm run deploy-quick
```

## 🔧 Configuration

### แก้ไข Discord Webhook:
แก้ไขใน `/scripts/super-tool.sh` บรรทัดที่ 18:
```bash
DISCORD_WEBHOOK="YOUR_NEW_WEBHOOK_URL"
```

### แก้ไข Alert Thresholds:
แก้ไขใน `/scripts/super-tool.sh` บรรทัด 19-21:
```bash
CPU_THRESHOLD=50      # เปลี่ยนเป็น 70 หากต้องการ
MEMORY_THRESHOLD=50   # เปลี่ยนเป็น 70 หากต้องการ
DISK_THRESHOLD=80     # เปลี่ยนเป็น 90 หากต้องการ
```

## 📱 Discord Alerts

จะได้รับแจ้งเตือนเมื่อ:
- 🚨 **CPU > 50%** = Critical Alert
- 🚨 **Memory > 50%** = Critical Alert
- ⚠️ **Disk > 80%** = Warning Alert
- 🔴 **Backend Down** = Critical Alert + Auto-restart attempt
- ✅ **Auto-restart Success** = Success Alert
- 🚀 **Deployment Success** = Success Alert

## 📁 Log Files

- **Super Tool logs**: `/var/log/ticket-super-tool.log`
- **PM2 logs**: `pm2 logs ticket-backend-prod`
- **Alert cooldown**: `/tmp/monitor_alerts`

## 🆘 Emergency Quick Reference

| ปัญหา | คำสั่ง |
|-------|--------|
| Backend ล่ม | `npm run fix-modules` |
| Node.js พัง | `npm run fix-nodejs` |
| ดูสถานะ | `npm run emergency` |
| Deploy ใหม่ | `npm run deploy-quick` |
| ทดสอบ Alert | `npm run test-alert` |
| เปิด Dashboard | `npm run monitor` |
| เปิด Interactive | `npm run super-tool` |

## 🎉 สรุป

**Super Tool** รวมทุกอย่างที่เคยแยกกันเป็น 8 ไฟล์มาเป็นไฟล์เดียว:

### ✅ แทนที่ Scripts เหล่านี้:
- ❌ `monitor.sh`
- ❌ `auto-restart.sh`
- ❌ `emergency-fix.sh`
- ❌ `fix-nodejs.sh`
- ❌ `dependency-check.sh`
- ❌ `one-click-deploy.sh`
- ❌ `setup-cron.sh`

### ✅ ใช้แค่:
- ✅ `super-tool.sh` (ไฟล์เดียวครบทุกฟีเจอร์)

### 🚀 การใช้งานหลัก:
1. **Interactive Mode**: `npm run super-tool`
2. **Emergency Fix**: `npm run fix-modules`
3. **Monitor**: `npm run monitor`
4. **Deploy**: `npm run deploy-quick`

ง่าย สะดวก และครบทุกฟีเจอร์ในไฟล์เดียว! 🎯
