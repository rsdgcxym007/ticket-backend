# 🎫 คู่มือ API Flow และการยิง API สำหรับ Front-end

## 🌐 ข้อมูลพื้นฐาน

### Base URL
```
http://localhost:3000/api/v1
```

### Documentation
```
http://localhost:3000/api/docs
```

## 🔐 Authentication Flow

### 1. Register (สมัครสมาชิก)
```bash
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "ชื่อผู้ใช้",
  "phone": "0901234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Register success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "ชื่อผู้ใช้",
      "role": "USER"
    }
  }
}
```

### 2. Login (เข้าสู่ระบบ)
```bash
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "ชื่อผู้ใช้",
    "role": "USER"
  }
}
```

### 3. Social Login (เข้าสู่ระบบด้วย Social Media)
```bash
# Google
GET /auth/google

# Facebook  
GET /auth/facebook

# LINE
GET /auth/line
```

### 4. Get Profile (ดูข้อมูลผู้ใช้)
```bash
GET /auth/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "ชื่อผู้ใช้",
  "phone": "0901234567",
  "role": "USER",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 🏟️ Zone & Seat Management

### 1. Get All Zones (ดูโซนทั้งหมด)
```bash
GET /zones
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "zone-uuid",
      "name": "Ringside",
      "description": "นั่งใกล้เวที",
      "price": 1500,
      "seatMap": [
        ["A1", "A2", "A3"],
        ["B1", "B2", "B3"]
      ]
    }
  ]
}
```

### 2. Get Seats by Zone (ดูที่นั่งตามโซน)
```bash
GET /seats/by-zone/:zoneId?showDate=2024-01-01T19:00:00Z
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "seat-uuid",
      "seatNumber": "A1",
      "rowIndex": 0,
      "columnIndex": 0,
      "status": "AVAILABLE",
      "bookingStatus": "AVAILABLE",
      "zone": {
        "id": "zone-uuid",
        "name": "Ringside",
        "price": 1500
      }
    }
  ]
}
```

### 3. Get All Seats (ดูที่นั่งทั้งหมด)
```bash
GET /seats
Authorization: Bearer <token>
```

---

## 🎫 Order Management Flow

### 1. Create Order (สร้างออเดอร์)
```bash
POST /orders
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerName": "ชื่อลูกค้า",
  "customerPhone": "0901234567",
  "customerEmail": "customer@example.com",
  "ticketType": "RINGSIDE",
  "quantity": 2,
  "seatIds": ["seat-uuid-1", "seat-uuid-2"],
  "showDate": "2024-01-01T19:00:00Z",
  "referrerCode": "REF001",
  "paymentMethod": "QR_CODE",
  "note": "หมายเหตุเพิ่มเติม"
}
```

**Response:**
```json
{
  "success": true,
  "message": "สร้างออเดอร์สำเร็จ",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-240101-001",
    "customerName": "ชื่อลูกค้า",
    "customerPhone": "0901234567",
    "customerEmail": "customer@example.com",
    "ticketType": "RINGSIDE",
    "quantity": 2,
    "totalAmount": 3000,
    "status": "PENDING",
    "paymentMethod": "QR_CODE",
    "showDate": "2024-01-01T19:00:00Z",
    "createdAt": "2024-01-01T12:00:00Z",
    "seatBookings": [
      {
        "id": "booking-uuid",
        "seat": {
          "id": "seat-uuid",
          "seatNumber": "A1",
          "zone": {
            "name": "Ringside"
          }
        },
        "status": "PENDING"
      }
    ]
  }
}
```

### 2. Get All Orders (ดูออเดอร์ทั้งหมด)
```bash
GET /orders?page=1&limit=10&status=PENDING&search=ชื่อลูกค้า
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "order-uuid",
        "orderNumber": "ORD-240101-001",
        "customerName": "ชื่อลูกค้า",
        "totalAmount": 3000,
        "status": "PENDING",
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 3. Get Order by ID (ดูออเดอร์ตาม ID)
```bash
GET /orders/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-240101-001",
    "customerName": "ชื่อลูกค้า",
    "customerPhone": "0901234567",
    "customerEmail": "customer@example.com",
    "ticketType": "RINGSIDE",
    "quantity": 2,
    "totalAmount": 3000,
    "status": "PENDING",
    "paymentMethod": "QR_CODE",
    "showDate": "2024-01-01T19:00:00Z",
    "createdAt": "2024-01-01T12:00:00Z",
    "user": {
      "id": "user-uuid",
      "name": "ชื่อผู้ใช้",
      "email": "user@example.com"
    },
    "seatBookings": [
      {
        "id": "booking-uuid",
        "seat": {
          "id": "seat-uuid",
          "seatNumber": "A1",
          "zone": {
            "name": "Ringside",
            "price": 1500
          }
        },
        "status": "PENDING"
      }
    ]
  }
}
```

### 4. Update Order (แก้ไขออเดอร์)
```bash
PATCH /orders/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerName": "ชื่อลูกค้าใหม่",
  "customerPhone": "0987654321",
  "note": "หมายเหตุใหม่"
}
```

### 5. Cancel Order (ยกเลิกออเดอร์)
```bash
PATCH /orders/:id/cancel
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "ยกเลิกออเดอร์สำเร็จ",
  "data": {
    "id": "order-uuid",
    "status": "CANCELLED"
  }
}
```

### 6. Confirm Payment (ยืนยันการชำระเงิน - Staff/Admin เท่านั้น)
```bash
PATCH /orders/:id/confirm-payment
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "ยืนยันการชำระเงินสำเร็จ",
  "data": {
    "success": true,
    "message": "Payment confirmed successfully"
  }
}
```

### 7. Generate Tickets (ออกตั๋ว)
```bash
GET /orders/:id/tickets
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "ออกตั๋วสำเร็จ",
  "data": {
    "tickets": [
      {
        "ticketId": "ticket-uuid",
        "seatNumber": "A1",
        "zoneName": "Ringside",
        "showDate": "2024-01-01T19:00:00Z",
        "customerName": "ชื่อลูกค้า",
        "orderNumber": "ORD-240101-001"
      }
    ]
  }
}
```

### 8. Change Seats (เปลี่ยนที่นั่ง - Staff/Admin เท่านั้น)
```bash
PATCH /orders/:id/change-seats
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "seatIds": ["new-seat-uuid-1", "new-seat-uuid-2"]
}
```

### 9. Get Order Statistics (สถิติออเดอร์ - Staff/Admin เท่านั้น)
```bash
GET /orders/stats/overview
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 100,
    "totalRevenue": 150000,
    "pendingOrders": 10,
    "confirmedOrders": 80,
    "cancelledOrders": 10,
    "todayOrders": 5,
    "todayRevenue": 7500
  }
}
```

---

## 💳 Payment Management

### 1. Pay with Cash (ชำระด้วยเงินสด)
```bash
POST /payments
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "order-uuid",
  "amount": 3000,
  "paymentMethod": "CASH",
  "note": "ชำระเงินสด"
}
```

### 2. Pay Standing Ticket (ชำระตั๋วยืน)
```bash
POST /payments/pay-standing
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerName": "ชื่อลูกค้า",
  "customerPhone": "0901234567",
  "quantity": 2,
  "amount": 1000,
  "referrerCode": "REF001"
}
```

---

## 👥 User Management

### 1. Get All Users (ดูผู้ใช้ทั้งหมด)
```bash
GET /users
Authorization: Bearer <token>
```

### 2. Get User by ID (ดูผู้ใช้ตาม ID)
```bash
GET /users/:id
Authorization: Bearer <token>
```

### 3. Create User (สร้างผู้ใช้)
```bash
POST /users
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "ชื่อผู้ใช้ใหม่",
  "phone": "0901234567",
  "role": "USER"
}
```

### 4. Update User (แก้ไขผู้ใช้)
```bash
PATCH /users/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "ชื่อใหม่",
  "phone": "0987654321"
}
```

### 5. Delete User (ลบผู้ใช้)
```bash
DELETE /users/:id
Authorization: Bearer <token>
```

---

## 🏷️ Referrer Management

### 1. Get All Referrers (ดูผู้แนะนำทั้งหมด)
```bash
GET /referrers?page=1&limit=10&search=ชื่อ
Authorization: Bearer <token>
```

### 2. Get Referrer by ID (ดูผู้แนะนำตาม ID)
```bash
GET /referrers/:id
Authorization: Bearer <token>
```

### 3. Create Referrer (สร้างผู้แนะนำ)
```bash
POST /referrers
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "ชื่อผู้แนะนำ",
  "phone": "0901234567",
  "email": "referrer@example.com",
  "code": "REF001",
  "commissionRate": 10
}
```

### 4. Get Orders by Referrer (ดูออเดอร์ของผู้แนะนำ)
```bash
GET /referrers/:id/orders?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

### 5. Export Referrer PDF (ออกรายงาน PDF)
```bash
GET /referrers/:id/export-pdf?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

---

## 🔧 Common Headers

### Authentication
```
Authorization: Bearer <your-jwt-token>
```

### Content Type
```
Content-Type: application/json
```

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "ข้อมูลไม่ถูกต้อง",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "ไม่มีสิทธิ์เข้าถึง",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "ไม่มีสิทธิ์ดำเนินการ",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "ไม่พบข้อมูล",
  "error": "Not Found"
}
```

---

## 🚀 Frontend Integration Examples

### JavaScript/TypeScript
```javascript
// สร้าง API Client
class TicketAPI {
  constructor(baseURL = 'http://localhost:3000/api/v1') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('token');
  }

  async request(url, options = {}) {
    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Login
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    this.token = response.access_token;
    localStorage.setItem('token', this.token);
    return response;
  }

  // Get Zones
  async getZones() {
    return this.request('/zones');
  }

  // Get Seats by Zone
  async getSeatsByZone(zoneId, showDate) {
    return this.request(`/seats/by-zone/${zoneId}?showDate=${showDate}`);
  }

  // Create Order
  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  // Get Orders
  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/orders?${query}`);
  }
}

// การใช้งาน
const api = new TicketAPI();

// เข้าสู่ระบบ
await api.login('user@example.com', 'password123');

// ดูโซน
const zones = await api.getZones();

// ดูที่นั่ง
const seats = await api.getSeatsByZone('zone-id', '2024-01-01T19:00:00Z');

// สร้างออเดอร์
const order = await api.createOrder({
  customerName: 'ชื่อลูกค้า',
  customerPhone: '0901234567',
  ticketType: 'RINGSIDE',
  seatIds: ['seat-id-1', 'seat-id-2'],
  showDate: '2024-01-01T19:00:00Z'
});
```

### React Hook Example
```javascript
import { useState, useEffect } from 'react';

function useTicketAPI() {
  const [api] = useState(() => new TicketAPI());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.login(email, password);
      setUser(response.user);
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData) => {
    setLoading(true);
    try {
      return await api.createOrder(orderData);
    } catch (error) {
      console.error('Create order failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    api,
    user,
    loading,
    login,
    createOrder
  };
}
```

---

## 🎯 Complete Frontend Flow Example

### 1. Login Flow
```javascript
// 1. Login
const loginResponse = await api.login('user@example.com', 'password123');

// 2. Save token
localStorage.setItem('token', loginResponse.access_token);

// 3. Get user profile
const profile = await api.request('/auth/profile');
```

### 2. Order Creation Flow
```javascript
// 1. Get zones
const zones = await api.getZones();

// 2. Get seats for selected zone
const seats = await api.getSeatsByZone('zone-id', '2024-01-01T19:00:00Z');

// 3. Filter available seats
const availableSeats = seats.data.filter(seat => 
  seat.bookingStatus === 'AVAILABLE'
);

// 4. Create order with selected seats
const orderData = {
  customerName: 'ชื่อลูกค้า',
  customerPhone: '0901234567',
  customerEmail: 'customer@example.com',
  ticketType: 'RINGSIDE',
  seatIds: ['seat-id-1', 'seat-id-2'],
  showDate: '2024-01-01T19:00:00Z',
  paymentMethod: 'QR_CODE'
};

const order = await api.createOrder(orderData);

// 5. Show order details
console.log('Order created:', order.data);
```

### 3. Order Management Flow
```javascript
// 1. Get user's orders
const orders = await api.getOrders({ page: 1, limit: 10 });

// 2. View specific order
const orderDetail = await api.request(`/orders/${orderId}`);

// 3. Cancel order (if needed)
const cancelResult = await api.request(`/orders/${orderId}/cancel`, {
  method: 'PATCH'
});

// 4. Generate tickets (after payment confirmed)
const tickets = await api.request(`/orders/${orderId}/tickets`);
```

---

## 🔧 Environment Variables

```bash
# .env
DATABASE_URL=postgresql://username:password@localhost:5432/ticket_db
JWT_SECRET=your-super-secret-jwt-key
PORT=3000
API_VERSION=v1

# Social Login
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
```

---

## 🎉 สรุป

ระบบ API นี้ให้ความสามารถครบครันสำหรับการจองตั๋วมวย รวมถึง:

- **Authentication** - ระบบเข้าสู่ระบบแบบครบครัน
- **Order Management** - จัดการออเดอร์ตั้งแต่สร้างจนจบ
- **Seat Management** - จัดการที่นั่งและการจอง
- **Payment Processing** - ระบบชำระเงิน
- **User Management** - จัดการผู้ใช้งาน
- **Referrer System** - ระบบผู้แนะนำ
- **Analytics** - ระบบรายงานและสถิติ

Frontend สามารถใช้ API เหล่านี้เพื่อสร้าง Web Application หรือ Mobile Application ที่สมบูรณ์ได้

**🚀 พร้อมใช้งาน 100%!**
