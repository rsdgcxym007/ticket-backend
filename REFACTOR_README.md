# 🔄 Order Service Refactoring

การ refactor โค้ดใน `order.service.ts` เพื่อให้ clean และมีประสิทธิภาพมากขึ้น โดยการแยกฟังก์ชันที่ใช้ซ้ำออกมาเป็น utilities และ services ที่แยกตามหน้าที่ความรับผิดชอบ

## 📂 ไฟล์ใหม่ที่สร้าง

### 1. **OrderValidationHelper** (`src/common/utils/order-validation.helper.ts`)
- `validateBookingLimits()` - ตรวจสอบขีดจำกัดการจอง
- `validateSeatAvailability()` - ตรวจสอบความพร้อมใช้งานของที่นั่ง
- `validateSeatAvailabilityExcludingOrder()` - ตรวจสอบที่นั่ง (ยกเว้นออเดอร์ปัจจุบัน)
- `validateReferrer()` - ตรวจสอบรหัสผู้แนะนำ
- `convertSeatNumbersToIds()` - แปลงหมายเลขที่นั่งเป็น ID
- `validateOrderAccess()` - ตรวจสอบสิทธิ์การเข้าถึงออเดอร์
- `validatePaymentConfirmation()` - ตรวจสอบสิทธิ์การยืนยันการชำระเงิน
- `validateTicketGeneration()` - ตรวจสอบสิทธิ์การออกตั๋ว

### 2. **OrderPricingHelper** (`src/common/utils/order-pricing.helper.ts`)
- `calculateOrderPricing()` - คำนวณราคาสำหรับออเดอร์ทั่วไป
- `calculateStandingTicketPricing()` - คำนวณราคาสำหรับตั๋วยืน
- `calculateSeatTicketPricing()` - คำนวณราคาสำหรับตั๋วที่นั่ง
- `calculateSeatPricing()` - คำนวณราคาใหม่สำหรับการเปลี่ยนที่นั่ง
- `calculateOrdersSummary()` - คำนวณสรุปยอดขายสำหรับรายงาน
- `getTicketPrice()` - ตรวจสอบราคาตั๋วสำหรับประเภทเฉพาะ
- `getCommissionRate()` - ตรวจสอบค่าคอมมิชชั่นสำหรับประเภทเฉพาะ

### 3. **OrderDataMapper** (`src/common/utils/order-data-mapper.helper.ts`)
- `mapToOrderData()` - แปลง Order Entity เป็น OrderData
- `mapOrdersToData()` - แปลงหลาย Orders เป็น OrderData array
- `mapToExportData()` - แปลงสำหรับ Export
- `mapToTicketData()` - แปลงสำหรับ Ticket Generation
- `generateStandingTickets()` - สร้างตั๋วยืน
- `generateSeatTickets()` - สร้างตั๋วที่นั่ง

### 4. **SeatBookingService** (`src/common/services/seat-booking.service.ts`)
- `createSeatBookings()` - สร้าง Seat Bookings สำหรับ Order
- `updateOrderSeatBookingsStatus()` - อัปเดตสถานะ Seat Bookings ของ Order
- `deleteOrderSeatBookings()` - ลบ Seat Bookings ของ Order
- `replaceSeatBookings()` - เปลี่ยน Seat Bookings สำหรับ Order
- `countSeatBookingsByStatus()` - นับจำนวน Seat Bookings ตามสถานะ
- `getSeatBookingsWithDetails()` - ดึง Seat Bookings พร้อม relations

### 5. **AuditHelperService** (`src/common/services/audit-helper.service.ts`)
- `createAuditLog()` - สร้าง Audit Log
- `auditOrderAction()` - Audit Log สำหรับ Order Actions
- `auditPaymentAction()` - Audit Log สำหรับ Payment Actions
- `auditUserAction()` - Audit Log สำหรับ User Actions
- `auditSeatAction()` - Audit Log สำหรับ Seat Actions
- `createOrderUpdateMetadata()` - สร้าง metadata สำหรับ Order Update
- `createSeatChangeMetadata()` - สร้าง metadata สำหรับ Seat Change
- `createPaymentConfirmationMetadata()` - สร้าง metadata สำหรับ Payment Confirmation
- `createOrderCancellationMetadata()` - สร้าง metadata สำหรับ Order Cancellation

## 🔄 การเปลี่ยนแปลงใน order.service.ts

### ❌ ฟังก์ชันที่ลบออก (ย้ายไป helpers)
- `validateBookingLimits()`
- `validateSeatAvailability()`
- `calculateOrderPricing()`
- `createSeatBookings()`
- `createAuditLog()`
- `mapToOrderData()`
- `calculateOrdersSummary()`

### ✅ ฟังก์ชันที่อัปเดต
- `createOrder()` - ใช้ OrderValidationHelper และ OrderPricingHelper
- `findAll()` - ใช้ OrderDataMapper.mapOrdersToData()
- `findById()` - ใช้ OrderValidationHelper และ OrderDataMapper
- `update()` - ใช้ OrderValidationHelper และ AuditHelperService
- `cancel()` - ใช้ OrderValidationHelper, SeatBookingService และ AuditHelperService
- `confirmPayment()` - ใช้ OrderValidationHelper, SeatBookingService และ AuditHelperService
- `generateTickets()` - ใช้ OrderValidationHelper และ OrderDataMapper
- `changeSeats()` - ใช้ SeatBookingService และ AuditHelperService
- `remove()` - ใช้ AuditHelperService
- `exportOrdersData()` - ใช้ OrderPricingHelper.calculateOrdersSummary()

## 🏗️ การเปลี่ยนแปลงใน order.module.ts

เพิ่ม providers ใหม่:
```typescript
providers: [
  OrderService,
  BusinessService,
  SeatBookingService, // ✅ เพิ่ม SeatBookingService
  AuditHelperService, // ✅ เพิ่ม AuditHelperService
]
```

## 📈 ประโยชน์ที่ได้รับ

### 1. **Clean Code**
- แยกความรับผิดชอบ (Separation of Concerns)
- ลดความซับซ้อนของ OrderService
- เพิ่มความอ่านง่ายของโค้ด

### 2. **Reusability**
- ฟังก์ชัน helpers สามารถใช้ในหลาย modules
- ลดการเขียนโค้ดซ้ำซ้อน

### 3. **Maintainability**
- แก้ไขบัคและเพิ่มฟีเจอร์ได้ง่ายขึ้น
- การเทสต์แยกตาม business logic ได้ชัดเจน

### 4. **Performance**
- โค้ดที่เป็นระเบียบทำให้ compile และ runtime เร็วขึ้น
- ลด memory footprint ของ service classes

### 5. **Type Safety**
- interfaces และ types ที่ชัดเจน
- ลด runtime errors

## 🧪 การทดสอบ

แต่ละ helper และ service ควรมี unit tests แยกออกมา:

```typescript
// ตัวอย่าง test สำหรับ OrderPricingHelper
describe('OrderPricingHelper', () => {
  it('should calculate standing ticket pricing correctly', () => {
    const request = {
      ticketType: TicketType.STANDING,
      standingAdultQty: 2,
      standingChildQty: 1,
    };
    
    const result = OrderPricingHelper.calculateStandingTicketPricing(request);
    
    expect(result.totalAmount).toBe(4200); // 2*1500 + 1*1200
    expect(result.commission).toBe(800);   // 2*300 + 1*200
  });
});
```

## 🚀 ขั้นตอนต่อไป

1. **สร้าง Unit Tests** สำหรับ helpers และ services ใหม่
2. **อัปเดต Integration Tests** เพื่อใช้ helpers ใหม่
3. **ทำ refactor ใน modules อื่น** ที่ใช้โค้ดคล้ายกัน (payment, user, referrer)
4. **เพิ่ม error handling** ที่ดีขึ้นใน helpers
5. **เพิ่ม caching** สำหรับ validation functions ที่เรียกบ่อย

## 📝 หมายเหตุ

- helpers ทั้งหมดเป็น static methods เพื่อประสิทธิภาพ
- services ใช้ dependency injection สำหรับ database operations
- interface OrderData มี 2 versions (helper และ common) ใช้ type casting ชั่วคราว
- ควรรวม interfaces ให้เป็นเดียวกันในอนาคต
