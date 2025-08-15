# 🎯 Quick Help - Deployment

## 🚨 ปัญหาที่พบบ่อย

### ❌ "This script requires sudo access" 
**สาเหตุ**: คุณกำลังรันบน local machine แต่ใช้ script สำหรับ server

**แก้ไข**:
```bash
# แทนที่จะใช้
npm run deploy:complete  # ❌ ไม่ใช่นี้

# ให้ใช้
npm run production:setup  # ✅ ใช้นี้แทน
```

### ❌ "Cannot connect to server"
**สาเหตุ**: ไม่สามารถ SSH เข้า server ได้

**แก้ไข**:
```bash
# ทดสอบ SSH
ssh root@43.229.133.51

# ถ้าไม่ได้ ลอง
ssh -o PreferredAuthentications=password root@43.229.133.51
```

## 🎯 คำสั่งที่ถูกต้องตาม Environment

### 💻 บน Local Machine (macOS/Windows):
```bash
npm run production:setup     # เลือกวิธีการ deploy
npm run production:deploy    # deploy ไปยัง server
npm run start:dev           # test ใน local
```

### 🖥️ บน Linux Server (VPS):
```bash
./deploy-complete.sh        # ติดตั้งครั้งแรก
./deploy-quick-update.sh    # อัปเดตเร็ว
```

## 📋 Step by Step สำหรับมือใหม่

### 1. ถ้าคุณอยู่บน Local (Mac/Windows):
```bash
# เลือกตัวเลือกการ deploy
npm run production:setup
```

### 2. ถ้าคุณต้องการ SSH เข้า server เพื่อ setup:
```bash
# SSH เข้า server
ssh root@43.229.133.51

# clone project
cd /var/www
git clone https://github.com/rsdgcxym007/ticket-backend.git api-patongboxingstadiumticket.com
cd api-patongboxingstadiumticket.com

# run setup
chmod +x deploy-complete.sh
./deploy-complete.sh
```

### 3. ถ้าต้องการ deploy จาก local:
```bash
npm run production:deploy
```

## 🔧 Debug Commands

### ตรวจสอบ environment:
```bash
uname -a                    # ดู OS
pwd                        # ดู directory ปัจจุบัน  
ls -la *.sh               # ดู scripts ที่มี
```

### ตรวจสอบ SSH:
```bash
ssh root@43.229.133.51 "pwd"           # test SSH
ssh root@43.229.133.51 "pm2 status"    # ดูสถานะ server
```

## 📞 ขอความช่วยเหลือ

หากยังมีปัญหา:
1. รันคำสั่ง debug ด้านบน
2. ส่ง error message ที่ได้
3. บอกว่าคุณอยู่บน environment ไหน (Local/Server)
