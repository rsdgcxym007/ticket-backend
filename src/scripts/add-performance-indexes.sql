-- Performance Optimization Indexes
-- รันคำสั่งเหล่านี้ในฐานข้อมูล PostgreSQL เพื่อเพิ่มประสิทธิภาพ

-- 1. Index สำหรับ seat_booking table (ใช้บ่อยในการ Query)
CREATE INDEX IF NOT EXISTS idx_seat_booking_show_date_status 
ON seat_booking ("showDate", status);

CREATE INDEX IF NOT EXISTS idx_seat_booking_seat_show_date 
ON seat_booking ("seatId", "showDate");

-- 2. Index สำหรับ seat table 
CREATE INDEX IF NOT EXISTS idx_seat_zone_row_col 
ON seat ("zoneId", "rowIndex", "columnIndex");

CREATE INDEX IF NOT EXISTS idx_seat_zone_status 
ON seat ("zoneId", status);

-- 3. Index สำหรับ order table (ชื่อจริงในฐานข้อมูล)
CREATE INDEX IF NOT EXISTS idx_order_user_status 
ON "order" ("userId", status);

CREATE INDEX IF NOT EXISTS idx_order_show_date_status 
ON "order" ("showDate", status);

-- 4. Index สำหรับ zones table
CREATE INDEX IF NOT EXISTS idx_zones_active 
ON zones ("isActive");

-- 5. Composite index สำหรับ Query ที่ซับซ้อน
CREATE INDEX IF NOT EXISTS idx_seat_booking_complex 
ON seat_booking ("showDate", status, "seatId");

-- 6. Index สำหรับ auth table (แก้ปัญหา uuid = text)
CREATE INDEX IF NOT EXISTS idx_auth_provider_id 
ON auth ("providerId");

-- 7. Index สำหรับ audit_log (ถ้ามี)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
ON audit_log ("createdAt");

-- Analyze tables เพื่ออัปเดต Statistics
ANALYZE seat;
ANALYZE seat_booking;
ANALYZE "order";
ANALYZE zones;
ANALYZE auth;
