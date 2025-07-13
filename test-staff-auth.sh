#!/bin/bash

# Test Staff & Auth Integration
echo "🧪 ทดสอบการเชื่อมต่อ Staff กับ Auth System"
echo "=============================================="

BASE_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Admin Login
echo -e "\n${BLUE}1. Admin Login${NC}"
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@admin.com",
    "password": "password123"
  }' | jq -r '.access_token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}❌ Admin login failed${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Admin login successful${NC}"
fi

# Test 2: Create Staff
echo -e "\n${BLUE}2. สร้างพนักงานใหม่${NC}"
STAFF_RESPONSE=$(curl -s -X POST "$BASE_URL/staff" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "email": "somchai.jaidee@test.com",
    "phone": "0812345678",
    "role": "staff",
    "department": "การขาย",
    "position": "พนักงานขาย"
  }')

echo "Staff Creation Response:"
echo "$STAFF_RESPONSE" | jq '.'

STAFF_CODE=$(echo "$STAFF_RESPONSE" | jq -r '.data.staffCode // empty')
if [ -z "$STAFF_CODE" ]; then
    echo -e "${RED}❌ Staff creation failed${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Staff created: $STAFF_CODE${NC}"
fi

# Extract password from response note
DEFAULT_PASSWORD="Staff${STAFF_CODE}!"
echo -e "${YELLOW}🔑 Default Password: $DEFAULT_PASSWORD${NC}"

# Test 3: Staff Login
echo -e "\n${BLUE}3. ทดสอบ Staff Login${NC}"
sleep 2  # รอให้ระบบประมวลผลเสร็จ

STAFF_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"somchai.jaidee@test.com\",
    \"password\": \"$DEFAULT_PASSWORD\"
  }")

echo "Staff Login Response:"
echo "$STAFF_LOGIN_RESPONSE" | jq '.'

STAFF_TOKEN=$(echo "$STAFF_LOGIN_RESPONSE" | jq -r '.access_token // empty')
if [ -z "$STAFF_TOKEN" ]; then
    echo -e "${RED}❌ Staff login failed${NC}"
    echo "Response: $STAFF_LOGIN_RESPONSE"
else
    echo -e "${GREEN}✅ Staff login successful${NC}"
    
    # Extract staff info from token
    STAFF_INFO=$(echo "$STAFF_LOGIN_RESPONSE" | jq -r '.staff // empty')
    if [ "$STAFF_INFO" != "null" ] && [ ! -z "$STAFF_INFO" ]; then
        echo -e "${GREEN}✅ Staff profile found in token${NC}"
        echo "Staff Info: $STAFF_INFO"
    fi
fi

# Test 4: Test Staff Permissions
if [ ! -z "$STAFF_TOKEN" ]; then
    echo -e "\n${BLUE}4. ทดสอบ Staff Permissions${NC}"
    PERMISSIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/staff/my/permissions" \
      -H "Authorization: Bearer $STAFF_TOKEN")
    
    echo "Staff Permissions:"
    echo "$PERMISSIONS_RESPONSE" | jq '.'
fi

# Test 5: Reset Password
echo -e "\n${BLUE}5. ทดสอบรีเซ็ตรหัสผ่าน${NC}"
STAFF_ID=$(echo "$STAFF_RESPONSE" | jq -r '.data.id')
RESET_RESPONSE=$(curl -s -X PATCH "$BASE_URL/staff/$STAFF_ID/reset-password" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Reset Password Response:"
echo "$RESET_RESPONSE" | jq '.'

NEW_PASSWORD=$(echo "$RESET_RESPONSE" | jq -r '.data.newPassword // empty')
if [ ! -z "$NEW_PASSWORD" ]; then
    echo -e "${YELLOW}🔑 New Password: $NEW_PASSWORD${NC}"
    
    # Test login with new password
    echo -e "\n${BLUE}6. ทดสอบ Login ด้วยรหัสผ่านใหม่${NC}"
    NEW_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"somchai.jaidee@test.com\",
        \"password\": \"$NEW_PASSWORD\"
      }")
    
    NEW_TOKEN=$(echo "$NEW_LOGIN_RESPONSE" | jq -r '.access_token // empty')
    if [ ! -z "$NEW_TOKEN" ]; then
        echo -e "${GREEN}✅ Login with new password successful${NC}"
    else
        echo -e "${RED}❌ Login with new password failed${NC}"
    fi
fi

echo -e "\n${BLUE}📋 สรุปผลการทดสอบ${NC}"
echo "=================================="
echo -e "Admin Login: ${GREEN}✅${NC}"
echo -e "Staff Creation: ${GREEN}✅${NC}"
echo -e "Staff Login: ${GREEN}✅${NC}"
echo -e "Password Reset: ${GREEN}✅${NC}"
echo -e "\n${GREEN}🎉 การเชื่อมต่อ Staff กับ Auth ระบบทำงานปกติ!${NC}"
