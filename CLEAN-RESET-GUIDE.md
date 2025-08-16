# Quick Commands - ล้างและติดตั้งใหม่

## 🧹 วิธีล้าง nginx ทั้งหมดและติดตั้งใหม่

### ขั้นที่ 1: อัปโหลดสคริปต์
```bash
# บนเครื่องคุณ
scp clean-reset-nginx.sh root@43.229.133.51:/root/
```

### ขั้นที่ 2: รันสคริปต์ล้างและติดตั้งใหม่
```bash
# SSH ไปเซิร์ฟเวอร์
ssh root@43.229.133.51

# ให้สิทธิ์และรัน
chmod +x clean-reset-nginx.sh
./clean-reset-nginx.sh
```

### ขั้นที่ 3: ตรวจสอบ Node app
```bash
# ตรวจว่า Node app ยังรันอยู่ที่ port 4000
curl -I http://127.0.0.1:4000

# ถ้าไม่รัน ให้สตาร์ทใหม่
pm2 restart all
# หรือ
cd /var/www/patong-boxing/backend
pm2 start dist/main.js --name patong-api
```

### ขั้นที่ 4: ขอ SSL Certificate
```bash
sudo certbot --nginx \
  -d patongboxingstadiumticket.com \
  -d www.patongboxingstadiumticket.com \
  -d api.patongboxingstadiumticket.com \
  -d app.patongboxingstadiumticket.com \
  --email rsdgcxym@gmail.com \
  --non-interactive --agree-tos
```

### ขั้นที่ 5: ทดสอบ
```bash
# ทดสอบ HTTP
curl -I http://patongboxingstadiumticket.com

# ทดสอบ HTTPS
curl -I https://patongboxingstadiumticket.com

# ทดสอบ API
curl -I https://api.patongboxingstadiumticket.com

# ดู nginx status
systemctl status nginx
```

## ✅ สิ่งที่สคริปต์จะทำ

### ลิซ:
- ✅ ลบ nginx เก่าทั้งหมด
- ✅ ลบ config files ทั้งหมด  
- ✅ ลบ SSL certificates เก่า
- ✅ ลบ logs เก่า

### สร้างใหม่:
- ✅ ติดตั้ง nginx ใหม่
- ✅ สร้าง config ที่เรียบง่ายและปลอดภัย
- ✅ ตั้งค่า UFW firewall
- ✅ ติดตั้ง fail2ban
- ✅ พร้อมติดตั้ง SSL

## 🔒 Features ความปลอดภัย

- **nginx reverse proxy**: ป้องกัน direct access ไปยัง Node
- **Security headers**: XSS, CSRF, Clickjacking protection  
- **UFW firewall**: เปิดเฉพาะ port 22, 80, 443
- **fail2ban**: ป้องกัน brute force attacks
- **SSL ready**: พร้อมติดตั้ง Let's Encrypt

## ⏱️ เวลาที่ใช้
- รันสคริปต์: 3-5 นาที
- ขอ SSL: 1-2 นาที  
- **รวม: 5-7 นาที**

## 🚨 ข้อควรระวัง
- สคริปต์นี้จะลบ nginx และ SSL certificates เก่าทั้งหมด
- ต้องขอ SSL certificate ใหม่หลังรันสคริปต์
- ควรแน่ใจว่า Node app รันที่ port 4000

## 📞 ถ้ามีปัญหา

### Node app ไม่รัน:
```bash
pm2 list
pm2 restart all
```

### nginx ไม่สตาร์ท:
```bash
sudo nginx -t
sudo systemctl status nginx
```

### SSL ไม่ได้:
```bash
sudo certbot certificates
sudo certbot --nginx --dry-run -d patongboxingstadiumticket.com
```
