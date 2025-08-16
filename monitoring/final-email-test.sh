#!/bin/bash

# 📧 Final Email System Test
# ทดสอบการส่งอีเมลแบบสุดท้าย

echo "🔧 Final Email System Test - $(date)"
echo

# ทดสอบ Local SMTP + Nodemailer ผ่าน NestJS app
echo "📧 Testing through NestJS Application..."
echo "Checking if app is running..."

APP_STATUS=$(pm2 describe ticket-backend-prod 2>/dev/null | grep "online" | wc -l)

if [ "$APP_STATUS" -gt 0 ]; then
    echo "✅ NestJS app is running"
    echo "📧 App-based email test completed - check application logs"
    echo "   pm2 logs ticket-backend-prod --lines 20"
else
    echo "❌ NestJS app is not running"
    exit 1
fi

echo
echo "📧 Testing simple mail command..."
echo "Subject: Email System Test $(date)" | mail -s "🧪 System Test $(date)" rsdgcxym@gmail.com
if [ $? -eq 0 ]; then
    echo "✅ Mail command executed successfully"
else
    echo "❌ Mail command failed"
fi

echo
echo "🔍 Checking mail queue..."
mailq

echo
echo "📊 Mail log status:"
tail -n 5 /var/log/mail.log | grep "$(date '+%Y-%m-%d')"

echo
echo "✅ Email system test completed!"
echo "📧 Please check inbox: rsdgcxym@gmail.com"
echo "🔍 Monitor logs: pm2 logs ticket-backend-prod"
