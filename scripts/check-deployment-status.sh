#!/bin/bash

# Deployment Status Checker Script
# ตรวจสอบสถานะการ deploy และส่ง notification

set -e

echo "🔍 Checking deployment status..."

# Discord webhook URL
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
WEBHOOK_URL="http://43.229.133.51:4000/api/v1/webhook/v1/deploy"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}📊 STATUS: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Function to send Discord notification
send_discord_notification() {
    local message="$1"
    local color="$2"  # green=5763719, red=15158332, yellow=16776960
    local status="$3"
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"embeds\": [{
                 \"title\": \"🔍 Deployment Status Check\",
                 \"description\": \"$message\",
                 \"color\": $color,
                 \"fields\": [
                     {
                         \"name\": \"📊 Status\",
                         \"value\": \"$status\",
                         \"inline\": true
                     },
                     {
                         \"name\": \"🌿 Branch\",
                         \"value\": \"feature/newfunction\",
                         \"inline\": true
                     },
                     {
                         \"name\": \"⏰ Timestamp\",
                         \"value\": \"$(date -u +\"%Y-%m-%d %H:%M:%S UTC\")\",
                         \"inline\": true
                     }
                 ],
                 \"footer\": {
                     \"text\": \"Stadium Ticket System\"
                 }
             }]
         }" \
         "$DISCORD_WEBHOOK_URL" 2>/dev/null || true
}

# Function to send webhook notification
send_webhook_notification() {
    local status="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    curl -s -H "Content-Type: application/json" \
         -H "User-Agent: ticket-backend-status-checker/1.0" \
         -X POST \
         -d "{
             \"status\": \"$status\",
             \"message\": \"[STATUS CHECK] $message\",
             \"branch\": \"feature/newfunction\",
             \"commit\": \"$(git rev-parse HEAD 2>/dev/null || echo 'unknown')\",
             \"timestamp\": \"$timestamp\",
             \"environment\": \"production\",
             \"version\": \"status-check\"
         }" \
         "$WEBHOOK_URL" 2>/dev/null || true
}

print_status "Checking deployment processes..."

# Check if deployment script is running
DEPLOY_PROCESSES=$(ps aux | grep -E "(webhook-deploy|build-and-deploy)" | grep -v grep | wc -l)
if [ "$DEPLOY_PROCESSES" -gt 0 ]; then
    print_warning "Deployment script is still running ($DEPLOY_PROCESSES processes)"
    ps aux | grep -E "(webhook-deploy|build-and-deploy)" | grep -v grep
else
    print_success "No deployment scripts running"
fi

echo ""

# Check PM2 status
print_status "Checking PM2 application status..."
if command -v pm2 >/dev/null 2>&1; then
    PM2_STATUS=$(pm2 status ticket-backend-prod --no-color 2>/dev/null | tail -n +4 | head -n -1)
    if echo "$PM2_STATUS" | grep -q "online"; then
        print_success "Application is running (PM2 status: online)"
        APP_STATUS="RUNNING"
        STATUS_COLOR=5763719
    elif echo "$PM2_STATUS" | grep -q "stopped"; then
        print_error "Application is stopped"
        APP_STATUS="STOPPED" 
        STATUS_COLOR=15158332
    elif echo "$PM2_STATUS" | grep -q "errored"; then
        print_error "Application has errors"
        APP_STATUS="ERRORED"
        STATUS_COLOR=15158332
    else
        print_warning "Application status unknown"
        APP_STATUS="UNKNOWN"
        STATUS_COLOR=16776960
    fi
    
    echo "PM2 Status:"
    echo "$PM2_STATUS"
else
    print_error "PM2 not found"
    APP_STATUS="PM2_NOT_FOUND"
    STATUS_COLOR=15158332
fi

echo ""

# Check recent PM2 logs for errors
print_status "Checking recent logs for errors..."
if command -v pm2 >/dev/null 2>&1; then
    RECENT_ERRORS=$(pm2 logs ticket-backend-prod --lines 20 --nostream 2>/dev/null | grep -i error | wc -l)
    if [ "$RECENT_ERRORS" -gt 0 ]; then
        print_warning "Found $RECENT_ERRORS error(s) in recent logs"
        pm2 logs ticket-backend-prod --lines 10 --nostream | grep -i error | tail -5
    else
        print_success "No recent errors found in logs"
    fi
fi

echo ""

# Check if application is responding
print_status "Testing application health..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" = "200" ] || [ "$HEALTH_CHECK" = "404" ]; then
    print_success "Application is responding (HTTP $HEALTH_CHECK)"
    if [ "$APP_STATUS" = "RUNNING" ]; then
        FINAL_STATUS="SUCCESS"
        FINAL_MESSAGE="✅ Deployment completed successfully! Application is running and responding."
        FINAL_COLOR=5763719
    else
        FINAL_STATUS="WARNING"
        FINAL_MESSAGE="⚠️ Application is responding but PM2 status is unclear."
        FINAL_COLOR=16776960
    fi
else
    print_error "Application is not responding (HTTP $HEALTH_CHECK)"
    FINAL_STATUS="FAILED"
    FINAL_MESSAGE="❌ Deployment may have failed. Application is not responding."
    FINAL_COLOR=15158332
fi

echo ""
echo "🎯 FINAL STATUS: $FINAL_STATUS"

# Send final notification
send_discord_notification "$FINAL_MESSAGE" "$FINAL_COLOR" "$FINAL_STATUS"
send_webhook_notification "$FINAL_STATUS" "$FINAL_MESSAGE"

print_status "Status check completed!"
