# 🔧 Deployment Hanging Issue - Fix & Prevention

## ⚠️ **Problem**
Auto-deployment process ค้างอยู่ที่ status "STARTED" และไม่ส่ง completion notification:

```
🚀 Stadium Backend Deployment
[AUTO] 🤖 Auto-deployment initiated from GitHub webhook
📊 Status: STARTED
🌿 Branch: feature/newfunction
🌍 Environment: production
⏰ Timestamp: 13/8/2568 00:14:29
📝 Commit: 0e567a30
🏷️ Version: auto-deploy
```

## 🔍 **Root Causes**

1. **PM2 Restart Timeout** - PM2 restart ไม่มี timeout ทำให้ค้างได้
2. **Health Check Issues** - Health check URL หรือ timeout ไม่เหมาะสม  
3. **Missing Error Handling** - ไม่มีการจัดการเมื่อ process ค้าง
4. **No Completion Notification** - ไม่ส่ง final success notification

## ✅ **Solutions Implemented**

### 1. **Enhanced `webhook-deploy.sh`**

**Added Timeouts:**
```bash
# PM2 operations with timeout
export PM2_KILL_TIMEOUT=30000
timeout 60s pm2 restart ticket-backend-prod

# Health check with timeout  
timeout 30s curl -f -s "$HEALTH_URL"
```

**Added Retry Logic:**
```bash
# Application startup verification with retries
RETRY_COUNT=0
MAX_RETRIES=10
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if pm2 describe ticket-backend-prod | grep -q "online"; then
        APP_RUNNING=true
        break
    fi
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT + 1))
done
```

**Enhanced Error Handling:**
```bash
# Show logs on failure
if [ "$APP_RUNNING" = false ]; then
    print_error "Recent PM2 logs:"
    pm2 logs ticket-backend-prod --lines 10 --nostream
    send_webhook_notification "failed" "Application failed to start - timeout"
    exit 1
fi
```

**Fixed Health Check URL:**
```bash
# Correct health check URL
HEALTH_URL="http://localhost:4000/api/v1"  # ไม่ใช่ :3001
```

**Multiple Completion Notifications:**
```bash
# Send success notification
send_webhook_notification "success" "✅ Deployment and health check completed"

# Send final completion notification
send_webhook_notification "completed" "🎉 Auto-deployment workflow completed!"
```

### 2. **New Utility Scripts**

**`scripts/check-deployment-status.sh`:**
- ตรวจสอบ deployment processes ที่ค้าง
- ตรวจสอบ PM2 status
- ตรวจสอบ application health
- ส่ง status notification

**`scripts/kill-stuck-deployment.sh`:**
- ฆ่า deployment processes ที่ค้าง
- ส่ง completion notification
- Cleanup และแจ้งสถานะ

### 3. **Usage Instructions**

**For Current Stuck Deployment:**
```bash
# Option 1: Check status and auto-complete
./scripts/check-deployment-status.sh

# Option 2: Kill stuck processes and complete
./scripts/kill-stuck-deployment.sh
```

**For Future Deployments:**
- Deployment จะมี timeout และ retry logic
- จะส่ง multiple completion notifications
- มี better error handling และ logging

## 🧪 **Testing & Monitoring**

### **Status Check Command:**
```bash
# Check if deployment is running
ps aux | grep -E "(webhook-deploy|build-and-deploy)" | grep -v grep

# Check PM2 status
pm2 status ticket-backend-prod

# Check application health
curl -f -s http://localhost:4000/api/v1
```

### **Manual Completion:**
```bash
# If deployment hangs, run:
./scripts/kill-stuck-deployment.sh

# This will:
# 1. Kill stuck processes
# 2. Send cleanup notification  
# 3. Send completion notification
# 4. Update Discord status
```

## 📋 **Prevention Measures**

✅ **PM2 Timeout** - 60 seconds max for restart operations  
✅ **Application Startup Retry** - 10 attempts with 3s intervals  
✅ **Health Check Timeout** - 30 seconds max  
✅ **Multiple Notifications** - Success, completion, and status updates  
✅ **Error Logging** - Show PM2 logs on failure  
✅ **Process Monitoring** - Utility scripts for stuck deployments  
✅ **Graceful Fallbacks** - Alternative health check endpoints  

## 🎯 **Expected Behavior**

**Normal Deployment Flow:**
1. `STARTED` - Webhook received
2. `success` - Build completed  
3. `success` - PM2 restart successful
4. `success` - Health check passed
5. `completed` - Final completion notification

**Total Time:** ~2-5 minutes  
**Notifications:** 4-5 Discord messages  
**Final Status:** ✅ Completed with health check  

---
**Status:** ✅ **FIXED & ENHANCED**  
**Date:** 13 สิงหาคม 2025  
**Impact:** Prevents hanging deployments, adds monitoring & cleanup tools  
