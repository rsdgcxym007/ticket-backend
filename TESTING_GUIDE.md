# 📧 Ticket Email System Testing Guide

## 🎯 ภาพรวมระบบ

ระบบส่งอีเมลตั๋วอัตโนมัติที่ผสานระหว่าง **PaymentService** และ **EmailAutomationService** เมื่อลูกค้าชำระเงินครบแล้ว ระบบจะส่งอีเมลตั๋วที่สวยงามและครบถ้วนโดยอัตโนมัติ

### 🔄 Payment → Email Flow
```
ลูกค้าชำระเงิน → ตรวจสอบการชำระครบ → ส่งอีเมลตั๋วอัตโนมัติ
```

---

## 🚀 วิธีการทดสอบ

### 1. **Quick Test (แนะนำ)**
```bash
# ทดสอบทั้งหมดอัตโนมัติ
node quick-test.js

# ทดสอบด้วยอีเมลกำหนดเอง
node quick-test.js --email your.email@gmail.com

# ทดสอบด้วย API URL กำหนดเอง
node quick-test.js --url http://localhost:4000
```

### 2. **Comprehensive Test**
```bash
# ทดสอบแบบ Interactive
npm run test:email

# ทดสอบทั้งหมดอัตโนมัติ
npm run test:email:auto
```

### 3. **Manual Test**
```bash
# ทดสอบด้วยไฟล์โดยตรง
node test-email-system.js
```

---

## 📋 Test Cases ที่ครอบคลุม

### ✅ 1. API Health Check
- ตรวจสอบเซิร์ฟเวอร์ทำงานปกติ
- **Endpoint**: `GET /health`
- **Expected**: Status 200

### ✅ 2. Email Templates Test
- ตรวจสอบ Email Templates ที่มีอยู่
- **Endpoint**: `GET /api/email/templates`
- **Expected**: รายการ templates ที่ใช้ได้

### ✅ 3. Direct Email Sending
- ทดสอบส่งอีเมลโดยตรง
- **Endpoint**: `POST /api/email/send-ticket`
- **Expected**: อีเมลตั๋วทดสอบส่งสำเร็จ

### ✅ 4. Seated Ticket Email
- ทดสอบอีเมลตั๋วที่นั่ง
- **Data**: VIP seats, seat numbers, QR code
- **Expected**: อีเมลแสดงข้อมูลที่นั่งครบถ้วน

### ✅ 5. Standing Ticket Email
- ทดสอบอีเมลตั๋วยืน
- **Data**: Adult/child quantities, standing info
- **Expected**: อีเมลแสดงข้อมูลตั๋วยืนครบถ้วน

### ✅ 6. Email without QR Code
- ทดสอบอีเมลที่ไม่มี QR Code
- **Data**: `includeQRCode: false`
- **Expected**: อีเมลไม่แสดง QR section

### ✅ 7. Large Amount Formatting
- ทดสอบการจัดรูปแบบยอดเงินใหญ่
- **Data**: Amount > 100,000
- **Expected**: ยอดเงินแสดงเป็น ฿123,456.78

---

## 🎨 Email Template Features

### 📱 Modern Design
- **Responsive Design**: ใช้งานได้ทุกอุปกรณ์
- **Gradient Background**: พื้นหลัง gradient สวยงาม
- **Ticket Card Layout**: ออกแบบเป็นตั๋วจริง
- **Modern Typography**: ฟอนต์สวยงาม readable

### 🌙 Advanced Features
- **Dark Mode Support**: รองรับโหมดมื่อ
- **Grid Layout**: จัดข้อมูลเป็น grid
- **QR Code Integration**: QR Code ฝังในอีเมล
- **Email Client Compatibility**: ใช้ได้ทุก email client

### 📊 Comprehensive Data
- ชื่อผู้ถือตั๋ว (Ticket Holder)
- ประเภทตั๋ว (Ticket Type)
- จำนวนตั๋ว (Quantity)
- วันที่งาน (Event Date)
- หมายเลขที่นั่ง (Seat Numbers)
- ยอดรวม (Total Amount)
- QR Code สำหรับเข้างาน
- คำแนะนำสำคัญ (Important Instructions)

---

## 🔧 Test Configuration

### Default Settings
```javascript
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  testEmail: 'rsdgcxym@gmail.com',
};
```

### Environment Variables
```bash
# Gmail SMTP Configuration
GMAIL_USER=rsdgcxym@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Database Configuration  
DATABASE_URL=your_database_url

# Server Configuration
PORT=3000
```

---

## 📈 Expected Results

### ✅ Successful Test Output
```
=================================================
🧪 TICKET EMAIL SYSTEM - QUICK TESTS
=================================================
✅ API Health Check
✅ Email Templates
✅ Direct Email Sending
✅ Seated Ticket Email
✅ Standing Ticket Email
✅ Email without QR
✅ Large Amount Formatting

📊 สรุปผลการทดสอบ
🎉 ผ่านทั้งหมด: 7/7

🚀 ระบบพร้อมใช้งานแล้ว!
```

### 📧 Email Content Validation
ตรวจสอบใน inbox ว่าอีเมลมี:

1. **Subject**: "🎫 Your Digital Ticket - Order ORD-xxx"
2. **Header**: Digital Ticket พร้อม gradient background
3. **Ticket Card**: EVENT TICKET card พร้อมข้อมูลครบถ้วน
4. **QR Code**: QR Code section (เมื่อ enabled)
5. **Instructions**: Important Instructions section
6. **Footer**: Contact information และ social links

---

## 🐛 Troubleshooting

### ❌ Common Issues

#### 1. API Connection Failed
```
❌ API server is not responding
```
**Solution**:
```bash
npm run start:dev
```

#### 2. Email Sending Failed
```
❌ ส่งอีเมลทดสอบไม่สำเร็จ
Error: Invalid login
```
**Solutions**:
- ตรวจสอบ `GMAIL_USER` ใน .env
- ตรวจสอบ `GMAIL_APP_PASSWORD` ใน .env  
- สร้าง App Password ใหม่ใน Gmail

#### 3. Template Loading Failed
```
❌ ไม่สามารถดึง Email Templates ได้
```
**Solution**:
- ตรวจสอบ EmailModule import ใน AppModule
- ตรวจสอบ EmailAutomationService registration

#### 4. Database Connection Error
```
Error: Connection terminated
```
**Solution**:
```bash
# ตรวจสอบ database
npm run typeorm -- query "SELECT 1"

# รัน migrations
npm run migration:run
```

---

## 📱 Mobile Testing

### ขั้นตอนการทดสอบบนมือถือ
1. ส่งอีเมลทดสอบให้ตัวเอง
2. เปิดอีเมลบนมือถือ
3. ตรวจสอบ responsive design
4. ทดสอบ dark mode (ถ้า device รองรับ)
5. ทดสอบ QR Code scanning

### สิ่งที่ต้องตรวจสอบ
- ✅ Layout ปรับตัวตามหน้าจอ
- ✅ Text อ่านง่าย ไม่เล็กเกินไป
- ✅ Button และ link กดได้ง่าย
- ✅ QR Code แสดงชัดเจน สแกนได้
- ✅ Colors แสดงถูกต้อง

---

## 🎯 Production Testing

### Pre-Production Checklist
- [ ] ทดสอบบน staging environment
- [ ] ทดสอบ email delivery rate
- [ ] ตรวจสอบ spam score
- [ ] Load testing (ส่งหลายๆ อีเมลพร้อมกัน)
- [ ] Cross-client testing (Gmail, Outlook, Apple Mail)

### Production Deployment
```bash
# Build และ deploy
npm run build
npm run start:prod

# ทดสอบหลัง deploy
node quick-test.js --url https://your-production-domain.com
```

---

## 📞 Support & Contact

### การรายงานปัญหา
หากพบปัญหาในการทดสอบ:

1. **Check Logs**: ดู console logs และ server logs
2. **Check Email**: ตรวจสอบ spam folder
3. **Check Configuration**: ยืนยัน environment variables
4. **Contact Team**: ติดต่อทีมพัฒนาพร้อมข้อมูล error

### Useful Commands
```bash
# ดู server logs
npm run logs:pm2

# ตรวจสอบ email configuration
node -e "console.log(process.env.GMAIL_USER)"

# ทดสอบ database connection
npm run typeorm -- query "SELECT NOW()"

# Build project
npm run build
```

---

## 📚 Additional Resources

- [Email Template Documentation](./test-documentation.md)
- [API Endpoints Reference](./docs/API_ENDPOINTS_SUMMARY.md)
- [Frontend Implementation Guide](./docs/FRONTEND_IMPLEMENTATION_GUIDE.md)
- [Environment Configuration](./docs/ENVIRONMENT_CONFIGURATION.md)

---

**🎉 Happy Testing! ระบบส่งอีเมลตั๋วของเราพร้อมให้บริการแล้ว!**
