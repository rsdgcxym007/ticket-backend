# Cloudflare + Gmail Setup Guide

## 📧 ขั้นตอน 1: ทำให้โดเมนทำงาน

### A. เปลี่ยน Nameservers
1. **เข้า Cloudflare Dashboard** → DNS tab
2. **ดู "Cloudflare nameservers"** (ด้านล่าง)
3. **ไปที่ registrar (OpenProvider/ผู้ขายโดเมน)**
4. **เปลี่ยน nameservers:**
   ```
   จาก: ns1.openprovider.nl, ns2.openprovider.be, ns3.openprovider.eu  
   เป็น: ava.ns.cloudflare.com, liam.ns.cloudflare.com (ตัวอย่าง)
   ```

### B. รอ propagation และทดสอบ
```bash
# ทดสอบทุก 10 นาที
dig A patongboxingstadiumticket.com

# เมื่อได้ IP (Cloudflare IP) แปลว่าสำเร็จ
curl -I http://patongboxingstadiumticket.com
curl -I https://patongboxingstadiumticket.com  # SSL จาก Cloudflare
```

## 📧 ขั้นตอน 2: ตั้งค่า Gmail/Email

### A. ตั้งค่า MX Records ใน Cloudflare

**สำหรับ Gmail Workspace:**
```
Type: MX
Name: @
Content: ASPMX.L.GOOGLE.COM
Priority: 1

Type: MX  
Name: @
Content: ALT1.ASPMX.L.GOOGLE.COM
Priority: 5

Type: MX
Name: @  
Content: ALT2.ASPMX.L.GOOGLE.COM
Priority: 5

Type: MX
Name: @
Content: ALT3.ASPMX.L.GOOGLE.COM  
Priority: 10

Type: MX
Name: @
Content: ALT4.ASPMX.L.GOOGLE.COM
Priority: 10
```

**สำหรับส่ง email จาก Node.js app:**
```
Type: TXT
Name: @  
Content: v=spf1 include:_spf.google.com include:sendgrid.net ~all
```

### B. ตั้งค่า DKIM (ป้องกัน spam)
```
Type: TXT
Name: default._domainkey
Content: (ได้จาก Gmail Workspace หรือ SendGrid)
```

### C. ตั้งค่า DMARC
```  
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=quarantine; rua=mailto:dmarc@patongboxingstadiumticket.com
```

## 🔧 ขั้นตอน 3: ตั้งค่า Node.js ส่งอีเมล

### A. ติดตั้ง dependencies
```bash
npm install nodemailer @sendgrid/mail
```

### B. ตัวอย่างโค้ดส่งอีเมล (Nodemailer + Gmail)
```javascript
// email.service.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-app@patongboxingstadiumticket.com',
    pass: 'your-app-password'  // App password จาก Google
  }
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: '"Patong Boxing Stadium" <noreply@patongboxingstadiumticket.com>',
      to,
      subject, 
      html
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email error:', error);
  }
}
```

### C. ตัวอย่างโค้ดส่งอีเมล (SendGrid)
```javascript
// email.service.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await sgMail.send({
      to,
      from: 'noreply@patongboxingstadiumticket.com',
      subject,
      html
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email error:', error);
  }
}
```

## 📧 ขั้นตอน 4: เลือก Email Provider

### Gmail Workspace (แนะนำสำหรับธุรกิจ)
- ราคา: $6/เดือน/user
- ✅ Professional email addresses  
- ✅ 30GB storage
- ✅ Admin console
- ✅ Security features

### SendGrid (แนะนำสำหรับ transactional emails)
- ราคา: ฟรี 100 emails/วัน, $14.95/เดือนสำหรับ unlimited
- ✅ High delivery rates
- ✅ Analytics
- ✅ Templates
- ✅ API integration

### Resend (ทางเลือกใหม่)
- ราคา: ฟรี 3,000 emails/เดือน
- ✅ Developer-friendly
- ✅ Good documentation  
- ✅ React email templates

## 🧪 การทดสอบ Email

### A. ทดสอบ MX records
```bash
dig MX patongboxingstadiumticket.com
```

### B. ทดสอบส่งอีเมล
```javascript
// ใน controller หรือ service
await sendEmail(
  'test@example.com',
  'Test Email from Patong Boxing',
  '<h1>Email setup successful!</h1>'
);
```

### C. เช็คว่าเข้า spam หรือไม่
- https://mail-tester.com  
- ส่งอีเมลไปที่ spam@mail-tester.com
- ดูคะแนนและคำแนะนำ

## ⚠️ ข้อควรระวัง

1. **Cloudflare Proxy**: ถ้าใช้ Proxied ต้องเซ็ต SSL/TLS mode เป็น "Full (strict)"
2. **Email Authentication**: ต้องมี SPF, DKIM, DMARC เพื่อไม่เข้า spam
3. **Rate Limiting**: ใส่ rate limit ในการส่งอีเมลเพื่อป้องกัน abuse
4. **Email Templates**: ใช้ responsive HTML templates
5. **Unsubscribe**: ใส่ลิงก์ยกเลิกการสมัครในอีเมล marketing

## 📞 Support

### Gmail Workspace  
- Admin Console: https://admin.google.com
- Support: https://support.google.com/a

### SendGrid
- Dashboard: https://app.sendgrid.com  
- API Docs: https://docs.sendgrid.com

### Cloudflare
- Dashboard: https://dash.cloudflare.com
- DNS Docs: https://developers.cloudflare.com/dns
