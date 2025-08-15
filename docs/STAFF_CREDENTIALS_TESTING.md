# 🔐 Staff Credentials & Testing Guide

## 👥 **Available Staff Accounts**

### **Staff Accounts (Role: STAFF)**
```javascript
{
  username: "staff1",
  password: "staff123",
  role: "STAFF",
  permissions: ["scan_qr", "check_in_customers"]
}

{
  username: "staff2", 
  password: "staff456",
  role: "STAFF",
  permissions: ["scan_qr", "check_in_customers"]
}
```

### **Admin Account (Role: ADMIN)**
```javascript
{
  username: "admin",
  password: "admin123", 
  role: "ADMIN",
  permissions: ["scan_qr", "check_in_customers", "view_reports", "manage_staff"]
}
```

---

## 🧪 **Testing Scenarios**

### **Scenario 1: ลูกค้าสแกน QR Code ด้วยกล้องมือถือ**

1. **ลูกค้าสแกน QR Code:**
   ```
   QR Code URL: https://your-domain.com/api/v1/mobile/scanner/check-in/ORD-001?qr=encrypted_data
   ```

2. **เปิดในเบราว์เซอร์:**
   - แสดงข้อมูลลูกค้า
   - แสดงฟอร์ม Staff Login
   - สถานะ: "⏳ รอเช็คอิน"

3. **Staff กรอกข้อมูล:**
   ```
   Username: staff1
   Password: staff123
   ```

4. **ผลลัพธ์:**
   - เช็คอินสำเร็จ
   - สถานะเปลี่ยนเป็น "✅ เช็คอินแล้ว"
   - แสดงเวลาเช็คอินและชื่อ Staff

---

### **Scenario 2: Staff ใช้ Mobile App สแกน**

1. **Staff เปิดแอป:**
   - Login ด้วย JWT Token
   - เข้าหน้า QR Scanner

2. **สแกน QR Code:**
   ```http
   POST /api/v1/mobile/scanner/scan
   Authorization: Bearer jwt_token
   
   {
     "qrData": "encrypted_qr_data",
     "location": "Stadium Gate",
     "deviceId": "mobile_123"
   }
   ```

3. **ผลลัพธ์:**
   ```json
   {
     "success": true,
     "data": {
       "orderId": "ORD-001",
       "attendanceStatus": "CHECKED_IN",
       "customerName": "John Doe"
     },
     "message": "เช็คอินสำเร็จ"
   }
   ```

---

### **Scenario 3: Error Handling**

#### **3.1 QR Code หมดอายุ:**
```json
{
  "success": false,
  "message": "QR Code หมดอายุแล้ว",
  "error": "QR_EXPIRED"
}
```

#### **3.2 Staff credentials ผิด:**
```html
<div class="error-page">
  <h1>❌ การเข้าสู่ระบบไม่สำเร็จ</h1>
  <p>Username หรือ Password ไม่ถูกต้อง</p>
</div>
```

#### **3.3 ลูกค้าเช็คอินแล้ว:**
```json
{
  "success": false,
  "message": "ลูกค้าได้เช็คอินแล้ว",
  "data": {
    "attendanceStatus": "CHECKED_IN",
    "checkInTime": "2025-08-12T10:30:00.000Z"
  }
}
```

---

## 🎯 **Test Cases for Frontend**

### **Test Case 1: QR Scanner Component**
```typescript
describe('QR Scanner Component', () => {
  it('should initialize camera on mount', async () => {
    const wrapper = mount(QRScanner)
    await nextTick()
    
    expect(wrapper.find('video').exists()).toBe(true)
    expect(wrapper.vm.isCameraActive).toBe(true)
  })
  
  it('should handle successful scan', async () => {
    const wrapper = mount(QRScanner)
    const mockResponse = {
      success: true,
      data: { orderId: 'ORD-001', customerName: 'John Doe' }
    }
    
    vi.spyOn(api, 'scanQRCode').mockResolvedValue(mockResponse)
    
    await wrapper.vm.handleScan('valid_qr_data')
    
    expect(wrapper.emitted('scanSuccess')).toBeTruthy()
    expect(wrapper.emitted('scanSuccess')[0][0]).toEqual(mockResponse)
  })
})
```

### **Test Case 2: Staff Login Form**
```typescript
describe('Staff Login Form', () => {
  it('should validate required fields', async () => {
    const wrapper = mount(StaffLoginForm)
    
    await wrapper.find('form').trigger('submit')
    
    expect(wrapper.find('.error-username').text()).toBe('กรุณากรอก Username')
    expect(wrapper.find('.error-password').text()).toBe('กรุณากรอก Password')
  })
  
  it('should submit with valid credentials', async () => {
    const wrapper = mount(StaffLoginForm)
    
    await wrapper.find('input[name="username"]').setValue('staff1')
    await wrapper.find('input[name="password"]').setValue('staff123')
    await wrapper.find('form').trigger('submit')
    
    expect(wrapper.emitted('loginAttempt')).toBeTruthy()
  })
})
```

---

## 📱 **Mobile App Testing**

### **Device Testing:**
```typescript
// utils/deviceTesting.ts
export const testDeviceCapabilities = async () => {
  const tests = {
    camera: false,
    qrScanning: false,
    networkConnection: false,
    localStorage: false
  }
  
  // Test Camera
  try {
    await navigator.mediaDevices.getUserMedia({ video: true })
    tests.camera = true
  } catch (error) {
    console.error('Camera not available:', error)
  }
  
  // Test QR Scanning
  try {
    const QrScanner = await import('qr-scanner')
    tests.qrScanning = QrScanner.hasCamera()
  } catch (error) {
    console.error('QR Scanner not available:', error)
  }
  
  // Test Network
  tests.networkConnection = navigator.onLine
  
  // Test Local Storage
  try {
    localStorage.setItem('test', 'test')
    localStorage.removeItem('test')
    tests.localStorage = true
  } catch (error) {
    console.error('LocalStorage not available:', error)
  }
  
  return tests
}
```

### **Performance Testing:**
```typescript
// utils/performanceTesting.ts
export const measureScanPerformance = () => {
  const startTime = performance.now()
  
  return {
    stop: () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`QR Scan took ${duration} milliseconds`)
      
      return {
        duration,
        isPerformant: duration < 2000 // Less than 2 seconds
      }
    }
  }
}
```

---

## 🌐 **Cross-Browser Testing**

### **Browser Compatibility:**
| Browser | QR Scanner | Camera | Local Storage | WebSocket |
|---------|------------|--------|---------------|-----------|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 85+ | ✅ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |
| Mobile Chrome | ✅ | ✅ | ✅ | ✅ |
| Mobile Safari | ✅ | ✅ | ✅ | ✅ |

### **Feature Detection:**
```typescript
// utils/featureDetection.ts
export const checkBrowserSupport = () => {
  const support = {
    mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    webrtc: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
    localStorage: !!window.localStorage,
    fetch: !!window.fetch,
    webgl: !!window.WebGLRenderingContext
  }
  
  const isSupported = Object.values(support).every(Boolean)
  
  return { support, isSupported }
}
```

---

## 🔧 **Development Setup**

### **Environment Variables:**
```bash
# .env.local (Development)
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000
NUXT_PUBLIC_STAFF_CREDENTIALS_ENABLED=true
NUXT_PUBLIC_DEBUG_MODE=true
NUXT_PUBLIC_MOCK_QR_RESPONSES=true
```

### **Mock Data for Development:**
```typescript
// mocks/staffCredentials.ts
export const MOCK_STAFF_CREDENTIALS = [
  {
    username: 'staff1',
    password: 'staff123',
    name: 'Staff Member 1',
    role: 'STAFF',
    location: 'Gate A'
  },
  {
    username: 'staff2',
    password: 'staff456', 
    name: 'Staff Member 2',
    role: 'STAFF',
    location: 'Gate B'
  },
  {
    username: 'admin',
    password: 'admin123',
    name: 'Admin User',
    role: 'ADMIN',
    location: 'Control Room'
  }
]
```

### **Development QR Codes:**
```typescript
// utils/developmentQRCodes.ts
export const SAMPLE_QR_CODES = [
  {
    orderId: 'ORD-DEV-001',
    customerName: 'John Doe',
    qrData: 'sample_encrypted_data_1',
    status: 'PENDING'
  },
  {
    orderId: 'ORD-DEV-002', 
    customerName: 'Jane Smith',
    qrData: 'sample_encrypted_data_2',
    status: 'CHECKED_IN'
  },
  {
    orderId: 'ORD-DEV-003',
    customerName: 'Bob Wilson',
    qrData: 'expired_qr_data',
    status: 'EXPIRED'
  }
]
```

---

## 📊 **Analytics & Monitoring**

### **QR Scan Analytics:**
```typescript
// utils/analytics.ts
export const trackQRScan = (result: QRScanResult) => {
  // Google Analytics
  gtag('event', 'qr_scan', {
    event_category: 'scanner',
    event_label: result.success ? 'success' : 'failure',
    value: result.success ? 1 : 0
  })
  
  // Custom Analytics
  analytics.track('QR Code Scanned', {
    orderId: result.data?.orderId,
    staffId: getCurrentStaff()?.id,
    scanTime: new Date().toISOString(),
    success: result.success
  })
}
```

### **Error Tracking:**
```typescript
// utils/errorTracking.ts
export const trackScanError = (error: Error, context: any) => {
  // Sentry
  Sentry.captureException(error, {
    tags: {
      component: 'qr-scanner',
      action: 'scan'
    },
    extra: context
  })
  
  // Console for development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 QR Scan Error')
    console.error('Error:', error)
    console.log('Context:', context)
    console.groupEnd()
  }
}
```

---

## 🚀 **Deployment Checklist**

### **Pre-deployment:**
- [ ] Test all staff credentials
- [ ] Verify QR code generation
- [ ] Test camera permissions
- [ ] Check API endpoints
- [ ] Validate error handling
- [ ] Test offline scenarios
- [ ] Performance testing
- [ ] Cross-browser testing

### **Post-deployment:**
- [ ] Monitor error rates
- [ ] Track scan success rates
- [ ] Check performance metrics
- [ ] Verify security logs
- [ ] Test with real QR codes
- [ ] Staff training completed

---

**📞 Support Contact:**
- **Technical Issues:** Backend Development Team
- **Staff Training:** Operations Team  
- **Bug Reports:** [GitHub Issues](https://github.com/your-repo/issues)

**🎉 Happy Testing! 🚀**
