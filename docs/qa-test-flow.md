# QA Test Flow – Boxing Ticket Booking System

วันที่เอกสาร: 2025-08-10

## สรุปภาพรวม
ระบบจองตั๋วชกมวย รองรับการจองที่นั่ง/ตั๋วยืน การชำระเงิน การออกตั๋ว การจัดการคำสั่งซื้อ การแจ้งเตือน และรายงาน พร้อมการป้องกัน concurrency ในการจองที่นั่ง

- Base URL: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/api/docs
- Auth: แนบ JWT ใน Header `Authorization: Bearer <token>`
- Roles: `USER`, `STAFF`, `ADMIN`
- Static files: `/uploads/slips`

## การเตรียมสภาพแวดล้อมทดสอบ
1) ตรวจสอบ Health
- GET `/health`
- GET `/health/database`
- GET `/health/memory`
คาดหวัง: 200 OK พร้อมสถานะบริการ

2) Authentication (เริ่มทุก flow ด้วยขั้นตอนนี้)
- POST `/auth/register` สมัครผู้ใช้ใหม่
- POST `/auth/login` รับ JWT token
- GET `/auth/profile` ต้องแนบ JWT และได้ข้อมูลผู้ใช้กลับมา
คาดหวัง: 200, ได้ token และอ่านโปรไฟล์ได้

## Main Flows สำหรับ QA

### 1) Seated Ticket Flow (ที่นั่งระบุที่นั่ง)
สิทธิ์: USER/STAFF/ADMIN
- (ออปชัน) ดูโซน/ที่นั่ง: `GET /zones`, `GET /seats/by-zone/:zoneId`
- ล็อกที่นั่งชั่วคราว: `POST /orders/seats/lock`
  - body หลัก: `{ seatIds: string[], showDate: string }`
  - คาดหวัง: 200/201 และสถานะล็อกสำเร็จ (กันจองชน)
- สร้างออเดอร์: `POST /orders`
  - ใส่รายละเอียดลูกค้า, `seatIds[]`, `showDate`, `purchaseType`, `referrer` ตาม DTO ใน Swagger
  - คาดหวัง: 201 ได้เลขออเดอร์
- ชำระเงิน: `POST /payments/seated`
  - body: ตาม `CreatePaymentDto` (เช่น `orderId`, `amount`, `method`, ข้อมูลสลิป/รายละเอียด)
  - คาดหวัง: 200 ชำระสำเร็จ
- ยืนยันการชำระเงิน: `PATCH /orders/:id/confirm-payment` (STAFF/ADMIN)
  - คาดหวัง: 200
- ออกตั๋ว: `GET /orders/:id/tickets`
  - คาดหวัง: 200 ได้รายการตั๋ว
- ปลดล็อกที่นั่ง (ถ้ายุติการจองหรือล้มเหลว): `POST /orders/seats/unlock`

ทดสอบ Negative:
- ล็อกที่นั่งซ้ำพร้อมกันหลาย user → ควร 409 หากที่นั่งถูกล็อกแล้ว
- ไม่แนบ JWT → 401

### 2) Standing Ticket Flow (ตั๋วยืน)
สิทธิ์: USER/STAFF/ADMIN
- สร้างออเดอร์: `POST /orders` (รูปแบบสำหรับ STANDING ตาม DTO)
- ชำระเงิน: `POST /payments/standing`
- ยืนยันชำระเงิน (ถ้ากำหนด): `PATCH /orders/:id/confirm-payment` (STAFF/ADMIN)
- ออกตั๋ว: `GET /orders/:id/tickets`

ทดสอบ Negative:
- จำนวนเกินกำหนด/ข้อมูลไม่ครบ → 400

### 3) Order Management
- ดูรายการออเดอร์: `GET /orders`
  - Query รองรับ: `page`, `limit`, `status`(PENDING|CONFIRMED|CANCELLED), `search`, `createdBy`, `showDate`, `paymentMethod`, `purchaseType`(WEBSITE|BOOKING|ONSITE), `attendanceStatus`(PENDING|CHECKED_IN|NO_SHOW), `referrerName`
  - คาดหวัง: 200 พร้อม pagination
- รายละเอียดออเดอร์: `GET /orders/:id`
- อัปเดตออเดอร์: `PATCH /orders/:id` (STAFF/ADMIN)
- ยกเลิกออเดอร์: `PATCH /orders/:id/cancel` (USER/STAFF/ADMIN)
  - คาดหวัง: 200/204; ถ้ายกเลิกซ้ำ → 409; ถ้าไม่พบ → 404
- ลบออเดอร์: `DELETE /orders/:id` (ADMIN)
- อัปเดตออเดอร์ STANDING: `PATCH /orders/:id/update-standing-order` (STAFF/ADMIN)
- สถิติภาพรวม: `GET /orders/stats/overview` (STAFF/ADMIN)

### 4) Change Seats (เปลี่ยนที่นั่ง)
- Endpoint: `PATCH /orders/:id/change-seats` (STAFF/ADMIN)
- body หลัก: `{ seatIds: string[] }` และออปชัน `newReferrerCode`, `newCustomerName`, `newCustomerPhone`, `newCustomerEmail`, `newShowDate`
- คาดหวัง: 200; ถ้า `seatIds` ว่าง → 400; ถ้าถูกล็อก/จองแล้ว → ข้อผิดพลาดตามสถานะ

### 5) Payments เพิ่มเติม
- ดูข้อมูลการชำระเงินของออเดอร์: `GET /payments/order/:orderId`
- ยกเลิกการชำระเงิน: `PATCH /payments/cancel/:orderId` (STAFF/ADMIN)
  - body: `{ reason: string }`

### 6) Notifications (ต้องใช้ JWT)
- รายการแจ้งเตือน: `GET /notifications`
- จำนวนยังไม่อ่าน: `GET /notifications/unread-count`
- อ่านแล้ว: `PATCH /notifications/:id/read`
- อ่านทั้งหมด: `PATCH /notifications/mark-all-read`
- ส่งโปรโมชัน: `POST /notifications/promotional`

### 7) Mobile API (หลักๆ)
- Home: `GET /mobile/home`
- โซน/ที่นั่ง: `GET /mobile/zones/available`, `GET /mobile/zones/:id`, `GET /mobile/zones/:id/seat-map`
- ออเดอร์/ประวัติ/สถานะ/QR: `GET /mobile/orders`, `GET /mobile/history`, `GET /mobile/orders/:id/status`, `GET /mobile/orders/:id/qr`
- โปรไฟล์: `PUT /mobile/profile` (JWT)

### 8) อื่นๆ ที่เกี่ยวข้อง
- Dashboard: `GET /dashboard` และกลุ่ม `/dashboard/*`
- Analytics: กลุ่ม `/analytics/*` (JWT + Roles)
- Audit: กลุ่ม `/audit/*` (JWT + Roles)
- Config: กลุ่ม `/config/*` (JWT + Roles)
- Performance: กลุ่ม `/performance/*` (JWT + Roles)

## ชุดทดสอบแนะนำ (Test Checklist)
- Auth: สมัคร → ล็อกอิน → อ่านโปรไฟล์ (ทุก role ที่ต้องใช้)
- Seated: ล็อกที่นั่ง → สร้างออเดอร์ → ชำระ → ยืนยัน → ออกตั๋ว → ปลดล็อก
- Standing: สร้างออเดอร์ → ชำระ → ยืนยัน → ออกตั๋ว
- Change seats: สำเร็จ/ผิดพลาด (ที่นั่งถูกล็อก/ถูกจอง)
- Cancel: ปกติ/ซ้ำ/ออเดอร์ไม่พบ
- Payments: ดูสถานะ, ยกเลิกการชำระ (STAFF/ADMIN)
- Orders list filter: ทดสอบ query ครบชุด
- Permissions: ไม่แนบ JWT → 401, บทบาทไม่พอ → 403
- Health: ตรวจ `/health`, `/health/database`, `/health/memory`

## หมายเหตุสำคัญสำหรับ QA
- DTO ที่แท้จริงและตัวอย่าง payload อยู่ใน Swagger (`/api/docs`) ให้ยึดตามนั้น
- ระบบใช้ JwtAuthGuard เกือบทุกจุด และบางส่วนใช้ RolesGuard (เฉพาะ STAFF/ADMIN)
- Concurrency/duplicate ในการสร้างออเดอร์หรือจองที่นั่ง อาจคืน 409 หรือข้อความ error เฉพาะ
- อัปโหลด/สลิปเข้าถึงผ่าน `/uploads/slips`

---
เอกสารนี้สรุป endpoints และ flow หลักสำหรับการทดสอบ หากต้องการตัวอย่าง payload minimal ต่อ endpoint แจ้งเพื่อเพิ่มภาคผนวกได้
