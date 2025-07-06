# 🎫 Ticket Booking System - Complete Documentation

## 📋 System Overview

This is a comprehensive ticket booking system built with NestJS, TypeScript, and PostgreSQL. The system manages event ticket sales, seat bookings, payments, user management, and analytics.

## 🏗️ Architecture & Structure

### Core Modules:

1. **Order Module** - Main booking and order management
2. **Payment Module** - Payment processing and verification
3. **Seat Module** - Seat management and availability
4. **User Module** - User authentication and management
5. **Referrer Module** - Referral system and commission tracking
6. **Audit Module** - System activity logging and tracking
7. **Analytics Module** - Business intelligence and reporting
8. **Config Module** - Application configuration management

## 🎯 Business Logic Flow

### 1. Order Creation Process

```
User → Create Order → Validate User → Check Seat Availability → Calculate Pricing → Create Booking → Generate Order Number → Set Expiration → Save Order
```

**Key Components:**
- `OrderService.createOrder()` - Main order creation logic
- `BusinessService.calculateTicketPrice()` - Pricing calculation
- `BusinessService.validateOrderData()` - Data validation
- `BusinessService.generateOrderReference()` - Reference generation

### 2. Payment Processing

```
Order Created → Payment Initiated → Verify Payment → Update Order Status → Update Seat Bookings → Calculate Commissions → Generate Tickets
```

**Payment Methods:**
- Cash payment (for staff/admin)
- Online payment (future implementation)
- Standing ticket payment (special handling)

### 3. Seat Management

```
Seat Available → Book Seat → Mark as Pending → Payment Confirmed → Mark as Paid → Generate Ticket
```

**Seat Statuses:**
- `AVAILABLE` - Seat is free to book
- `PENDING` - Seat is temporarily reserved
- `BOOKED` - Seat is booked but not paid
- `PAID` - Seat is paid and confirmed
- `CANCELLED` - Booking was cancelled

## 📊 Data Models & Entities

### Order Entity
```typescript
{
  id: string (UUID)
  orderNumber: string (ORD + timestamp + random)
  userId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  showDate: Date
  totalAmount: number
  status: OrderStatus (PENDING, CONFIRMED, CANCELLED, PAID)
  referrerCode?: string
  referrerCommission?: number
  standingCommission?: number
  standingAdultQty?: number
  standingChildQty?: number
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}
```

### SeatBooking Entity
```typescript
{
  id: string (UUID)
  orderId: string
  seatId: string
  showDate: string
  status: BookingStatus
  createdAt: Date
  updatedAt: Date
}
```

### Payment Entity
```typescript
{
  id: string (UUID)
  orderId: string
  amount: number
  method: PaymentMethod (CASH, ONLINE, BANK_TRANSFER)
  status: PaymentStatus (PENDING, PAID, FAILED, REFUNDED)
  paidAt?: Date
  transactionId?: string
  createdAt: Date
}
```

### User Entity
```typescript
{
  id: string (UUID)
  email: string
  name: string
  phone?: string
  role: UserRole (USER, STAFF, ADMIN)
  createdAt: Date
  updatedAt: Date
}
```

## 🔐 User Roles & Permissions

### USER (Customer)
- Create orders for own bookings
- View own orders
- Cancel own pending orders
- Limited booking quantity per order
- Maximum orders per day limit

### STAFF (Box Office Staff)
- Create orders for customers
- Process cash payments
- Confirm payments
- View all orders
- Generate tickets
- Higher booking limits

### ADMIN (System Administrator)
- All staff permissions
- Delete orders
- Manage users
- System configuration
- Analytics access
- Full audit log access

## 💰 Pricing & Commission System

### Ticket Pricing
```typescript
const basePrices = {
  VIP: 5000,
  PREMIUM: 3000,
  STANDARD: 2000,
  STANDING: 1000,
};

// Staff/Admin Discounts
const discountRates = {
  USER: 0,
  STAFF: 0.1,    // 10% discount
  ADMIN: 0.2,    // 20% discount
};
```

### Commission Structure
- Base commission: 5% of total amount
- Referrer commission: 2% of total amount (if referrer exists)
- Standing ticket commission: Fixed rates per ticket type

## 🎟️ Booking Limits & Constraints

### Per Role Limits
```typescript
const BOOKING_LIMITS = {
  USER: {
    maxSeatsPerOrder: 4,
    maxOrdersPerDay: 2,
    maxStandingTickets: 2,
  },
  STAFF: {
    maxSeatsPerOrder: 10,
    maxOrdersPerDay: 20,
    maxStandingTickets: 10,
  },
  ADMIN: {
    maxSeatsPerOrder: 50,
    maxOrdersPerDay: 100,
    maxStandingTickets: 50,
  },
};
```

### Time Constraints
- Orders expire after 24 hours if not paid
- Cannot book seats less than 2 hours before show
- Cannot book seats more than 30 days in advance

## 📈 Analytics & Reporting

### Dashboard Metrics
- Total sales (daily, monthly)
- Order statistics by status
- Customer count
- Seat availability
- Commission tracking
- Payment method breakdown
- Top customers and referrers

### Audit System
All system activities are logged with:
- User ID
- Action type (CREATE, UPDATE, DELETE, CANCEL, CONFIRM, etc.)
- Entity type and ID
- Timestamp
- Additional metadata

## 🔄 API Endpoints

### Order Management
```
POST   /orders                    - Create new order
GET    /orders                    - List orders (with pagination)
GET    /orders/:id                - Get order details
PATCH  /orders/:id                - Update order
PATCH  /orders/:id/cancel         - Cancel order
PATCH  /orders/:id/confirm-payment - Confirm payment
GET    /orders/:id/tickets        - Generate tickets
PATCH  /orders/:id/change-seats   - Change seats
DELETE /orders/:id                - Delete order (admin only)
```

### Payment Processing
```
POST   /payments                  - Process cash payment
POST   /payments/pay-standing     - Process standing ticket payment
```

### Seat Management
```
GET    /seats                     - List all seats
GET    /seats/by-zone/:zoneId     - Get seats by zone
PATCH  /seats/:id/status          - Update seat status
```

### User Management
```
POST   /auth/login                - User login
POST   /auth/register             - User registration
GET    /auth/profile              - Get user profile
GET    /users                     - List users
```

## 🛠️ Technical Implementation

### Database Schema
- PostgreSQL with TypeORM
- UUID primary keys
- Proper foreign key relationships
- Indexes on frequently queried fields
- Audit trail for all entities

### Validation & Error Handling
- Class-validator for DTO validation
- Custom business validation rules
- Comprehensive error messages
- Audit logging for all operations

### Security
- JWT-based authentication
- Role-based access control (RBAC)
- Input sanitization
- SQL injection prevention

## 🚀 Business Use Cases

### Case 1: Customer Books Tickets Online
1. Customer selects show date and seats
2. System validates availability and user limits
3. Order created with 24-hour expiration
4. Customer pays online (future feature)
5. System confirms payment and generates tickets

### Case 2: Staff Processes Walk-in Customer
1. Staff creates order for customer
2. Customer pays cash at box office
3. Staff processes cash payment
4. System immediately confirms order
5. Tickets generated and printed

### Case 3: Referrer Commission Tracking
1. Customer uses referrer code during booking
2. System calculates referrer commission
3. Commission tracked in referrer account
4. Monthly commission reports generated

### Case 4: Standing Ticket Sales
1. Customer books standing tickets (no seat assignment)
2. Different pricing and commission structure
3. Quantity limits enforced
4. Special handling in payment processing

### Case 5: Order Cancellation
1. Customer/staff cancels pending order
2. System releases reserved seats
3. Refund processed if payment made
4. Audit log created for tracking

## 🔧 Configuration & Environment

### Environment Variables
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PAYMENT_GATEWAY_KEY=...
ADMIN_EMAIL=...
COMMISSION_RATES=...
BOOKING_LIMITS=...
```

### Business Rules Configuration
- Ticket prices per zone
- Commission rates
- Booking limits by user role
- Order expiration times
- Payment methods enabled

## 📱 Integration Points

### External Services
- Payment gateways (future)
- OCR for payment slip verification
- Notification services (SMS, Email)
- PDF generation for tickets
- QR code generation

### Internal Services
- Audit logging
- Analytics processing
- Report generation
- Automated cleanup tasks

## 🔍 Monitoring & Maintenance

### Scheduled Tasks
- Expire unpaid orders (runs every minute)
- Generate daily reports
- Clean up old audit logs
- Update seat availability cache

### Health Checks
- Database connectivity
- External service availability
- System resource usage
- Error rate monitoring

## 🎯 Future Enhancements

### Planned Features
1. Online payment integration
2. Mobile app support
3. Real-time seat availability updates
4. Advanced analytics dashboard
5. Customer loyalty program
6. Multi-language support
7. Social media integration
8. Automated marketing campaigns

### Technical Improvements
1. Caching layer (Redis)
2. Event-driven architecture
3. Microservices migration
4. Real-time WebSocket updates
5. Advanced security measures
6. Performance optimization
7. CI/CD pipeline
8. Docker containerization

---

This documentation provides a complete understanding of the ticket booking system's architecture, business logic, and implementation details. The system is designed to be scalable, maintainable, and extensible for future enhancements.
