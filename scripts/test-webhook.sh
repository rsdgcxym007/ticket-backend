#!/bin/bash

# Test Webhook Script for Stadium Backend
# This script tests the webhook endpoints

set -e

# Configuration
WEBHOOK_BASE_URL="http://43.229.133.51:4000/api"
LOCAL_WEBHOOK_URL="http://localhost:3001/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}🔍 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to test webhook endpoint
test_webhook() {
    local url="$1"
    local endpoint="$2"
    local description="$3"
    
    print_status "Testing $description: $url$endpoint"
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "status": "success",
            "message": "Test deployment notification",
            "branch": "feature/newfunction",
            "commit": "abc1234567890",
            "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
            "environment": "production",
            "version": "1.0.0"
        }' \
        "$url$endpoint" 2>/dev/null || echo -e "\nERROR")
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    # Extract response body (all lines except last)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        print_success "Response: $body"
        print_success "HTTP Status: $http_code"
        return 0
    else
        print_error "HTTP Status: $http_code"
        print_error "Response: $body"
        return 1
    fi
}

echo "🚀 Testing Stadium Backend Webhook Endpoints"
echo "=============================================="
echo ""

# Test 1: Production webhook
print_status "Test 1: Production Deployment Webhook"
if test_webhook "$WEBHOOK_BASE_URL" "/v1/webhook/deploy" "Production Webhook"; then
    print_success "Production webhook is working!"
else
    print_error "Production webhook failed!"
fi
echo ""

# Test 2: Local webhook (if available)
print_status "Test 2: Local Development Webhook"
if test_webhook "$LOCAL_WEBHOOK_URL" "/webhook/v1/deploy" "Local Webhook"; then
    print_success "Local webhook is working!"
else
    print_warning "Local webhook not available (this is normal if not running locally)"
fi
echo ""

# Test 3: Test different statuses
print_status "Test 3: Testing Different Deployment Statuses"

statuses=("started" "deploying" "success" "failed" "warning")

for status in "${statuses[@]}"; do
    print_status "Testing status: $status"
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "status": "'$status'",
            "message": "Test '$status' status notification",
            "branch": "feature/newfunction",
            "commit": "test123456",
            "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
            "environment": "testing"
        }' \
        "$WEBHOOK_BASE_URL/v1/webhook/deploy" 2>/dev/null || echo -e "\nERROR")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        print_success "Status '$status' sent successfully"
    else
        print_error "Status '$status' failed with HTTP $http_code"
    fi
done

echo ""
print_status "Test 4: Testing GitHub-style Webhook (Original Endpoint)"
github_payload='{
    "repository": {
        "name": "ticket-backend"
    },
    "ref": "refs/heads/feature/newfunction",
    "commits": [
        {
            "id": "abc123",
            "message": "Test commit"
        }
    ]
}'

response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "User-Agent: GitHub-Hookshot/test" \
    -d "$github_payload" \
    "$LOCAL_WEBHOOK_URL/webhook/deploy" 2>/dev/null || echo -e "\nERROR")

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    print_success "GitHub-style webhook working"
else
    print_warning "GitHub webhook not available (local only)"
fi

echo ""
echo "=============================================="
print_status "🎯 Webhook Testing Complete!"
echo ""
print_status "Production Webhook URL: $WEBHOOK_BASE_URL/v1/webhook/deploy"
print_status "Test Command: curl -X POST $WEBHOOK_BASE_URL/v1/webhook/deploy -H 'Content-Type: application/json' -d '{\"status\":\"test\",\"message\":\"Hello\"}'"
echo ""
print_success "Check Discord channel for notifications! 📱"
