# 🔌 QR Code API Reference

## 📝 **Quick Reference Card**

### **🌐 Public Endpoints (ไม่ต้อง Authentication)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/mobile/scanner/check-in/{orderId}` | แสดงข้อมูลลูกค้าจาก QR Code |
| `POST` | `/api/v1/mobile/scanner/staff-checkin` | Staff Login และเช็คอิน |

### **🔒 Protected Endpoints (ต้องมี JWT Token)**

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/mobile/scanner/scan` | สแกน QR Code ผ่าน Mobile App | STAFF, ADMIN |

---

## 📋 **Detailed API Documentation**

### **1. Public Check-in Page**

```http
GET /api/v1/mobile/scanner/check-in/{orderId}?qr={encrypted_data}
```

**Parameters:**
- `orderId` (path): Order ID
- `qr` (query): Encrypted QR data

**Example Request:**
```bash
# Development
curl "http://localhost:3000/api/v1/mobile/scanner/check-in/ORD-20250811-001?qr=U2FsdGVkX1%2B..."

# Production  
curl "http://43.229.133.51:3000/api/v1/mobile/scanner/check-in/ORD-20250811-001?qr=U2FsdGVkX1%2B..."
```

**Response:** HTML Page
```html
<!DOCTYPE html>
<html>
<head>
    <title>ข้อมูลลูกค้า - ORD-20250811-001</title>
</head>
<body>
    <!-- Customer info and staff login form -->
</body>
</html>
```

---

### **2. Staff Check-in via Web**

```http
POST /api/v1/mobile/scanner/staff-checkin
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "ORD-20250811-001",
  "qrData": "encrypted_qr_data_here",
  "username": "staff1",
  "password": "staff123"
}
```

**Success Response:** HTML Page
```html
<!-- Success check-in page -->
<div class="success-page">
    <h1>✅ เช็คอินสำเร็จ!</h1>
    <p>เช็คอินโดย: staff1</p>
    <!-- Customer details -->
</div>
```

**Error Response:** HTML Page
```html
<!-- Error page -->
<div class="error-page">
    <h1>❌ เกิดข้อผิดพลาด</h1>
    <p>Username หรือ Password ไม่ถูกต้อง</p>
</div>
```

---

### **3. Mobile App QR Scan**

```http
POST /api/v1/mobile/scanner/scan
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "qrData": "encrypted_qr_data_here",
  "location": "Stadium Gate",
  "deviceId": "mobile_device_123"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-20250811-001",
    "isValid": true,
    "attendanceStatus": "CHECKED_IN",
    "customerName": "John Doe",
    "customerPhone": "081-234-5678",
    "ticketType": "seated",
    "seats": ["A1", "A2"],
    "amount": 3000,
    "showDate": "2025-08-15T19:00:00.000Z",
    "validUntil": "2025-08-22T19:00:00.000Z",
    "orderStatus": "confirmed",
    "checkInTime": "2025-08-12T14:30:00.000Z"
  },
  "message": "เช็คอินสำเร็จ",
  "timestamp": "2025-08-12T14:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "data": null,
  "message": "QR Code หมดอายุแล้ว",
  "timestamp": "2025-08-12T14:30:00.000Z"
}
```

---

## 🔐 **Authentication**

### **JWT Token Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Token Payload:**
```json
{
  "id": "staff_123",
  "username": "staff1",
  "name": "Staff Name",
  "role": "STAFF",
  "iat": 1692187200,
  "exp": 1692273600
}
```

---

## 📊 **Data Structures**

### **QR Code Data (Encrypted):**
```typescript
interface QRCodeData {
  orderId: string;          // "ORD-20250811-001"
  userId: string;           // "user_123"
  showDate: string;         // "2025-08-15T19:00:00.000Z"
  seats?: string[];         // ["A1", "A2"]
  amount: number;           // 3000
  ticketType: 'seated' | 'standing';
  validUntil: string;       // "2025-08-22T19:00:00.000Z"
  securityHash: string;     // Security hash for verification
}
```

### **Order Object:**
```typescript
interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  attendanceStatus: 'PENDING' | 'CHECKED_IN';
  ticketType: 'seated' | 'standing';
  seats?: string[];
  total: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  showDate: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🚨 **Error Codes**

| Code | Message | Description |
|------|---------|-------------|
| `QR_INVALID` | QR Code ไม่ถูกต้องหรือเสียหาย | QR Code format ผิด |
| `QR_EXPIRED` | QR Code หมดอายุแล้ว | เกินเวลาที่กำหนด |
| `QR_OUT_OF_TIME` | QR Code ไม่อยู่ในช่วงเวลาการใช้งาน | ไม่ใช่วันการแข่งขัน |
| `ORDER_NOT_FOUND` | ไม่พบข้อมูลออเดอร์ | Order ID ไม่มีในระบบ |
| `INVALID_CREDENTIALS` | Username หรือ Password ไม่ถูกต้อง | Staff credentials ผิด |
| `ALREADY_CHECKED_IN` | ลูกค้าได้เช็คอินแล้ว | Status เป็น CHECKED_IN แล้ว |
| `UNAUTHORIZED` | ไม่มีสิทธิ์เข้าถึง | ไม่มี JWT token หรือ role ไม่ถูกต้อง |

---

## 🔧 **Frontend Integration Examples**

### **Vue 3 Composable:**
```typescript
// composables/useQRScanner.ts
export const useQRScanner = () => {
  const config = useRuntimeConfig()
  
  const scanQRCode = async (qrData: string) => {
    const { data } = await $fetch('/api/v1/mobile/scanner/scan', {
      method: 'POST',
      baseURL: config.public.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: {
        qrData,
        location: 'Stadium Gate',
        deviceId: getDeviceId()
      }
    })
    
    return data
  }
  
  return {
    scanQRCode
  }
}
```

### **Nuxt 3 Plugin:**
```typescript
// plugins/qr-scanner.client.ts
import { QrScanner } from 'qr-scanner'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      qrScanner: QrScanner
    }
  }
})
```

### **Component Usage:**
```vue
<script setup>
const { $qrScanner } = useNuxtApp()
const { scanQRCode } = useQRScanner()

const handleScan = async (result: string) => {
  try {
    const response = await scanQRCode(result)
    console.log('Scan result:', response)
  } catch (error) {
    console.error('Scan error:', error)
  }
}

onMounted(() => {
  $qrScanner.start(
    document.getElementById('video'),
    handleScan,
    {
      highlightScanRegion: true,
      highlightCodeOutline: true
    }
  )
})
</script>
```

---

## 📱 **Mobile App Integration**

### **Capacitor Configuration:**
```json
{
  "plugins": {
    "Camera": {
      "permissions": ["camera"]
    },
    "BarcodeScanner": {
      "cameraDirection": "back"
    }
  }
}
```

### **QR Scanner with Capacitor:**
```typescript
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'

export const scanQRWithCapacitor = async () => {
  await BarcodeScanner.checkPermission({ force: true })
  
  BarcodeScanner.hideBackground()
  
  const result = await BarcodeScanner.startScan()
  
  if (result.hasContent) {
    return result.content
  }
  
  throw new Error('No QR code found')
}
```

---

## 🌐 **Environment Configuration**

### **Development:**
```bash
# .env.development
NUXT_PUBLIC_APP_URL=http://localhost:3000
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000
NUXT_PUBLIC_QR_TIMEOUT=30000
```

### **Production:**
```bash
# .env.production
NUXT_PUBLIC_APP_URL=http://43.229.133.51:3000
NUXT_PUBLIC_API_BASE_URL=http://43.229.133.51:3000
NUXT_PUBLIC_QR_TIMEOUT=15000
```

---

## 🧪 **Testing Examples**

### **QR Code Testing:**
```typescript
// tests/qr-scanner.test.ts
describe('QR Scanner', () => {
  it('should scan valid QR code', async () => {
    const mockQRData = 'encrypted_test_data'
    const result = await scanQRCode(mockQRData)
    
    expect(result.success).toBe(true)
    expect(result.data.orderId).toBeDefined()
  })
  
  it('should handle invalid QR code', async () => {
    const invalidQRData = 'invalid_data'
    
    await expect(scanQRCode(invalidQRData))
      .rejects.toThrow('QR Code ไม่ถูกต้อง')
  })
})
```

### **API Mock for Development:**
```typescript
// mocks/qr-api.ts
export const mockQRScanResponse = {
  success: true,
  data: {
    orderId: 'ORD-20250811-001',
    isValid: true,
    attendanceStatus: 'CHECKED_IN',
    customerName: 'John Doe',
    customerPhone: '081-234-5678',
    ticketType: 'seated',
    seats: ['A1', 'A2'],
    checkInTime: '2025-08-12T14:30:00.000Z'
  },
  message: 'เช็คอินสำเร็จ',
  timestamp: '2025-08-12T14:30:00.000Z'
}
```

---

## 📚 **Additional Resources**

- **Swagger API Docs:** `https://your-domain.com/api/docs`
- **QR Code Libraries:** [qr-scanner](https://github.com/nimiq/qr-scanner)
- **Nuxt 3 Documentation:** [nuxt.com](https://nuxt.com)
- **Capacitor Plugins:** [capacitorjs.com](https://capacitorjs.com)

---

**🎯 Ready to integrate? Let's build something awesome! 🚀**
