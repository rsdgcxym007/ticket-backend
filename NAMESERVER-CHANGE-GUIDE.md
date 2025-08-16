# Quick Action Guide - เปลี่ยน Nameservers

## 🎯 Cloudflare Nameservers ที่ต้องใช้
```
damon.ns.cloudflare.com
gracie.ns.cloudflare.com  
```

## 🔄 ขั้นตอนเปลี่ยน (ทำเลย!)

### 1. เข้าไปใน Domain Registrar Panel
- ไปที่เว็บไซต์ผู้ขายโดเมน (ReadyIDC/OpenProvider หรือที่ซื้อ)
- Login เข้าบัญชี
- หา domain: patongboxingstadiumticket.com

### 2. หาส่วน Nameserver Settings  
มองหา:
- "Nameservers"
- "DNS Settings" 
- "Domain Management"
- "Authoritative DNS"

### 3. เปลี่ยน Nameservers
**ลบเก่า:**
```
ns11.readyidc.com
ns12.readyidc.com
ns13.readyidc.com  
ns14.readyidc.com
```

**ใส่ใหม่:**
```
damon.ns.cloudflare.com
gracie.ns.cloudflare.com
```

### 4. Save และรอ
- คลิก "Save Changes" หรือ "Update"
- รอ propagation 15-30 นาที

## 🧪 ตรวจสอบความสำเร็จ

### คำสั่งตรวจสอบ (รันทุก 10 นาที)
```bash
# ตรวจ nameservers
dig NS patongboxingstadiumticket.com

# ตรวจ A records  
dig A patongboxingstadiumticket.com
dig A api.patongboxingstadiumticket.com

# ทดสอบ HTTP/HTTPS
curl -I http://patongboxingstadiumticket.com
curl -I https://patongboxingstadiumticket.com
```

### ผลลัพธ์ที่ต้องการ
```bash
# dig NS ควรได้:
damon.ns.cloudflare.com.
gracie.ns.cloudflare.com.

# dig A ควรได้:
104.21.x.x (Cloudflare IP)
172.67.x.x (Cloudflare IP)

# curl ควรได้:
HTTP/1.1 200 OK
server: cloudflare
```

## ⏱️ Timeline หลังเปลี่ยน NS

- **0-5 นาที:** อาจยังไม่เปลี่ยน
- **5-15 นาที:** เริ่มเห็น Cloudflare nameservers
- **15-30 นาที:** A records เริ่มชี้ไป Cloudflare IP
- **30+ นาที:** ทำงานเต็มรูปแบบ

## 🎯 หลัง DNS ทำงานแล้ว

### 1. ทดสอบโดเมน
```bash
curl -I https://patongboxingstadiumticket.com
curl -I https://api.patongboxingstadiumticket.com  
curl -I https://www.patongboxingstadiumticket.com
```

### 2. ตั้งค่า MX Records สำหรับ Email
ใน Cloudflare Dashboard → DNS → Add record:
```
Type: MX
Name: @  
Content: ASPMX.L.GOOGLE.COM
Priority: 1
```

### 3. รันสคริปต์ติดตั้งอีเมล
```bash
scp setup-email.sh root@43.229.133.51:/root/
ssh root@43.229.133.51
./setup-email.sh
```

## 🚨 ถ้ามีปัญหา

### NS ไม่เปลี่ยน
- ตรวจว่า Save แล้ว
- ลองใช้ online DNS checker: https://dnschecker.org
- อาจใช้เวลามากกว่า 30 นาที

### A records ยังไม่ชี้ Cloudflare
- รอเพิ่มอีก 15-30 นาที
- ตรวจใน Cloudflare Dashboard ว่า records ยังอยู่

### HTTPS ไม่ทำงาน  
- ใน Cloudflare → SSL/TLS → เลือก "Full (strict)"
- รอ SSL certificate provision (5-10 นาที)

## 📞 Contact

ถ้าติดปัญหา:
1. โพสต์ผล `dig NS patongboxingstadiumticket.com` 
2. โพสต์ screenshot จาก registrar panel
3. บอกเวลาที่เปลี่ยน NS
