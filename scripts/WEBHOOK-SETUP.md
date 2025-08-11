# 🔗 Auto-Deployment Webhook Setup Guide

## Overview
ระบบ auto-deployment จะทำงานเมื่อมีการ push code ไปยัง repository โดยอัตโนมัติ

## Components Created

### 1. Webhook Endpoint
- **URL:** `https://yourdomain.com/webhook/deploy`
- **Method:** POST
- **Purpose:** รับ webhook จาก GitHub/GitLab

### 2. Webhook Handler Script
- **File:** `scripts/webhook-deploy.sh`
- **Purpose:** ทำ auto-deployment เมื่อได้รับ webhook

### 3. NestJS Controller
- **File:** `src/webhook/webhook.controller.ts`
- **Routes:**
  - `POST /webhook/deploy` - รับ webhook และ trigger deployment
  - `POST /webhook/test` - ทดสอบ webhook endpoint

## Setup Instructions

### 1. บน VPS (Production Server)

```bash
# ไปที่ project directory
cd /var/www/backend/ticket-backend

# Pull โค้ดล่าสุดที่มี webhook
git pull origin feature/newfunction

# ให้ permission กับ scripts
chmod +x scripts/*.sh

# Deploy ครั้งแรกเพื่อเปิด webhook endpoint
./scripts/deploy.sh full

# ตรวจสอบว่า webhook endpoint ทำงาน
curl -X POST http://localhost:4000/webhook/test
```

### 2. GitHub Webhook Setup

1. ไปที่ GitHub repository settings
2. เลือก "Webhooks" → "Add webhook"
3. กรอกข้อมูล:
   - **Payload URL:** `https://yourdomain.com/webhook/deploy`
   - **Content type:** `application/json`
   - **Which events:** เลือก "Just the push event"
   - **Active:** ✅ เช็คให้เปิดใช้งาน

### 3. GitLab Webhook Setup (ถ้าใช้ GitLab)

1. ไปที่ Project Settings → Webhooks
2. กรอกข้อมูล:
   - **URL:** `https://yourdomain.com/webhook/deploy`
   - **Trigger:** เลือก "Push events"
   - **Branch filter:** `feature/newfunction`

## How It Works

### การทำงานของระบบ:

1. **Developer push code** → GitHub/GitLab
2. **GitHub/GitLab ส่ง webhook** → `POST /webhook/deploy`
3. **NestJS รับ webhook** → ตรวจสอบ branch และ payload
4. **Execute deployment script** → `scripts/webhook-deploy.sh`
5. **Auto-deployment** → `git pull` + `build` + `restart`
6. **Discord notification** → แจ้งผลการ deploy

### Process Flow:
```
Code Push → Webhook → Validation → Auto-Deploy → Notification
```

## Testing

### ทดสอบ webhook endpoint:
```bash
# Test endpoint
curl -X POST http://localhost:4000/webhook/test

# Test deployment webhook (manual)
curl -X POST http://localhost:4000/webhook/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repository": {"name": "ticket-backend"},
    "ref": "refs/heads/feature/newfunction",
    "commits": [{"id": "test"}]
  }'
```

## Security Notes

1. **Branch Protection:** ระบบจะ deploy เฉพาะจาก branch `feature/newfunction` เท่านั้น
2. **Payload Validation:** ตรวจสอบ payload format ก่อนทำ deployment
3. **Error Handling:** มี error handling และ notification เมื่อ deploy ล้มเหลว

## Logs & Monitoring

### ดู logs:
```bash
# Application logs
./scripts/manage.sh logs

# PM2 logs
pm2 logs ticket-backend-prod

# System logs
journalctl -u your-app-service
```

### Monitor deployment:
- Discord notifications จะแจ้งผลการ deploy
- Health check จะตรวจสอบว่าแอพทำงานปกติหรือไม่

## Troubleshooting

### หาก auto-deployment ไม่ทำงาน:

1. **ตรวจสอบ webhook endpoint:**
   ```bash
   curl -X POST http://localhost:4000/webhook/test
   ```

2. **ตรวจสอบ script permissions:**
   ```bash
   ls -la scripts/webhook-deploy.sh
   # ต้องมี execute permission (x)
   ```

3. **ตรวจสอบ application logs:**
   ```bash
   ./scripts/manage.sh logs
   ```

4. **Manual deployment สำรองเมื่อ webhook ล้มเหลว:**
   ```bash
   ./scripts/deploy.sh quick
   ```

## Benefits

✅ **Auto-deployment** - ไม่ต้อง manual deploy ทุกครั้ง  
✅ **Fast deployment** - ใช้ quick deployment mode  
✅ **Branch protection** - deploy เฉพาะ branch ที่กำหนด  
✅ **Notifications** - แจ้งผลผ่าน Discord  
✅ **Error handling** - จัดการ error และ rollback ได้  
✅ **Health checks** - ตรวจสอบสถานะหลัง deploy  

พอ push code ครั้งหน้า ระบบจะ auto-deploy ให้เลย! 🚀
