# 🚨 Emergency Fixes for Patong Boxing Stadium

## 📊 **Current Status** (Aug 16, 2025)

### ✅ **Working Systems:**
- **API Backend**: Running on PM2 (2 instances)
- **Database**: PostgreSQL accessible 
- **Web Server**: Nginx with SSL certificates
- **Authentication**: JWT login working
- **Mail Server**: Postfix + Dovecot installed

### ❌ **Current Issues:**
1. **SSH Access Blocked** - Port 22 refused connection
2. **Email Module Not Working** - Need to restart PM2 with updated code

---

## 🔧 **Immediate Fix Required:**

### **Option 1: VPS Provider Console Access**
```bash
# Through hosting provider console/VNC:
sudo systemctl restart ssh
sudo systemctl enable ssh  
sudo ufw allow 22/tcp
sudo ufw status

# Restart PM2 with email fixes:
cd /var/www/patong-boxing
pm2 restart all
```

### **Option 2: Emergency API Endpoint** 
Create `/api/v1/admin/emergency-restart` endpoint:

```typescript
// In any existing controller, add:
@Post('emergency-restart')
@Roles(UserRole.ADMIN)
async emergencyRestart() {
  // Restart PM2
  exec('pm2 restart all', (error, stdout) => {
    if (error) throw error;
    return { success: true, message: 'Services restarted' };
  });
}
```

### **Option 3: Database Direct Fix**
```sql
-- If needed, create via database console:
INSERT INTO staff (username, password, role) 
VALUES ('emergency', '$hashed_password', 'admin');
```

---

## 📧 **Email System Fix**

### **Problem:** EmailModule not properly loaded
### **Solution:** Code is ready, just need restart

**Files Updated:**
- ✅ `src/app.module.ts` - EmailModule imported
- ✅ `src/email/email.module.ts` - Module configured  
- ✅ `src/email/email-automation.service.ts` - Service ready
- ✅ `src/email/email-automation.controller.ts` - API endpoints ready

**Need to do:**
```bash
cd /var/www/patong-boxing
npm run build
pm2 restart all --update-env
```

---

## 🧪 **Test Email After Fix:**

```bash
# Test API endpoint:
curl -X POST "https://api.patongboxingstadiumticket.com/api/v1/email/test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "subject": "Test Email from Patong Boxing",
    "message": "🎫 Email system working!"
  }'
```

---

## 📞 **Contact Actions Needed:**

1. **Contact VPS Provider** - Request SSH access restoration
2. **Or use Web Console** - Execute fix commands
3. **Test Email System** - After restart

**VPS Details:**
- IP: 43.229.133.51
- Domain: patongboxingstadiumticket.com  
- Services: Working except SSH
- Provider: [Contact your hosting provider]

---

**Status: Ready for SSH access to complete email system setup** 🚀

*Last Updated: Aug 16, 2025 - 17:16 GMT+7*
