# 🎫 ER Diagram - Ticket Booking System

## 📊 Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string name
        string avatar
        enum role
        datetime createdAt
        datetime updatedAt
        string userId
    }

    AUTH {
        uuid id PK
        string providerId UK
        string password
        string provider
        string email
        string displayName
        string avatar
        enum role
        uuid userId FK
    }

    ZONES {
        uuid id PK
        string name
        string description
        decimal price
        json seatMap
        datetime createdAt
        datetime updatedAt
    }

    SEATS {
        uuid id PK
        string seatNumber
        int rowIndex
        int columnIndex
        enum status
        uuid zoneId FK
        datetime createdAt
        datetime updatedAt
    }

    ORDERS {
        uuid id PK
        string orderNumber UK
        string customerName
        string customerPhone
        string customerEmail
        enum ticketType
        int quantity
        decimal totalAmount
        enum status
        enum paymentMethod
        datetime showDate
        string note
        uuid userId FK
        uuid referrerId FK
        datetime createdAt
        datetime updatedAt
    }

    SEAT_BOOKING {
        uuid id PK
        uuid seatId FK
        uuid orderId FK
        enum status
        datetime bookedAt
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
    }

    PAYMENTS {
        uuid id PK
        uuid orderId FK
        decimal amount
        enum paymentMethod
        enum status
        string transactionId
        string slipUrl
        string note
        datetime paidAt
        datetime createdAt
        datetime updatedAt
    }

    REFERRERS {
        uuid id PK
        string name
        string phone
        string email
        string code UK
        decimal commissionRate
        decimal totalCommission
        int totalOrders
        datetime createdAt
        datetime updatedAt
    }

    AUDIT_LOGS {
        uuid id PK
        string action
        string entityType
        string entityId
        json oldData
        json newData
        string userId
        string ipAddress
        string userAgent
        datetime timestamp
    }

    APP_CONFIGS {
        uuid id PK
        string key UK
        string value
        string description
        datetime createdAt
        datetime updatedAt
    }

    %% Relationships
    USERS ||--o{ AUTH : "has"
    USERS ||--o{ ORDERS : "creates"
    
    ZONES ||--o{ SEATS : "contains"
    
    SEATS ||--o{ SEAT_BOOKING : "booked_in"
    
    ORDERS ||--o{ SEAT_BOOKING : "books"
    ORDERS ||--o{ PAYMENTS : "has"
    
    REFERRERS ||--o{ ORDERS : "refers"
    
    AUTH }o--|| USERS : "belongs_to"
    SEATS }o--|| ZONES : "belongs_to"
    SEAT_BOOKING }o--|| SEATS : "books"
    SEAT_BOOKING }o--|| ORDERS : "belongs_to"
    PAYMENTS }o--|| ORDERS : "for"
    ORDERS }o--|| REFERRERS : "referred_by"
    ORDERS }o--|| USERS : "created_by"
```

## 🔗 Relationship Details

### 1. **Users ↔ Auth (1:N)**
- One User can have multiple Auth records (different providers)
- Each Auth record belongs to one User

### 2. **Users ↔ Orders (1:N)**
- One User can create multiple Orders
- Each Order belongs to one User

### 3. **Zones ↔ Seats (1:N)**
- One Zone contains multiple Seats
- Each Seat belongs to one Zone

### 4. **Orders ↔ Seat Booking (1:N)**
- One Order can book multiple Seats
- Each Seat Booking belongs to one Order

### 5. **Seats ↔ Seat Booking (1:N)**
- One Seat can have multiple Bookings (different times)
- Each Booking is for one Seat

### 6. **Orders ↔ Payments (1:N)**
- One Order can have multiple Payments (partial payments)
- Each Payment belongs to one Order

### 7. **Referrers ↔ Orders (1:N)**
- One Referrer can refer multiple Orders
- Each Order can be referred by one Referrer

## 📋 Entity Descriptions

### **Users**
- Core user information
- Manages user profiles and authentication

### **Auth**
- Authentication records for different providers
- Supports manual, Google, Facebook, LINE login

### **Zones**
- Seating zones (Ringside, VIP, General, etc.)
- Contains pricing and seat layout information

### **Seats**
- Individual seats within zones
- Tracks seat numbers and positions

### **Orders**
- Ticket booking orders
- Contains customer and booking information

### **Seat Booking**
- Junction table for Orders and Seats
- Tracks booking status and timing

### **Payments**
- Payment records for orders
- Supports multiple payment methods

### **Referrers**
- Referral system for commission tracking
- Tracks referrer performance

### **Audit Logs**
- System activity tracking
- Records all important changes

### **App Configs**
- System configuration settings
- Key-value pairs for app settings

## 🎯 Key Features

### **Multi-tenancy Support**
- Users can have multiple auth methods
- Orders can have multiple seat bookings
- Payments can be split across multiple transactions

### **Flexible Booking System**
- Seats can be booked temporarily
- Bookings have expiration times
- Status tracking throughout the process

### **Commission System**
- Referrers track total orders and commissions
- Automatic commission calculation

### **Audit Trail**
- Complete system activity logging
- Data change tracking for compliance

### **Configurable System**
- App settings stored in database
- Easy configuration management
