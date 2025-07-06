# 📖 คู่มือการใช้งาน Payment System ที่ปรับปรุงใหม่

## 🎯 การแยกประเภทตั๋วอย่างชัดเจน

### 🪑 **ตั๋วนั่ง (RINGSIDE/STADIUM)**
สำหรับตั๋วที่มีที่นั่งจริง เช่น RINGSIDE, STADIUM

### 🚶 **ตั๋วยืน (STANDING)**  
สำหรับตั๋วยืนที่แบ่งเป็นผู้ใหญ่และเด็ก

---

## 🚀 API Endpoints ใหม่

### 1. **ชำระเงินตั๋วนั่ง**
```http
POST /payments/seated
```

**Request Body:**
```json
{
  "orderId": "uuid-order-id",
  "amount": 1800,
  "method": "CASH",
  "customerName": "ชื่อลูกค้า",
  "referrerCode": "REF001"
}
```

**เหมาะสำหรับ:**
- ตั๋ว RINGSIDE
- ตั๋ว STADIUM
- ตั๋วที่มีการจองที่นั่งเฉพาะ

---

### 2. **ชำระเงินตั๋วยืน**
```http
POST /payments/standing
```

**Request Body:**
```json
{
  "orderId": "uuid-order-id",
  "amount": 2700,
  "method": "CASH",
  "customerName": "ชื่อลูกค้า",
  "referrerCode": "REF001"
}
```

**เหมาะสำหรับ:**
- ตั๋วยืนผู้ใหญ่
- ตั๋วยืนเด็ก
- การผสมระหว่างผู้ใหญ่และเด็ก

---

### 3. **ดูข้อมูลการชำระเงิน**
```http
GET /payments/order/:orderId
```

**Response ตัวอย่าง:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-2025-001",
    "status": "PAID",
    "ticketType": "STANDING",
    "totalAmount": 2700,
    "isPaid": true,
    "payment": {
      "id": "payment-uuid",
      "amount": 2700,
      "method": "CASH",
      "paidAt": "2025-07-06T10:30:00Z",
      "status": "PAID"
    },
    "commission": {
      "referrerCode": "REF001",
      "referrerCommission": 500,
      "standingCommission": 500
    },
    "tickets": {
      "adultQty": 1,
      "childQty": 1,
      "total": 2
    }
  }
}
```

---

### 4. **ยกเลิกการชำระเงิน** (Admin/Staff เท่านั้น)
```http
PATCH /payments/cancel/:orderId
```

**Request Body:**
```json
{
  "reason": "เหตุผลในการยกเลิก"
}
```

---

## 💰 การคำนวณค่าคอมมิชชั่น

### **ตั๋วนั่ง (RINGSIDE/STADIUM)**
- **400 บาท** ต่อที่นั่ง
- คำนวณจากจำนวนที่นั่งที่จองจริง

### **ตั๋วยืน (STANDING)**
- **ผู้ใหญ่:** 300 บาท ต่อใบ
- **เด็ก:** 200 บาท ต่อใบ
- คำนวณจาก `standingAdultQty` และ `standingChildQty`

**ตัวอย่างการคำนวณ:**
- ตั๋วยืนผู้ใหญ่ 1 ใบ + เด็ก 1 ใบ
- คอมมิชชั่น = (1 × 300) + (1 × 200) = 500 บาท

---

## 📝 Audit Log และการติดตาม

### **ข้อมูลที่บันทึก:**
- ผู้ที่ทำการชำระเงิน
- เวลาที่ทำรายการ
- ประเภทตั๋ว
- จำนวนเงิน
- วิธีการชำระ
- เหตุผลในการยกเลิก (ถ้ามี)

### **การติดตามใน Order:**
- `updatedBy`: ใครเป็นคนอัปเดตล่าสุด
- `updatedAt`: เวลาที่อัปเดตล่าสุด
- `cancelReason`: เหตุผลในการยกเลิก

---

## 🔄 Backward Compatibility (รองรับของเก่า)

### **Endpoints เก่าที่ยังใช้ได้:**
```http
POST /payments          # สำหรับตั๋วนั่ง (เก่า)
POST /payments/pay-standing  # สำหรับตั๋วยืน (เก่า)
```

⚠️ **คำแนะนำ:** ใช้ endpoints ใหม่ (`/seated` และ `/standing`) เพื่อความชัดเจน

---

## 🎯 Flow การทำงาน

### **สำหรับตั๋วนั่ง:**
1. สร้างออเดอร์ด้วย `ticketType: "RINGSIDE"` หรือ `"STADIUM"`
2. ระบุ `seatIds` ของที่นั่งที่ต้องการ
3. ชำระเงินผ่าน `POST /payments/seated`
4. ระบบจะอัปเดตสถานะการจองที่นั่งเป็น `PAID`
5. คำนวณค่าคอมมิชชั่น 400 บาท/ที่นั่ง

### **สำหรับตั๋วยืน:**
1. สร้างออเดอร์ด้วย `ticketType: "STANDING"`
2. ระบุ `standingAdultQty` และ `standingChildQty`
3. ชำระเงินผ่าน `POST /payments/standing`
4. คำนวณค่าคอมมิชชั่นตามประเภทและจำนวน

---

## ⚡ ข้อดีของระบบใหม่

### **🎯 ความชัดเจน**
- แยก endpoints ตามประเภทตั๋ว
- ลดความผิดพลาดในการเรียกใช้

### **📊 การติดตาม**
- Audit log ครบถ้วน
- ติดตามผู้ใช้ที่ทำรายการ
- บันทึกเหตุผลการยกเลิก

### **💰 การคำนวณที่แม่นยำ**
- ค่าคอมมิชชั่นตามประเภทตั๋ว
- รองรับการผสมผู้ใหญ่-เด็กในตั๋วยืน

### **🔒 ความปลอดภัย**
- ตรวจสอบสิทธิ์การยกเลิก
- Validation ครบถ้วน
- Error handling ที่ดี

### **🔄 ความเข้ากันได้**
- รองรับ endpoints เก่า
- Migration ที่ราบรื่น
