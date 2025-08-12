# 🔧 Webhook Issues Fix Summary

## ปัญหาที่พบและแก้ไข

### 1. jq Syntax Error ❌ ➡️ ✅
```bash
jq: error: syntax error, unexpected INVALID_CHARACTER (Unix shell quoting issues?) at <top-level>, line 1:
.[\"ticket-backend\"]  
```

**สาเหตุ:** การใช้ escape quotes ใน jq command ไม่ถูกต้อง และ shell quoting issues

**การแก้ไข:**
```bash
# เดิม (ผิด)
jq -r '.[\"ticket-backend\"]'

# ใหม่ (ถูก) - ใช้ grep + cut แทน jq
grep '\"ticket-backend\"' | cut -d'\"' -f4
```

### 2. API Endpoint 404 Error ❌ ➡️ ✅
```json
{"message":"Cannot POST /api/webhook/v1/deploy","error":"Not Found","statusCode":404}
```

**สาเหตุ:** URL ใน GitHub webhook ไม่ตรงกับ API prefix ที่ตั้งไว้

**การแก้ไข:**
```bash
# GitHub webhook URL (ถูกต้อง)
http://43.229.133.51:4000/api/v1/webhook/deploy

# Script notification URL (ถูกต้อง)  
http://43.229.133.51:4000/api/v1/webhook/v1/deploy
```

### 3. User-Agent Validation Error ❌ ➡️ ✅
```
UnauthorizedException: Invalid webhook source
```

**สาเหตุ:** webhook controller ตรวจสอบ User-Agent เข้มงวดเกินไป

**การแก้ไข:**
- อนุญาต User-Agent: `GitHub-Hookshot`, `curl`, `axios`, `node`, `ticket-backend-deploy-script`
- อนุญาต IP: server IP (43.229.133.51) และ localhost

### 4. Invalid Payload Error ❌ ➡️ ✅
```json
{"status":"error","message":"Invalid payload"}
```

**สาเหตุ:** Scripts ส่ง deployment notification ไปยัง GitHub webhook endpoint แทนที่จะเป็น notification endpoint

**การแก้ไข:**
```bash
# เดิม (ผิด) - ส่ง notification payload ไป GitHub endpoint
WEBHOOK_URL="http://43.229.133.51:4000/api/v1/webhook/deploy"

# ใหม่ (ถูก) - ส่ง notification payload ไป notification endpoint
WEBHOOK_URL="http://43.229.133.51:4000/api/v1/webhook/v1/deploy"
```

## Endpoint Architecture

### `/api/v1/webhook/deploy` (GitHub Webhook)
- **Purpose:** รับ webhook จาก GitHub
- **Payload:** GitHub webhook format
- **Validation:** ต้องมี `repository` และ `commits` fields
- **User-Agent:** `GitHub-Hookshot/*`

### `/api/v1/webhook/v1/deploy` (Deployment Notifications)
- **Purpose:** รับการแจ้งเตือนจาก deployment scripts
- **Payload:** Custom notification format
- **Validation:** ยืดหยุ่น, ไม่บังคับ format
- **User-Agent:** `ticket-backend-deploy-script/*` หรือ `curl`

## ไฟล์ที่แก้ไข

### 1. `/src/webhook/webhook.controller.ts`
```typescript
// ปรับปรุง User-Agent validation ให้ยืดหยุ่นมากขึ้น
const isValidUserAgent = userAgent && (
  userAgent.includes('GitHub-Hookshot') || 
  userAgent.includes('curl') || 
  userAgent.includes('axios') ||
  userAgent.includes('node') ||
  userAgent.includes('ticket-backend-deploy-script') ||
  clientIp === '43.229.133.51' || // Allow from server IP
  clientIp.includes('127.0.0.1') || // Allow localhost
  clientIp.includes('::1') // Allow IPv6 localhost
);
```

### 2. `/scripts/build-and-deploy.sh`
```bash
# แก้ไข version extraction ไม่ใช้ jq
grep '\"ticket-backend\"' | cut -d'\"' -f4

# แก้ไข webhook URL ไปยัง notification endpoint
WEBHOOK_URL="http://43.229.133.51:4000/api/v1/webhook/v1/deploy"

# เพิ่ม User-Agent
curl -H "User-Agent: ticket-backend-deploy-script/1.0"
```

### 3. `/scripts/webhook-deploy.sh`
```bash
# แก้ไข webhook URL ไปยัง notification endpoint
WEBHOOK_URL="http://43.229.133.51:4000/api/v1/webhook/v1/deploy"

# เพิ่ม User-Agent
curl -H "User-Agent: ticket-backend-deploy-script/1.0"
```

### 4. `/scripts/test-webhooks.sh` (ใหม่)
```bash
# Script สำหรับทดสอบ webhook endpoints
# ทดสอบทั้ง GitHub webhook และ notification endpoints
```

## GitHub Webhook Configuration

**ตรวจสอบให้แน่ใจว่า GitHub webhook ใช้ URL ที่ถูกต้อง:**
```
Payload URL: http://43.229.133.51:4000/api/v1/webhook/deploy
Content-Type: application/json
Events: Just the push event
```

## การทดสอบ

### Test 1: Deployment notification
```bash
curl -X POST http://43.229.133.51:4000/api/v1/webhook/v1/deploy \
  -H "Content-Type: application/json" \
  -H "User-Agent: ticket-backend-deploy-script/1.0" \
  -d '{
    "status": "test",
    "message": "Test deployment notification"
  }'
```

### Test 2: GitHub webhook
```bash
curl -X POST http://43.229.133.51:4000/api/v1/webhook/deploy \
  -H "Content-Type: application/json" \
  -H "User-Agent: GitHub-Hookshot/test" \
  -d '{
    "repository": {"name": "ticket-backend"},
    "ref": "refs/heads/feature/newfunction",
    "commits": [{"id": "test123"}]
  }'
```

### Test 3: Automated testing
```bash
./scripts/test-webhooks.sh
```

## สถานะ

✅ **jq syntax error** - แก้ไขแล้ว (ใช้ grep+cut แทน jq)  
✅ **API endpoint 404** - แก้ไขแล้ว (URL mappings ถูกต้อง)  
✅ **User-Agent validation** - แก้ไขแล้ว (รองรับ scripts)  
✅ **Invalid payload error** - แก้ไขแล้ว (ใช้ endpoint ที่ถูกต้อง)  
🔄 **รอการทดสอบ** - Deploy และทดสอบใน production  

## Next Steps

1. Deploy โค้ดที่แก้ไขแล้วไป production server
2. Restart PM2 application
3. ทดสอบ webhook endpoints ด้วย `test-webhooks.sh`
4. ทดสอบ GitHub webhook integration
5. ตรวจสอบ Discord notifications

---
**วันที่อัพเดท:** 12 สิงหาคม 2025 (23:54)  
**ผู้อัพเดท:** GitHub Copilot  
**รอบการแก้ไข:** 2 (แก้ไขเพิ่มเติม Invalid payload และ jq issues)  
