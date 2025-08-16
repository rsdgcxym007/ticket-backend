#!/bin/bash

# 🚀 Email System Fix Script - Patong Boxing Stadium
# This script will fix the EmailModule loading issue

echo "🎯 Starting Email System Fix..."

# Navigate to project directory
cd /var/www/patong-boxing || exit 1

# Stop PM2 process
echo "⏹️  Stopping PM2..."
pm2 stop ecosystem.config.js

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install --production

# Clean build directory
echo "🧹 Cleaning build directory..."
rm -rf dist/

# Build the application
echo "🔨 Building application..."
npm run build

# Check if EmailModule is properly compiled
echo "🔍 Checking compiled EmailModule..."
if [ -f "dist/email/email.module.js" ]; then
    echo "✅ EmailModule compiled successfully"
else
    echo "❌ EmailModule not found in dist folder"
    echo "Checking source files..."
    ls -la src/email/
fi

# Check if EmailController is compiled
if [ -f "dist/email/email-automation.controller.js" ]; then
    echo "✅ EmailController compiled successfully"
else
    echo "❌ EmailController not found in dist folder"
fi

# Check if QRCodeService is available
if [ -f "dist/common/services/qr-code.service.js" ]; then
    echo "✅ QRCodeService compiled successfully"
else
    echo "❌ QRCodeService not found in dist folder"
fi

# Restart PM2
echo "🚀 Restarting PM2..."
pm2 restart ecosystem.config.js

# Wait for startup
echo "⏳ Waiting for application to start..."
sleep 10

# Test API endpoints
echo "🧪 Testing Email API endpoints..."

# Test base API
echo "Testing base API..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "https://api.patongboxingstadiumticket.com/api/v1/health" || echo "❌ Base API unreachable"

# Test email endpoints (will need authentication)
echo "Testing email endpoints (expect 401 unauthorized)..."
curl -s -o /dev/null -w "Email Test Status: %{http_code}\n" -X POST "https://api.patongboxingstadiumticket.com/api/v1/email/test" || echo "❌ Email endpoint unreachable"

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Check logs for any errors
echo "📝 Recent logs:"
pm2 logs --lines 20

echo ""
echo "🎯 Email System Fix Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Test email endpoints with proper JWT token"
echo "2. Verify SMTP configuration works"
echo "3. Send test email"
echo ""
echo "💡 If still not working:"
echo "1. Check if EmailModule is imported in app.module.ts"
echo "2. Verify QRCodeService dependencies"
echo "3. Check email service configuration"
echo ""
echo "🔗 Email API endpoints:"
echo "POST /api/v1/email/send-ticket"
echo "POST /api/v1/email/send-confirmation"
echo "POST /api/v1/email/test"
echo "GET  /api/v1/email/templates"
echo "GET  /api/v1/email/history"
echo "GET  /api/v1/email/stats"
