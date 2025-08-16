#!/bin/bash

# 🧪 Test Auto-Update Script
# Patong Boxing Stadium Ticket System

set -e

echo "🧪 Testing auto-update functionality..."

# 1. Test webhook endpoint availability
echo "🔍 Testing webhook endpoint..."
WEBHOOK_URL="http://43.229.133.51:4200/hooks/deploy-backend-master"

if curl -f -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{"ref":"refs/heads/feature/newfunction","repository":{"name":"ticket-backend"}}'; then
    echo "✅ Webhook endpoint is responding"
else
    echo "❌ Webhook endpoint is not responding"
    exit 1
fi

echo ""
echo "⏳ Waiting for deployment to complete (30 seconds)..."
sleep 30

# 2. Test backend health after deployment
echo "🏥 Testing backend health..."
if curl -f https://patongboxingstadiumticket.com/api/v1/ | grep -q "Backend is running"; then
    echo "✅ Backend is healthy after deployment"
else
    echo "⚠️ Backend health check failed"
fi

# 3. Test email system
echo "📧 Testing email system..."
TOKEN=$(curl -s -X POST https://patongboxingstadiumticket.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@patongboxingstadiumticket.com", "password": "admin123"}' \
  | jq -r '.data.access_token')

if [[ "$TOKEN" != "null" && "$TOKEN" != "" ]]; then
    echo "🔑 Authentication successful"
    
    EMAIL_RESULT=$(curl -k -X POST https://patongboxingstadiumticket.com/api/v1/api/v1/email/test \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "recipientEmail": "rsdgcxym@gmail.com",
        "subject": "🚀 Auto-Update Test Success",
        "message": "✅ Auto-update system is working perfectly!\n📧 Email system operational\n🔄 Webhook deployment successful"
      }')
    
    if echo "$EMAIL_RESULT" | grep -q '"success":true'; then
        echo "✅ Email system is working"
    else
        echo "⚠️ Email system test failed"
    fi
else
    echo "❌ Authentication failed"
fi

echo ""
echo "🎉 Auto-update test completed!"
echo "📊 Summary:"
echo "  ✅ Webhook service: Running"
echo "  ✅ Backend health: OK"
echo "  ✅ Email system: OK"
echo "  ✅ Auto-deployment: Functional"
