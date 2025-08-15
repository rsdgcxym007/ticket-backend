# 🧪 Email System Test Documentation

## การใช้งานสคริปต์ทดสอบ

### เริ่มต้นใช้งาน
```bash
# ทดสอบแบบ Interactive (มีเมนู)
npm run test:email

# ทดสอบอัตโนมัติทั้งหมด
npm run test:email:auto

# หรือเรียกไฟล์โดยตรง
node test-email-system.js
```

### ก่อนเริ่มทดสอบ
1. ✅ เซิร์ฟเวอร์ต้องทำงานอยู่ที่ `http://localhost:3000`
2. ✅ ฐานข้อมูลต้องเชื่อมต่อสำเร็จ
3. ✅ Gmail SMTP ต้องตั้งค่าถูกต้อง
4. ✅ มี test email addresses ที่สามารถรับอีเมลได้

---

## 📊 Test Cases ที่ครอบคลุม

### 1. 🔗 API Connection Test
- **จุดประสงค์**: ตรวจสอบการเชื่อมต่อ API
- **Endpoint**: `GET /health`
- **ผลลัพธ์ที่คาดหวัง**: Status 200

### 2. 📧 Email System Test
- **จุดประสงค์**: ทดสอบระบบส่งอีเมลพื้นฐาน
- **Tests**:
  - ดึง Email Templates
  - ส่งอีเมลทดสอบ
- **ข้อมูลทดสอบ**:
```json
{
  "orderId": "TEST-001",
  "recipientEmail": "test@example.com",
  "recipientName": "ทดสอบ สมิท",
  "ticketType": "ตั๋วทดสอบ",
  "quantity": 2,
  "showDate": "2025-08-20",
  "totalAmount": 3000,
  "seatNumbers": ["A1", "A2"],
  "includeQRCode": true,
  "notes": "นี่คือการทดสอบระบบส่งอีเมล"
}
```

### 3. 🎫 Seated Ticket Order Test
- **จุดประสงค์**: ทดสอบการสร้างออเดอร์ตั๋วที่นั่ง
- **Endpoint**: `POST /api/order/seated`
- **ข้อมูลทดสอบ**:
```json
{
  "customerName": "ทดสอบ สมิท",
  "customerEmail": "test@example.com",
  "customerPhone": "0812345678",
  "zoneId": "zone-vip",
  "seatNumbers": ["A1", "A2"],
  "quantity": 2,
  "pricePerSeat": 1500,
  "showDate": "2025-08-20",
  "notes": "ทดสอบการสั่งซื้อตั๋วที่นั่ง"
}
```

### 4. 🎪 Standing Ticket Order Test
- **จุดประสงค์**: ทดสอบการสร้างออเดอร์ตั๋วยืน
- **Endpoint**: `POST /api/order/standing`
- **ข้อมูลทดสอบ**:
```json
{
  "customerName": "John Doe",
  "customerEmail": "john.doe@gmail.com",
  "customerPhone": "0823456789",
  "standingAdultQty": 2,
  "standingChildQty": 1,
  "adultPrice": 800,
  "childPrice": 400,
  "showDate": "2025-08-22",
  "notes": "ทดสอบการสั่งซื้อตั๋วยืน"
}
```

### 5. 💳 Payment & Email Automation Test
- **จุดประสงค์**: ทดสอบการชำระเงินและส่งอีเมลอัตโนมัติ
- **กระบวนการ**:
  1. ชำระเงินบางส่วน (ไม่ควรส่งอีเมล)
  2. ชำระส่วนที่เหลือ (ควรส่งอีเมล)

#### การชำระเงินบางส่วน
```json
{
  "orderId": "ORD-xxx",
  "amount": 1500,
  "method": "CASH",
  "notes": "ชำระเงินบางส่วน - ทดสอบ"
}
```

#### การชำระเงินครบ
```json
{
  "orderId": "ORD-xxx",
  "amount": 1500,
  "method": "TRANSFER",
  "notes": "ชำระเงินครบ - ควรส่งอีเมลตั๋ว"
}
```

---

## 📋 Test Data Sets

### 👥 Customer Data
```javascript
const customers = [
  {
    name: 'ทดสอบ สมิท',
    email: 'test@example.com',
    phone: '0812345678'
  },
  {
    name: 'John Doe',
    email: 'john.doe@gmail.com',
    phone: '0823456789'
  },
  {
    name: 'นางสาวทดสอบ ระบบ',
    email: 'system.test@yahoo.com',
    phone: '0834567890'
  }
];
```

### 🎫 Seated Ticket Data
```javascript
const seatedTickets = [
  {
    zoneId: 'zone-vip',
    seatNumbers: ['A1', 'A2'],
    quantity: 2,
    pricePerSeat: 1500,
    showDate: '2025-08-20'
  },
  {
    zoneId: 'zone-premium',
    seatNumbers: ['B5', 'B6', 'B7'],
    quantity: 3,
    pricePerSeat: 1200,
    showDate: '2025-08-21'
  }
];
```

### 🎪 Standing Ticket Data
```javascript
const standingTickets = [
  {
    adultQty: 2,
    childQty: 1,
    adultPrice: 800,
    childPrice: 400,
    showDate: '2025-08-22'
  },
  {
    adultQty: 4,
    childQty: 0,
    adultPrice: 800,
    childPrice: 400,
    showDate: '2025-08-23'
  }
];
```

---

## 🎯 Expected Results

### ✅ Success Scenarios

#### 1. API Connection Success
```
✅ API เชื่อมต่อสำเร็จ
ℹ️ Status: 200
```

#### 2. Email System Success
```
✅ ดึง Email Templates สำเร็จ
✅ ส่งอีเมลทดสอบสำเร็จไปยัง test@example.com
```

#### 3. Seated Order Success
```
✅ สร้างออเดอร์ตั๋วที่นั่งสำเร็จ
ℹ️ Order ID: xxx-xxx-xxx
ℹ️ Order Number: ORD-20250815-001
ℹ️ Total Amount: ฿3000
```

#### 4. Standing Order Success
```
✅ สร้างออเดอร์ตั๋วยืนสำเร็จ
ℹ️ Order ID: xxx-xxx-xxx
ℹ️ Order Number: ORD-20250815-002
ℹ️ Total Amount: ฿2000
```

#### 5. Payment & Email Success
```
✅ ชำระเงินบางส่วนสำเร็จ (ไม่ควรส่งอีเมล)
ℹ️ จำนวนที่ชำระ: ฿1500
ℹ️ ยอดคงเหลือ: ฿1500

✨ ชำระเงินครบสำเร็จ (ควรส่งอีเมลตั๋วแล้ว)
ℹ️ จำนวนที่ชำระครั้งนี้: ฿1500
ℹ️ ยอดรวมที่ชำระ: ฿3000
📧 อีเมลตั๋วควรส่งไปยัง: test@example.com
ℹ️ Payment ID: xxx-xxx-xxx
ℹ️ Payment Status: COMPLETED
ℹ️ Is Fully Paid: YES
```

### ❌ Error Scenarios

#### API Connection Failed
```
❌ API เชื่อมต่อไม่สำเร็จ
❌ ไม่สามารถเชื่อมต่อ API: ECONNREFUSED
```

#### Email Sending Failed
```
❌ ส่งอีเมลทดสอบไม่สำเร็จ
Error: Invalid email configuration
```

#### Order Creation Failed
```
❌ สร้างออเดอร์ตั๋วที่นั่งไม่สำเร็จ
Error: Zone not found
```

---

## 📊 Test Summary

### ผลการทดสอบที่สมบูรณ์
```
📊 สรุปผลการทดสอบ
ผลการทดสอบ: 6/6 ผ่าน

รายละเอียดการทดสอบ:
1. การเชื่อมต่อ API: ✅ ผ่าน
2. ระบบส่งอีเมล: ✅ ผ่าน
3. สร้างออเดอร์ตั๋วที่นั่ง: ✅ ผ่าน
4. สร้างออเดอร์ตั๋วยืน: ✅ ผ่าน
5. ชำระเงินและส่งอีเมล (ตั๋วที่นั่ง): ✅ ผ่าน
6. ชำระเงินและส่งอีเมล (ตั๋วยืน): ✅ ผ่าน

🎉 ระบบส่งอีเมลตั๋วทำงานได้สมบูรณ์!
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. API Connection Failed
**สาเหตุ**: เซิร์ฟเวอร์ไม่ทำงาน
**แก้ไข**: 
```bash
npm run start:dev
```

#### 2. Email Sending Failed
**สาเหตุ**: Gmail SMTP configuration ผิด
**ตรวจสอบ**: 
- `GMAIL_USER` in .env
- `GMAIL_APP_PASSWORD` in .env
- Gmail App Password ถูกต้อง

#### 3. Order Creation Failed
**สาเหตุ**: Database connection หรือ missing zones
**แก้ไข**:
```bash
npm run seed:zone
npm run seed:seat
```

#### 4. Payment Processing Failed
**สาเหตุ**: Order not found หรือ validation failed
**ตรวจสอบ**: Order ID ถูกต้องและ order status เป็น PENDING

---

## 📧 Email Template Testing

### สิ่งที่ต้องตรวจสอบในอีเมลที่ได้รับ

1. **📱 Subject Line**: 
   - "🎫 Your Digital Ticket - Order ORD-xxx"

2. **🎨 Design Elements**:
   - Modern gradient background
   - Responsive layout
   - Ticket card design
   - Professional typography

3. **📊 Ticket Information**:
   - Ticket Holder name
   - Ticket Type
   - Quantity
   - Event Date
   - Seat Numbers (สำหรับ seated tickets)
   - Total Amount

4. **📱 QR Code**:
   - QR code image แสดงอยู่
   - QR code สามารถสแกนได้
   - Contains order information

5. **📋 Instructions**:
   - Important instructions section
   - Contact information
   - Professional footer

### Mobile Testing
- เปิดอีเมลบนมือถือ
- ตรวจสอบ responsive design
- ตรวจสอบ dark mode support (ถ้า device รองรับ)

---

## 🚀 Next Steps

หลังจากทดสอบสำเร็จแล้ว:

1. **Production Testing**: ทดสอบบน production environment
2. **Load Testing**: ทดสอบการส่งอีเมลหลายๆ ฉบับพร้อมกัน
3. **Email Delivery**: ตรวจสอบ delivery rate และ spam score
4. **User Acceptance**: ให้ user ทดสอบจริง
5. **Monitoring**: ติดตั้ง monitoring สำหรับ email delivery

## 📞 Support

หากมีปัญหาในการทดสอบ:
- ตรวจสอบ console logs
- ดู server logs ใน terminal
- ตรวจสอบ email logs ใน Gmail
- ติดต่อทีมพัฒนาระบบ
