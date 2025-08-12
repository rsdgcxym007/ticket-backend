# 🚀 Quick Start: Monitoring System Setup

## สำหรับ VPS ใหม่ (Full Setup)

```bash
# 1. Clone repository
git clone https://github.com/rsdgcxym007/ticket-backend.git
cd ticket-backend

# 2. Setup VPS with monitoring (ต้องใช้ sudo)
sudo ./scripts/deploy.sh vps

# 3. Setup cron jobs for automated monitoring
sudo ./scripts/setup-cron.sh

# 4. Test system
npm run monitor:test
```

## สำหรับ VPS ที่มี Backend อยู่แล้ว

```bash
# 1. Pull latest code
git pull origin feature/newfunction

# 2. Setup monitoring system only
sudo ./scripts/deploy.sh monitoring

# 3. Setup cron jobs
sudo ./scripts/setup-cron.sh

# 4. Test alerts
npm run monitor:test
```

## การใช้งานหลังติดตั้ง

### ดู Dashboard
```bash
npm run monitor
# หรือ
./scripts/monitor.sh dashboard
```

### เริ่ม Monitoring พร้อม Alerts
```bash
npm run monitor:alert
# หรือ
./scripts/monitor.sh alert
```

### ทดสอบ Discord Alert
```bash
npm run monitor:test
# หรือ
./scripts/monitor.sh test-alert
```

### ดู Logs
```bash
npm run monitor:logs
# หรือ
./scripts/monitor.sh logs
```

### Auto-restart System
```bash
# เริ่ม auto-restart (จะทำงานใน background)
./scripts/auto-restart.sh

# ทดสอบ auto-restart
npm run auto-restart:test
```

### Dependency Check
```bash
# ตรวจสอบ dependencies
npm run dependency-check

# แก้ไข dependencies อัตโนมัติ
npm run dependency-fix
```

## การตรวจสอบสถานะ Services

```bash
# ตรวจสอบ monitoring services
sudo systemctl status ticket-monitor
sudo systemctl status ticket-auto-restart

# ดู logs ของ services
sudo journalctl -u ticket-monitor -f
sudo journalctl -u ticket-auto-restart -f

# ตรวจสอบ cron jobs
sudo crontab -l | grep ticket
```

## การแก้ไขปัญหาเบื้องต้น

### 1. Backend ล่ม (MODULE_NOT_FOUND)
```bash
# ลองแก้ไข dependencies
npm run dependency-fix

# หรือแก้ไขด้วยตนเอง
cd /var/www/backend/ticket-backend
rm -rf node_modules package-lock.json
npm install --production
pm2 restart ticket-backend-prod
```

### 2. ไม่ได้รับ Discord alerts
```bash
# ทดสอบ webhook
curl -X POST -H "Content-Type: application/json" \
  -d '{"content":"Test from command line"}' \
  "https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
```

### 3. Services ไม่ทำงาน
```bash
# Restart services
sudo systemctl restart ticket-monitor
sudo systemctl restart ticket-auto-restart

# หรือ reload systemd
sudo systemctl daemon-reload
sudo systemctl start ticket-monitor
sudo systemctl start ticket-auto-restart
```

### 4. CPU/RAM สูงเกินไป
```bash
# ดูกระบวนการที่ใช้ resource มาก
top -p $(pgrep -d',' node)

# ลดจำนวน PM2 instances (หากมีหลาย instances)
pm2 scale ticket-backend-prod 1

# Restart โดยใช้ auto-restart
npm run auto-restart:test
```

## ข้อมูล Alert Thresholds

- **CPU Usage**: > 50% = Critical Alert 🚨
- **Memory Usage**: > 50% = Critical Alert 🚨  
- **Disk Usage**: > 80% = Warning Alert ⚠️
- **PM2 Status**: Not online = Critical Alert 🚨
- **Application Health**: Not responding = Warning Alert ⚠️

## การปรับแต่ง Thresholds

แก้ไขไฟล์ `scripts/monitor.sh`:

```bash
CPU_THRESHOLD=50      # เปลี่ยนเป็น 70 หากต้องการ
MEMORY_THRESHOLD=50   # เปลี่ยนเป็น 70 หากต้องการ  
DISK_THRESHOLD=80     # เปลี่ยนเป็น 90 หากต้องการ
```

หลังจากแก้ไขแล้ว restart service:
```bash
sudo systemctl restart ticket-monitor
```

## Log Files ที่สำคัญ

- **Auto-restart logs**: `/var/log/ticket-auto-restart.log`
- **Dependency check logs**: `/var/log/dependency-check.log`
- **PM2 logs**: `pm2 logs ticket-backend-prod`
- **System logs**: `sudo journalctl -u ticket-monitor`

## การยกเลิก Monitoring

```bash
# หยุด services
sudo systemctl stop ticket-monitor
sudo systemctl stop ticket-auto-restart
sudo systemctl disable ticket-monitor
sudo systemctl disable ticket-auto-restart

# ลบ cron jobs
sudo ./scripts/setup-cron.sh --remove

# ลบ service files
sudo rm /etc/systemd/system/ticket-monitor.service
sudo rm /etc/systemd/system/ticket-auto-restart.service
sudo systemctl daemon-reload
```

---

## 🎯 สรุป

หลังจากติดตั้งเรียบร้อยแล้ว คุณจะได้รับ:

✅ **Discord alerts** เมื่อ CPU/RAM เกิน 50%  
✅ **Auto-restart** เมื่อ backend ล่ม  
✅ **Dependency monitoring** ป้องกัน MODULE_NOT_FOUND  
✅ **Health checks** ทุก 15 นาที  
✅ **Log management** อัตโนมัติ  

แจ้งเตือนจะส่งไปที่ Discord channel ที่กำหนดไว้ และระบบจะพยายามแก้ไขปัญหาอัตโนมัติก่อนแจ้งเตือน!
