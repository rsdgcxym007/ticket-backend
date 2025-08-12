#!/bin/bash

# Test webhook endpoints to verify they're working correctly

echo "🧪 Testing webhook endpoints..."

# Test notification endpoint
echo "📋 Testing deployment notification endpoint..."
curl -X POST http://localhost:4000/api/v1/webhook/v1/deploy \
  -H "Content-Type: application/json" \
  -H "User-Agent: ticket-backend-deploy-script/1.0" \
  -d '{
    "status": "test",
    "message": "Test deployment notification",
    "branch": "feature/newfunction",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
    "commit": "test123",
    "version": "0.0.1",
    "environment": "production"
  }' && echo ""

echo ""

# Test GitHub webhook endpoint (with proper GitHub payload)
echo "🐙 Testing GitHub webhook endpoint..."
curl -X POST http://localhost:4000/api/v1/webhook/deploy \
  -H "Content-Type: application/json" \
  -H "User-Agent: GitHub-Hookshot/test" \
  -d '{
    "repository": {
      "name": "ticket-backend"
    },
    "ref": "refs/heads/feature/newfunction",
    "commits": [
      {
        "id": "test123",
        "message": "Test webhook deployment"
      }
    ]
  }' && echo ""

echo ""
echo "✅ Webhook testing completed!"
