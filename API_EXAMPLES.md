# 🧪 ตัวอย่าง API Requests สำหรับทดสอบ

## 🎫 1. สร้างออเดอร์ตั๋วยืน

```http
POST /orders
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "ticketType": "STANDING",
  "standingAdultQty": 1,
  "standingChildQty": 1,
  "showDate": "2025-12-31",
  "customerName": "ทดสอบ สมิท",
  "customerPhone": "0812345678",
  "customerEmail": "test@example.com",
  "source": "DIRECT"
}
```

## 🪑 2. สร้างออเดอร์ตั๋วนั่ง

```http
POST /orders
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "ticketType": "RINGSIDE",
  "seatIds": ["seat-uuid-1", "seat-uuid-2"],
  "showDate": "2025-12-31",
  "customerName": "ทดสอบ สมิท",
  "customerPhone": "0812345678",
  "customerEmail": "test@example.com",
  "source": "DIRECT"
}
```

## 💰 3. ชำระเงินตั๋วยืน (ใหม่)

```http
POST /payments/standing
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "orderId": "be07fc45-21b9-4b02-97c5-8f1f477dd58d",
  "amount": 2700,
  "method": "CASH",
  "customerName": "ทดสอบ สมิท อัปเดต",
  "referrerCode": "REF001"
}
```

## 💰 4. ชำระเงินตั๋วนั่ง (ใหม่)

```http
POST /payments/seated
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "orderId": "another-order-uuid",
  "amount": 3600,
  "method": "CASH",
  "customerName": "ลูกค้า VIP",
  "referrerCode": "REF002"
}
```

## 📊 5. ดูข้อมูลการชำระเงิน

```http
GET /payments/order/be07fc45-21b9-4b02-97c5-8f1f477dd58d
Authorization: Bearer <your-jwt-token>
```

## 🚫 6. ยกเลิกการชำระเงิน (Admin/Staff เท่านั้น)

```http
PATCH /payments/cancel/be07fc45-21b9-4b02-97c5-8f1f477dd58d
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "reason": "ลูกค้าขอยกเลิก - คืนเงิน"
}
```

## 🔄 7. Backward Compatibility - ตั๋วยืน (เก่า)

```http
POST /payments/pay-standing
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "orderId": "be07fc45-21b9-4b02-97c5-8f1f477dd58d",
  "amount": 2700,
  "method": "CASH",
  "referrerCode": "REF001"
}
```

## 🔄 8. Backward Compatibility - ตั๋วนั่ง (เก่า)

```http
POST /payments
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "orderId": "another-order-uuid",
  "amount": 3600,
  "method": "CASH",
  "customerName": "ลูกค้า VIP"
}
```

---

## 🎯 Body Fields สำหรับ Payment

### **Required Fields:**
- `orderId`: UUID ของคำสั่งซื้อ
- `amount`: จำนวนเงินที่ชำระ (number)
- `method`: วิธีการชำระเงิน (`"CASH"`, `"QR_CODE"`, `"BANK_TRANSFER"`, `"CREDIT_CARD"`)

### **Optional Fields:**
- `customerName`: ชื่อลูกค้า (สำหรับอัปเดตชื่อ)
- `referrerCode`: รหัสผู้แนะนำ (สำหรับเพิ่มผู้แนะนำหลังสร้างออเดอร์)
- `slipUrl`: URL ของสลิปการโอนเงิน

---

## ⚠️ ข้อสำคัญ

### **สำหรับตั๋วยืน:**
- ต้องมี `standingAdultQty` หรือ `standingChildQty` > 0
- `ticketType` ต้องเป็น `"STANDING"`

### **สำหรับตั๋วนั่ง:**
- ต้องมี `seatIds` ที่ถูกต้อง
- `ticketType` ต้องเป็น `"RINGSIDE"` หรือ `"STADIUM"`

### **การคำนวณ Amount:**
- **ตั๋วยืนผู้ใหญ่:** 1,500 บาท
- **ตั๋วยืนเด็ก:** 1,200 บาท
- **ตั๋วนั่ง RINGSIDE/STADIUM:** 1,800 บาท

### **ตัวอย่างการคำนวณ:**
- ผู้ใหญ่ 1 + เด็ก 1 = (1,500 × 1) + (1,200 × 1) = 2,700 บาท
- RINGSIDE 2 ที่นั่ง = 1,800 × 2 = 3,600 บาท
