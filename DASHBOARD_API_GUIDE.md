# 📊 Dashboard API ใหม่ - คู่มือการใช้งาน

## 🎯 ภาพรวมของ Dashboard API

Dashboard API ใหม่ที่ออกแบบมาเพื่อให้ข้อมูลสำคัญในการจัดการระบบตั๋ว ครอบคลุมข้อมูลยอดขาย ผลงาน Referrer การวิเคราะห์ลูกค้า และสถานะระบบ

## 🔗 API Endpoints

### 1. `/dashboard` - แดชบอร์ดหลัก
**GET** `/api/dashboard`

ข้อมูลสรุปทั้งหมดในหน้าเดียว ประกอบด้วย:
- สถิติวันนี้ เมื่อวาน สัปดาห์นี้ เดือนนี้
- ข้อมูล Referrer
- ข้อมูลที่นั่งว่าง
- ออเดอร์ล่าสุด
- Top Referrers
- แจ้งเตือนระบบ

```json
{
  "success": true,
  "data": {
    "today": {
      "orderCount": 25,
      "totalAmount": 125000,
      "totalCommission": 12500,
      "totalTickets": 45,
      "avgOrderValue": 5000
    },
    "yesterday": { /* ข้อมูลเมื่อวาน */ },
    "week": { /* ข้อมูลสัปดาห์นี้ */ },
    "month": { /* ข้อมูลเดือนนี้ */ },
    "total": { /* ข้อมูลรวมทั้งหมด */ },
    "referrer": { /* ผลงาน Referrer วันนี้ */ },
    "seats": { /* สถานะที่นั่ง */ },
    "recentOrders": [ /* ออเดอร์ล่าสุด 10 รายการ */ ],
    "topReferrers": [ /* Top 5 Referrers */ ],
    "systemAlerts": [ /* การแจ้งเตือน */ ]
  }
}
```

### 2. `/dashboard/referrer-performance` - ผลงาน Referrer วันนี้
**GET** `/api/dashboard/referrer-performance`

ข้อมูลผลงานของ Referrer ทั้งหมดในวันนี้:

```json
{
  "success": true,
  "data": {
    "date": "2025-07-08T00:00:00.000Z",
    "referrers": [
      {
        "referrerId": "uuid",
        "referrerName": "ชื่อ Referrer",
        "referrerCode": "CODE123",
        "orderCount": 10,
        "totalAmount": 50000,
        "totalCommission": 5000,
        "standingCommission": 2000,
        "totalTickets": 20
      }
    ],
    "summary": {
      "totalOrders": 25,
      "totalRevenue": 125000,
      "totalCommission": 12500
    }
  }
}
```

### 3. `/dashboard/ticket-sales` - ยอดขายตั๋วตามช่วงเวลา
**GET** `/api/dashboard/ticket-sales?period=daily`

พารามิเตอร์:
- `period`: `daily` (30 วันล่าสุด), `weekly` (12 สัปดาห์ล่าสุด), `monthly` (12 เดือนล่าสุด)

```json
{
  "success": true,
  "data": {
    "period": "daily",
    "startDate": "2025-06-08T00:00:00.000Z",
    "endDate": "2025-07-08T23:59:59.999Z",
    "data": [
      {
        "period": "2025-07-08",
        "orderCount": 15,
        "totalAmount": 75000,
        "totalTickets": 30,
        "standingAdult": 10,
        "standingChild": 5,
        "avgOrderValue": 5000
      }
    ]
  }
}
```

### 4. `/dashboard/revenue-summary` - สรุปยอดรายได้
**GET** `/api/dashboard/revenue-summary`

แบ่งยอดรายได้เป็น:
- **ยอดรวม (Gross Revenue)**: รายได้ทั้งหมดก่อนหักค่าคอม
- **ยอดสุทธิ (Net Revenue)**: รายได้หลังหักค่าคอมมิชชั่น
- **ค่าคอมมิชชั่น (Total Commission)**: รวมค่าคอม Referrer + Standing

```json
{
  "success": true,
  "data": {
    "today": {
      "grossRevenue": 100000,
      "totalCommission": 10000,
      "netRevenue": 90000
    },
    "week": { /* ข้อมูลสัปดาห์ */ },
    "month": { /* ข้อมูลเดือน */ },
    "total": { /* ข้อมูลรวมทั้งหมด */ }
  }
}
```

### 5. `/dashboard/seat-availability` - ที่นั่งว่างแต่ละโซน
**GET** `/api/dashboard/seat-availability?showDate=2025-07-08`

พารามิเตอร์:
- `showDate`: วันที่แสดง (YYYY-MM-DD) หากไม่ระบุจะใช้วันนี้

**หมายเหตุ**: ไม่นับที่นั่งที่มี `seatNumber` เป็น `null`

```json
{
  "success": true,
  "data": {
    "showDate": "2025-07-08",
    "zones": [
      {
        "zoneId": "uuid",
        "zoneName": "Ringside",
        "totalSeats": 100,
        "bookedSeats": 75,
        "availableSeats": 25,
        "occupancyRate": "75.0"
      }
    ],
    "summary": {
      "totalSeats": 500,
      "totalBooked": 350,
      "totalAvailable": 150
    }
  }
}
```

### 6. `/dashboard/customer-analytics` - วิเคราะห์ลูกค้า
**GET** `/api/dashboard/customer-analytics`

จำนวนลูกค้าแบบ Unique (นับจาก customerName):

```json
{
  "success": true,
  "data": {
    "today": 25,
    "week": 150,
    "month": 500,
    "total": 2000,
    "repeatCustomers": 100
  }
}
```

### 7. `/dashboard/system-health` - สถานะระบบและการแจ้งเตือน
**GET** `/api/dashboard/system-health`

```json
{
  "success": true,
  "data": {
    "pendingOrders": 5,
    "expiredOrders": 2,
    "lowStockZones": 1,
    "alerts": [
      {
        "type": "warning",
        "message": "มีออเดอร์รอชำระเงิน 5 รายการ",
        "count": 5
      },
      {
        "type": "info",
        "message": "โซนที่เหลือที่นั่งน้อย: VIP",
        "zones": [
          {
            "id": "uuid",
            "name": "VIP",
            "totalSeats": 50,
            "availableSeats": 8,
            "availabilityRate": "16.0"
          }
        ]
      }
    ]
  }
}
```

## 📈 การใช้งานแนะนำ

### สำหรับ Frontend Dashboard:
1. **หน้าแรก**: เรียก `/dashboard` เพื่อดูภาพรวมทั้งหมด
2. **หน้า Referrer**: เรียก `/dashboard/referrer-performance` เพื่อดูผลงานวันนี้
3. **หน้า Sales**: เรียก `/dashboard/ticket-sales` กับ period ต่างๆ
4. **หน้า Revenue**: เรียก `/dashboard/revenue-summary` เพื่อดูยอดรายได้
5. **หน้า Seats**: เรียก `/dashboard/seat-availability` เพื่อดูที่นั่งว่าง

### สำหรับ Real-time Updates:
- ตั้ง interval เรียก API ทุก 30 วินาที - 1 นาที
- แสดง `lastUpdated` timestamp ให้ผู้ใช้เห็น
- ใช้ loading states ขณะ fetch ข้อมูล

## 🎨 UI Components แนะนำ

### 1. Dashboard Cards:
```typescript
// วันนี้ vs เมื่อวาน
<MetricCard
  title="ยอดขายวันนี้"
  value="125,000 บาท"
  change="+15.5%"
  trend="up"
/>

// ผลงาน Referrer
<ReferrerCard
  name="ชื่อ Referrer"
  code="CODE123"
  orders={10}
  commission={5000}
/>
```

### 2. Charts:
- **Line Chart**: แสดงยอดขายตามวัน/สัปดาห์/เดือน
- **Bar Chart**: เปรียบเทียบ Referrer performance
- **Pie Chart**: สัดส่วนที่นั่งแต่ละโซน
- **Gauge Chart**: ยอดขายเทียบกับเป้า

### 3. Tables:
- **Recent Orders Table**: 10 ออเดอร์ล่าสุด
- **Top Referrers Table**: Top 5 Referrers
- **Seat Availability Table**: สถานะที่นั่งแต่ละโซน

## 🔧 การ Customize

### เพิ่ม Metrics ใหม่:
1. เพิ่ม method ใน `DashboardService`
2. เพิ่ม endpoint ใน `DashboardController`
3. อัพเดต interface ที่เกี่ยวข้อง

### เปลี่ยนช่วงเวลา:
- แก้ไขใน method `getTicketSalesByPeriod`
- เพิ่ม period ใหม่ตามต้องการ

### เพิ่มการแจ้งเตือน:
- แก้ไขใน method `getSystemHealthInternal`
- เพิ่มเงื่อนไขการแจ้งเตือนใหม่

## 🚀 Performance Tips

1. **Caching**: ใช้ Redis cache สำหรับข้อมูลที่ไม่เปลี่ยนบ่อย
2. **Database Indexing**: ให้แน่ใจว่า index สำหรับ date ranges
3. **Pagination**: จำกัดจำนวนข้อมูลที่ return
4. **Background Jobs**: คำนวณข้อมูลสถิติล่วงหน้า

## 🔍 Debugging

### หากข้อมูลไม่ถูกต้อง:
1. เช็ค Order status = 'PAID'
2. เช็ค date range calculation
3. เช็ค timezone settings
4. เช็ค database connection

### หากช้า:
1. เช็ค database query performance
2. เช็ค N+1 query problems
3. เพิ่ม database index
4. ใช้ query optimization

---

**หมายเหตุ**: API นี้ออกแบบมาเพื่อความยืดหยุ่นและง่ายต่อการใช้งาน สามารถเรียกแยกทีละ endpoint หรือรวมกันได้ตามความต้องการของ Frontend
