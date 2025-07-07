# 🔧 การแก้ไขปัญหา Timezone ทั้งโปรเจค

## สำหรับ order.service.ts

สร้าง order.service.ts ใหม่ที่ใช้ ThaiTime helper:

### 1. อัปเดต import statements:

```typescript
// เปลี่ยนจาก
import dayjs from 'dayjs';

// เป็น
import { ThailandTimeHelper, ThaiTime } from '../common/utils/thailand-time.helper';
```

### 2. แก้ไขฟังก์ชันหลัก:

```typescript
// เปลี่ยนจาก
const expiresAt = dayjs(order.showDate).hour(21).minute(0).second(0).toDate();

// เป็น
const expiresAt = ThaiTime.createOrderExpiry(order.showDate);

// เปลี่ยนจาก
const reservationExpiry = dayjs().add(5, 'minute').toDate();

// เป็น
const reservationExpiry = ThaiTime.createSeatReservationExpiry();

// เปลี่ยนจาก
new Date()

// เป็น
ThaiTime.now()
```

## สำหรับ analytics.service.ts

### แก้ไขการคำนวณวันที่:

```typescript
// เปลี่ยนจาก
const start = new Date(startDate);
const end = new Date(endDate);

// เป็น
const start = ThaiTime.toThailandTime(startDate);
const end = ThaiTime.toThailandTime(endDate);
```

## สำหรับทุกไฟล์ที่ใช้วันที่:

### กฎการแปลง:

1. `new Date()` → `ThaiTime.now()`
2. `dayjs()` → `ThaiTime.now()`
3. `dayjs(date)` → `ThaiTime.toThailandTime(date)`
4. `.startOf('day')` → `ThaiTime.startOfDay(date)`
5. `.endOf('day')` → `ThaiTime.endOfDay(date)`
6. `.format('YYYY-MM-DD')` → `ThaiTime.format(date, 'YYYY-MM-DD')`
7. `.add(1, 'day')` → `ThaiTime.add(date, 1, 'day')`
8. `.subtract(1, 'day')` → `ThaiTime.subtract(date, 1, 'day')`

## สร้าง Migration Script

```bash
# สร้าง script สำหรับแก้ไขทั้งโปรเจค
cd /Users/user/Desktop/work/ticket-backend
find src -name "*.ts" -exec grep -l "new Date()\|dayjs\|moment" {} \;
```
