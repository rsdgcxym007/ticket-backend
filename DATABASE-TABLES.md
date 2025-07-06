# 🗃️ Database Tables & Entities Documentation

## 📋 Table Specifications

### 1. **USERS Table**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'staff', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID -- Self-referencing for hierarchical relationships
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Purpose:** Core user information storage  
**Relationships:** 1:N with AUTH, 1:N with ORDERS  
**Business Rules:** 
- Email must be unique
- Role determines access permissions
- Soft delete capability

---

### 2. **AUTH Table**
```sql
CREATE TABLE auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('manual', 'google', 'facebook', 'line')),
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    avatar TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'staff', 'admin')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_email ON auth(email);
CREATE INDEX idx_auth_provider ON auth(provider);
CREATE INDEX idx_auth_user_id ON auth(user_id);
CREATE UNIQUE INDEX idx_auth_provider_email ON auth(provider, email);
```

**Purpose:** Authentication records for multiple providers  
**Relationships:** N:1 with USERS  
**Business Rules:**
- One user can have multiple auth methods
- Provider + email combination must be unique
- Password hashed with bcrypt

---

### 3. **ZONES Table**
```sql
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    seat_map JSONB, -- Array of seat layout
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zones_name ON zones(name);
CREATE INDEX idx_zones_price ON zones(price);
```

**Purpose:** Seating zones (Ringside, VIP, General, etc.)  
**Relationships:** 1:N with SEATS  
**Business Rules:**
- Name should be descriptive (e.g., "Ringside VIP")
- Price in Thai Baht
- seat_map contains 2D array of seat layout

**Example seat_map:**
```json
[
  ["A1", "A2", "A3", "A4", "A5"],
  ["B1", "B2", "B3", "B4", "B5"],
  ["C1", "C2", "C3", "C4", "C5"]
]
```

---

### 4. **SEATS Table**
```sql
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seat_number VARCHAR(10) NOT NULL,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seats_zone_id ON seats(zone_id);
CREATE INDEX idx_seats_status ON seats(status);
CREATE INDEX idx_seats_position ON seats(row_index, column_index);
CREATE UNIQUE INDEX idx_seats_zone_number ON seats(zone_id, seat_number);
```

**Purpose:** Individual seats within zones  
**Relationships:** N:1 with ZONES, 1:N with SEAT_BOOKING  
**Business Rules:**
- Seat number must be unique within zone
- Position tracking for seat map rendering
- Status management for availability

---

### 5. **ORDERS Table**
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    ticket_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'qr_code', 'bank_transfer')),
    show_date TIMESTAMP NOT NULL,
    note TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referrer_id UUID REFERENCES referrers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_show_date ON orders(show_date);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_referrer_id ON orders(referrer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

**Purpose:** Ticket booking orders  
**Relationships:** N:1 with USERS, N:1 with REFERRERS, 1:N with SEAT_BOOKING, 1:N with PAYMENTS  
**Business Rules:**
- Order number format: ORD-YYMMDD-XXX
- Total amount calculated from seat prices
- Show date determines booking validity

---

### 6. **SEAT_BOOKING Table**
```sql
CREATE TABLE seat_booking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL, -- 5 minutes for temp booking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seat_booking_seat_id ON seat_booking(seat_id);
CREATE INDEX idx_seat_booking_order_id ON seat_booking(order_id);
CREATE INDEX idx_seat_booking_status ON seat_booking(status);
CREATE INDEX idx_seat_booking_expires_at ON seat_booking(expires_at);
CREATE UNIQUE INDEX idx_seat_booking_active ON seat_booking(seat_id, order_id) WHERE status = 'pending';
```

**Purpose:** Junction table for seat reservations  
**Relationships:** N:1 with SEATS, N:1 with ORDERS  
**Business Rules:**
- Temporary booking expires in 5 minutes
- One seat can only be booked by one order at a time
- Status tracking for booking lifecycle

---

### 7. **PAYMENTS Table**
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'qr_code', 'bank_transfer')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    transaction_id VARCHAR(255),
    slip_url TEXT,
    note TEXT,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
```

**Purpose:** Payment records and tracking  
**Relationships:** N:1 with ORDERS  
**Business Rules:**
- Multiple payments per order (partial payments)
- Slip URL for bank transfer verification
- Transaction ID for payment gateway integration

---

### 8. **REFERRERS Table**
```sql
CREATE TABLE referrers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    code VARCHAR(20) UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 10.00, -- Percentage
    total_commission DECIMAL(10,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrers_code ON referrers(code);
CREATE INDEX idx_referrers_email ON referrers(email);
CREATE INDEX idx_referrers_total_orders ON referrers(total_orders);
```

**Purpose:** Referral system for commission tracking  
**Relationships:** 1:N with ORDERS  
**Business Rules:**
- Referral code must be unique
- Commission rate 5-15%
- Automatic calculation of totals

---

### 9. **AUDIT_LOGS Table**
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

**Purpose:** System activity and change tracking  
**Relationships:** References various entities  
**Business Rules:**
- Track CREATE, UPDATE, DELETE operations
- Store before/after data for changes
- User and session information

---

### 10. **APP_CONFIGS Table**
```sql
CREATE TABLE app_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_app_configs_key ON app_configs(key);
```

**Purpose:** Application configuration settings  
**Business Rules:**
- Key-value pairs for system settings
- Hot-reload configuration without restart

**Example configurations:**
```json
{
  "booking_timeout_minutes": "5",
  "payment_timeout_hours": "24",
  "commission_rate_default": "10.00",
  "show_date_default": "2024-12-31T19:00:00Z"
}
```

---

## 🔄 Data Flow & Relationships

### **Order Creation Flow:**
1. User selects seats → SEAT_BOOKING (pending)
2. User creates order → ORDERS (pending)
3. User makes payment → PAYMENTS (pending)
4. Staff confirms → ORDERS (confirmed), PAYMENTS (confirmed)
5. System generates tickets → ORDERS (completed)

### **Commission Calculation:**
1. Order with referrer_id → ORDERS
2. Order confirmed → Calculate commission
3. Update REFERRERS (total_commission, total_orders)

### **Audit Trail:**
1. Any entity change → AUDIT_LOGS
2. User action tracking → Include user context
3. System changes → Include system context

## 📊 Database Statistics & Performance

### **Expected Volume:**
- **Users:** ~10,000 records
- **Orders:** ~100,000 records/year
- **Seat Bookings:** ~500,000 records/year
- **Payments:** ~150,000 records/year
- **Audit Logs:** ~1,000,000 records/year

### **Performance Considerations:**
- Index on frequently queried columns
- Partition audit_logs by timestamp
- Regular cleanup of expired bookings
- Connection pooling for concurrent access

### **Backup Strategy:**
- Daily full backup
- Hourly incremental backup
- Point-in-time recovery capability
- Cross-region replication for disaster recovery

## 🚀 Optimization Recommendations

### **Query Optimization:**
- Use covering indexes for common queries
- Implement read replicas for reporting
- Cache frequently accessed data (Redis)
- Use materialized views for complex analytics

### **Storage Optimization:**
- Compress old audit logs
- Archive completed orders older than 2 years
- Use JSONB for flexible schema fields
- Implement proper vacuum and analyze schedules

### **Security Measures:**
- Row-level security for multi-tenant data
- Encrypt sensitive data at rest
- Regular security audits
- Principle of least privilege for database users
