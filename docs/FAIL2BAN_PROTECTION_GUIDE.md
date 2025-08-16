# 🛡️ Fail2ban Protection & SSH Security Guide

## 🚨 เมื่อถูก IP Ban แล้วต้องทำยังไง?

### 📋 **อาการที่บ่งบอกว่าถูกแบน:**
```bash
ssh: connect to host 43.229.133.51 port 22: Connection refused
scp: Connection closed
```

### 🔧 **วิธีแก้ไขด่วน (Emergency Fix):**

**Option 1: ใช้ VPS Console/VNC**
```bash
# Login เข้า VPS ผ่าน web console แล้วรัน:
sudo bash /var/www/html/ticket-backend/scripts/emergency-unban.sh
```

**Option 2: รอให้หายเอง (10-30 นาที)**
- Fail2ban จะ unban อัตโนมัติ
- ลองเชื่อมต่อใหม่ทุก 10 นาที

**Option 3: ติดต่อ VPS Provider**
- บอกให้ unban IP: `58.11.188.245`
- หรือขอ console access เพื่อแก้เอง

---

## 🔧 ตั้งค่าป้องกันการถูกแบน

### 1️⃣ **ตั้งค่า Fail2ban ให้เบาลง:**
```bash
# รันในเซิร์ฟเวอร์:
sudo bash /var/www/html/ticket-backend/scripts/configure-fail2ban-protection.sh
```

**การเปลี่ยนแปลง:**
- ✅ เพิ่ม MaxRetry จาก 5 → 10 ครั้ง
- ✅ ลด BanTime จาก 3600s → 1800s (30 นาที)
- ✅ เพิ่ม IP ไทยใน whitelist
- ✅ Whitelist IP ปัจจุบัน

### 2️⃣ **ปรับปรุง SSH Security:**
```bash
# รันในเซิร์ฟเวอร์:
sudo bash /var/www/html/ticket-backend/scripts/configure-ssh-security.sh
```

**การเปลี่ยนแปลง:**
- ✅ MaxAuthTries: 6 → 10
- ✅ LoginGraceTime: 120s → 60s  
- ✅ ClientAliveInterval: 300s
- ✅ เพิ่ม SSH key authentication

### 3️⃣ **จัดการ IP Whitelist:**
```bash
# รันในเซิร์ฟเวอร์:
sudo bash /var/www/html/ticket-backend/scripts/manage-ip-whitelist.sh
```

**จะทำให้:**
- 🔍 ตรวจสอบ IP ปัจจุบันอัตโนมัติ
- ➕ เพิ่มเข้า whitelist
- 🔓 Unban IP ทั้งหมด
- 🔄 Reload fail2ban

---

## 📊 ตัวอย่างคำสั่งตรวจสอบ

### **ดู IP ปัจจุบัน:**
```bash
curl -s https://ipv4.icanhazip.com
```

### **ตรวจสอบสถานะ Fail2ban:**
```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### **ดูรายการ IP ที่ถูกแบน:**
```bash
sudo fail2ban-client banned sshd
```

### **Unban IP เฉพาะ:**
```bash
sudo fail2ban-client unban 58.11.188.245
```

### **ดู whitelist:**
```bash
grep "ignoreip" /etc/fail2ban/jail.local
```

---

## 🔒 การตั้งค่าที่แนะนำ

### **สำหรับ Development:**
```ini
[DEFAULT]
bantime = 1800      # 30 นาที (แทน 1 ชั่วโมง)
findtime = 600      # ตรวจสอบ 10 นาทีย้อนหลัง
maxretry = 10       # อนุญาต 10 ครั้ง (แทน 5 ครั้ง)

[sshd]
maxretry = 10       # SSH อนุญาต 10 ครั้ง
bantime = 1800      # แบน 30 นาที
```

### **IP Whitelist ที่ควรเพิ่ม:**
```
127.0.0.1/8         # Localhost
58.11.188.245       # IP ปัจจุบัน
103.0.0.0/8         # Thai ISP ranges
49.0.0.0/8
1.0.0.0/8
27.0.0.0/8
```

---

## 🚨 Emergency Contacts & Procedures

### **เมื่อระบบล็อคเข้าไม่ได้:**

1. **ลองผ่าน VPS Console:**
   - Login เข้า console web
   - รัน emergency script

2. **รอให้ ban หมดอายุ:**
   - 30 นาทีจากครั้งสุดท้าย
   - ลอง SSH ทุก 10 นาที

3. **ติดต่อ VPS Provider:**
   - ขอ unban IP: `58.11.188.245`
   - ขอ console/VNC access

### **หมายเลขติดต่อ:**
- VPS Provider Support
- Server Admin Emergency Line

---

## ✅ Best Practices

### **เมื่อใช้ SSH:**
- ✅ ใส่ password ช้าๆ อย่าพิมพ์ผิด
- ✅ ใช้ SSH key แทน password
- ✅ เก็บ IP address ไว้ใน whitelist
- ✅ ตรวจสอบ IP ก่อน connect

### **เมื่อ Deploy Code:**
- ✅ ใช้ automated deployment script
- ✅ Test connection ก่อนทำงานใหญ่
- ✅ มี backup plan เมื่อถูกแบน

### **Monitoring:**
- ✅ Setup alerts เมื่อมี IP ban
- ✅ Monitor fail2ban logs
- ✅ Regular whitelist updates

---

## 📝 Script Locations

**บนเซิร์ฟเวอร์:**
```bash
/var/www/html/ticket-backend/scripts/
├── emergency-unban.sh                 # รันเมื่อถูกแบน
├── configure-fail2ban-protection.sh   # ตั้งค่า fail2ban
├── configure-ssh-security.sh          # ตั้งค่า SSH
└── manage-ip-whitelist.sh             # จัดการ whitelist
```

**บนเครื่อง Local:**
```bash
/Users/user/Desktop/work/ticket-backend/scripts/
├── emergency-unban.sh
├── configure-fail2ban-protection.sh
├── configure-ssh-security.sh
└── manage-ip-whitelist.sh
```

---

## 🎯 สรุป Action Plan

### **ทันทีหลัง SSH กลับเข้าได้:**
```bash
# 1. ตั้งค่าป้องกัน fail2ban
sudo bash /var/www/html/ticket-backend/scripts/configure-fail2ban-protection.sh

# 2. ปรับปรุง SSH security  
sudo bash /var/www/html/ticket-backend/scripts/configure-ssh-security.sh

# 3. จัดการ IP whitelist
sudo bash /var/www/html/ticket-backend/scripts/manage-ip-whitelist.sh

# 4. Deploy emergency API endpoint
cd /var/www/html/ticket-backend
pm2 restart all --update-env
```

### **สำหรับอนาคต:**
- 🔄 Run whitelist script ทุกสัปดาห์
- 📊 Monitor fail2ban logs
- 🔧 Update IP whitelist เมื่อเปลี่ยน ISP
- 💾 Backup security configurations
