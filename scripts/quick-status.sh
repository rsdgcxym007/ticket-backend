#!/bin/bash

# Quick deployment status check
echo "🔍 Quick Deployment Status Check"
echo "================================="

# Check if webhook-deploy script is still running
DEPLOY_RUNNING=$(ps aux | grep webhook-deploy | grep -v grep | wc -l)
echo "📋 Deployment script running: $DEPLOY_RUNNING processes"

# Check PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 status ticket-backend-prod --no-color 2>/dev/null | tail -n +4 | head -n -1 || echo "PM2 not available"

# Check recent logs
echo ""
echo "📝 Recent logs (last 5 lines):"
pm2 logs ticket-backend-prod --lines 5 --nostream 2>/dev/null || echo "Logs not available"

# Test application
echo ""
echo "🌐 Application Health:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ]; then
    echo "✅ Application responding (HTTP $HTTP_STATUS)"
else
    echo "❌ Application not responding (HTTP $HTTP_STATUS)"
fi

echo ""
echo "🎯 Summary:"
if [ "$DEPLOY_RUNNING" -eq 0 ]; then
    echo "✅ No deployment script running (completed or stopped)"
else
    echo "⚠️  Deployment script still running"
fi

if pm2 describe ticket-backend-prod 2>/dev/null | grep -q "online"; then
    echo "✅ Application is online"
elif pm2 describe ticket-backend-prod 2>/dev/null | grep -q "stopped"; then
    echo "❌ Application is stopped"
else
    echo "⚠️  Application status unknown"
fi
