#!/bin/bash

# Create Test Staff and Auth Data
# สร้างข้อมูล Staff และ Auth สำหรับทดสอบระบบ

echo "🔧 Creating test staff and auth data..."

# สร้าง User ก่อน
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "123456",
    "name": "Admin User",
    "role": "admin"
  }'

echo "\n✅ Created admin user"

# สร้าง Staff แรก (Admin)
curl -X POST http://localhost:4001/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "staffCode": "ST001",
    "firstName": "Admin",
    "lastName": "User", 
    "email": "admin@test.com",
    "phone": "0812345678",
    "role": "ADMIN",
    "status": "ACTIVE",
    "permissions": ["VIEW_ANALYTICS", "MANAGE_STAFF", "MANAGE_ORDERS", "SYSTEM_SETTINGS", "AUDIT_LOGS", "VIEW_PERFORMANCE", "SYSTEM_MONITORING"],
    "department": "IT",
    "position": "System Administrator"
  }'

echo "\n✅ Created admin staff"

# สร้าง Staff ที่สอง (Manager)
curl -X POST http://localhost:4001/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "staffCode": "ST002",
    "firstName": "Manager",
    "lastName": "Test",
    "email": "manager@test.com", 
    "phone": "0887654321",
    "role": "MANAGER",
    "status": "ACTIVE",
    "permissions": ["VIEW_ANALYTICS", "MANAGE_STAFF", "VIEW_PERFORMANCE"],
    "department": "Operations",
    "position": "Operations Manager"
  }'

echo "\n✅ Created manager staff"

echo "\n🎉 Test data creation completed!"
echo "📝 You can now test login with:"
echo "   Email: admin@test.com"
echo "   Password: 123456"

echo "\n🔗 Test endpoints:"
echo "   POST /auth/login - เข้าสู่ระบบ"
echo "   GET /staff/permissions - ดู permissions ทั้งหมด"
echo "   GET /staff/my/permissions - ดูสิทธิ์ตัวเอง"
echo "   GET /staff - ดูรายการ staff"
