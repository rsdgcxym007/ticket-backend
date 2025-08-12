#!/bin/bash

# Quick Webhook Test
echo "🧪 Testing Webhook URLs"
echo "======================"

echo ""
echo "🔗 Testing correct webhook URL..."
curl -X POST http://43.229.133.51:4000/api/webhook/v1/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "status": "test",
    "message": "Quick test notification",
    "branch": "feature/newfunction",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
    "environment": "testing"
  }'

echo ""
echo ""
echo "✅ If you see a success response above, the webhook is working!"
echo "❌ If you see an error, check the logs: pm2 logs ticket-backend-prod"
echo ""
echo "🔗 Correct URL: http://43.229.133.51:4000/api/webhook/v1/deploy"
echo "❌ Wrong URL:   http://43.229.133.51:4000/api/v1/webhook/deploy"
