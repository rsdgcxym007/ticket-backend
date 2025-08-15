# SSL Certificate Troubleshooting Guide
# สำหรับ patongboxingstadiumticket.com

## 🔍 ปัญหาที่พบบ่อยและวิธีแก้ไข

### 1. DNS ยังไม่ propagate เต็มที่

**ตรวจสอบ DNS:**
```bash
# ตรวจสอบ A record
nslookup patongboxingstadiumticket.com
nslookup api-patongboxingstadiumticket.com

# ตรวจสอบจากหลายๆ server
dig @8.8.8.8 patongboxingstadiumticket.com
dig @1.1.1.1 api-patongboxingstadiumticket.com
```

**แก้ไข:** รอ DNS propagate 24-48 ชั่วโมง หรือใช้ Cloudflare DNS เพื่อเร่งการ propagate

### 2. Port 80/443 ถูกบล็อค

**ตรวจสอบ Firewall:**
```bash
# ตรวจสอบ ports
sudo ufw status
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# เปิด ports
sudo ufw allow 80
sudo ufw allow 443
sudo ufw reload
```

### 3. Nginx ไม่ได้ติดตั้งหรือหยุดทำงาน

**ติดตั้งและเริ่ม Nginx:**
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 4. วิธีติดตั้ง SSL แบบ Manual (ถ้า Script ไม่ได้)

**Option 1: ติดตั้งทีละ Domain**
```bash
# ติดตั้ง Certbot
sudo apt install certbot python3-certbot-nginx -y

# หยุด Nginx ชั่วคราว
sudo systemctl stop nginx

# สร้าง certificate สำหรับ main domain
sudo certbot certonly --standalone \
  -d patongboxingstadiumticket.com \
  -d www.patongboxingstadiumticket.com \
  --email info@patongboxingstadiumticket.com \
  --agree-tos \
  --non-interactive

# สร้าง certificate สำหรับ API domain
sudo certbot certonly --standalone \
  -d api-patongboxingstadiumticket.com \
  --email info@patongboxingstadiumticket.com \
  --agree-tos \
  --non-interactive

# เริ่ม Nginx อีกครั้ง
sudo systemctl start nginx
```

**Option 2: ใช้ Nginx Plugin**
```bash
# ถ้า Nginx ทำงานอยู่แล้ว
sudo certbot --nginx \
  -d patongboxingstadiumticket.com \
  -d www.patongboxingstadiumticket.com \
  -d api-patongboxingstadiumticket.com \
  --email info@patongboxingstadiumticket.com \
  --agree-tos \
  --non-interactive
```

### 5. การสร้าง Nginx Configuration แบบ Manual

**สร้างไฟล์ config สำหรับ main domain:**
```bash
sudo nano /etc/nginx/sites-available/patongboxingstadiumticket.com
```

**เนื้อหาไฟล์:**
```nginx
server {
    listen 80;
    server_name patongboxingstadiumticket.com www.patongboxingstadiumticket.com;
    return 301 https://patongboxingstadiumticket.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name patongboxingstadiumticket.com www.patongboxingstadiumticket.com;

    ssl_certificate /etc/letsencrypt/live/patongboxingstadiumticket.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/patongboxingstadiumticket.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /var/www/patongboxingstadiumticket.com;
    index index.html;

    location / {
        try_files $uri $uri/ @fallback;
    }

    location @fallback {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**สร้างไฟล์ config สำหรับ API domain:**
```bash
sudo nano /etc/nginx/sites-available/api-patongboxingstadiumticket.com
```

**เนื้อหาไฟล์:**
```nginx
server {
    listen 80;
    server_name api-patongboxingstadiumticket.com;
    return 301 https://api-patongboxingstadiumticket.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api-patongboxingstadiumticket.com;

    ssl_certificate /etc/letsencrypt/live/api-patongboxingstadiumticket.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api-patongboxingstadiumticket.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    add_header Access-Control-Allow-Origin "https://patongboxingstadiumticket.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;

    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://patongboxingstadiumticket.com";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Content-Length 0;
            return 204;
        }

        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
```

**เปิดใช้งาน sites:**
```bash
sudo ln -sf /etc/nginx/sites-available/patongboxingstadiumticket.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api-patongboxingstadiumticket.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6. การตรวจสอบหลังติดตั้ง SSL

```bash
# ตรวจสอบ certificate
sudo certbot certificates

# ตรวจสอบ expiry date
openssl x509 -in /etc/letsencrypt/live/patongboxingstadiumticket.com/fullchain.pem -text -noout | grep "Not After"

# ทดสอบ HTTPS
curl -I https://patongboxingstadiumticket.com
curl -I https://api-patongboxingstadiumticket.com/health

# ตรวจสอบ SSL rating
https://www.ssllabs.com/ssltest/analyze.html?d=patongboxingstadiumticket.com
```

### 7. Auto-renewal Setup

```bash
# เพิ่ม cron job สำหรับ auto-renewal
sudo crontab -e

# เพิ่มบรรทัดนี้
0 12 * * * /usr/bin/certbot renew --quiet --nginx

# ทดสอบ renewal
sudo certbot renew --dry-run
```

### 8. การ Debug ปัญหา

**ดู logs:**
```bash
# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# System logs
sudo journalctl -u nginx -f
```

**ตรวจสอบ services:**
```bash
sudo systemctl status nginx
sudo systemctl status certbot.timer
pm2 status
```

## 🚨 หากยังไม่สามารถติดตั้ง SSL ได้

### ทางเลือกที่ 1: ใช้ Cloudflare SSL
1. เข้า Cloudflare และเพิ่ม domain
2. เปลี่ยน nameservers ตาม Cloudflare
3. เปิดใช้งาน SSL/TLS (Full Strict)
4. ไม่ต้องติดตั้ง Let's Encrypt บนเซิร์ฟเวอร์

### ทางเลือกที่ 2: ใช้ Self-signed Certificate (สำหรับทดสอบ)
```bash
# สร้าง self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/patong.key \
  -out /etc/ssl/certs/patong.crt \
  -subj "/C=TH/ST=Phuket/L=Patong/O=PatongBoxingStadium/CN=patongboxingstadiumticket.com"

# อัปเดต Nginx config ให้ใช้ certificate นี้
ssl_certificate /etc/ssl/certs/patong.crt;
ssl_certificate_key /etc/ssl/private/patong.key;
```

### ทางเลือกที่ 3: ชั่วคราวใช้ HTTP
```bash
# แก้ไข Nginx config ให้ใช้ HTTP ก่อน
# แล้วติดตั้ง SSL ทีหลัง
```

## 📞 ติดต่อขอความช่วยเหลือ

หากยังมีปัญหา สามารถ:
1. ดู logs และส่งมาเพื่อ debug
2. ใช้ command `sudo certbot --help` เพื่อดู options เพิ่มเติม
3. ตรวจสอบ DNS propagation ที่ https://dnschecker.org
