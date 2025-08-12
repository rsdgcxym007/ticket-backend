# 🎯 Monitoring System Implementation Summary

## 📋 ปัญหาที่แก้ไข

**ปัญหาเดิม:**
- Backend ตายเพราะ MODULE_NOT_FOUND (@nestjs/core หาไม่เจอ)
- RAM และ CPU เกิน 50% แต่ไม่มีการแจ้งเตือน
- ไม่มีระบบ auto-restart เมื่อ backend ล่ม
- ไม่มีการตรวจสอบ health อัตโนมัติ

**โซลูชันที่สร้าง:**
✅ ระบบแจ้งเตือน Discord เมื่อ CPU/RAM เกิน 50%  
✅ Auto-restart system เมื่อ backend ล่ม  
✅ Dependency health check ป้องกัน MODULE_NOT_FOUND  
✅ Complete monitoring dashboard  
✅ Automated cron jobs สำหรับตรวจสอบต่อเนื่อง  

## 🔧 Files ที่สร้าง/แก้ไข

### 1. Monitoring Scripts
- **`scripts/monitor.sh`** - Main monitoring script พร้อม Discord alerts
- **`scripts/auto-restart.sh`** - Auto-restart system เมื่อ app ล่ม
- **`scripts/dependency-check.sh`** - ตรวจสอบ dependencies หาย
- **`scripts/setup-cron.sh`** - Setup automated cron jobs
- **`scripts/one-click-deploy.sh`** - Complete deployment ในครั้งเดียว

### 2. Systemd Services
- **`scripts/ticket-monitor.service`** - Service สำหรับ resource monitoring
- **`scripts/ticket-auto-restart.service`** - Service สำหรับ auto-restart

### 3. Configuration Updates
- **`package.json`** - เพิ่ม npm scripts สำหรับ monitoring
- **`scripts/deploy.sh`** - เพิ่ม monitoring setup functions

### 4. Documentation
- **`docs/MONITORING_GUIDE.md`** - Complete monitoring guide
- **`docs/QUICK_START_MONITORING.md`** - Quick start guide

## 🚀 การใช้งาน

### สำหรับ VPS ใหม่ (One-Click Setup)
```bash
sudo ./scripts/one-click-deploy.sh
```

### สำหรับ VPS ที่มี Backend อยู่แล้ว
```bash
# 1. Pull code ใหม่
git pull origin feature/newfunction

# 2. Setup monitoring
sudo ./scripts/deploy.sh monitoring

# 3. Setup cron jobs
sudo ./scripts/setup-cron.sh

# 4. Test system
npm run monitor:test
```

### Quick Commands
```bash
# Dashboard
npm run monitor

# Start monitoring with alerts
npm run monitor:alert

# Test Discord alerts
npm run monitor:test

# View logs
npm run monitor:logs

# Auto-restart (background)
./scripts/auto-restart.sh

# Dependency check
npm run dependency-check
```

## 📊 Alert Types

### 🚨 Critical Alerts (แจ้งเตือนทันที)
- CPU usage > 50%
- Memory usage > 50%  
- PM2 application down
- Auto-restart failed

### ⚠️ Warning Alerts
- Disk usage > 80%
- Application unresponsive (3 consecutive failures)

### ✅ Success Alerts
- Auto-restart successful
- Dependencies fixed successfully
- Deployment completed

### ℹ️ Info Alerts
- System health reports (every 6 hours)
- Test alerts
- Monitoring system status

## 🔄 Automated Processes

### Systemd Services (Always Running)
- **ticket-monitor** - Resource monitoring ทุกนาที
- **ticket-auto-restart** - Application monitoring ทุก 30 วินาที

### Cron Jobs
- **Dependency check** - ทุก 15 นาที
- **Health reports** - ทุก 6 ชั่วโมง  
- **Log cleanup** - ทุกวันเวลา 02:00
- **Alert cooldown reset** - ทุกวันเวลา 03:00

## 🛠️ Key Features

### 1. Resource Monitoring
- CPU, RAM, Disk usage tracking
- PM2 application status monitoring
- Health endpoint checking
- Discord notifications with rich embeds

### 2. Auto-restart System
- Detects when PM2 app goes down
- Attempts to fix dependencies first
- Tries multiple restart methods
- Maximum attempt limits with notifications
- Cooldown periods between attempts

### 3. Dependency Health Check
- Monitors for MODULE_NOT_FOUND errors
- Automatically fixes missing dependencies
- Multiple fix strategies (install, clean-install, cache-clean)
- PM2 log analysis for early detection

### 4. Alert Management
- Cooldown system ป้องกัน spam alerts (5 นาที)
- Rich Discord embeds with color coding
- Server info และ timestamp
- Different alert levels

### 5. Complete Dashboard
- Real-time system metrics
- PM2 process information
- Health check results
- Recent logs display
- Performance metrics

## 📁 Log Files

- **Auto-restart logs**: `/var/log/ticket-auto-restart.log`
- **Dependency check logs**: `/var/log/dependency-check.log`
- **Systemd service logs**: `journalctl -u ticket-monitor`
- **PM2 application logs**: `pm2 logs ticket-backend-prod`
- **Alert cooldown tracking**: `/tmp/monitor_alerts`

## 🔧 Maintenance

### Service Management
```bash
# Check status
sudo systemctl status ticket-monitor ticket-auto-restart

# Restart services
sudo systemctl restart ticket-monitor ticket-auto-restart

# View logs
sudo journalctl -u ticket-monitor -f
sudo journalctl -u ticket-auto-restart -f
```

### Cron Job Management
```bash
# List current jobs
sudo crontab -l

# Remove monitoring jobs
sudo ./scripts/setup-cron.sh --remove

# Re-setup jobs
sudo ./scripts/setup-cron.sh --setup
```

### Manual Testing
```bash
# Test all monitoring functions
./scripts/monitor.sh test-alert
./scripts/auto-restart.sh --test
./scripts/dependency-check.sh --test

# Force dependency fix
npm run dependency-fix

# Manual restart with monitoring
./scripts/deploy.sh quick
```

## 🎯 Solution Benefits

1. **Proactive Monitoring** - ตรวจจับปัญหาก่อนที่จะส่งผลกระทบต่อผู้ใช้
2. **Automatic Recovery** - แก้ไขปัญหาอัตโนมัติโดยไม่ต้องรอการแทรกแซงจากคน
3. **Real-time Alerts** - แจ้งเตือนทันทีผ่าน Discord channel
4. **Complete Visibility** - Dashboard และ logs ครบถ้วนสำหรับ debugging
5. **Easy Management** - npm scripts และ CLI tools ใช้งานง่าย

## 📋 Checklist สำหรับ Production

### หลังจาก Deploy
- [ ] ทดสอบ Discord alerts: `npm run monitor:test`
- [ ] ตรวจสอบ services running: `sudo systemctl status ticket-*`
- [ ] ตรวจสอบ cron jobs: `sudo crontab -l`
- [ ] ทดสอบ health endpoints: `curl http://localhost:4000/health`
- [ ] ตรวจสอบ PM2 status: `pm2 status`

### การตรวจสอบประจำ
- [ ] ดู dashboard: `npm run monitor` (รายวัน)
- [ ] ตรวจสอบ logs: `./scripts/auto-restart.sh --logs` (รายสัปดาห์)
- [ ] ทดสอบ auto-restart: `npm run auto-restart:test` (รายเดือน)
- [ ] อัปเดต dependency thresholds ตามความเหมาะสม

---

**Discord Webhook URL**: `https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l`

เมื่อระบบทำงานแล้ว คุณจะได้รับแจ้งเตือนผ่าน Discord ทุกครั้งที่มีปัญหา และระบบจะพยายามแก้ไขอัตโนมัติก่อนแจ้งเตือน!
