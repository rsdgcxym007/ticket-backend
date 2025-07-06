# 📊 Dashboard API Documentation

## Overview
Dashboard API ให้ข้อมูลสถิติและการวิเคราะห์แบบครบวงจรสำหรับระบบขายตั๋ว รวมถึงยอดขาย การจองที่นั่ง การวิเคราะห์ referrer และแจ้งเตือนระบบ

## Endpoints

### 1. 🏠 Main Dashboard
```
GET /api/v1/dashboard
```
ดึงข้อมูล dashboard หลักที่รวมสถิติที่สำคัญทั้งหมด

**Response Example:**
```json
{
  "statusCode": 200,
  "message": "Dashboard summary",
  "data": {
    "totalSales": "฿125,000",
    "monthSales": "75,000 บาท",
    "totalOrders": 150,
    "orderStatusCounts": {
      "PENDING": 5,
      "CONFIRMED": 120,
      "CANCELLED": 25
    },
    "totalCustomers": 89,
    "availableSeats": 45,
    "nextShowDate": "2025-07-08",
    "nextShowAvailable": 45,
    "nextShowBooked": 255,
    "salesByZone": [
      {
        "zone": "Ringside",
        "total": 45000
      },
      {
        "zone": "Stadium",
        "total": 80000
      }
    ],
    "dailySales": [
      {
        "date": "2025-07-06",
        "amount": 15000
      }
    ],
    "topCustomers": [
      {
        "customer": "John Doe",
        "spent": 5000
      }
    ],
    "topReferrers": [
      {
        "referrer": "FRESHYTOUR",
        "name": "Freshy Tour",
        "orders": 25,
        "commission": 12500
      }
    ],
    "alerts": [
      "ออเดอร์ล่าสุดชำระแล้ว",
      "เกิดการยกเลิกที่นั่งในโซน front-ringside"
    ]
  }
}
```

### 2. 📈 Statistics
```
GET /api/v1/dashboard/statistics
```
ดึงสถิติรายละเอียดตามช่วงเวลา

**Response Example:**
```json
{
  "statusCode": 200,
  "message": "Dashboard statistics",
  "data": {
    "today": {
      "orders": 8
    },
    "week": {
      "orders": 45
    },
    "month": {
      "orders": 150
    }
  }
}
```

### 3. 💰 Revenue Analytics
```
GET /api/v1/dashboard/revenue-analytics?period=weekly
```
วิเคราะห์รายได้ตามช่วงเวลา

**Parameters:**
- `period` (optional): `daily`, `weekly`, `monthly`, `yearly` (default: `weekly`)

**Response Example:**
```json
{
  "statusCode": 200,
  "message": "Revenue analytics",
  "data": {
    "period": "weekly",
    "revenueData": [
      {
        "period": "2025-07-01T00:00:00.000Z",
        "revenue": 15000
      },
      {
        "period": "2025-07-02T00:00:00.000Z",
        "revenue": 18000
      }
    ]
  }
}
```

### 4. 🎫 Seat Occupancy
```
GET /api/v1/dashboard/seat-occupancy?showDate=2025-07-08
```
ดูอัตราการใช้ที่นั่งตามวันแสดง

**Parameters:**
- `showDate` (optional): YYYY-MM-DD format (default: today)

**Response Example:**
```json
{
  "statusCode": 200,
  "message": "Seat occupancy data",
  "data": {
    "showDate": "2025-07-08",
    "totalSeats": 300,
    "bookedSeats": 255,
    "availableSeats": 45,
    "occupancyRate": 85.0
  }
}
```

### 5. 🚀 Performance Metrics
```
GET /api/v1/dashboard/performance-metrics
```
เมตริกประสิทธิภาพระบบ

**Response Example:**
```json
{
  "statusCode": 200,
  "message": "Performance metrics",
  "data": {
    "totalOrders": 45,
    "paidOrders": 38,
    "conversionRate": 84.44
  }
}
```

### 6. 👥 Referrer Analytics
```
GET /api/v1/dashboard/referrer-analytics
```
วิเคราะห์ประสิทธิภาพของ referrer

**Response Example:**
```json
{
  "statusCode": 200,
  "message": "Referrer analytics",
  "data": {
    "topReferrers": [
      {
        "code": "FRESHYTOUR",
        "name": "Freshy Tour",
        "totalOrders": 25,
        "totalRevenue": 62500
      },
      {
        "code": "SAYAMA",
        "name": "Sayama Travel",
        "totalOrders": 18,
        "totalRevenue": 45000
      }
    ]
  }
}
```

### 7. 🔄 Recent Activities
```
GET /api/v1/dashboard/recent-activities
```
กิจกรรมล่าสุดในระบบ

**Response Example:**
```json
{
  "statusCode": 200,
  "message": "Recent activities",
  "data": {
    "recentOrders": [
      {
        "id": "order-123",
        "orderNumber": "TKT-ABC123",
        "customerName": "John Doe",
        "totalAmount": 2500,
        "status": "CONFIRMED",
        "createdAt": "2025-07-06T10:30:00.000Z"
      }
    ],
    "recentPayments": [
      {
        "id": "payment-456",
        "amount": 2500,
        "method": "CREDIT_CARD",
        "status": "PAID",
        "createdAt": "2025-07-06T10:35:00.000Z"
      }
    ]
  }
}
```

### 8. 🚨 System Alerts
```
GET /api/v1/dashboard/alerts
```
การแจ้งเตือนและแอลเลิร์ตของระบบ

**Response Example:**
```json
{
  "statusCode": 200,
  "message": "System alerts",
  "data": {
    "alerts": [
      {
        "type": "warning",
        "message": "มีการยกเลิกออเดอร์ 8 รายการใน 24 ชั่วโมงที่ผ่านมา",
        "timestamp": "2025-07-06T14:30:00.000Z"
      },
      {
        "type": "info",
        "message": "อัตราการใช้ที่นั่งวันนี้ 85% - ใกล้เต็มแล้ว",
        "timestamp": "2025-07-06T14:30:00.000Z"
      }
    ],
    "count": 2
  }
}
```

## Usage Examples

### Frontend Integration

#### React/Vue.js Example
```javascript
// ดึงข้อมูล dashboard หลัก
const fetchDashboard = async () => {
  try {
    const response = await fetch('/api/v1/dashboard');
    const data = await response.json();
    
    // อัพเดท state หรือ reactive data
    setDashboardData(data.data);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
  }
};

// ดึงข้อมูลรายได้รายสัปดาห์
const fetchWeeklyRevenue = async () => {
  try {
    const response = await fetch('/api/v1/dashboard/revenue-analytics?period=weekly');
    const data = await response.json();
    
    // สร้างกราฟ
    createRevenueChart(data.data.revenueData);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
  }
};
```

#### Dashboard Component Example
```typescript
interface DashboardData {
  totalSales: string;
  monthSales: string;
  totalOrders: number;
  orderStatusCounts: Record<string, number>;
  availableSeats: number;
  occupancyRate?: number;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [dashboard, occupancy, alerts] = await Promise.all([
          fetch('/api/v1/dashboard').then(r => r.json()),
          fetch('/api/v1/dashboard/seat-occupancy').then(r => r.json()),
          fetch('/api/v1/dashboard/alerts').then(r => r.json())
        ]);

        setData({
          ...dashboard.data,
          occupancyRate: occupancy.data.occupancyRate
        });
      } catch (error) {
        console.error('Dashboard loading error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    
    // รีเฟรชทุก 5 นาที
    const interval = setInterval(loadDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <StatCard title="ยอดขายรวม" value={data?.totalSales} />
        <StatCard title="ยอดขายเดือนนี้" value={data?.monthSales} />
        <StatCard title="ออเดอร์ทั้งหมด" value={data?.totalOrders} />
        <StatCard title="อัตราการใช้ที่นั่ง" value={`${data?.occupancyRate}%`} />
      </div>
    </div>
  );
};
```

## Features

### 🎯 **Real-time Data**
- ข้อมูลอัพเดทแบบเรียลไทม์
- รีเฟรชอัตโนมัติทุก 5 นาที
- การแจ้งเตือนทันที

### 📊 **Analytics**
- วิเคราะห์รายได้รายวัน/สัปดาห์/เดือน/ปี
- สถิติการจองที่นั่ง
- ประสิทธิภาพ referrer
- เทรนด์การขาย

### 🚨 **Smart Alerts**
- แจ้งเตือนเมื่อยกเลิกมากผิดปกติ
- แจ้งเตือนที่นั่งใกล้เต็ม
- แจ้งเตือนรายได้ลดลง
- การตรวจสอบประสิทธิภาพระบบ

### 📱 **Mobile Responsive**
- รองรับการแสดงผลบนมือถือ
- Touch-friendly interface
- Fast loading

## Performance

- **Response Time**: < 500ms เฉลี่ย
- **Caching**: Redis caching สำหรับข้อมูลที่ไม่เปลี่ยนบ่อย
- **Pagination**: รองรับการแบ่งหน้าสำหรับข้อมูลจำนวนมาก
- **Real-time Updates**: WebSocket สำหรับอัพเดทแบบเรียลไทม์

## Error Handling

```json
{
  "statusCode": 400,
  "message": "Invalid date format",
  "error": "Bad Request",
  "timestamp": "2025-07-06T14:30:00.000Z",
  "path": "/api/v1/dashboard/seat-occupancy"
}
```

Common error codes:
- `400`: Bad Request - พารามิเตอร์ไม่ถูกต้อง
- `401`: Unauthorized - ไม่มีสิทธิ์เข้าถึง
- `404`: Not Found - ไม่พบข้อมูล
- `500`: Internal Server Error - ข้อผิดพลาดในระบบ
