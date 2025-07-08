# คู่มือการขึ้นระบบบน Render.com

## ข้อมูลเบื้องต้น
ระบบของคุณเป็น NestJS Backend API ที่ใช้ PostgreSQL เป็นฐานข้อมูล และมี file upload functionality

## 1. แพ็กเกจที่แนะนำ

### สำหรับระบบ Production
- **Web Service**: $7/เดือน (Starter Plan)
  - 0.5 GB RAM
  - 0.5 CPU
  - 100 GB Bandwidth
  - เหมาะสำหรับ API ขนาดเล็กถึงกลาง

### สำหรับฐานข้อมูล
- **PostgreSQL**: $7/เดือน (Starter Plan)
  - 1 GB Storage
  - 1 GB RAM
  - 97 connections
  - เหมาะสำหรับระบบขนาดเล็กถึงกลาง

### หากต้องการประสิทธิภาพสูงขึ้น
- **Web Service**: $25/เดือน (Standard Plan)
  - 2 GB RAM
  - 1 CPU
  - 400 GB Bandwidth

- **PostgreSQL**: $20/เดือน (Standard Plan)
  - 10 GB Storage
  - 2 GB RAM
  - 197 connections

## 2. การเตรียมโปรเจ็กต์

### 2.1 ตรวจสอบไฟล์ที่จำเป็น

```bash
# ควรมีไฟล์เหล่านี้
- package.json
- tsconfig.json
- nest-cli.json
- render.yaml (มีอยู่แล้ว)
```

### 2.2 แก้ไข package.json
เพิ่ม scripts สำหรับ production:

```json
{
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main"
  }
}
```

### 2.3 ตรวจสอบไฟล์ render.yaml
```yaml
services:
  - type: web
    name: ticket-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: ticket-db
          property: connectionString
```

## 3. ขั้นตอนการ Deploy

### 3.1 เตรียม Repository
1. Push โค้ดไปยัง GitHub repository
2. ตรวจสอบว่า `.env` ไม่ได้อยู่ใน repository (ใช้ `.env.example` แทน)

### 3.2 สร้าง Database บน Render
1. เข้า render.com และ login
2. คลิก "New +" → "PostgreSQL"
3. ใส่ชื่อ database เช่น "ticket-db"
4. เลือก plan ($7/เดือน สำหรับ starter)
5. รอให้ database สร้างเสร็จ

### 3.3 สร้าง Web Service
1. คลิก "New +" → "Web Service"
2. เชื่อมต่อ GitHub repository
3. เลือก repository ของโปรเจ็กต์
4. ตั้งค่า:
   - **Name**: ticket-backend
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Starter ($7/เดือน)

### 3.4 ตั้งค่า Environment Variables
เพิ่ม environment variables เหล่านี้:

```
NODE_ENV=production
DATABASE_URL=[จะได้จาก database ที่สร้าง]
JWT_SECRET=your-jwt-secret-key
PORT=10000
```

### 3.5 การตั้งค่า File Upload
เนื่องจากระบบมี file upload อาจต้องพิจารณา:
1. ใช้ AWS S3 หรือ Google Cloud Storage
2. หรือใช้ Render's persistent disk (เพิ่มเติมค่าใช้จ่าย)

## 4. ค่าใช้จ่ายรวม

### แพ็กเกจ Starter (แนะนำสำหรับเริ่มต้น)
- Web Service: $7/เดือน
- PostgreSQL: $7/เดือน
- **รวม: $14/เดือน**

### แพ็กเกจ Standard (สำหรับ production จริง)
- Web Service: $25/เดือน
- PostgreSQL: $20/เดือน
- **รวม: $45/เดือน**

## 5. ข้อดีของ Render.com

### ✅ ข้อดี
- Deploy อัตโนมัติจาก GitHub
- SSL certificate ฟรี
- Custom domain ได้
- Monitoring และ logs
- Zero downtime deployments
- ใช้งานง่าย

### ❌ ข้อเสีย
- ราคาแพงกว่า VPS
- Resource จำกัดในแพ็กเกจ starter
- Cold start สำหรับ free tier

## 6. ทางเลือกอื่น

### Railway ($5-10/เดือน)
- ราคาถูกกว่า
- Deploy ง่าย
- PostgreSQL รวมอยู่ด้วย

### DigitalOcean App Platform ($12-25/เดือน)
- ประสิทธิภาพดี
- Database แยกต่างหาก

### AWS/Google Cloud
- ซับซ้อนกว่า
- ค่าใช้จ่ายแปรผัน
- Scalable มากกว่า

## 7. คำแนะนำ

### สำหรับการเริ่มต้น
1. ใช้ Starter Plan ($14/เดือน)
2. ทดสอบระบบให้ครบถ้วน
3. Monitor การใช้งาน

### สำหรับ Production
1. อัปเกรดเป็น Standard Plan
2. ตั้งค่า monitoring
3. Backup database สม่ำเสมอ
4. ใช้ CDN สำหรับ static files

## 8. การ Monitor และ Maintenance

### Monitoring
- ดู logs ใน Render dashboard
- ตั้งค่า alerts
- ติดตาม performance metrics

### Backup
- Render backup database อัตโนมัติ
- สามารถ manual backup ได้
- ควร test restore process

## สรุป

**แนะนำเริ่มต้นด้วย Starter Plan ($14/เดือน)** เพื่อทดสอบระบบ แล้วค่อยอัปเกรดตามความต้องการ

Render.com เป็นตัวเลือกที่ดีสำหรับ NestJS เพราะ:
- Setup ง่าย
- Support Node.js เต็มที่
- PostgreSQL integration ดี
- Documentation ครบถ้วน

หากต้องการคำแนะนำเพิ่มเติมเกี่ยวกับการ setup หรือ configuration สามารถสอบถามได้ครับ
