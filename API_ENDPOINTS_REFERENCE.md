# 📡 API Endpoints Reference - Patong Boxing Stadium

**Base URL**: `https://api.patongboxingstadiumticket.com`

---

## 🔐 Authentication Endpoints

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Register  
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "Full Name",
  "phone": "0812345678"
}
```

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer {refresh_token}
```

---

## 🎫 Event & Booking Endpoints

### Get All Events
```http
GET /api/events
```

### Get Event Details
```http
GET /api/events/{eventId}
```

### Get Available Seats
```http
GET /api/seats/event/{eventId}
```

### Create Booking
```http
POST /api/bookings
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "eventId": "uuid",
  "seatIds": ["seat1", "seat2"],
  "customerInfo": {
    "name": "Customer Name",
    "email": "customer@email.com",
    "phone": "0812345678"
  }
}
```

### Get User Bookings
```http
GET /api/bookings/my-bookings
Authorization: Bearer {access_token}
```

---

## 💳 Payment Endpoints

### Process Payment
```http
POST /api/payments
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "bookingId": "uuid",
  "amount": 1500,
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123"
  }
}
```

### Check Payment Status
```http
GET /api/payments/{paymentId}/status
Authorization: Bearer {access_token}
```

---

## 📱 QR Code Endpoints

### Generate QR Code
```http
POST /api/qr/generate
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "bookingId": "uuid"
}
```

### Validate QR Code (Staff Only)
```http
POST /api/qr/validate
Authorization: Bearer {staff_token}
Content-Type: application/json

{
  "qrData": "encrypted_qr_string"
}
```

### Get Ticket QR
```http
GET /api/tickets/{ticketId}/qr
Authorization: Bearer {access_token}
```

---

## 👨‍💼 Admin Endpoints (Admin Only)

### Create Event
```http
POST /api/admin/events
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Boxing Night 2025",
  "description": "Championship fight",
  "date": "2025-09-15T19:00:00Z",
  "venue": "Patong Boxing Stadium",
  "totalSeats": 500,
  "pricing": {
    "VIP": 2000,
    "Premium": 1500,
    "Standard": 800
  }
}
```

### Get All Bookings (Admin)
```http
GET /api/admin/bookings
Authorization: Bearer {admin_token}
```

### Update Event
```http
PUT /api/admin/events/{eventId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Updated Event Title",
  "status": "active"
}
```

---

## 📊 Analytics Endpoints

### Get Booking Analytics
```http
GET /api/analytics/bookings
Authorization: Bearer {admin_token}
Query Parameters:
- startDate: 2025-01-01
- endDate: 2025-12-31
- eventId: optional
```

### Get Revenue Analytics  
```http
GET /api/analytics/revenue
Authorization: Bearer {admin_token}
Query Parameters:
- period: daily|weekly|monthly
- year: 2025
```

---

## 📁 File Upload Endpoints

### Upload Image
```http
POST /api/upload/image
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

file: [image file]
category: event|profile|document
```

### Get Uploaded File
```http
GET /api/upload/files/{filename}
```

---

## 🏥 System Endpoints

### Health Check
```http
GET /health
```

### API Documentation
```http
GET /api/docs
```

---

## 🔒 Authentication Headers

### For User Endpoints
```http
Authorization: Bearer {access_token}
```

### For Admin Endpoints
```http
Authorization: Bearer {admin_token}
```

### For Staff Endpoints (QR Validation)
```http
Authorization: Bearer {staff_token}
```

---

## ⚠️ Error Responses

### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-08-16T09:46:34.000Z",
  "path": "/api/bookings"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created  
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🚀 Rate Limits

- **Public endpoints**: 100 requests/minute per IP
- **Authenticated users**: 1000 requests/minute  
- **Admin users**: 5000 requests/minute
- **File uploads**: 10 uploads/minute

---

## 📝 Notes for Frontend Developers

1. **All dates** are in ISO 8601 format (UTC)
2. **File uploads** support PNG, JPG, PDF (max 10MB)
3. **QR codes** expire after 24 hours
4. **JWT tokens** expire after 7 days (refresh tokens: 30 days)
5. **Seat locking** expires after 10 minutes during booking process
6. **Thai language support** - API accepts Thai text in UTF-8

---

**🎯 Complete API Documentation**: https://api.patongboxingstadiumticket.com/api/docs

*Ready for integration! 🚀*
