# 🎯 คู่มือการใช้งาน API Collection

## 📋 ข้อมูลพื้นฐาน

### 📁 ไฟล์ที่สร้าง:
- `api-collection.json` - Postman/Insomnia Collection ครบทุกเส้น API

### 🔧 วิธีการใช้งาน:

#### 1. **Postman** (แนะนำ)
```bash
# Import Collection
1. เปิด Postman
2. คลิก "Import" 
3. เลือกไฟล์ api-collection.json
4. Collection จะปรากฏใน Postman
```

#### 2. **Insomnia**
```bash
# Import Collection
1. เปิด Insomnia
2. คลิก "Import/Export"
3. เลือก "Import Data"
4. เลือกไฟล์ api-collection.json
```

#### 3. **VS Code REST Client**
```bash
# Install Extension
1. ติดตั้ง "REST Client" extension
2. สร้างไฟล์ .http หรือ .rest
3. Copy API calls จาก collection
```

## 🚀 การเริ่มต้นใช้งาน

### 1. ตั้งค่าตัวแปร (Variables)
```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "token": "your-jwt-token-here",
  "userId": "user-uuid-here",
  "orderId": "order-uuid-here"
}
```

### 2. ขั้นตอนการทดสอบ

#### 🔐 **Step 1: Authentication**
```bash
1. รัน "Register" หรือ "Login"
2. Token จะถูกบันทึกอัตโนมัติ
3. ใช้ Token ใน API อื่นๆ
```

#### 🏟️ **Step 2: Setup Zones & Seats**
```bash
1. รัน "Create Zone"
2. รัน "Create Seat" 
3. รัน "Get Seats by Zone"
```

#### 🎫 **Step 3: Create Orders**
```bash
1. รัน "Create Order"
2. รัน "Get Order by ID"
3. รัน "Confirm Payment"
```

#### 💳 **Step 4: Process Payments**
```bash
1. รัน "Create Payment"
2. รัน "Upload Payment Slip"
3. รัน "Generate Tickets"
```

## 📊 API Groups (กลุม API)

### 1. 🔐 Authentication (6 APIs)
- Register, Login, Profile
- Google, Facebook, LINE Login

### 2. 🏟️ Zones & Seats (11 APIs)
- CRUD Zones, CRUD Seats
- Get by Zone, Filter by Date

### 3. 🎫 Orders (10 APIs)
- Create, Read, Update, Delete
- Cancel, Confirm Payment, Generate Tickets
- Statistics, Change Seats

### 4. 💳 Payments (5 APIs)
- Create Payment, Standing Tickets
- Upload Slip, Payment History

### 5. 👥 Users (6 APIs)
- CRUD Users, Change Roles
- User Management

### 6. 🏷️ Referrers (7 APIs)
- CRUD Referrers, Orders by Referrer
- PDF Export, Commission Reports

### 7. 📊 Dashboard (4 APIs)
- Overview, Sales Analytics
- Popular Zones, Customer Analytics

### 8. 📱 Mobile (3 APIs)
- Mobile Config, Dashboard, Orders

### 9. 🔔 Notifications (3 APIs)
- Get, Send, Mark as Read

### 10. 🔧 Utilities (3 APIs)
- Upload File, OCR, QR Code

### 11. 🏥 Health Check (2 APIs)
- System Health, Database Health

## 🎯 Test Scenarios (สถานการณ์ทดสอบ)

### 📝 **Scenario 1: Complete Order Flow**
```bash
1. Login → Get Token
2. Get Zones → Select Zone
3. Get Seats → Select Available Seats
4. Create Order → Get Order ID
5. Create Payment → Upload Slip
6. Confirm Payment → Generate Tickets
```

### 📝 **Scenario 2: User Management**
```bash
1. Admin Login
2. Create User → Get User ID
3. Update User → Change Role
4. Get All Users → Search Users
5. Delete User (if needed)
```

### 📝 **Scenario 3: Referrer System**
```bash
1. Create Referrer → Get Referrer Code
2. Create Order with Referrer Code
3. Get Orders by Referrer
4. Export PDF Report
```

### 📝 **Scenario 4: Analytics & Reports**
```bash
1. Get Dashboard Overview
2. Get Sales Analytics
3. Get Popular Zones
4. Get Customer Analytics
5. Get Order Statistics
```

## 🔧 Auto-Testing Features

### 🤖 **Automatic Token Management**
- Token จะถูกบันทึกอัตโนมัติหลัง Login
- ไม่ต้องคัดลอก Token ใหม่ทุกครั้ง

### 🤖 **Automatic ID Generation**
- UUID จะถูกสร้างอัตโนมัติสำหรับทดสอบ
- ID จะถูกบันทึกหลังสร้าง Entity ใหม่

### 🤖 **Response Validation**
- ตรวจสอบ Status Code อัตโนมัติ
- ตรวจสอบ Response Time

## 💡 Tips & Best Practices

### ✅ **การทดสอบที่ดี:**
1. **เริ่มจาก Authentication** เสมอ
2. **ทดสอบ CRUD** อย่างเป็นระบบ
3. **ทดสอบ Edge Cases** (Error Scenarios)
4. **ทดสอบ Authorization** (Roles & Permissions)

### ✅ **การจัดการข้อมูลทดสอบ:**
1. **ใช้ข้อมูลสมมุติ** ที่สมเหตุสมผล
2. **ทำความสะอาดข้อมูล** หลังทดสอบ
3. **ใช้ Environment** แยกการทดสอบ

### ✅ **การแก้ไขปัญหา:**
1. **ตรวจสอบ Token** หากได้ 401 Unauthorized
2. **ตรวจสอบ Body Format** หากได้ 400 Bad Request
3. **ตรวจสอบ Database Connection** หากได้ 500 Internal Server Error

## 🎉 สรุป

### 📊 **สถิติ API Collection:**
- **รวม 60+ API endpoints**
- **11 กลุม API หลัก**
- **Test Data ครบทุกเส้น**
- **Auto-testing Features**

### 🚀 **พร้อมใช้งาน:**
- ✅ Import เข้า Postman/Insomnia ได้เลย
- ✅ Test Data ครบทุกเส้น
- ✅ Auto Token Management
- ✅ Response Validation

### 🎯 **ผลลัพธ์:**
**คุณสามารถทดสอบ API ทุกเส้นได้ครบถ้วน พร้อมข้อมูลทดสอบที่สมจริง!**

---

## 📞 การใช้งานเพิ่มเติม

หากต้องการความช่วยเหลือเพิ่มเติม:
1. **ดูไฟล์ `คู่มือ-API-FLOW.md`** สำหรับรายละเอียด API
2. **ดูไฟล์ `คู่มือเทสต์.md`** สำหรับการทดสอบระบบ
3. **ทดสอบผ่าน `api-collection.json`** ที่สร้างขึ้น

**Happy Testing! 🎉**
