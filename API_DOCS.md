# 🎫 Ticket Backend API Documentation

> Complete API reference for front-end developers and UI designers

## 📋 Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Order Management](#order-management)
- [Payment Processing](#payment-processing)
- [Seat Management](#seat-management)
- [Zone Management](#zone-management)
- [Mobile API](#mobile-api)
- [Dashboard & Analytics](#dashboard--analytics)
- [Notifications](#notifications)
- [Health & Monitoring](#health--monitoring)
- [Configuration](#configuration)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)
- [UI/UX Guidelines](#uiux-guidelines)

---

## 🔐 Authentication

### POST `/auth/login`
**Description**: User login with email and password

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

**UI Suggestions**:
- Show loading spinner during login
- Store token in secure storage (localStorage/cookies)
- Redirect to dashboard on success
- Show inline error messages for invalid credentials

### POST `/auth/register`
**Description**: Register new user account

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Jane Doe",
  "role": "user"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "newuser@example.com",
      "name": "Jane Doe",
      "role": "user"
    }
  }
}
```

### GET `/auth/profile`
**Authentication**: Bearer Token Required
**Description**: Get current user profile

**Response (200)**:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### GET `/auth/google`
**Description**: Initiate Google OAuth login
**UI Suggestion**: Open in popup or redirect to OAuth page

### GET `/auth/facebook`
**Description**: Initiate Facebook OAuth login

### GET `/auth/line`
**Description**: Initiate LINE OAuth login

---

## 👥 User Management

### GET `/users`
**Authentication**: Bearer Token Required
**Description**: Get all users (Admin/Staff only)

**Response (200)**:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET `/users/:id`
**Authentication**: Bearer Token Required
**Description**: Get specific user details

### POST `/users`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Create new user

### PATCH `/users/:id`
**Authentication**: Bearer Token Required
**Description**: Update user information

### DELETE `/users/:id`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Delete user account

---

## 🎫 Order Management

### POST `/orders`
**Authentication**: Bearer Token Required
**Description**: Create new order with concurrency protection

**Request Body**:
```json
{
  "customerName": "John Doe",
  "customerPhone": "+66812345678",
  "customerEmail": "john@example.com",
  "ticketType": "RINGSIDE",
  "quantity": 2,
  "seatIds": ["seat-uuid-1", "seat-uuid-2"],
  "showDate": "2025-01-15",
  "paymentMethod": "QR_CODE",
  "orderSource": "DIRECT",
  "referrerCode": "REF123"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "สร้างออเดอร์สำเร็จ (ป้องกัน race condition)",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-20250115-001",
    "status": "PENDING",
    "total": 5000,
    "expiresAt": "2025-01-15T10:05:00.000Z",
    "seats": [
      {
        "id": "seat-uuid-1",
        "seatNumber": "A1",
        "zoneName": "RINGSIDE"
      }
    ]
  }
}
```

**Error Responses**:
- `409`: Duplicate order or seats unavailable
- `429`: Too many requests (rate limit)
- `403`: Booking limit exceeded

**UI Suggestions**:
- Show 5-minute countdown timer for payment
- Disable form during submission
- Show seat selection visually
- Handle race conditions gracefully with retry mechanism

### GET `/orders`
**Authentication**: Bearer Token Required
**Description**: Get paginated list of orders

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (PENDING, CONFIRMED, CANCELLED)
- `search`: Search by order number or customer name

**Response (200)**:
```json
{
  "success": true,
  "message": "ดึงรายการออเดอร์สำเร็จ",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

**UI Suggestions**:
- Implement infinite scroll or pagination
- Show status badges with colors
- Add search and filter dropdowns
- Show loading states for async operations

### GET `/orders/:id`
**Authentication**: Bearer Token Required
**Description**: Get specific order details

**Response (200)**:
```json
{
  "success": true,
  "message": "ดึงรายละเอียดออเดอร์สำเร็จ",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-20250115-001",
    "status": "PAID",
    "customerName": "John Doe",
    "total": 5000,
    "seats": [...],
    "payment": {...},
    "qrCode": "data:image/png;base64,..."
  }
}
```

### PATCH `/orders/:id`
**Authentication**: Bearer Token Required (Staff/Admin only)
**Description**: Update order details

### DELETE `/orders/:id`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Cancel order

---

## 💳 Payment Processing

### POST `/payments/seated`
**Authentication**: Bearer Token Required
**Description**: Process payment for seated tickets (RINGSIDE/STADIUM)

**Request Body**:
```json
{
  "orderId": "order-uuid",
  "method": "QR_CODE",
  "customerName": "John Doe",
  "customerPhone": "+66812345678",
  "amount": 5000,
  "slipUrl": "https://example.com/slip.jpg",
  "referrerCode": "REF123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "ชำระเงินตั๋วนั่งสำเร็จ",
  "data": {
    "paymentId": "payment-uuid",
    "status": "PAID",
    "qrCode": "data:image/png;base64,...",
    "receiptUrl": "https://example.com/receipt.pdf"
  }
}
```

### POST `/payments/standing`
**Authentication**: Bearer Token Required
**Description**: Process payment for standing tickets

### GET `/payments/order/:orderId`
**Authentication**: Bearer Token Required
**Description**: Get payment information for an order

### PATCH `/payments/cancel/:orderId`
**Authentication**: Bearer Token Required (Admin/Staff only)
**Description**: Cancel payment and issue refund

**UI Suggestions**:
- Show payment method options clearly
- Display QR code prominently for mobile scanning
- Show receipt download option
- Implement payment status polling for real-time updates

---

## 💺 Seat Management

### GET `/seats`
**Authentication**: Bearer Token Required
**Description**: Get all seats

**Response (200)**:
```json
{
  "success": true,
  "message": "Seats retrieved successfully",
  "data": [
    {
      "id": "seat-uuid",
      "seatNumber": "A1",
      "row": "A",
      "column": 1,
      "zone": "RINGSIDE",
      "price": 2500,
      "status": "AVAILABLE"
    }
  ]
}
```

### GET `/seats/by-zone/:zoneId`
**Authentication**: Bearer Token Required
**Description**: Get seats by zone for specific show date

**Query Parameters**:
- `showDate`: Show date (YYYY-MM-DD)

**Response (200)**:
```json
{
  "success": true,
  "message": "Seats by zone retrieved successfully",
  "data": [
    {
      "id": "seat-uuid",
      "seatNumber": "A1",
      "status": "AVAILABLE",
      "price": 2500,
      "x": 100,
      "y": 50
    }
  ]
}
```

### GET `/seats/:id`
**Description**: Get specific seat details

### POST `/seats`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Create new seat

### PATCH `/seats/:id/status`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Update seat status (maintenance only)

**UI Suggestions**:
- Display seats as interactive seat map
- Use different colors for seat statuses:
  - Green: Available
  - Yellow: Reserved (temporary)
  - Red: Booked/Occupied
  - Gray: Blocked/Empty
- Show price on hover
- Implement zoom functionality for large venues

---

## 🏟️ Zone Management

### GET `/zones`
**Authentication**: Bearer Token Required
**Description**: Get all zones

**Response (200)**:
```json
{
  "success": true,
  "message": "All zones",
  "data": [
    {
      "id": "zone-uuid",
      "name": "RINGSIDE",
      "description": "Premium ringside seats",
      "price": 2500,
      "totalSeats": 100,
      "availableSeats": 95,
      "features": ["VIP Access", "Complimentary Drinks"]
    }
  ]
}
```

### GET `/zones/:id`
**Description**: Get specific zone details

### POST `/zones`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Create new zone

### PATCH `/zones/:id`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Update zone information

### DELETE `/zones/:id`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Delete zone

**UI Suggestions**:
- Display zones as cards with images
- Show availability percentage with progress bars
- Highlight zone features prominently
- Use consistent color coding across the app

---

## 📱 Mobile API

### GET `/mobile/home`
**Description**: Get mobile app home page data

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "announcement-uuid",
        "title": "Special Event Tonight",
        "content": "Don't miss the championship match!",
        "type": "PROMOTION",
        "priority": "HIGH",
        "imageUrl": "https://example.com/banner.jpg"
      }
    ],
    "promotions": [...],
    "upcomingEvents": [...],
    "quickStats": {
      "totalEvents": 5,
      "totalSeats": 1000,
      "availableSeats": 750,
      "popularZones": ["RINGSIDE", "STADIUM"]
    }
  }
}
```

### GET `/mobile/zones/available`
**Description**: Get available zones for mobile booking

### GET `/mobile/orders`
**Authentication**: Bearer Token Required
**Description**: Get user's orders for mobile app

### GET `/mobile/history`
**Authentication**: Bearer Token Required
**Description**: Get user's booking history

### GET `/mobile/orders/:id/status`
**Authentication**: Bearer Token Required
**Description**: Get order status for mobile tracking

### GET `/mobile/announcements`
**Description**: Get announcements and news for mobile app

**Query Parameters**:
- `type`: Filter by announcement type

### PUT `/mobile/profile`
**Authentication**: Bearer Token Required
**Description**: Update user profile from mobile app

### POST `/mobile/notifications/settings`
**Authentication**: Bearer Token Required
**Description**: Update notification preferences

**UI Suggestions for Mobile**:
- Implement pull-to-refresh on home screen
- Use bottom sheet for seat selection
- Show push notification for order status updates
- Implement offline mode for viewing past orders
- Use swipe gestures for navigation

---

## 📊 Dashboard & Analytics

### GET `/dashboard`
**Authentication**: Bearer Token Required (Staff/Admin)
**Description**: Get main dashboard data

**Response (200)**:
```json
{
  "success": true,
  "message": "ข้อมูลแดชบอร์ดหลักทั้งหมด",
  "data": {
    "revenue": {
      "today": 25000,
      "thisWeek": 150000,
      "thisMonth": 500000,
      "growth": 15.5
    },
    "orders": {
      "pending": 12,
      "confirmed": 85,
      "cancelled": 3
    },
    "seats": {
      "totalAvailable": 750,
      "totalBooked": 250,
      "occupancyRate": 25
    },
    "alerts": [
      {
        "type": "WARNING",
        "message": "5 orders expiring in 2 minutes",
        "priority": "HIGH"
      }
    ]
  }
}
```

### GET `/dashboard/referrer-performance`
**Authentication**: Bearer Token Required
**Description**: Get referrer performance data

### GET `/dashboard/ticket-sales`
**Authentication**: Bearer Token Required
**Description**: Get ticket sales summary

### GET `/dashboard/seat-availability`
**Authentication**: Bearer Token Required
**Description**: Get seat availability by zone

**Query Parameters**:
- `showDate`: Specific show date

### GET `/dashboard/customer-analytics`
**Authentication**: Bearer Token Required
**Description**: Get customer analytics data

### GET `/dashboard/system-health`
**Authentication**: Bearer Token Required
**Description**: Get system health and alerts

### GET `/dashboard/quick-stats`
**Authentication**: Bearer Token Required
**Description**: Get quick statistics for dashboard widgets

**UI Suggestions for Dashboard**:
- Use real-time updates with WebSocket connections
- Implement dark/light theme toggle
- Show KPI cards with trend indicators
- Use charts for revenue and booking trends
- Implement dashboard customization options
- Show alerts with different priority colors

---

## 🔔 Notifications

### GET `/notifications`
**Authentication**: Bearer Token Required
**Description**: Get user notifications

**Query Parameters**:
- `limit`: Number of notifications (default: 50)

**Response (200)**:
```json
{
  "success": true,
  "message": "ดึงการแจ้งเตือนสำเร็จ",
  "data": [
    {
      "id": "notification-uuid",
      "title": "Order Confirmed",
      "message": "Your order ORD-20250115-001 has been confirmed",
      "type": "ORDER_CONFIRMED",
      "isRead": false,
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

### GET `/notifications/unread-count`
**Authentication**: Bearer Token Required
**Description**: Get count of unread notifications

### PATCH `/notifications/:id/read`
**Authentication**: Bearer Token Required
**Description**: Mark notification as read

### PATCH `/notifications/mark-all-read`
**Authentication**: Bearer Token Required
**Description**: Mark all notifications as read

### POST `/notifications/promotional`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Send promotional notification to all users

**UI Suggestions**:
- Show notification badge with count
- Implement real-time notifications with WebSocket
- Use toast notifications for immediate alerts
- Group notifications by type
- Implement notification sound/vibration for mobile

---

## 🏥 Health & Monitoring

### GET `/health`
**Description**: Application health check (no auth required)

**Response (200)**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "database": "connected",
  "memory": {
    "used": "45.2 MB",
    "total": "128 MB",
    "percentage": 35.3
  }
}
```

### GET `/health/database`
**Description**: Database health check

### GET `/health/memory`
**Description**: Memory usage information

**UI Suggestions**:
- Display system status page for administrators
- Show color-coded health indicators
- Implement automatic health monitoring alerts

---

## ⚙️ Configuration

### GET `/config/:key`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Get configuration value

### POST `/config`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Create/update configuration

### POST `/config/multiple`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Get multiple configuration values

### GET `/config/prefix/:prefix`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Get configurations by prefix

### POST `/config/initialize-defaults`
**Authentication**: Bearer Token Required (Admin only)
**Description**: Initialize default configurations

---

## 🔄 Common Patterns

### Standard Response Format
```json
{
  "success": boolean,
  "message": string,
  "data": any,
  "meta"?: {
    "timestamp": string,
    "requestId": string
  }
}
```

### Paginated Response Format
```json
{
  "success": true,
  "message": string,
  "data": {
    "items": array,
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": string,
  "error": {
    "code": string,
    "details": any
  },
  "statusCode": number
}
```

---

## ⚠️ Error Handling

### Common Error Codes

| Status Code | Description | UI Handling |
|-------------|-------------|-------------|
| 400 | Bad Request | Show inline error messages |
| 401 | Unauthorized | Redirect to login page |
| 403 | Forbidden | Show access denied message |
| 404 | Not Found | Show 404 page or fallback UI |
| 409 | Conflict | Show conflict resolution options |
| 429 | Rate Limited | Show "too many requests" message |
| 500 | Server Error | Show generic error with retry option |

### Rate Limiting
- Most endpoints: 100 requests per minute
- Login endpoint: 5 attempts per minute
- Order creation: 10 requests per minute

---

## 🎨 UI/UX Guidelines

### Loading States
- **Button loading**: Show spinner with disabled state
- **Page loading**: Show skeleton screens
- **Data fetching**: Show loading indicators
- **Form submission**: Disable form with loading overlay

### Success Feedback
- **Order creation**: Show success modal with order details
- **Payment**: Show confirmation with QR code
- **Profile update**: Show toast notification
- **Settings save**: Show inline success message

### Error Handling
- **Network errors**: Show retry button
- **Validation errors**: Show inline field errors
- **Server errors**: Show friendly error page
- **Timeout**: Show timeout message with retry option

### Status Indicators
- **Order Status Colors**:
  - PENDING: Orange/Yellow
  - CONFIRMED: Green
  - CANCELLED: Red
  - EXPIRED: Gray
- **Seat Status Colors**:
  - AVAILABLE: Green
  - RESERVED: Yellow
  - BOOKED: Red
  - BLOCKED: Gray

### Mobile-Specific Guidelines
- Use native-like navigation patterns
- Implement swipe gestures for common actions
- Use bottom sheets for secondary actions
- Optimize for one-handed use
- Implement haptic feedback for important actions

### Accessibility
- Use semantic HTML elements
- Provide alt text for images
- Ensure keyboard navigation support
- Maintain proper color contrast ratios
- Implement screen reader support

### Performance Optimization
- Implement lazy loading for large lists
- Use virtual scrolling for seat maps
- Optimize images and assets
- Implement proper caching strategies
- Use pagination for large datasets

---

## 🚀 User Flows

### Booking Flow
1. `GET /mobile/zones/available` - Show available zones
2. `GET /seats/by-zone/:zoneId` - Show seat map
3. `POST /orders` - Create order with selected seats
4. `POST /payments/seated` - Process payment
5. `GET /orders/:id` - Show confirmation with QR code

### Dashboard Flow (Admin)
1. `GET /dashboard` - Load main dashboard
2. `GET /dashboard/system-health` - Check system status
3. `GET /orders` - View recent orders
4. `GET /analytics/*` - View detailed analytics

### Mobile App Flow
1. `GET /mobile/home` - Load home screen
2. `GET /mobile/announcements` - Show announcements
3. `GET /mobile/orders` - Show user's orders
4. `GET /mobile/orders/:id/status` - Track order status

This documentation provides a comprehensive guide for front-end developers and UI designers to understand and implement the ticket booking system's API endpoints effectively.
