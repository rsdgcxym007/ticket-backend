# 📧 Email System Setup Guide

## 🎯 **ภาพรวม**
ระบบส่งอีเมลอัตโนมัติที่ส่งตั๋วและการยืนยันการสั่งซื้อให้ลูกค้าทางอีเมล

## ⚙️ **การตั้งค่า Environment Variables**

### **Development (.env.development)**
```bash
# Email Configuration (Development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rsdgcxym@gmail.com
SMTP_PASS=your-gmail-app-password-here
EMAIL_FROM=rsdgcxym@gmail.com
```

### **Production (.env.production)**
```bash
# Email Configuration (Production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rsdgcxym@gmail.com
SMTP_PASS=your-gmail-app-password-here
EMAIL_FROM=rsdgcxym@gmail.com
```

## 🔐 **การสร้าง Gmail App Password**

1. **เปิด Google Account Settings**: https://myaccount.google.com/
2. **Security** → **2-Step Verification** (ต้องเปิดก่อน)
3. **App passwords** → **Generate password**
4. **เลือก App**: Mail
5. **เลือก Device**: Other (custom name) → ใส่ "Ticket Backend"
6. **Copy password** ที่ได้มาใส่ในตัวแปร `SMTP_PASS`

## 🚀 **ฟีเจอร์ที่มี**

### **1. ส่งอีเมลยืนยันการสั่งซื้อ** 
- **เมื่อไหร่**: หลังจากลูกค้าสร้างออเดอร์สำเร็จ
- **เนื้อหา**: รายละเอียดออเดอร์, จำนวนเงิน, วิธีชำระเงิน
- **Template**: HTML สวยงาม responsive design

### **2. ส่งตั๋ว QR Code**
- **เมื่อไหร่**: หลังจาก Staff/Admin ยืนยันการชำระเงิน
- **เนื้อหา**: QR Code สำหรับเข้างาน, รายละเอียดตั๋ว
- **Attachment**: QR Code เป็นไฟล์ .png

## 📱 **การทำงานของระบบ**

### **Flow การส่งอีเมล:**
```
1. ลูกค้าสร้างออเดอร์ (POST /orders)
   ↓
2. 📧 ส่งอีเมลยืนยันการสั่งซื้อทันที
   ↓
3. Staff ยืนยันการชำระเงิน (PATCH /orders/:id/confirm-payment)
   ↓
4. 📧 ส่งตั๋ว QR Code ให้ลูกค้า
```

## 🎨 **Email Templates**

### **Order Confirmation Email:**
- ✅ หัวข้อ: "ยืนยันการสั่งซื้อ - ออเดอร์ ORD-xxx"
- ✅ เนื้อหา: รายละเอียดออเดอร์, จำนวนเงิน
- ✅ Design: Modern HTML template

### **Ticket Email:**
- ✅ หัวข้อ: "ตั๋วของคุณสำหรับออเดอร์ ORD-xxx"
- ✅ เนื้อหา: QR Code, วิธีใช้งาน
- ✅ Attachment: QR Code PNG file

## 🔧 **Manual API Usage**

### **ส่งตั๋วทางอีเมล:**
```bash
POST /api/v1/email/send-ticket
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "orderId": "ORD-20250815-001",
  "recipientEmail": "customer@example.com",
  "recipientName": "John Doe",
  "includeQRCode": true,
  "language": "th",
  "notes": "ตั๋วสำหรับที่นั่ง A1-A2"
}
```

### **ส่งยืนยันการสั่งซื้อ:**
```bash
POST /api/v1/email/send-confirmation
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "orderId": "ORD-20250815-001",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe", 
  "totalAmount": 3000,
  "paymentMethod": "Cash"
}
```

## 🧪 **การทดสอบ**

### **ทดสอบส่งอีเมล:**
```bash
POST /api/v1/email/test
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "email": "test@example.com",
  "subject": "Test Email",
  "message": "Hello from Ticket Backend!"
}
```

## 📊 **Logging และ Monitoring**

### **Log Messages:**
- ✅ `📧 กำลังส่งตั๋วทาง email สำหรับออเดอร์ ORD-xxx`
- ✅ `✅ ส่งตั๋วทาง email สำเร็จ: customer@example.com`
- ❌ `❌ ส่งอีเมลไม่สำเร็จ: error message`

### **Email Status:**
- `sent`: ส่งสำเร็จ
- `failed`: ส่งไม่สำเร็จ
- `delivered`: ถึงปลายทางแล้ว (ถ้า provider รองรับ)

## 🚨 **Troubleshooting**

### **ปัญหาที่พบบ่อย:**

1. **Gmail App Password ไม่ทำงาน**
   - ✅ ตรวจสอบว่าเปิด 2-Step Verification แล้ว
   - ✅ สร้าง App Password ใหม่
   - ✅ ตรวจสอบว่าไม่มี space ใน password

2. **อีเมลไม่ส่ง**
   - ✅ ตรวจสอบ Environment Variables
   - ✅ ดู log ใน console
   - ✅ ทดสอบด้วย API `/api/v1/email/test`

3. **QR Code ไม่แสดงในอีเมล**
   - ✅ ตรวจสอบ QRCodeService
   - ✅ ดูว่า attachment ถูกสร้างหรือไม่

## 🔐 **Security**

- ✅ ใช้ Gmail App Password (ไม่ใช้รหัสผ่านหลัก)
- ✅ SMTP over TLS (port 587)
- ✅ Environment Variables สำหรับ sensitive data
- ✅ Error handling ไม่ expose credentials

## 🎯 **Next Steps**

1. **Email Templates Management** - หน้าแอดมินแก้ไข template
2. **Email Analytics** - ติดตาม open rate, click rate
3. **Email Queue** - ส่งแบบ background job
4. **Multiple Providers** - รองรับ SendGrid, Mailgun
5. **Email Scheduling** - ส่งอีเมลนัดหมาย

---

**🎉 Ready to send beautiful emails! 🚀**
