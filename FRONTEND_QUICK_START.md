# 🎯 Frontend Quick Start - Patong Boxing Stadium

## 🚀 TL;DR - Get Started in 5 Minutes

### 1. API Base URL (Copy & Paste Ready)
```
https://api.patongboxingstadiumticket.com
```

### 2. Environment Variables (Copy to your .env)
```bash
NUXT_PUBLIC_API_BASE_URL=https://api.patongboxingstadiumticket.com
NUXT_PUBLIC_APP_URL=https://patongboxingstadiumticket.com
API_URL=https://api.patongboxingstadiumticket.com/api
NUXT_PUBLIC_QR_TIMEOUT=15000
NUXT_PUBLIC_CAMERA_FACING_MODE=environment
NUXT_PUBLIC_DEBUG_MODE=false
```

### 3. Test API Connection (JavaScript)
```javascript
// Quick API test
fetch('https://api.patongboxingstadiumticket.com/health')
  .then(res => res.json())
  .then(data => console.log('✅ API Ready:', data))
  .catch(err => console.error('❌ API Error:', err));
```

### 4. View API Documentation
**Open in browser**: https://api.patongboxingstadiumticket.com/api/docs

---

## 🏗️ What You Need to Build

### Must-Have Pages
- [ ] **Home Page** - Event listings
- [ ] **Login/Register** - User authentication  
- [ ] **Event Detail** - Show event info + seat selection
- [ ] **Booking Checkout** - Payment processing
- [ ] **User Dashboard** - Booking history
- [ ] **QR Scanner** - Staff ticket validation
- [ ] **Admin Panel** - Event/booking management

### Key Features to Implement
- [ ] JWT authentication
- [ ] Real-time seat availability
- [ ] Payment gateway integration
- [ ] QR code generation/scanning
- [ ] Responsive mobile design
- [ ] Thai language support

---

## 📱 Target Domains for Deployment

```
Frontend App:     https://patongboxingstadiumticket.com
Mobile App:       https://app.patongboxingstadiumticket.com  
Admin Panel:      https://admin.patongboxingstadiumticket.com
Backend API:      https://api.patongboxingstadiumticket.com ✅
```

*SSL certificates already installed for all domains* 🔒

---

## 🔥 Backend Status: PRODUCTION READY

- ✅ **API**: Running on HTTPS with SSL
- ✅ **Database**: PostgreSQL configured  
- ✅ **Authentication**: JWT tokens ready
- ✅ **File Upload**: Image/document handling
- ✅ **QR Codes**: Generation & validation
- ✅ **Payment**: Payment processing endpoints
- ✅ **Admin**: Full management API
- ✅ **Security**: Rate limiting, CORS, firewall
- ✅ **Monitoring**: Health checks, logging
- ✅ **Scaling**: 2 PM2 instances with auto-restart

**👨‍💻 Your turn to build the frontend! Backend is waiting.** 🎪🥊

*Updated: August 16, 2025*
