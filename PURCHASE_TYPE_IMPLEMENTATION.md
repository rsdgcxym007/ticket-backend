# การเพิ่ม OrderPurchaseType ให้ Order Entity

## สรุปการเปลี่ยนแปลง

เพิ่ม enum `OrderPurchaseType` เพื่อระบุประเภทการซื้อตั๋ว โดยมีค่าดังนี้:
- `WEBSITE` - ซื้อจากหน้าเว็บ
- `BOOKING` - ซื้อจากการจอง
- `ONSITE` - ซื้อหน้างาน (ค่า default)

## ไฟล์ที่ถูกแก้ไข

### 1. Enums
- `src/common/enums/index.ts` - เพิ่ม enum `OrderPurchaseType`

### 2. Entity
- `src/order/order.entity.ts` - เพิ่มฟิลด์ `purchaseType` พร้อม default เป็น `ONSITE`

### 3. DTOs
- `src/order/dto/create-order.dto.ts` - เพิ่มฟิลด์ `purchaseType` (optional)
- `src/order/dto/update-order.dto.ts` - เพิ่มฟิลด์ `purchaseType` (optional)

### 4. Services
- `src/order/order.service.ts` - อัพเดท interface และ methods เพื่อรองรับ `purchaseType`
- `src/common/services/enhanced-order.service.ts` - เพิ่มการจัดการ `purchaseType`

### 5. Controllers
- `src/order/order.controller.ts` - เพิ่ม query parameter สำหรับกรองตาม `purchaseType`

### 6. Interfaces
- `src/common/interfaces/index.ts` - เพิ่มฟิลด์ `purchaseType` ใน `OrderData` interface

### 7. Migration
- `migrations/1704628800000-AddPurchaseTypeToOrder.ts` - Migration สำหรับเพิ่ม column ใน database

## การใช้งาน

### 1. สร้าง Order ใหม่
```typescript
const orderDto = {
  customerName: "John Doe",
  ticketType: TicketType.RINGSIDE,
  purchaseType: OrderPurchaseType.WEBSITE, // หรือ BOOKING, ONSITE
  // ... ฟิลด์อื่นๆ
};
```

### 2. กรองข้อมูล Order
```typescript
// GET /orders?purchaseType=WEBSITE
// GET /orders?purchaseType=BOOKING
// GET /orders?purchaseType=ONSITE
```

### 3. ค่า Default
หากไม่ระบุ `purchaseType` จะถูกตั้งเป็น `ONSITE` (ซื้อหน้างาน)

## การรัน Migration

เนื่องจากไม่มี migration script ใน package.json ให้รัน SQL command ด้านล่างใน database:

```sql
-- Create enum type
CREATE TYPE "public"."order_purchasetype_enum" AS ENUM('WEBSITE', 'BOOKING', 'ONSITE');

-- Add column to orders table
ALTER TABLE "order" 
ADD "purchaseType" "public"."order_purchasetype_enum" NOT NULL DEFAULT 'ONSITE';
```

## การทดสอบ

1. ทดสอบการสร้าง order พร้อม purchaseType
2. ทดสอบการกรองข้อมูลตาม purchaseType
3. ทดสอบการแสดงผล purchaseType ในรายการ order
4. ทดสอบ default value เมื่อไม่ระบุ purchaseType

## หมายเหตุ

- Field นี้จะช่วยในการวิเคราะห์และรายงานยอดขายตามช่องทางการขาย
- สามารถใช้ในการจัดการคอมมิชชั่นหรือโปรโมชั่นแยกตามช่องทางได้
- รองรับการรับข้อมูลจาก frontend และสามารถ set default เป็น ONSITE ได้
