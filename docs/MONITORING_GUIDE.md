# Ticket Backend Monitoring System

ระบบตรวจสอบและแจ้งเตือนสำหรับ Ticket Backend ที่จะส่งแจ้งเตือนไปที่ Discord เมื่อ CPU หรือ RAM เกิน 50%

## คุณสมบัติ

- ✅ ตรวจสอบ CPU, RAM, และ Disk usage
- ✅ ตรวจสอบสถานะ PM2 application
- ✅ ส่งแจ้งเตือนไปที่ Discord webhook
- ✅ Auto-restart เมื่อ application ล่ม
- ✅ Cooldown system เพื่อป้องกัน spam alerts
- ✅ Systemd services สำหรับทำงานอัตโนมัติ

## การติดตั้ง

### 1. ติดตั้งบน VPS ใหม่

```bash
sudo ./scripts/deploy.sh vps
```

### 2. ติดตั้งเฉพาะ monitoring system

```bash
sudo ./scripts/deploy.sh monitoring
```

### 3. ตรวจสอบสถานะ monitoring system

```bash
./scripts/deploy.sh monitor-status
```

## การใช้งาน

### Monitor Script

```bash
# แสดงความช่วยเหลือ
./scripts/monitor.sh

# แสดง dashboard
./scripts/monitor.sh dashboard

# ดู logs
./scripts/monitor.sh logs

# ดู error logs เท่านั้น
./scripts/monitor.sh errors

# เริ่ม resource monitoring พร้อมแจ้งเตือน
./scripts/monitor.sh alert

# ทดสอบส่งแจ้งเตือน
./scripts/monitor.sh test-alert

# ดู logs แบบ real-time
./scripts/monitor.sh watch
```

### Auto-restart Script

```bash
# เริ่ม auto-restart monitoring
./scripts/auto-restart.sh

# ทดสอบ restart functionality
./scripts/auto-restart.sh --test

# ดู logs
./scripts/auto-restart.sh --logs

# ล้าง logs
./scripts/auto-restart.sh --clear
```

## การตั้งค่า

### Discord Webhook

แก้ไข webhook URL ในไฟล์:
- `scripts/monitor.sh`
- `scripts/auto-restart.sh`
- `scripts/deploy.sh`

```bash
DISCORD_WEBHOOK="https://discord.com/api/webhooks/YOUR_WEBHOOK_URL"
```

### Thresholds

แก้ไขค่า threshold ใน `scripts/monitor.sh`:

```bash
CPU_THRESHOLD=50      # CPU usage %
MEMORY_THRESHOLD=50   # Memory usage %
DISK_THRESHOLD=80     # Disk usage %
```

## Systemd Services

### ดูสถานะ services

```bash
sudo systemctl status ticket-monitor
sudo systemctl status ticket-auto-restart
```

### จัดการ services

```bash
# Start services
sudo systemctl start ticket-monitor
sudo systemctl start ticket-auto-restart

# Stop services
sudo systemctl stop ticket-monitor
sudo systemctl stop ticket-auto-restart

# Restart services
sudo systemctl restart ticket-monitor
sudo systemctl restart ticket-auto-restart

# ดู logs
sudo journalctl -u ticket-monitor -f
sudo journalctl -u ticket-auto-restart -f
```

### Enable/Disable auto-start

```bash
# Enable auto-start on boot
sudo systemctl enable ticket-monitor
sudo systemctl enable ticket-auto-restart

# Disable auto-start
sudo systemctl disable ticket-monitor
sudo systemctl disable ticket-auto-restart
```

## แจ้งเตือนที่จะได้รับ

### Critical Alerts (🚨)
- CPU usage > 50%
- Memory usage > 50%
- PM2 application down
- Auto-restart failed after maximum attempts

### Warning Alerts (⚠️)
- Disk usage > 80%
- Application unresponsive

### Success Alerts (✅)
- Auto-restart successful
- Deployment successful

### Info Alerts (ℹ️)
- System health reports
- Test alerts
- Monitoring system status

## การแก้ไขปัญหา

### 1. Service ไม่ทำงาน

```bash
# ตรวจสอบ syntax
sudo systemctl daemon-reload

# ตรวจสอบ logs
sudo journalctl -u ticket-monitor --no-pager -l
sudo journalctl -u ticket-auto-restart --no-pager -l
```

### 2. ไม่ได้รับแจ้งเตือน

```bash
# ทดสอบ webhook
./scripts/monitor.sh test-alert

# ตรวจสอบ network connectivity
curl -I https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```

### 3. Dependencies หาย

```bash
# ติดตั้ง dependencies ที่จำเป็น
sudo apt update
sudo apt install -y jq curl htop

# สำหรับ Node.js dependencies
cd /var/www/backend/ticket-backend
npm install --production
```

### 4. Permission issues

```bash
# แก้ไข permissions
sudo chmod +x /var/www/backend/ticket-backend/scripts/*.sh
sudo chown -R root:root /var/www/backend/ticket-backend/scripts/
```

## Log Files

- Monitor logs: `/var/log/ticket-auto-restart.log`
- Systemd logs: `journalctl -u ticket-monitor` และ `journalctl -u ticket-auto-restart`
- Alert cooldown file: `/tmp/monitor_alerts`

## ตัวอย่างการแจ้งเตือน

```json
{
  "embeds": [
    {
      "title": "🚨 Server Monitor Alert",
      "description": "🔥 **HIGH CPU USAGE DETECTED**\n\nCurrent CPU usage: **75.3%**\nThreshold: 50%\n\nPM2 App CPU: 45.2%",
      "color": 15158332,
      "fields": [
        {
          "name": "Server",
          "value": "your-server-hostname",
          "inline": true
        },
        {
          "name": "Time",
          "value": "2025-08-12 14:30:15 +07:00",
          "inline": true
        }
      ],
      "footer": {
        "text": "Ticket Backend Monitoring System"
      }
    }
  ]
}
```

## Best Practices

1. **ตรวจสอบสถานะอย่างสม่ำเสมอ**
   ```bash
   ./scripts/deploy.sh monitor-status
   ```

2. **ทดสอบ alert system หลังติดตั้ง**
   ```bash
   ./scripts/monitor.sh test-alert
   ```

3. **ตรวจสอบ logs เป็นประจำ**
   ```bash
   ./scripts/auto-restart.sh --logs
   ```

4. **ใช้ dashboard เพื่อดูภาพรวม**
   ```bash
   ./scripts/monitor.sh dashboard
   ```

5. **Backup การตั้งค่าก่อนแก้ไข**
   ```bash
   cp scripts/monitor.sh scripts/monitor.sh.backup
   ```
