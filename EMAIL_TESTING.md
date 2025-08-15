# 📧 Email API Testing Examples

## 🎯 **ขั้นตอนการทดสอบ**

### **1. เตรียม JWT Token**
ก่อนทดสอบต้องมี JWT Token (เข้าสู่ระบบด้วย Staff/Admin account):

```bash
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

### **2. ทดสอบส่งอีเมลตั๋ว**

```bash
# ส่งตั๋วพร้อม QR Code
POST http://localhost:4000/api/v1/email/send-ticket
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "orderId": "ORD-20250815-001",
  "recipientEmail": "test@example.com",
  "recipientName": "ลูกค้าทดสอบ",
  "includeQRCode": true,
  "language": "th",
  "notes": "ตั๋วสำหรับที่นั่ง A1-A2 จำนวน 2 ใบ"
}
```

### **3. ทดสอบส่งยืนยันการสั่งซื้อ**

```bash
POST http://localhost:4000/api/v1/email/send-confirmation
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "orderId": "ORD-20250815-001",
  "customerEmail": "test@example.com",
  "customerName": "ลูกค้าทดสอบ",
  "totalAmount": 3000,
  "paymentMethod": "เงินสด"
}
```

### **4. ทดสอบระบบอีเมลทั่วไป**

```bash
POST http://localhost:4000/api/v1/email/test
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "email": "test@example.com",
  "subject": "ทดสอบระบบอีเมล",
  "message": "Hello from Ticket Backend System!"
}
```

## 🧪 **การทดสอบแบบครบวงจร**

### **1. สร้างออเดอร์ใหม่และทดสอบอีเมลยืนยัน**

```bash
# สร้างออเดอร์ (จะส่งอีเมลยืนยันอัตโนมัติ)
POST http://localhost:4000/orders
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "ticketType": "STANDING",
  "standingAdultQty": 2,
  "standingChildQty": 0,
  "showDate": "2025-08-20T19:00:00Z",
  "customerName": "นายทดสอบ ระบบ",
  "customerPhone": "081-234-5678",
  "customerEmail": "test@example.com",
  "paymentMethod": "CASH",
  "purchaseType": "WEBSITE"
}
```

### **2. ยืนยันการชำระเงินและส่งตั๋ว**

```bash
# ยืนยันการชำระเงิน (จะส่งตั๋วอัตโนมัติ)
PATCH http://localhost:4000/orders/{ORDER_ID}/confirm-payment
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📊 **Expected Response**

### **Success Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "email-1723795200000-abc123",
    "orderId": "ORD-20250815-001",
    "recipientEmail": "test@example.com",
    "sentAt": "2025-08-15T14:30:00.000Z",
    "status": "sent"
  },
  "message": "ส่งตั๋วทาง email สำเร็จ",
  "timestamp": "2025-08-15T14:30:00.000Z"
}
```

### **Error Response:**
```json
{
  "success": false,
  "message": "เกิดข้อผิดพลาดในการส่ง email",
  "error": "Invalid email configuration",
  "timestamp": "2025-08-15T14:30:00.000Z"
}
```

## 🔍 **การตรวจสอบผลลัพธ์**

### **1. ตรวจสอบ Log**
```bash
# ดู log ในคอนโซล
npm run start:dev

# ข้อความที่ควรเห็น:
# 📧 Email transporter initialized with rsdgcxym@gmail.com
# 📧 กำลังส่งตั๋วทาง email สำหรับออเดอร์ ORD-xxx
# ✅ ส่งตั๋วทาง email สำเร็จ - Message ID: xxx
```

### **2. ตรวจสอบอีเมลในกล่องจดหมาย**
- เช็คใน Inbox ของอีเมลที่ส่งไป
- ตรวจสอบ Spam folder ถ้าไม่เจอ
- QR Code ควรแสดงในอีเมลและเป็น attachment

### **3. ทดสอบ QR Code**
- สแกน QR Code ด้วยแอปกล้องมือถือ
- ควรเปิดลิงก์ไปยัง: `http://localhost:3000/api/v1/mobile/scanner/check-in/{orderId}?qr=...`

## 🚨 **Common Issues & Solutions**

### **1. SMTP Authentication Failed**
```bash
# Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**Solution:** ตรวจสอบ Gmail App Password

### **2. Network Error**
```bash
# Error: connect ECONNREFUSED 127.0.0.1:587
```
**Solution:** ตรวจสอบ SMTP_HOST และ SMTP_PORT

### **3. Email Not Received**
**Solutions:**
- ตรวจสอบ Spam folder
- ตรวจสอบ EMAIL_FROM address
- ลองส่งไปยังอีเมลอื่น

### **4. QR Code Not Generated**
```bash
# Error: QR Code generation failed
```
**Solution:** ตรวจสอบ QRCodeService และ environment variables

## 📋 **Pre-deployment Checklist**

- [ ] Gmail App Password ถูกต้อง
- [ ] Environment variables ครบถ้วน
- [ ] ทดสอบส่งอีเมลสำเร็จ
- [ ] QR Code สแกนได้
- [ ] Email template แสดงผลถูกต้อง
- [ ] Log messages ปรากฏปกติ

---

**🎯 Happy Email Testing! 📧**
