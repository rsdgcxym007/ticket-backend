#!/bin/bash

# 📧 Gmail SMTP Test Script
# ทดสอบการส่งอีเมลด้วย Gmail credentials ใหม่

echo "🔧 Testing Updated Gmail SMTP Credentials - $(date)"
echo "📧 From: patongboxingstadiumticket@gmail.com"
echo "📧 To: rsdgcxym@gmail.com"
echo

# ทดสอบด้วย mail command + Gmail SMTP configuration
echo "📧 Sending test email via mail command..."

# สร้างเนื้อหาอีเมลทดสอบ
cat > /tmp/test_email_body.txt << EOF
🧪 SMTP Test Email - $(date)
🏟️ From: Patong Boxing Stadium
📧 Gmail Account: patongboxingstadiumticket@gmail.com

This is a test email to verify the updated Gmail SMTP credentials:
- SMTP_USER: patongboxingstadiumticket@gmail.com
- SMTP_PASS: wykeiiiswwdznmko (App Password)

✅ If you receive this email, the Gmail SMTP configuration is working correctly!

System Information:
- Server: 43.229.133.51
- Node.js: $(node --version 2>/dev/null || echo "Not available in PATH")
- PM2 Status: $(pm2 describe ticket-backend-prod 2>/dev/null | grep -o "online\|stopped" || echo "Not running")

Best regards,
Patong Boxing Stadium Ticket System
EOF

# ส่งอีเมล
echo "Subject: 🧪 Gmail SMTP Test - $(date '+%Y-%m-%d %H:%M')" | \
mail -s "🧪 Gmail SMTP Configuration Test" \
-a "From: Patong Boxing Stadium <patongboxingstadiumticket@gmail.com>" \
rsdgcxym@gmail.com < /tmp/test_email_body.txt

if [ $? -eq 0 ]; then
    echo "✅ Email sent successfully via mail command"
else
    echo "❌ Failed to send email via mail command"
fi

echo
echo "🔍 Checking mail queue status..."
mailq | head -10

echo
echo "📊 Recent mail logs:"
tail -n 5 /var/log/mail.log 2>/dev/null || echo "Mail log not accessible"

echo
echo "📱 PM2 Application Status:"
pm2 describe ticket-backend-prod 2>/dev/null | grep -E "(status|restart|cpu|memory)" || echo "PM2 info not available"

echo
echo "✅ Gmail SMTP test completed!"
echo "📧 Please check inbox: rsdgcxym@gmail.com"
echo "🔍 For detailed logs: pm2 logs ticket-backend-prod"

# ทำความสะอาด
rm -f /tmp/test_email_body.txt
