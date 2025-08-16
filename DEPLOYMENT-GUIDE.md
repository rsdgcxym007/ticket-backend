# 🥊 Patong Boxing Stadium - Complete Deployment Scripts

สคริปต์ครบวงจรสำหรับการ Deploy ระบบ Patong Boxing Stadium ticket booking system แบบ Production-Ready

## 📋 Overview

ระบบนี้ประกอบด้วย:
- **Backend API**: NestJS + TypeScript
- **Database**: PostgreSQL + Redis  
- **Web Server**: Nginx with SSL
- **Process Manager**: PM2
- **Security**: UFW + Fail2ban
- **Email**: SendGrid + SMTP fallback
- **Monitoring**: Discord alerts + Health checks
- **Auto-Deploy**: GitHub webhook integration

## 🚀 Quick Start (One Command)

```bash
# รันสคริปต์หลักที่ทำทุกอย่าง
sudo ./master-deployment.sh
```

สคริปต์หลักจะทำงานตามลำดับ:
1. 🧹 ลบโปรเจ็คเก่าทั้งหมด
2. 🏗️ ติดตั้งระบบใหม่ทั้งหมด  
3. 📧 ตั้งค่าระบบ Email
4. 🔍 ตรวจสอบสถานะระบบ

## 📂 Scripts Available

### 1. `master-deployment.sh` - สคริปต์หลัก
รันทุกอย่างในคำสั่งเดียว (แนะนำ)

### 2. `complete-deployment-setup.sh` - ติดตั้งระบบใหม่
- ติดตั้ง Node.js, PostgreSQL, Redis, Nginx
- ตั้งค่า SSL certificates
- สร้าง PM2 processes
- ตั้งค่า monitoring และ webhooks

### 3. `complete-project-cleanup.sh` - ลบโปรเจ็คเก่า
- หยุด PM2 processes
- ลบ databases และ configurations
- รีเซ็ต Nginx และ security settings

### 4. `setup-email-complete.sh` - ตั้งค่า Email
- ติดตั้ง SendGrid + SMTP
- สร้าง email templates
- ตั้งค่า test endpoints

### 5. Legacy Scripts
- `build-and-deploy.sh` - สำหรับ update อย่างเดียว
- `server-security-setup.sh` - ตั้งค่า security  
- `setup-email.sh` - ตั้งค่า email แบบเก่า

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Database
DATABASE_URL="postgresql://patonguser:strongpassword123@localhost:5432/patongdb"
REDIS_URL="redis://localhost:6379"

# Email
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@patongboxingstadiumticket.com
SMTP_USER=your-email@patongboxingstadiumticket.com  
SMTP_PASS=your-app-password

# Discord Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l
```

### Domain Structure
- **Main**: `patongboxingstadiumticket.com`
- **API**: `api.patongboxingstadiumticket.com`  
- **App**: `app.patongboxingstadiumticket.com`
- **Admin**: `admin.patongboxingstadiumticket.com`

## 🌐 URLs After Deployment

```
Main Site:  https://patongboxingstadiumticket.com
API Server: https://api.patongboxingstadiumticket.com  
App Portal: https://app.patongboxingstadiumticket.com
Admin Panel: https://admin.patongboxingstadiumticket.com

Health Check: https://api.patongboxingstadiumticket.com/health
Email Test:   https://api.patongboxingstadiumticket.com/test/email/health
Webhook URL:  http://43.229.133.51:4200/hooks/deploy-backend-master
```

## 📊 Monitoring & Alerts

### Discord Notifications
- Deployment status (start/success/fail)
- Server health alerts  
- Auto-deployment notifications
- Service failure alerts

### Health Monitoring
- ตรวจสอบทุก 5 นาที
- Alert เมื่อ disk > 90%
- Alert เมื่อ memory > 90%  
- Alert เมื่อ services หยุดทำงาน

### Log Files
```
/var/log/patong-deployment.log  - สคริปต์ deployment
/var/log/pm2/                   - Application logs
/var/log/webhook-deploy.log     - Auto-deployment logs
```

## 🚀 Auto-Deployment Setup

### 1. GitHub Webhook Configuration
Repository → Settings → Webhooks → Add webhook:

```
Payload URL: http://43.229.133.51:4200/hooks/deploy-backend-master
Content type: application/json  
Secret: your-webhook-secret-here
Events: Push events (master branch only)
```

### 2. How Auto-Deploy Works
1. Push ไปที่ `master` branch
2. GitHub ส่ง webhook ไป server
3. Server pull code ใหม่
4. Install dependencies และ build
5. Restart PM2 processes  
6. ตรวจสอบ health check
7. ส่ง notification ไป Discord

## 🔐 Security Features

### Firewall (UFW)
- Allow SSH (22)
- Allow HTTP/HTTPS (80/443)
- Deny all other incoming connections

### Fail2ban
- SSH protection (3 failed attempts = 1 hour ban)
- Nginx rate limiting protection
- Custom jail configurations

### SSL/TLS
- Let's Encrypt certificates for all subdomains
- Auto-renewal every 12 hours
- HTTPS redirect for all traffic

## 📧 Email System

### Supported Providers
1. **SendGrid** (Primary)
   - Production-ready
   - High deliverability
   - Analytics dashboard

2. **SMTP** (Fallback)  
   - Gmail/custom SMTP
   - Backup when SendGrid fails

### Email Templates
- `booking-confirmation.hbs` - ยืนยันการจอง
- `payment-success.hbs` - ชำระเงินสำเร็จ
- `event-reminder.hbs` - แจ้งเตือนก่อนงาน
- `welcome.hbs` - ต้อนรับสมาชิกใหม่
- `password-reset.hbs` - รีเซ็ตรหัสผ่าน

### Test Endpoints
```bash
# Test email system
curl http://localhost:3000/test/email/health

# Send test booking confirmation  
curl -X POST http://localhost:3000/test/email/booking-confirmation \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","customerName":"Test User"}'
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Services Not Starting
```bash
# Check service status
systemctl status nginx postgresql redis-server

# Restart services  
systemctl restart nginx postgresql redis-server
```

#### 2. PM2 Process Issues
```bash
# Check PM2 status
sudo -u nodeapp pm2 list

# Restart all processes
sudo -u nodeapp pm2 restart all

# Check logs
sudo -u nodeapp pm2 logs
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew certificates
certbot renew

# Test nginx config
nginx -t
```

#### 4. Database Connection Issues  
```bash
# Check PostgreSQL status
systemctl status postgresql

# Connect to database
sudo -u postgres psql -d patongdb
```

### Log Analysis
```bash
# Deployment logs
tail -f /var/log/patong-deployment.log

# Application logs  
tail -f /var/log/pm2/patong-boxing-api.log

# Nginx logs
tail -f /var/log/nginx/error.log
```

## 🧪 Testing After Deployment

### 1. Health Checks
```bash
# API health
curl https://api.patongboxingstadiumticket.com/health

# Database connection
curl https://api.patongboxingstadiumticket.com/api/health/db

# Redis connection  
curl https://api.patongboxingstadiumticket.com/api/health/redis
```

### 2. Email Testing
```bash
# Email system health
curl https://api.patongboxingstadiumticket.com/test/email/health

# Send test email
curl -X POST https://api.patongboxingstadiumticket.com/test/email/welcome \
  -H 'Content-Type: application/json' \
  -d '{"email":"your-email@example.com","customerName":"Test User"}'
```

### 3. Load Testing (Optional)
```bash
# Install Apache bench
apt install apache2-utils

# Test API performance
ab -n 1000 -c 10 https://api.patongboxingstadiumticket.com/health
```

## 📱 Mobile & Frontend Setup

หลังจากตั้งค่า backend แล้ว คุณสามารถ:

1. Deploy frontend applications ไปที่:
   - `/var/www/patong-boxing-frontend` (main site)
   - `/var/www/patong-boxing-app` (mobile app)  
   - `/var/www/patong-boxing-admin` (admin panel)

2. Update API endpoints ใน frontend ให้ชี้ไปที่:
   - `https://api.patongboxingstadiumticket.com`

## 🔄 Maintenance

### Regular Tasks
- ตรวจสอบ disk space
- Update system packages  
- Backup database
- Monitor application performance
- Review security logs

### Monthly Tasks  
- Rotate log files
- Update dependencies
- Review SSL certificate expiry
- Performance optimization

## 📞 Support & Contact

- **Discord Alerts**: Configured for immediate notifications
- **Logs**: Available in `/var/log/` directories  
- **Monitoring**: Auto health checks every 5 minutes
- **Backup**: Created automatically before any major changes

---

## 🎯 Success Indicators

After running the master deployment script, you should see:

✅ All services running (nginx, postgresql, redis, fail2ban)  
✅ Application responding at https://api.patongboxingstadiumticket.com/health  
✅ PM2 processes online  
✅ SSL certificates installed  
✅ Discord notifications working  
✅ Auto-deployment webhook active  
✅ Email system functional  

**🎊 Your Patong Boxing Stadium ticketing system is now ready for production!**
