# 🚀 Deployment Scripts & Commands

ระบบ deployment ที่ครบครันสำหรับ Patong Boxing Stadium API

## 🎯 Quick Start

### สำหรับผู้ใช้ทั่วไป (รันครั้งเดียวจบ):
```bash
# ตรวจสอบสภาพแวดล้อมและเลือกวิธีการ deploy ที่เหมาะสม
npm run production:setup
```

### สำหรับผู้ใช้ที่ชำนาญ:
```bash
# Deploy จาก local ไปยัง server
npm run production:deploy

# หรือถ้าอยู่บน server แล้ว
./deploy-complete.sh
```

## 🌍 สภาพแวดล้วม

### 💻 Local Machine (macOS/Windows/Linux Desktop)
- ใช้สำหรับพัฒนาและ deploy ไปยัง server
- Scripts: `production:setup`, `production:deploy`

### 🖥️ VPS/Server (Linux)
- ใช้สำหรับติดตั้งและรันระบบ production
- Scripts: `deploy:complete`, `deploy:quick`

## 📋 Available Scripts

### 🏗️ Production Setup (ครั้งแรก)
```bash
# ติดตั้งระบบทั้งหมดบนเซิร์ฟเวอร์ครั้งแรก
npm run production:setup
# หรือ
./deploy-complete.sh
```

### 🔄 Deployment Scripts

#### Deploy จาก Local Machine
```bash
# Deploy จาก local ไปยัง production server
npm run production:deploy
# หรือ
./deploy-from-local.sh
```

#### Deploy บนเซิร์ฟเวอร์โดยตรง
```bash
# อัปเดตเร็ว (บนเซิร์ฟเวอร์)
npm run deploy:quick
# หรือ
./deploy-quick-update.sh

# Deploy เต็มรูปแบบ (บนเซิร์ฟเวอร์)
npm run deploy:complete
# หรือ
./deploy-complete.sh
```

### 📊 Server Management

#### PM2 Management
```bash
# เริ่ม PM2
npm run start:pm2

# หยุด PM2
npm run stop:pm2

# Restart PM2
npm run restart:pm2

# ดู logs
npm run logs:pm2

# ดูสถานะ
npm run status:pm2
```

#### Remote Server Management
```bash
# Restart บนเซิร์ฟเวอร์จาก local
npm run production:restart

# ดู logs จากเซิร์ฟเวอร์
npm run production:logs

# ดูสถานะเซิร์ฟเวอร์
npm run production:status
```

#### Server Utilities
```bash
# ดูสถานะระบบ
npm run server:status

# สร้าง backup
npm run server:backup

# ดู SSL certificates
npm run server:ssl

# Restart แอปและดู logs
npm run server:restart

# ดู logs อย่างเดียว
npm run server:logs
```

### 🗃️ Database Scripts
```bash
# สร้าง migration
npm run migration:generate

# รัน migrations
npm run migration:run

# Rollback migration
npm run migration:revert

# Seed data
npm run seed:zone
npm run seed:seat
npm run seed:admin
```

### 🧪 Testing Scripts
```bash
# ทดสอบระบบอีเมล
npm run test:email

# ทดสอบอีเมลแบบอัตโนมัติ
npm run test:email:auto

# ทดสอบเร็ว
npm run test:email:quick
```

### 🔐 Utility Scripts
```bash
# สร้าง JWT secrets
npm run generate:jwt-secrets

# Clean build files
npm run clean

# Build project
npm run build

# Start production
npm run start:prod
```

## 🎯 Deployment Workflows

### Workflow 1: ครั้งแรกติดตั้งบนเซิร์ฟเวอร์
```bash
# 1. Clone project บนเซิร์ฟเวอร์
git clone <repository> /var/www/api-patongboxingstadiumticket.com
cd /var/www/api-patongboxingstadiumticket.com

# 2. รันการติดตั้งครบครัน
npm run production:setup
```

### Workflow 2: Deploy จาก Local Machine
```bash
# 1. ทำงานใน local
# 2. Deploy ไปเซิร์ฟเวอร์
npm run production:deploy

# 3. ตรวจสอบสถานะ
npm run production:status
```

### Workflow 3: อัปเดตบนเซิร์ฟเวอร์โดยตรง
```bash
# 1. SSH เข้าเซิร์ฟเวอร์
ssh root@43.229.133.51

# 2. เข้าไปยัง project directory
cd /var/www/api-patongboxingstadiumticket.com

# 3. Pull changes และ deploy
git pull origin main
npm run deploy:quick
```

### Workflow 4: Development & Testing
```bash
# 1. Development
npm run start:dev

# 2. Test email system
npm run test:email:quick

# 3. Build และ test
npm run build
npm run start:prod

# 4. Deploy
npm run production:deploy
```

## 🔗 Important URLs

- **Production API**: https://api-patongboxingstadiumticket.com
- **API Documentation**: https://api-patongboxingstadiumticket.com/api
- **Health Check**: https://api-patongboxingstadiumticket.com/health

## 📁 Important Directories

- **Production Project**: `/var/www/api-patongboxingstadiumticket.com`
- **Backups**: `/var/backups/deployments`
- **Nginx Config**: `/etc/nginx/sites-available/api-patongboxingstadiumticket.com`
- **SSL Certificates**: `/etc/letsencrypt/live/api-patongboxingstadiumticket.com`

## ⚙️ Configuration Files

- **Environment**: `.env.production`
- **PM2**: `ecosystem.config.js`
- **Database**: `src/config/database.config.ts`
- **App Config**: `src/config/app.config.ts`

## 🚨 Troubleshooting

### Common Issues

#### API ไม่ตอบสนอง
```bash
# ตรวจสอบ PM2
npm run logs:pm2
npm run status:pm2

# Restart
npm run restart:pm2
```

#### Database Connection Error
```bash
# ตรวจสอบ database
psql -h 43.229.133.51 -U boxing_user -d patong_boxing_stadium

# รัน migrations
npm run migration:run
```

#### SSL Certificate Issues
```bash
# ตรวจสอบ certificate
npm run server:ssl

# Renew certificate
sudo certbot renew
```

#### Nginx Issues
```bash
# ตรวจสอบ config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# ดู logs
sudo tail -f /var/log/nginx/error.log
```

## 💡 Tips

1. **สำหรับการ deploy ครั้งแรก**: ใช้ `npm run production:setup`
2. **สำหรับการ deploy ปกติ**: ใช้ `npm run production:deploy`
3. **สำหรับการอัปเดตเร็ว**: ใช้ `npm run deploy:quick` บนเซิร์ฟเวอร์
4. **สำหรับการ debug**: ใช้ `npm run production:logs`
5. **อย่าลืม**: อัปเดต email credentials ใน `.env.production`

## 🔐 Security Notes

- เปลี่ยน JWT secrets ในการ deploy จริง
- ตั้งค่า email passwords ใน `.env.production`
- ตรวจสอบ firewall settings
- Backup ข้อมูลสม่ำเสมอ

## 📞 Support

หากมีปัญหา สามารถตรวจสอบ:
1. PM2 logs: `npm run logs:pm2`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. System logs: `sudo journalctl -u nginx -f`
4. Database logs: ตรวจสอบ PostgreSQL logs
