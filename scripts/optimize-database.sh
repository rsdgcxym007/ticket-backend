#!/bin/bash

# สคริปต์สำหรับเพิ่ม Performance Indexes
# รันสคริปต์นี้เพื่อเพิ่มประสิทธิภาพฐานข้อมูล

echo "🚀 Adding Performance Indexes to Database..."

# อ่านค่า Database จาก .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# สร้าง Connection String
DB_URL="postgresql://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"

echo "📡 Connecting to database: ${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"

# รัน SQL Script
psql "$DB_URL" -f src/scripts/add-performance-indexes.sql

if [ $? -eq 0 ]; then
    echo "✅ Performance indexes added successfully!"
    echo "📊 Analyzing tables for better query planning..."
    
    # Analyze tables for statistics
    psql "$DB_URL" -c "
    ANALYZE seat;
    ANALYZE seat_booking;
    ANALYZE orders;
    ANALYZE zones;
    ANALYZE auth;
    SELECT 'Database analysis completed' as status;
    "
    
    echo "🎉 Database optimization completed!"
else
    echo "❌ Failed to add indexes. Please check the error messages above."
    exit 1
fi
