# 🤖 AI FRONTEND INTEGRATION GUIDE
## Complete API Flow Summary for AI Bot & Frontend Development

### 📋 **OVERVIEW**
This guide provides complete API flows for AI bots and frontend developers to implement a ticketing system with dashboard analytics, payment processing, and order management.

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **Base URL**: `http://localhost:3000/api/v1`
### **Authentication**: Bearer Token (JWT)
### **Content-Type**: `application/json`

---

## 🎯 **COMPLETE FLOW SCENARIOS**

### **1. CUSTOMER TICKET PURCHASE FLOW**

#### **Standing Tickets Purchase**
```typescript
// Step 1: Create Standing Ticket Order
POST /api/v1/payments/standing
{
  "ticketType": "STANDING",
  "standingAdultQty": 2,
  "standingChildQty": 1,
  "showDate": "2025-12-25",
  "customerName": "สมชาย ใจดี",
  "customerPhone": "0812345678",
  "customerEmail": "somchai@example.com",
  "paymentMethod": "QR_CODE",
  "referrerCode": "FRESHYTOUR"
}

// Response includes:
{
  "orderId": "uuid",
  "standingAdultQty": 2,
  "standingChildQty": 1,
  "standingTotal": 4200,
  "standingCommission": 800,
  "qrCodeUrl": "data:image/png;base64...",
  "paymentUrl": "https://promptpay.link..."
}
```

#### **Seated Tickets Purchase**
```typescript
// Step 1: Get Available Seats
GET /api/v1/seats?showDate=2025-12-25&zone=RINGSIDE

// Step 2: Create Seated Ticket Order
POST /api/v1/payments/seated
{
  "ticketType": "RINGSIDE",
  "seatIds": ["seat-1", "seat-2"],
  "showDate": "2025-12-25",
  "customerName": "สมหญิง รักดี",
  "customerPhone": "0823456789",
  "customerEmail": "somying@example.com",
  "paymentMethod": "BANK_TRANSFER",
  "referrerCode": "AGENT001"
}
```

#### **Payment Verification**
```typescript
// Check Payment Status
GET /api/v1/payments/order/{orderId}

// Response:
{
  "orderId": "uuid",
  "status": "PAID",
  "paymentSlip": "base64image",
  "confirmedAt": "2025-07-06T10:30:00Z"
}
```

---

### **2. DASHBOARD ANALYTICS FLOW**

#### **Main Dashboard Data**
```typescript
// Get Complete Dashboard Overview
GET /api/v1/dashboard

// Response includes:
{
  "totalSales": "฿125,000",
  "monthSales": "฿75,000",
  "totalOrders": 150,
  "orderStatusCounts": {
    "PENDING": 5,
    "CONFIRMED": 120,
    "CANCELLED": 25
  },
  "availableSeats": 45,
  "nextShowDate": "2025-07-08",
  "salesByZone": [...],
  "dailySales": [...],
  "topCustomers": [...],
  "topReferrers": [...]
}
```

#### **Detailed Statistics**
```typescript
// Get Detailed Statistics
GET /api/v1/dashboard/statistics

// Response:
{
  "today": {
    "sales": 15000,
    "orders": 12,
    "customers": 8
  },
  "thisWeek": {
    "sales": 85000,
    "orders": 67,
    "customers": 45
  },
  "thisMonth": {
    "sales": 250000,
    "orders": 189,
    "customers": 134
  }
}
```

#### **Revenue Analytics**
```typescript
// Get Revenue Trends
GET /api/v1/dashboard/revenue-analytics?period=weekly

// Response:
{
  "period": "weekly",
  "data": [
    { "date": "2025-07-01", "amount": 25000 },
    { "date": "2025-07-02", "amount": 30000 },
    // ... more daily data
  ],
  "growth": 15.5,
  "total": 175000
}
```

#### **Seat Occupancy**
```typescript
// Get Seat Occupancy for Specific Show
GET /api/v1/dashboard/seat-occupancy?showDate=2025-07-08

// Response:
{
  "showDate": "2025-07-08",
  "totalSeats": 300,
  "bookedSeats": 255,
  "availableSeats": 45,
  "occupancyRate": 85.0,
  "byZone": {
    "RINGSIDE": { "total": 100, "booked": 95, "available": 5 },
    "STADIUM": { "total": 200, "booked": 160, "available": 40 }
  }
}
```

---

### **3. ORDER MANAGEMENT FLOW**

#### **List Orders with Filters**
```typescript
// Get Orders with Pagination and Filters
GET /api/v1/orders?page=1&limit=20&status=CONFIRMED&startDate=2025-07-01&endDate=2025-07-31

// Response:
{
  "items": [...orders],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

#### **Order Details**
```typescript
// Get Single Order Details
GET /api/v1/orders/{orderId}

// Response includes complete order information:
{
  "id": "uuid",
  "orderNumber": "ORD-20250706-001",
  "customerName": "สมชาย ใจดี",
  "ticketType": "STANDING",
  "standingAdultQty": 2,
  "standingChildQty": 1,
  "standingTotal": 4200,
  "standingCommission": 800,
  "status": "CONFIRMED",
  "seats": [...],
  "payments": [...],
  "auditLogs": [...]
}
```

#### **Order Status Updates**
```typescript
// Cancel Order
PATCH /api/v1/orders/{orderId}/cancel

// Confirm Payment
PATCH /api/v1/orders/{orderId}/confirm-payment
```

---

### **4. REFERRER ANALYTICS FLOW**

#### **Referrer Performance**
```typescript
// Get Referrer Analytics
GET /api/v1/dashboard/referrer-analytics

// Response:
{
  "topReferrers": [
    {
      "referrerCode": "FRESHYTOUR",
      "name": "Freshy Tour",
      "totalSales": 85000,
      "totalOrders": 34,
      "totalCommission": 12750,
      "conversionRate": 68.5
    }
  ],
  "totalCommissionPaid": 45000,
  "averageOrderValue": 2500
}
```

#### **Specific Referrer Data**
```typescript
// Get Referrer Orders
GET /api/v1/referrers/{referrerId}/orders?startDate=2025-07-01&endDate=2025-07-31

// Export Referrer Report
GET /api/v1/referrers/{referrerId}/export-pdf
```

---

### **5. SEAT MANAGEMENT FLOW**

#### **Seat Availability**
```typescript
// Get Seats by Zone
GET /api/v1/seats/by-zone/{zoneId}

// Get All Seats with Status
GET /api/v1/seats?status=AVAILABLE&showDate=2025-07-08
```

#### **Seat Status Updates**
```typescript
// Update Seat Status
PATCH /api/v1/seats/{seatId}/status
{
  "status": "MAINTENANCE",
  "reason": "ซ่อมแซม"
}
```

---

### **6. SYSTEM MONITORING FLOW**

#### **Performance Metrics**
```typescript
// Get System Performance
GET /api/v1/dashboard/performance-metrics

// Response:
{
  "systemHealth": "HEALTHY",
  "responseTime": 120,
  "throughput": 150,
  "errorRate": 0.5,
  "conversionRate": 85.2,
  "averageOrderTime": 180
}
```

#### **Recent Activities**
```typescript
// Get Recent System Activities
GET /api/v1/dashboard/recent-activities

// Response:
{
  "recentOrders": [...],
  "recentPayments": [...],
  "systemEvents": [...]
}
```

#### **System Alerts**
```typescript
// Get System Alerts
GET /api/v1/dashboard/alerts

// Response:
{
  "alerts": [
    {
      "type": "WARNING",
      "message": "ที่นั่งใกล้เต็ม - Ringside Zone",
      "timestamp": "2025-07-06T10:30:00Z",
      "priority": "HIGH"
    }
  ],
  "criticalCount": 0,
  "warningCount": 3,
  "infoCount": 5
}
```

---

### **7. AUDIT & REPORTING FLOW**

#### **Audit Logs**
```typescript
// Get Audit Logs
GET /api/v1/audit?entityType=ORDER&startDate=2025-07-01&page=1&limit=50

// Response includes complete audit trail:
{
  "items": [
    {
      "id": "uuid",
      "action": "ORDER_CREATED",
      "entityType": "ORDER",
      "entityId": "order-uuid",
      "userId": "user-uuid",
      "userRole": "CUSTOMER",
      "timestamp": "2025-07-06T10:30:00Z",
      "details": {...}
    }
  ]
}
```

---

## 💰 **PRICING & COMMISSION STRUCTURE**

### **Ticket Prices**
```typescript
const TICKET_PRICES = {
  RINGSIDE: {
    adult: 2500,
    child: 2000,
    commission: { adult: 500, child: 400 }
  },
  STADIUM: {
    adult: 2000,
    child: 1500,
    commission: { adult: 400, child: 300 }
  },
  STANDING: {
    adult: 1500,
    child: 1200,
    commission: { adult: 300, child: 200 }
  }
}
```

### **Commission Calculation**
```typescript
// Standing Tickets Example:
// 2 Adult + 1 Child = (2 × 1500) + (1 × 1200) = 4200 baht
// Commission = (2 × 300) + (1 × 200) = 800 baht
```

---

## 🎨 **FRONTEND UI COMPONENTS GUIDE**

### **Dashboard Components**
1. **Sales Overview Cards** - Use `/api/v1/dashboard`
2. **Revenue Chart** - Use `/api/v1/dashboard/revenue-analytics`
3. **Seat Occupancy Visualization** - Use `/api/v1/dashboard/seat-occupancy`
4. **Recent Activities Feed** - Use `/api/v1/dashboard/recent-activities`
5. **System Alerts Panel** - Use `/api/v1/dashboard/alerts`

### **Order Management Components**
1. **Order List Table** - Use `/api/v1/orders` with pagination
2. **Order Details Modal** - Use `/api/v1/orders/{id}`
3. **Payment Status Tracker** - Use `/api/v1/payments/order/{orderId}`
4. **Seat Selection Grid** - Use `/api/v1/seats/by-zone/{zoneId}`

### **Analytics Components**
1. **Revenue Trends Chart** - Multiple period options
2. **Referrer Performance Table** - Top performers ranking
3. **Customer Analytics** - Purchase behavior insights
4. **Performance Metrics Dashboard** - System health monitoring

---

## 🔐 **ERROR HANDLING**

### **Common Error Responses**
```typescript
// Validation Error (400)
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "customerEmail",
      "message": "อีเมลไม่ถูกต้อง"
    }
  ]
}

// Not Found (404)
{
  "statusCode": 404,
  "message": "ไม่พบข้อมูลคำสั่งซื้อ",
  "error": "Order not found"
}

// Server Error (500)
{
  "statusCode": 500,
  "message": "เกิดข้อผิดพลาดของระบบ",
  "error": "Internal server error"
}
```

---

## 📱 **MOBILE RESPONSIVE CONSIDERATIONS**

### **Mobile-First API Usage**
- Use pagination for all list endpoints
- Implement lazy loading for large datasets
- Optimize image responses (QR codes, payment slips)
- Use lightweight data formats for mobile networks

### **Recommended Mobile Flows**
1. **Quick Ticket Purchase** - Simplified standing ticket flow
2. **Payment Verification** - QR code scanning integration
3. **Order Status Check** - Real-time status updates
4. **Basic Analytics** - Essential metrics only

---

## 🚀 **DEPLOYMENT & PRODUCTION NOTES**

### **Environment Variables**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://your-frontend-domain.com
```

### **Performance Optimization**
- Enable Redis caching for dashboard data
- Implement database indexes for frequent queries
- Use CDN for static assets (QR codes, logos)
- Enable gzip compression

### **Security Considerations**
- Implement rate limiting
- Validate all input data
- Use HTTPS in production
- Sanitize database queries
- Log security events

---

**This guide provides complete API integration patterns for AI bots and frontend developers to build a comprehensive ticketing system with analytics, payment processing, and order management.**
