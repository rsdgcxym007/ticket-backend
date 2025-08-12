# 🎫 Ticket Backend API Integration Guide
## Nuxt3 + Vue3 + Tailwind CSS Frontend Integration

### 📋 Overview
ระบบ Backend API สำหรับการจัดการตั้ว ticket management system ที่ใช้ NestJS พร้อม Integration Guide สำหรับ Frontend Nuxt3/Vue3

---

## 🔐 Authentication
ระบบใช้ JWT Authentication ในการยืนยันตัวตน


---

## 📊 Analytics API

### 1. 📈 Sales Analytics

#### 1.1 Daily Sales Report
```http
GET /analytics/sales/daily?date=2024-01-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "totalSales": 125000,
    "totalOrders": 45,
    "averageOrderValue": 2777.78,
    "hourlyBreakdown": [
      { "hour": 9, "sales": 15000, "orders": 5 },
      { "hour": 10, "sales": 22000, "orders": 8 }
    ],
    "paymentMethods": {
      "CREDIT_CARD": { "amount": 75000, "count": 25 },
      "BANK_TRANSFER": { "amount": 50000, "count": 20 }
    }
  }
}
```

**Nuxt3 Composable:**
```vue
<script setup>
// composables/useAnalytics.js
export const useAnalytics = () => {
  const getDailySales = async (date = null) => {
    const { data } = await $fetch('/analytics/sales/daily', {
      query: { date: date || new Date().toISOString().split('T')[0] },
      headers: useAuthHeaders()
    })
    return data
  }
  
  return { getDailySales }
}
</script>
```

#### 1.2 Monthly Sales Report
```http
GET /analytics/sales/monthly?year=2024&month=1
```

#### 1.3 Weekly Comparison
```http
GET /analytics/sales/weekly-comparison
```

#### 1.4 Date Range Sales
```http
GET /analytics/sales/date-range?startDate=2024-01-01&endDate=2024-01-31
```

### 2. 📊 Realtime Monitoring

#### 2.1 System Health
```http
GET /analytics/realtime/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "systemStatus": "healthy",
    "cpuUsage": 45.2,
    "memoryUsage": 67.8,
    "diskUsage": 23.1,
    "activeConnections": 1247,
    "responseTime": 125
  }
}
```

#### 2.2 Performance Metrics
```http
GET /analytics/realtime/performance
```

#### 2.3 Business Metrics
```http
GET /analytics/realtime/business
```

### 3. 🔮 Advanced Analytics & Predictions

#### 3.1 Sales Predictions
```http
GET /analytics/predictions/sales?days=30
```

#### 3.2 Demand Forecasting
```http
GET /analytics/predictions/demand?zoneId=zone123&weeks=4
```

#### 3.3 Revenue Optimization
```http
GET /analytics/optimization/revenue?zoneId=zone123
```

---

---

## 🎫 QR Code & Thermal Receipt API

### 1. 📄 Generate Thermal Receipt with QR Code

#### 1.1 Generate QR-enabled Thermal Receipt
```http
POST /referrers/generate-thermal-receipt-qr
```

**Request Body:**
```json
{
  "tickets": [
    {
      "orderId": "ORD-20250811-001",
      "orderNumber": "TK001",
      "customerName": "John Doe",
      "showDate": "2024-02-14",
      "seatNumber": "A-15",
      "type": "RINGSIDE",
      "userId": "user123",
      "amount": 1500
    }
  ]
}
```

**Response:** PDF file with QR codes for each ticket

**Vue Implementation:**
```vue
<template>
  <div class="thermal-receipt-generator">
    <h3 class="text-lg font-semibold mb-4">🎫 สร้างใบเสร็จความร้อน (QR Code)</h3>
    
    <div class="space-y-4">
      <div v-for="(ticket, index) in tickets" :key="index" class="border p-4 rounded-lg">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">เลขออเดอร์</label>
            <input 
              v-model="ticket.orderNumber" 
              type="text" 
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">ชื่อลูกค้า</label>
            <input 
              v-model="ticket.customerName" 
              type="text" 
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">ที่นั่ง</label>
            <input 
              v-model="ticket.seatNumber" 
              type="text" 
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">ประเภท</label>
            <select 
              v-model="ticket.type" 
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="RINGSIDE">RINGSIDE</option>
              <option value="STADIUM">STADIUM</option>
              <option value="STANDING">STANDING</option>
            </select>
          </div>
        </div>
        
        <button 
          v-if="tickets.length > 1"
          @click="removeTicket(index)"
          class="mt-2 text-red-600 text-sm hover:underline"
        >
          ลบตั๋วนี้
        </button>
      </div>
      
      <div class="flex space-x-4">
        <button 
          @click="addTicket"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          เพิ่มตั๋ว
        </button>
        
        <button 
          @click="generateReceipt"
          :disabled="isGenerating"
          class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <span v-if="isGenerating">กำลังสร้าง...</span>
          <span v-else">📄 สร้างใบเสร็จ QR</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const tickets = ref([
  {
    orderId: '',
    orderNumber: '',
    customerName: '',
    showDate: new Date().toISOString().split('T')[0],
    seatNumber: '',
    type: 'RINGSIDE',
    userId: 'guest',
    amount: 1500
  }
])

const isGenerating = ref(false)

const addTicket = () => {
  tickets.value.push({
    orderId: '',
    orderNumber: '',
    customerName: '',
    showDate: new Date().toISOString().split('T')[0],
    seatNumber: '',
    type: 'RINGSIDE',
    userId: 'guest',
    amount: 1500
  })
}

const removeTicket = (index) => {
  tickets.value.splice(index, 1)
}

const generateReceipt = async () => {
  isGenerating.value = true
  
  try {
    // Generate unique IDs for tickets without orderId
    const ticketsWithIds = tickets.value.map(ticket => ({
      ...ticket,
      orderId: ticket.orderId || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderNumber: ticket.orderNumber || `TK${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
    }))
    
    const response = await fetch('/referrers/generate-thermal-receipt-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...useAuthHeaders()
      },
      body: JSON.stringify({ tickets: ticketsWithIds })
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate receipt')
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `thermal-receipt-qr-${new Date().getTime()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    useToast().success('สร้างใบเสร็จ QR Code สำเร็จ!')
    
  } catch (error) {
    console.error('Error generating receipt:', error)
    useToast().error('เกิดข้อผิดพลาดในการสร้างใบเสร็จ')
  } finally {
    isGenerating.value = false
  }
}
</script>
```

### 2. 📱 QR Code Features

#### 2.1 QR Code Structure
QR Code ที่สร้างขึ้นจะมีข้อมูลที่เข้ารหัสแล้ว ประกอบด้วย:
- Order ID และข้อมูลออเดอร์
- ข้อมูลลูกค้าและที่นั่ง
- วันที่แสดงและวันหมดอายุ
- Security hash เพื่อป้องกันการปลอมแปลง

#### 2.2 QR Code Validation
เมื่อสแกน QR Code ระบบจะ:
1. ถอดรหัสข้อมูล
2. ตรวจสอบ security hash
3. ตรวจสอบวันหมดอายุ
4. ตรวจสอบว่าอยู่ในช่วงเวลาการแสดง
5. อัพเดท `attendanceStatus` เป็น `CHECKED_IN`

#### 2.3 Attendance Status
```typescript
enum AttendanceStatus {
  PENDING = 'PENDING',     // ยังไม่เช็คอิน
  CHECKED_IN = 'CHECKED_IN', // เช็คอินแล้ว  
  NO_SHOW = 'NO_SHOW'      // ไม่มาร่วมงาน
}
```

## 🤖 AI Recommendations API

### 1. 🪑 Seat Recommendations

#### 1.1 Get AI Seat Recommendations
```http
GET /ai-recommendations/seats/{userId}/{zoneId}?limit=5
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "seatId": "A-15",
      "row": "A",
      "seatNumber": 15,
      "confidence": 0.95,
      "reasons": ["ใกล้เวที", "มุมมองดี", "ราคาเหมาะสม"],
      "price": 1500,
      "zone": "VIP",
      "userPreferenceMatch": 0.88
    }
  ]
}
```

**Vue Component Example:**
```vue
<template>
  <div class="seat-recommendations">
    <h3 class="text-xl font-bold mb-4">แนะนำที่นั่งสำหรับคุณ</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div 
        v-for="seat in recommendations" 
        :key="seat.seatId"
        class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
      >
        <div class="flex justify-between items-start mb-2">
          <span class="text-lg font-semibold">{{ seat.seatId }}</span>
          <span class="text-green-600 font-bold">฿{{ seat.price.toLocaleString() }}</span>
        </div>
        <div class="text-sm text-gray-600 mb-2">
          {{ seat.zone }} | ความมั่นใจ: {{ (seat.confidence * 100).toFixed(0) }}%
        </div>
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="reason in seat.reasons" 
            :key="reason"
            class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
          >
            {{ reason }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { userId, zoneId } = defineProps(['userId', 'zoneId'])
const { data: recommendations } = await $fetch(`/ai-recommendations/seats/${userId}/${zoneId}`)
</script>
```

#### 1.2 Dynamic Pricing Recommendations
```http
GET /ai-recommendations/pricing/{zoneId}?seatZone=VIP
```

#### 1.3 User Behavior Predictions
```http
GET /ai-recommendations/user-behavior/{userId}
```

#### 1.4 Popular Seat Analysis
```http
GET /ai-recommendations/popular-seats/{zoneId}
```

---

## 📱 Mobile API

### 1. 🏠 Mobile Home Screen

#### 1.1 Home Screen Data
```http
GET /mobile/home
```

**Response:**
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "ann_001",
        "title": "ข่าวสำคัญ",
        "content": "ระบบจะปิดปรับปรุงในวันที่ 15 ม.ค.",
        "type": "maintenance",
        "priority": "high",
        "isActive": true,
        "createdAt": "2024-01-10T10:00:00Z"
      }
    ],
    "promotions": [
      {
        "id": "promo_001",
        "title": "ลดราคา 20%",
        "description": "ลดราคาตั๋วทุกโซน",
        "discountPercent": 20,
        "validUntil": "2024-01-31T23:59:59Z",
        "imageUrl": "/images/promo1.jpg"
      }
    ],
    "upcomingEvents": [
      {
        "id": "event_001",
        "title": "คอนเสิร์ตใหญ่",
        "eventDate": "2024-02-14T19:00:00Z",
        "venue": "อิมแพ็ค อารีนา",
        "ticketPrice": 1500,
        "availableSeats": 250
      }
    ],
    "quickStats": {
      "totalEvents": 15,
      "totalSeats": 50000,
      "availableSeats": 12500,
      "popularZones": ["VIP", "Premium", "Standard"]
    }
  }
}
```

**Nuxt3 Page Example:**
```vue
<template>
  <div class="mobile-home min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
      <h1 class="text-2xl font-bold">TicketApp</h1>
      <p class="text-blue-100">ยินดีต้อนรับ!</p>
    </header>

    <!-- Announcements -->
    <section v-if="homeData?.announcements?.length" class="p-4">
      <h2 class="text-lg font-semibold mb-3">📢 ประกาศ</h2>
      <div class="space-y-2">
        <div 
          v-for="announcement in homeData.announcements" 
          :key="announcement.id"
          :class="[
            'p-3 rounded-lg border-l-4',
            announcement.priority === 'high' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
          ]"
        >
          <h3 class="font-medium">{{ announcement.title }}</h3>
          <p class="text-sm text-gray-600 mt-1">{{ announcement.content }}</p>
        </div>
      </div>
    </section>

    <!-- Promotions -->
    <section v-if="homeData?.promotions?.length" class="p-4">
      <h2 class="text-lg font-semibold mb-3">🎉 โปรโมชั่น</h2>
      <div class="overflow-x-auto">
        <div class="flex space-x-4">
          <div 
            v-for="promo in homeData.promotions" 
            :key="promo.id"
            class="bg-gradient-to-br from-orange-400 to-pink-500 text-white p-4 rounded-lg min-w-64 flex-shrink-0"
          >
            <h3 class="font-bold text-lg">{{ promo.title }}</h3>
            <p class="text-sm opacity-90 mb-2">{{ promo.description }}</p>
            <div class="text-2xl font-bold">-{{ promo.discountPercent }}%</div>
            <div class="text-xs opacity-75">
              หมดเขต: {{ formatDate(promo.validUntil) }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Stats -->
    <section class="p-4">
      <h2 class="text-lg font-semibold mb-3">📊 สถิติ</h2>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded-lg shadow">
          <div class="text-2xl font-bold text-blue-600">{{ homeData?.quickStats?.totalEvents }}</div>
          <div class="text-sm text-gray-600">กิจกรรมทั้งหมด</div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow">
          <div class="text-2xl font-bold text-green-600">{{ homeData?.quickStats?.availableSeats?.toLocaleString() }}</div>
          <div class="text-sm text-gray-600">ที่นั่งว่าง</div>
        </div>
      </div>
    </section>

    <!-- Upcoming Events -->
    <section v-if="homeData?.upcomingEvents?.length" class="p-4">
      <h2 class="text-lg font-semibold mb-3">🎪 กิจกรรมที่จะมาถึง</h2>
      <div class="space-y-3">
        <div 
          v-for="event in homeData.upcomingEvents" 
          :key="event.id"
          class="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 class="font-semibold text-lg">{{ event.title }}</h3>
          <p class="text-gray-600 text-sm mb-2">📍 {{ event.venue }}</p>
          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm text-gray-500">{{ formatDate(event.eventDate) }}</div>
              <div class="text-green-600 font-bold">เริ่มต้น ฿{{ event.ticketPrice.toLocaleString() }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-500">ที่นั่งเหลือ</div>
              <div class="font-bold">{{ event.availableSeats }} ที่</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'mobile'
})

const { data: homeData } = await useFetch('/mobile/home')

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
```

#### 1.2 QR Code Scanner
```http
POST /mobile/scanner/qr
```

**Request Body:**
```json
{
  "qrData": "encrypted_qr_code_data",
  "location": "Stadium Gate A",
  "deviceId": "scanner-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-20250811-001",
    "isValid": true,
    "attendanceStatus": "CHECKED_IN",
    "customerName": "John Doe",
    "ticketType": "seated",
    "seats": ["A1", "A2"],
    "amount": 3000,
    "showDate": "2024-02-14T19:00:00Z",
    "orderStatus": "PAID"
  },
  "message": "เช็คอินสำเร็จ",
  "timestamp": "2025-08-11T14:30:00.000Z"
}
```

**Vue QR Scanner Component:**
```vue
<template>
  <div class="qr-scanner-container">
    <div class="scanner-header bg-blue-600 text-white p-4">
      <h1 class="text-xl font-bold">📱 QR Code Scanner</h1>
      <p class="text-blue-100">สแกน QR Code เพื่อเช็คอิน</p>
    </div>

    <!-- QR Scanner Area -->
    <div class="scanner-area p-4">
      <div class="relative bg-black rounded-lg overflow-hidden">
        <video
          ref="videoRef"
          class="w-full h-64 object-cover"
          autoplay
          muted
          playsinline
        ></video>
        
        <!-- Scanning Overlay -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-48 h-48 border-2 border-white rounded-lg opacity-50">
            <div class="w-full h-full border-4 border-transparent border-t-green-400 border-l-green-400 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      <!-- Manual Input Fallback -->
      <div class="mt-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          หรือป้อน QR Code ด้วยตนเอง:
        </label>
        <div class="flex space-x-2">
          <input
            v-model="manualQRCode"
            type="text"
            class="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            placeholder="วาง QR Code ที่นี่..."
          >
          <button
            @click="scanManualQR"
            :disabled="!manualQRCode || isScanning"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            สแกน
          </button>
        </div>
      </div>
    </div>

    <!-- Scan Results -->
    <div v-if="lastScanResult" class="p-4">
      <div 
        :class="[
          'p-4 rounded-lg border-l-4',
          lastScanResult.success 
            ? 'bg-green-50 border-green-500 text-green-800' 
            : 'bg-red-50 border-red-500 text-red-800'
        ]"
      >
        <div class="flex items-start">
          <Icon 
            :name="lastScanResult.success ? 'heroicons:check-circle' : 'heroicons:x-circle'" 
            class="w-5 h-5 mt-0.5 mr-2" 
          />
          <div class="flex-1">
            <h3 class="font-medium">{{ lastScanResult.message }}</h3>
            <div v-if="lastScanResult.success && lastScanResult.data" class="mt-2 text-sm">
              <p><strong>ออเดอร์:</strong> {{ lastScanResult.data.orderId }}</p>
              <p><strong>ลูกค้า:</strong> {{ lastScanResult.data.customerName }}</p>
              <p><strong>ที่นั่ง:</strong> {{ lastScanResult.data.seats?.join(', ') || 'Standing' }}</p>
              <p><strong>สถานะ:</strong> {{ getAttendanceStatusText(lastScanResult.data.attendanceStatus) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scan History -->
    <div class="p-4">
      <h3 class="font-semibold mb-3">📋 ประวัติการสแกน</h3>
      <div class="space-y-2 max-h-48 overflow-y-auto">
        <div 
          v-for="scan in scanHistory" 
          :key="scan.id"
          class="flex justify-between items-center p-2 bg-gray-50 rounded"
        >
          <div>
            <span class="font-medium">{{ scan.orderId }}</span>
            <span class="text-sm text-gray-500 ml-2">{{ formatTime(scan.scanTime) }}</span>
          </div>
          <span 
            :class="[
              'px-2 py-1 text-xs rounded',
              scan.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            ]"
          >
            {{ scan.success ? '✓' : '✗' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const videoRef = ref(null)
const manualQRCode = ref('')
const isScanning = ref(false)
const lastScanResult = ref(null)
const scanHistory = ref([])

let qrScanner = null

onMounted(async () => {
  // Initialize QR Code Scanner
  try {
    const { default: QrScanner } = await import('qr-scanner')
    
    qrScanner = new QrScanner(
      videoRef.value,
      (result) => handleQRScan(result.data),
      {
        onDecodeError: (err) => {
          console.log('QR Scan Error:', err)
        },
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    )
    
    await qrScanner.start()
  } catch (error) {
    console.error('Failed to initialize QR Scanner:', error)
  }
})

onUnmounted(() => {
  if (qrScanner) {
    qrScanner.destroy()
  }
})

const handleQRScan = async (qrData) => {
  if (isScanning.value) return
  
  isScanning.value = true
  
  try {
    const response = await $fetch('/api/v1/mobile/scanner/scan', {
      method: 'POST',
      body: {
        qrData,
        location: 'Stadium Gate A',
        deviceId: navigator.userAgent
      },
      headers: useAuthHeaders()
    })
    
    lastScanResult.value = response
    
    // Add to scan history
    scanHistory.value.unshift({
      id: Date.now(),
      orderId: response.data?.orderId || 'Unknown',
      scanTime: new Date(),
      success: response.success
    })
    
    // Keep only last 10 scans
    if (scanHistory.value.length > 10) {
      scanHistory.value = scanHistory.value.slice(0, 10)
    }
    
    // Show success animation
    if (response.success) {
      navigator.vibrate?.(200) // Vibrate if supported
    }
    
  } catch (error) {
    lastScanResult.value = {
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการสแกน'
    }
  } finally {
    isScanning.value = false
  }
}

const scanManualQR = () => {
  if (manualQRCode.value) {
    handleQRScan(manualQRCode.value)
    manualQRCode.value = ''
  }
}

const getAttendanceStatusText = (status) => {
  switch (status) {
    case 'CHECKED_IN': return '✅ เช็คอินแล้ว'
    case 'PENDING': return '⏳ รอเช็คอิน'
    case 'NO_SHOW': return '❌ ไม่มาร่วมงาน'
    default: return status
  }
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
```

#### 1.3 Device Settings
```http
GET /mobile/settings/{userId}
PUT /mobile/settings/{userId}
```

#### 1.4 Offline Support
```http
GET /mobile/offline-data/{userId}
```

---

## 🔔 Notifications API

### 1. 📬 User Notifications

#### 1.1 Get User Notifications
```http
GET /notifications?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_001",
      "title": "การจองสำเร็จ",
      "message": "คุณได้จองที่นั่ง A-15 เรียบร้อยแล้ว",
      "type": "booking_success",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "data": {
        "orderId": "ORD_001",
        "seatId": "A-15"
      }
    }
  ]
}
```

**Vue Notifications Component:**
```vue
<template>
  <div class="notifications-panel">
    <!-- Notification Bell Icon with Badge -->
    <div class="relative" @click="togglePanel">
      <Icon name="heroicons:bell" class="w-6 h-6 cursor-pointer" />
      <span 
        v-if="unreadCount > 0"
        class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </div>

    <!-- Notifications Panel -->
    <div 
      v-if="showPanel"
      class="absolute top-8 right-0 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-hidden"
    >
      <div class="p-4 border-b flex justify-between items-center">
        <h3 class="font-semibold">การแจ้งเตือน</h3>
        <button 
          @click="markAllAsRead"
          class="text-sm text-blue-600 hover:underline"
        >
          อ่านทั้งหมด
        </button>
      </div>
      
      <div class="overflow-y-auto max-h-80">
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          :class="[
            'p-4 border-b hover:bg-gray-50 cursor-pointer',
            !notification.isRead ? 'bg-blue-50' : ''
          ]"
          @click="markAsRead(notification.id)"
        >
          <div class="flex items-start space-x-3">
            <div :class="getNotificationIcon(notification.type)">
              <Icon :name="getIconName(notification.type)" class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-medium truncate">{{ notification.title }}</h4>
              <p class="text-sm text-gray-600 mt-1">{{ notification.message }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ formatTime(notification.createdAt) }}</p>
            </div>
            <div v-if="!notification.isRead" class="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const showPanel = ref(false)
const notifications = ref([])
const unreadCount = ref(0)

const { data: notificationsData } = await useFetch('/notifications')
const { data: countData } = await useFetch('/notifications/unread-count')

notifications.value = notificationsData.value
unreadCount.value = countData.value.count

const togglePanel = () => {
  showPanel.value = !showPanel.value
}

const markAsRead = async (id) => {
  await $fetch(`/notifications/${id}/read`, { method: 'PATCH' })
  // Update local state
  const notification = notifications.value.find(n => n.id === id)
  if (notification) {
    notification.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
}

const markAllAsRead = async () => {
  await $fetch('/notifications/mark-all-read', { method: 'PATCH' })
  notifications.value.forEach(n => n.isRead = true)
  unreadCount.value = 0
}

const getNotificationIcon = (type) => {
  const baseClass = "w-8 h-8 rounded-full flex items-center justify-center"
  switch (type) {
    case 'booking_success': return `${baseClass} bg-green-100 text-green-600`
    case 'payment_required': return `${baseClass} bg-yellow-100 text-yellow-600`
    case 'promotion': return `${baseClass} bg-purple-100 text-purple-600`
    default: return `${baseClass} bg-gray-100 text-gray-600`
  }
}

const getIconName = (type) => {
  switch (type) {
    case 'booking_success': return 'heroicons:check-circle'
    case 'payment_required': return 'heroicons:exclamation-triangle'
    case 'promotion': return 'heroicons:gift'
    default: return 'heroicons:bell'
  }
}

const formatTime = (dateString) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Close panel when clicking outside
onClickOutside(showPanel, () => showPanel.value = false)
</script>
```

#### 1.2 Get Unread Count
```http
GET /notifications/unread-count
```

#### 1.3 Mark as Read
```http
PATCH /notifications/{id}/read
```

#### 1.4 Mark All as Read
```http
PATCH /notifications/mark-all-read
```

#### 1.5 Send Promotional Notification (Admin)
```http
POST /notifications/promotional
```

---

## ⚡ Realtime API (WebSocket)

### 1. 🔌 WebSocket Connection

#### Connection Setup
```javascript
// plugins/socket.client.js
import { io } from 'socket.io-client'

export default defineNuxtPlugin(() => {
  const socket = io('ws://localhost:3000/realtime', {
    auth: {
      token: useCookie('auth-token').value
    }
  })

  return {
    provide: {
      socket
    }
  }
})
```

#### 1.1 Join User Room
```javascript
socket.emit('join-user', { userId: 'user123' })
```

#### 1.2 Join Zone Updates
```javascript
socket.emit('join-zone', { zoneId: 'zone123' })
```

### 2. 🪑 Seat Selection Realtime

#### 2.1 Seat Selection Event
```javascript
socket.emit('seat-selection', {
  seatId: 'A-15',
  userId: 'user123',
  zoneId: 'zone123',
  action: 'select' // or 'deselect'
})
```

**Vue Realtime Seat Map:**
```vue
<template>
  <div class="seat-map">
    <div class="grid grid-cols-10 gap-2 p-4">
      <div
        v-for="seat in seats"
        :key="seat.id"
        :class="[
          'w-8 h-8 rounded border-2 cursor-pointer transition-all duration-200',
          getSeatClass(seat)
        ]"
        @click="selectSeat(seat)"
      >
        {{ seat.number }}
      </div>
    </div>
    
    <!-- Live Selection Indicator -->
    <div v-if="liveSelections.length" class="mt-4 p-3 bg-yellow-50 rounded">
      <h4 class="text-sm font-medium text-yellow-800 mb-2">🔴 มีคนกำลังเลือกที่นั่ง:</h4>
      <div class="flex flex-wrap gap-2">
        <span 
          v-for="selection in liveSelections" 
          :key="selection.seatId"
          class="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded"
        >
          {{ selection.seatId }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
const { $socket } = useNuxtApp()
const seats = ref([])
const liveSelections = ref([])
const selectedSeats = ref([])

// Join zone for realtime updates
onMounted(() => {
  $socket.emit('join-zone', { zoneId: props.zoneId })
  
  // Listen for seat updates
  $socket.on('seat-update', (data) => {
    if (data.action === 'select') {
      liveSelections.value.push(data)
    } else {
      liveSelections.value = liveSelections.value.filter(s => s.seatId !== data.seatId)
    }
    
    // Remove after 30 seconds
    setTimeout(() => {
      liveSelections.value = liveSelections.value.filter(s => s.seatId !== data.seatId)
    }, 30000)
  })
})

const selectSeat = (seat) => {
  if (seat.status === 'occupied') return
  
  const action = selectedSeats.value.includes(seat.id) ? 'deselect' : 'select'
  
  $socket.emit('seat-selection', {
    seatId: seat.id,
    userId: useAuthUser().value.id,
    zoneId: props.zoneId,
    action
  })
  
  if (action === 'select') {
    selectedSeats.value.push(seat.id)
  } else {
    selectedSeats.value = selectedSeats.value.filter(id => id !== seat.id)
  }
}

const getSeatClass = (seat) => {
  if (seat.status === 'occupied') return 'bg-red-500 text-white cursor-not-allowed'
  if (selectedSeats.value.includes(seat.id)) return 'bg-blue-500 text-white'
  if (liveSelections.value.some(s => s.seatId === seat.id)) return 'bg-yellow-400 text-black animate-pulse'
  return 'bg-gray-200 hover:bg-gray-300'
}
</script>
```

#### 2.3 Request Live Updates
```javascript
socket.emit('request-live-updates', { zoneId: 'zone123' })
```

### 3. 📊 Live Analytics Updates

#### 3.1 Subscribe to Analytics
```javascript
socket.emit('subscribe-analytics')

socket.on('analytics-update', (data) => {
  // Real-time analytics data
  console.log('Live analytics:', data)
})
```

---

## 🛠️ Nuxt3 Integration Examples

### 1. 📁 Project Structure
```
nuxt-frontend/
├── components/
│   ├── Analytics/
│   │   ├── DashboardChart.vue
│   │   ├── SalesMetrics.vue
│   │   └── RealtimeStats.vue
│   ├── Mobile/
│   │   ├── HomeScreen.vue
│   │   ├── QRScanner.vue
│   │   └── NotificationBell.vue
│   ├── Notifications/
│   │   ├── NotificationPanel.vue
│   │   └── NotificationItem.vue
│   └── Realtime/
│       ├── SeatMap.vue
│       ├── LiveCounter.vue
│       └── ConnectionStatus.vue
├── composables/
│   ├── useAnalytics.js
│   ├── useAI.js
│   ├── useMobile.js
│   ├── useNotifications.js
│   └── useRealtime.js
├── plugins/
│   ├── socket.client.js
│   └── api.js
└── pages/
    ├── admin/
    │   └── analytics.vue
    ├── mobile/
    │   └── index.vue
    └── dashboard.vue
```

### 2. 🎯 Composables

#### useAnalytics.js
```javascript
export const useAnalytics = () => {
  const getDailySales = async (date = null) => {
    const { data } = await $fetch('/analytics/sales/daily', {
      query: { date: date || new Date().toISOString().split('T')[0] },
      headers: useAuthHeaders()
    })
    return data
  }

  const getMonthlySales = async (year, month) => {
    const { data } = await $fetch('/analytics/sales/monthly', {
      query: { year, month },
      headers: useAuthHeaders()
    })
    return data
  }

  const getRealtimeStats = async () => {
    const { data } = await $fetch('/analytics/realtime', {
      headers: useAuthHeaders()
    })
    return data
  }

  const getSeatUtilization = async (zoneId = null) => {
    const { data } = await $fetch('/analytics/seats/utilization', {
      query: zoneId ? { zoneId } : {},
      headers: useAuthHeaders()
    })
    return data
  }

  return {
    getDailySales,
    getMonthlySales,
    getRealtimeStats,
    getSeatUtilization
  }
}
```

#### useAI.js
```javascript
export const useAI = () => {
  const getSeatRecommendations = async (userId, zoneId, limit = 5) => {
    const { data } = await $fetch(`/ai-recommendations/seats/${userId}/${zoneId}`, {
      query: { limit },
      headers: useAuthHeaders()
    })
    return data
  }

  const getPricingRecommendations = async (zoneId, seatZone = 'General') => {
    const { data } = await $fetch(`/ai-recommendations/pricing/${zoneId}`, {
      query: { seatZone },
      headers: useAuthHeaders()
    })
    return data
  }

  const getUserBehaviorPredictions = async (userId) => {
    const { data } = await $fetch(`/ai-recommendations/user-behavior/${userId}`, {
      headers: useAuthHeaders()
    })
    return data
  }

  return {
    getSeatRecommendations,
    getPricingRecommendations,
    getUserBehaviorPredictions
  }
}
```

#### useQRCode.js
```javascript
export const useQRCode = () => {
  const scanQRCode = async (qrData, location = 'Unknown', deviceId = 'Unknown') => {
    const { data } = await $fetch('/api/v1/mobile/scanner/scan', {
      method: 'POST',
      body: {
        qrData,
        location,
        deviceId
      },
      headers: useAuthHeaders()
    })
    return data
  }

  const generateThermalReceipt = async (tickets) => {
    const response = await fetch('/referrers/generate-thermal-receipt-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...useAuthHeaders()
      },
      body: JSON.stringify({ tickets })
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate receipt')
    }
    
    return response.blob()
  }

  const downloadReceiptPDF = async (tickets, filename = null) => {
    try {
      const blob = await generateThermalReceipt(tickets)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `thermal-receipt-qr-${new Date().getTime()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      return true
    } catch (error) {
      console.error('Error downloading receipt:', error)
      throw error
    }
  }

  return {
    scanQRCode,
    generateThermalReceipt,
    downloadReceiptPDF
  }
}
```
```javascript
export const useNotifications = () => {
  const notifications = ref([])
  const unreadCount = ref(0)

  const fetchNotifications = async (limit = 50) => {
    const { data } = await $fetch('/notifications', {
      query: { limit },
      headers: useAuthHeaders()
    })
    notifications.value = data
    return data
  }

  const getUnreadCount = async () => {
    const { data } = await $fetch('/notifications/unread-count', {
      headers: useAuthHeaders()
    })
    unreadCount.value = data.count
    return data.count
  }

  const markAsRead = async (id) => {
    await $fetch(`/notifications/${id}/read`, {
      method: 'PATCH',
      headers: useAuthHeaders()
    })
    
    const notification = notifications.value.find(n => n.id === id)
    if (notification && !notification.isRead) {
      notification.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  const markAllAsRead = async () => {
    await $fetch('/notifications/mark-all-read', {
      method: 'PATCH',
      headers: useAuthHeaders()
    })
    
    notifications.value.forEach(n => n.isRead = true)
    unreadCount.value = 0
  }

  return {
    notifications: readonly(notifications),
    unreadCount: readonly(unreadCount),
    fetchNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
  }
}
```

### 3. 🎨 Tailwind CSS Classes

#### Utility Classes
```css
/* Analytics Dashboard */
.analytics-card {
  @apply bg-white rounded-lg shadow-md p-6 border border-gray-200;
}

.metric-value {
  @apply text-3xl font-bold text-gray-900;
}

.metric-label {
  @apply text-sm text-gray-600 uppercase tracking-wide;
}

.metric-change-positive {
  @apply text-green-600 text-sm font-medium;
}

.metric-change-negative {
  @apply text-red-600 text-sm font-medium;
}

/* Mobile Interface */
.mobile-card {
  @apply bg-white rounded-lg shadow-sm border border-gray-100 p-4;
}

.mobile-button {
  @apply w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors;
}

.mobile-header {
  @apply bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4;
}

/* Notifications */
.notification-item {
  @apply p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors;
}

.notification-unread {
  @apply bg-blue-50 border-l-4 border-blue-500;
}

.notification-badge {
  @apply absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center;
}

/* Seat Map */
.seat-available {
  @apply bg-gray-200 hover:bg-gray-300 border-gray-400 cursor-pointer;
}

.seat-selected {
  @apply bg-blue-500 text-white border-blue-600;
}

.seat-occupied {
  @apply bg-red-500 text-white border-red-600 cursor-not-allowed;
}

.seat-live-selection {
  @apply bg-yellow-400 text-black border-yellow-500 animate-pulse;
}
```

### 4. 📱 Mobile-First Design

#### Responsive Breakpoints
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        'mobile': { 'max': '767px' },
        'tablet': { 'min': '768px', 'max': '1023px' },
        'desktop': { 'min': '1024px' }
      }
    }
  }
}
```

---

## 🚀 Performance Optimization

### 1. 📊 Caching Strategy
```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:3000'
    }
  },
  
  nitro: {
    routeRules: {
      // Analytics data - cache for 5 minutes
      '/api/analytics/**': { isr: 300 },
      // Static content - cache for 1 hour
      '/api/mobile/home': { isr: 3600 },
      // User-specific - no cache
      '/api/notifications/**': { index: false }
    }
  }
})
```

### 2. ⚡ Real-time Optimization
```javascript
// plugins/socket.client.js
export default defineNuxtPlugin(() => {
  const socket = io(useRuntimeConfig().public.apiBase + '/realtime', {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    maxReconnectionAttempts: 10
  })

  // Connection health monitoring
  const connectionHealth = ref('connecting')
  
  socket.on('connect', () => {
    connectionHealth.value = 'connected'
  })
  
  socket.on('disconnect', () => {
    connectionHealth.value = 'disconnected'
  })

  return {
    provide: {
      socket,
      connectionHealth: readonly(connectionHealth)
    }
  }
})
```

---

## 🔧 Error Handling

### 1. 🚨 API Error Handling
```javascript
// plugins/api.js
export default defineNuxtPlugin(() => {
  const handleApiError = (error) => {
    if (error.status === 401) {
      // Redirect to login
      return navigateTo('/login')
    }
    
    if (error.status === 403) {
      // Show permission error
      useToast().error('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
      return
    }
    
    if (error.status >= 500) {
      // Show server error
      useToast().error('เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง')
      return
    }
    
    // Generic error
    useToast().error(error.message || 'เกิดข้อผิดพลาด')
  }

  return {
    provide: {
      handleApiError
    }
  }
})
```

### 2. 🔄 Retry Logic
```javascript
// utils/api.js
export const apiWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await $fetch(url, options)
    } catch (error) {
      lastError = error
      
      if (i === maxRetries || error.status < 500) {
        break
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
  
  throw lastError
}
```

---

## 📚 Additional Resources

### 1. 🔗 Useful Links
- [NestJS Documentation](https://docs.nestjs.com/)
- [Nuxt3 Documentation](https://nuxt.com/docs)
- [Vue3 Documentation](https://vuejs.org/guide/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Socket.IO Documentation](https://socket.io/docs/)

### 2. 📝 Example Environment Variables
```bash
# .env
NUXT_PUBLIC_API_BASE=http://localhost:3000
NUXT_PUBLIC_WS_URL=ws://localhost:3000
NUXT_AUTH_SECRET=your-secret-key
NUXT_PUBLIC_APP_NAME=TicketApp
```

### 3. 🎯 Recommended Packages
```json
{
  "dependencies": {
    "@nuxtjs/tailwindcss": "^6.0.0",
    "@pinia/nuxt": "^0.5.0",
    "@vueuse/nuxt": "^10.0.0",
    "socket.io-client": "^4.7.0",
    "@nuxtjs/google-fonts": "^3.0.0",
    "chart.js": "^4.0.0",
    "vue-chartjs": "^5.0.0",
    "qr-scanner": "^1.4.2",
    "qrcode": "^1.5.3",
    "@zxing/library": "^0.20.0"
  }
}
```

### 4. 📱 QR Code Scanner Setup
```bash
# Install QR Scanner packages
npm install qr-scanner qrcode @zxing/library

# For Nuxt3 plugins
# Create plugins/qr-scanner.client.js
```

**plugins/qr-scanner.client.js:**
```javascript
export default defineNuxtPlugin(() => {
  // QR Scanner is only available on client side
  return {
    provide: {
      QrScanner: () => import('qr-scanner')
    }
  }
})
```

---

## 📞 Support & Contact

### Development Team
- **Backend API**: NestJS + TypeScript
- **Frontend**: Nuxt3 + Vue3 + Tailwind CSS
- **Real-time**: Socket.IO
- **Database**: PostgreSQL + Redis

### API Endpoints Summary
| Module | Base URL | Key Features |
|--------|----------|--------------|
| Analytics | `/analytics` | Sales reports, predictions, monitoring |
| AI | `/ai-recommendations` | Seat recommendations, pricing, behavior |
| Mobile | `/mobile` | Home screen, QR scanner, settings |
| Notifications | `/notifications` | Push notifications, read status |
| Realtime | `/realtime` (WebSocket) | Live updates, seat selection |
| QR Code | `/mobile/scanner` | QR scanning, attendance tracking |
| Thermal Receipt | `/referrers/generate-thermal-receipt-qr` | PDF generation with QR codes |

---

*อัพเดทล่าสุด: มกราคม 2024*
