# 📋 Deployment Scripts Guide

## 🎯 **ไฟล์ที่ใช้งานจริง (เหลือแค่นี้)**

### **Primary Deployment Scripts:**

1. **`scripts/build-and-deploy.sh`** 🚀
   - **ใช้เมื่อไร**: Manual deployment หลัก
   - **คำสั่ง**: `npm run build-deploy` หรือ `./scripts/build-and-deploy.sh`
   - **การทำงาน**: Build → Deploy → PM2 restart → Health check

2. **`scripts/webhook-deploy.sh`** 🪝
   - **ใช้เมื่อไร**: Called by webhook system
   - **การทำงาน**: รับ webhook → pull code → deploy

3. **`monitoring/auto-deploy.sh`** ⚙️
   - **ใช้เมื่อไร**: Auto deployment จาก GitHub webhook
   - **คำสั่ง**: `bash monitoring/auto-deploy.sh deploy`
   - **การทำงาน**: Smart deployment with enhanced error handling

4. **`monitoring/webhook-server.js`** 🌐
   - **ใช้เมื่อไร**: Webhook listener server
   - **การทำงาน**: รับ GitHub webhook → trigger deployment

---

## 🔄 **วิธีใช้งาน**

### **Manual Deployment:**
```bash
# วิธีหลัก - ใช้อันนี้
npm run build-deploy
```

### **Auto Deployment:**
```bash
# GitHub webhook จะเรียกอัตโนมัติ
# แต่ถ้าต้องการรันเอง:
bash monitoring/auto-deploy.sh deploy
```

### **Emergency Deployment:**
```bash
# ถ้า npm script ไม่ทำงาน ใช้ direct
./scripts/build-and-deploy.sh
```

---

## ❌ **ไฟล์ที่ลบออกแล้ว**

- `scripts/build-deploy-enhanced.sh` - ซ้ำกับหลัก
- `scripts/deployment-recovery.sh` - ซับซ้อนเกินไป
- `scripts/emergency-deployment-fix.sh` - ไม่จำเป็น
- `scripts/quick-fix-hanging.sh` - ไม่จำเป็น
- `scripts/quick-syntax-fix.sh` - ใช้แล้ว
- `scripts/check-node-compatibility.sh` - รวมในหลักแล้ว
- `monitoring/system-monitor.sh` - ไม่จำเป็น
- `monitoring/accurate-memory-monitor.sh` - ไม่ได้ใช้
- `monitoring/balanced-memory-manager.sh` - ไม่ได้ใช้

---

## ✅ **สรุปแบบง่าย**

**ต้องการ Deploy ใช้คำสั่งเดียว:**
```bash
npm run build-deploy
```

**ที่เหลือใน scripts/ และ monitoring/ ใช้งานอัตโนมัติทั้งหมด**

---

*อัปเดต: August 17, 2025 - Cleaned up และเหลือแค่ไฟล์ที่จำเป็นจริงๆ*
