#!/bin/bash
# Clean Reset nginx และติดตั้งใหม่ทั้งหมด
# Author: GitHub Copilot - Fresh Clean Install
# Date: 2025-08-16

set -e

echo "🧹 กำลังล้าง nginx และตั้งค่าใหม่ทั้งหมด..."

# Step 1: หยุดและลบ nginx ทั้งหมด
echo "🛑 หยุด nginx และลบการตั้งค่าเก่า..."
systemctl stop nginx || true
apt remove --purge nginx nginx-common nginx-core -y || true
apt autoremove -y

# Step 2: ลบไฟล์ config ทั้งหมด
echo "🗑️ ลบไฟล์ configuration ทั้งหมด..."
rm -rf /etc/nginx
rm -rf /var/log/nginx
rm -rf /var/lib/nginx
rm -rf /usr/share/nginx

# Step 3: ล้าง certbot (ถ้ามี)
echo "🔐 ล้าง SSL certificates เก่า..."
systemctl stop certbot.timer || true
apt remove --purge certbot python3-certbot-nginx -y || true
rm -rf /etc/letsencrypt
rm -rf /var/lib/letsencrypt

# Step 4: ติดตั้ง nginx ใหม่
echo "📦 ติดตั้ง nginx ใหม่..."
apt update
apt install -y nginx

# Step 5: สร้าง config หลักที่เรียบง่าย
echo "⚙️ สร้าง configuration ใหม่..."
cat > /etc/nginx/sites-available/patong << 'EOF'
server {
    listen 80;
    server_name patongboxingstadiumticket.com www.patongboxingstadiumticket.com api.patongboxingstadiumticket.com app.patongboxingstadiumticket.com admin.patongboxingstadiumticket.com;

    # Logs
    access_log /var/log/nginx/patong.access.log;
    error_log /var/log/nginx/patong.error.log;

    # Basic security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Block sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~* \.(env|log|ini|conf|bak)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Step 6: ลบ default site และเปิดใช้ site ใหม่
rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/patong /etc/nginx/sites-enabled/patong

# Step 7: ตั้งค่า UFW firewall (ถ้ายังไม่มี)
echo "🔥 ตั้งค่า firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Step 8: ติดตั้ง fail2ban
echo "🛡️ ติดตั้ง fail2ban..."
apt install -y fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Step 9: ทดสอบ nginx
echo "🧪 ทดสอบ nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ nginx configuration ถูกต้อง!"
    systemctl enable nginx
    systemctl start nginx
    systemctl status nginx --no-pager
else
    echo "❌ nginx configuration ผิด! กำลังแก้ไข..."
    exit 1
fi

# Step 10: ติดตั้ง certbot
echo "🔐 ติดตั้ง SSL certificate..."
apt install -y certbot python3-certbot-nginx

# ทดสอบการเชื่อมต่อ
echo "🧪 ทดสอบการเชื่อมต่อ..."
echo "HTTP test:"
curl -I http://localhost || echo "HTTP ยังไม่ทำงาน - ตรวจสอบ Node app"

echo ""
echo "✅ ติดตั้งเสร็จสิ้น!"
echo ""
echo "📋 ขั้นตอนถัดไป:"
echo "1. ตรวจสอบ Node app รันที่ port 4000:"
echo "   curl -I http://127.0.0.1:4000"
echo ""
echo "2. ขอ SSL certificate:"
echo "   sudo certbot --nginx -d patongboxingstadiumticket.com -d www.patongboxingstadiumticket.com -d api.patongboxingstadiumticket.com"
echo ""
echo "3. ทดสอบโดเมน:"
echo "   curl -I http://patongboxingstadiumticket.com"
echo "   curl -I https://patongboxingstadiumticket.com"
echo ""
echo "🔒 ระบบความปลอดภัย:"
echo "- UFW Firewall: ✅ เปิดแล้ว"
echo "- fail2ban: ✅ เปิดแล้ว" 
echo "- nginx security headers: ✅"
echo "- SSL ready: ✅ (รอ certbot)"
EOF
