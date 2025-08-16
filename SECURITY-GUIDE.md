# Production Server Security Checklist
# ปลอดภัยสุดสำหรับ Production Environment

## 🔐 Level 1: Basic Security (จำเป็น)
- [ ] nginx reverse proxy (ป้องกัน direct access ไปยัง Node)
- [ ] UFW firewall เปิดเฉพาะ 22/80/443
- [ ] fail2ban ป้องกัน brute force
- [ ] Let's Encrypt SSL certificate
- [ ] Security headers (XSS, CSRF, etc.)

## 🛡️ Level 2: Advanced Security (แนะนำสำหรับ Production)
- [ ] Non-root user สำหรับ Node app
- [ ] Rate limiting (API endpoints)
- [ ] Log monitoring
- [ ] Regular security updates
- [ ] Backup strategy

## 🚨 Level 3: Maximum Security (Enterprise level)
- [ ] WAF (Web Application Firewall)
- [ ] DDoS protection (Cloudflare)
- [ ] Security scanning & monitoring
- [ ] Intrusion detection system
- [ ] Database connection pooling + encryption

## วิธีรันสคริปต์

### ขั้นที่ 1: อัปโหลดสคริปต์ไปเซิร์ฟเวอร์
```bash
# บนเครื่องของคุณ
scp server-security-setup.sh root@43.229.133.51:/root/
```

### ขั้นที่ 2: รันสคริปต์บนเซิร์ฟเวอร์
```bash
# SSH ไปเซิร์ฟเวอร์
ssh root@43.229.133.51

# ให้สิทธิ์ execute
chmod +x server-security-setup.sh

# รันสคริปต์ (ใช้เวลาประมาณ 5-10 นาที)
./server-security-setup.sh
```

### ขั้นที่ 3: ตั้งค่า SSL Certificate
```bash
# หลังรันสคริปต์เสร็จแล้ว
sudo certbot --nginx \
  -d patongboxingstadiumticket.com \
  -d www.patongboxingstadiumticket.com \
  -d api.patongboxingstadiumticket.com \
  -d app.patongboxingstadiumticket.com \
  -d admin.patongboxingstadiumticket.com
```

### ขั้นที่ 4: ย้าย Node app ไปใช้ user ที่ปลอดภัย
```bash
# สร้าง nodeapp user และย้าย app
sudo su - nodeapp
npm install -g pm2

# ย้ายไฟล์ app (ถ้าจำเป็น)
sudo cp -r /var/www/patong-boxing /home/nodeapp/
sudo chown -R nodeapp:nodeapp /home/nodeapp/patong-boxing

# รัน PM2 ใหม่
pm2 start /home/nodeapp/patong-boxing/backend/dist/main.js --name patong-api
pm2 save
pm2 startup
```

## ทำไมวิธีนี้ปลอดภัยสุด?

### 1. **Defense in Depth** (การป้องกันหลายชั้น)
- Firewall → nginx → Rate Limiting → Node App
- แต่ละชั้นป้องกันแบบต่างกัน

### 2. **Principle of Least Privilege**
- Node app ไม่รันเป็น root
- เปิดเฉพาะพอร์ตที่จำเป็น

### 3. **Security Headers & SSL**
- ป้องกัน XSS, CSRF, Clickjacking
- HTTPS บังคับทั้งหมด

### 4. **Monitoring & Logging**
- fail2ban ตรวจจับการโจมตี
- nginx logs สำหรับ audit

### 5. **Rate Limiting**
- ป้องกัน DDoS และ API abuse
- แยก limit สำหรับ login endpoints

## การทดสอบความปลอดภัย

```bash
# ทดสอบพอร์ตที่เปิด
nmap -sS 43.229.133.51

# ทดสอบ SSL
curl -I https://patongboxingstadiumticket.com

# ทดสอบ security headers
curl -I https://api.patongboxingstadiumticket.com

# ทดสอบ rate limiting
for i in {1..20}; do curl https://patongboxingstadiumticket.com/api/login; done
```

## ⚠️ หลังติดตั้งแล้ว
1. เปลี่ยน SSH port (ไม่ใช่ 22)
2. ตั้งค่า SSH key-based authentication
3. ปิด password authentication
4. ตั้งค่า auto-update สำหรับ security patches
5. สำรองข้อมูลสม่ำเสมอ
