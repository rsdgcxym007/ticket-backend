# 🚨 Emergency Production Fixes

## สำหรับปัญหาที่เกิดขึ้นบ่อย

### 1. 🔴 Backend ล่ม (MODULE_NOT_FOUND)
```bash
# Quick fix
npm run emergency-module-fix

# หรือ manual fix
cd /var/www/backend/ticket-backend
rm -rf node_modules package-lock.json
npm install --production
pm2 restart ticket-backend-prod
```

### 2. 🔧 Node.js Installation Issues  
```bash
# Fix Node.js conflicts (ต้องใช้ sudo)
sudo ./scripts/fix-nodejs.sh

# หรือ emergency fix
npm run fix-nodejs
```

### 3. 📊 ดูสถานะระบบเร็วๆ
```bash
# Quick diagnostics
npm run emergency-diagnostics

# หรือ
./scripts/emergency-fix.sh --diagnostics
```

### 4. 🔄 PM2 Process Issues
```bash
# Fix PM2 processes
npm run emergency-fix
# แล้วเลือก option 3

# หรือ manual
pm2 kill
pm2 start ecosystem.config.js --env production
```

### 5. 💾 High Resource Usage
```bash
# Emergency resource fix (ต้องใช้ sudo)
sudo ./scripts/emergency-fix.sh --resource-fix

# หรือ manual
pm2 restart ticket-backend-prod -- --max-old-space-size=512
```

## 🆘 Nuclear Option (แก้ทุกอย่าง)

```bash
# ใช้เมื่อทุกอย่างพัง (ต้องใช้ sudo)
sudo ./scripts/emergency-fix.sh --all
```

## 📞 One-Line Fixes

```bash
# Backend ล่ม
npm run emergency-module-fix

# ดูสถานะ
npm run emergency-diagnostics

# แก้ Node.js
npm run fix-nodejs

# Deploy ใหม่ทั้งหมด
npm run one-click-deploy
```

## 🔍 Quick Checks

```bash
# ตรวจสอบ PM2
pm2 status

# ตรวจสอบ health
curl http://localhost:4000/health

# ดู logs
pm2 logs ticket-backend-prod --lines 20

# ดู resource usage
top -p $(pgrep -d',' node)
```

## 📋 Interactive Emergency Menu

```bash
./scripts/emergency-fix.sh
```

## 🚀 VPS Setup Commands

**สำหรับ VPS ใหม่:**
```bash
sudo ./scripts/one-click-deploy.sh
```

**สำหรับ VPS ที่มี backend อยู่แล้ว:**
```bash
git pull origin feature/newfunction
sudo ./scripts/deploy.sh monitoring
sudo ./scripts/setup-cron.sh
npm run monitor:test
```

**ถ้ามีปัญหา Node.js dependency conflicts:**
```bash
sudo ./scripts/fix-nodejs.sh --clean
```

## 🎯 คำสั่งที่ควรจำ

| ปัญหา | คำสั่ง |
|-------|--------|
| Backend ล่ม | `npm run emergency-module-fix` |
| Node.js พัง | `npm run fix-nodejs` |
| ดูสถานะ | `npm run emergency-diagnostics` |
| แก้ทุกอย่าง | `sudo ./scripts/emergency-fix.sh --all` |
| Deploy ใหม่ | `npm run one-click-deploy` |
| ทดสอบ Alert | `npm run monitor:test` |

## 📱 Discord Alerts

หลังจากแก้ไขปัญหาแล้ว จะได้รับแจ้งเตือนใน Discord:
- 🚨 Emergency fix applied
- ✅ System restored
- 📊 Current status

## ⚡ Emergency Contact Info

**Discord Webhook:** `https://discord.com/api/webhooks/1404715794205511752/...`

**Log Files:**
- PM2 logs: `pm2 logs ticket-backend-prod`
- Auto-restart: `/var/log/ticket-auto-restart.log`
- Dependency check: `/var/log/dependency-check.log`

---

## 🔄 Workflow สำหรับปัญหาเร่งด่วน

1. **ดูสถานะเร็วๆ:** `npm run emergency-diagnostics`
2. **แก้ปัญหาที่เจอ:** ใช้คำสั่งที่เหมาะสม
3. **ตรวจสอบอีกครั้ง:** `curl http://localhost:4000/health`
4. **ถ้ายังไม่ได้:** `sudo ./scripts/emergency-fix.sh --all`
