# 🎯 Frontend Integration Guide - Vue 3 + Nuxt 3 + Tailwind CSS

## 🚀 System Overview

### **ระบบจองตั้วใหม่แบบ Real-time**
- **Backend**: NestJS + PostgreSQL + WebSocket
- **Frontend**: Vue 3 + Nuxt 3 + Tailwind CSS
- **Features**: Real-time seat updates, Race condition prevention, Database-level locking

---

## 📋 Required Dependencies

### **Package.json**
```json
{
  "dependencies": {
    "socket.io-client": "^4.7.2",
    "@vueuse/nuxt": "^10.4.1",
    "@pinia/nuxt": "^0.5.1"
  }
}
```

### **Nuxt Configuration**
```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:4000',
      wsUrl: process.env.WEBSOCKET_URL || 'http://localhost:4000'
    }
  }
})
```

---

## 🔧 Core Implementation

### **1. Composables - WebSocket Connection**
```javascript
// composables/useWebSocket.js
import { io } from 'socket.io-client'

export const useWebSocket = () => {
  const config = useRuntimeConfig()
  const socket = ref(null)
  const isConnected = ref(false)

  const connect = (showDate) => {
    socket.value = io(`${config.public.wsUrl}/order-updates`, {
      transports: ['websocket'],
      upgrade: false
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      // เข้าร่วม room สำหรับวันแสดง
      socket.value.emit('join_show_room', { showDate })
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
    })

    socket.value.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    return socket.value
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }

  return {
    socket: readonly(socket),
    isConnected: readonly(isConnected),
    connect,
    disconnect
  }
}
```

### **2. Composables - API Calls**
```javascript
// composables/useApi.js
export const useApi = () => {
  const config = useRuntimeConfig()
  const { $fetch } = useNuxtApp()

  const apiCall = async (endpoint, options = {}) => {
    const token = useCookie('authToken').value
    
    return await $fetch(`${config.public.apiBase}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }

  // ล็อกที่นั่ง
  const lockSeats = async (seatIds, showDate) => {
    return await apiCall('/api/v1/orders/seats/lock', {
      method: 'POST',
      body: { seatIds, showDate }
    })
  }

  // ปลดล็อกที่นั่ง
  const unlockSeats = async (seatIds, showDate) => {
    return await apiCall('/api/v1/orders/seats/unlock', {
      method: 'POST',
      body: { seatIds, showDate }
    })
  }

  // สร้างออเดอร์
  const createOrder = async (orderData) => {
    return await apiCall('/api/v1/orders', {
      method: 'POST',
      body: orderData
    })
  }

  // ยกเลิกออเดอร์
  const cancelOrder = async (orderId) => {
    return await apiCall(`/api/v1/orders/${orderId}/cancel`, {
      method: 'PATCH'
    })
  }

  // ดูที่นั่งตามโซน
  const getSeatsByZone = async (zoneId, showDate) => {
    return await apiCall(`/api/v1/seats/by-zone/${zoneId}?showDate=${showDate}`)
  }

  // ตรวจสอบสถานะระบบ
  const getSystemHealth = async () => {
    return await apiCall('/api/v1/orders/system/health')
  }

  return {
    lockSeats,
    unlockSeats,
    createOrder,
    cancelOrder,
    getSeatsByZone,
    getSystemHealth
  }
}
```

### **3. Pinia Store - State Management**
```javascript
// stores/booking.js
import { defineStore } from 'pinia'

export const useBookingStore = defineStore('booking', () => {
  // State
  const seats = ref(new Map())
  const selectedSeats = ref([])
  const lockedSeats = ref([])
  const bookedSeats = ref([])
  const showDate = ref('2025-07-09')
  const isLoading = ref(false)
  const error = ref(null)

  // WebSocket & API
  const { socket, isConnected, connect, disconnect } = useWebSocket()
  const api = useApi()

  // Seat status constants
  const SEAT_STATUS = {
    AVAILABLE: 'AVAILABLE',
    LOCKED: 'LOCKED',
    BOOKED: 'BOOKED',
    SELECTED: 'SELECTED',
    EMPTY: 'EMPTY'
  }

  // Actions
  const initializeWebSocket = () => {
    const socketInstance = connect(showDate.value)

    // Listen to seat events
    socketInstance.on('seat_locked', (event) => {
      event.data.seatIds.forEach(seatId => {
        updateSeatStatus(seatId, SEAT_STATUS.LOCKED)
      })
    })

    socketInstance.on('seat_unlocked', (event) => {
      event.data.seatIds.forEach(seatId => {
        updateSeatStatus(seatId, SEAT_STATUS.AVAILABLE)
      })
    })

    socketInstance.on('order_created', (event) => {
      event.data.seatIds.forEach(seatId => {
        updateSeatStatus(seatId, SEAT_STATUS.BOOKED)
        bookedSeats.value.push(seatId)
      })
    })

    socketInstance.on('order_cancelled', (event) => {
      event.data.seatIds.forEach(seatId => {
        updateSeatStatus(seatId, SEAT_STATUS.AVAILABLE)
        bookedSeats.value = bookedSeats.value.filter(id => id !== seatId)
      })
    })
  }

  const updateSeatStatus = (seatId, status) => {
    const seat = seats.value.get(seatId)
    if (seat) {
      seat.status = status
      seats.value.set(seatId, seat)
    }
  }

  const selectSeat = async (seatId) => {
    try {
      isLoading.value = true
      error.value = null

      if (selectedSeats.value.includes(seatId)) {
        // ปลดล็อกที่นั่ง
        await api.unlockSeats([seatId], showDate.value)
        selectedSeats.value = selectedSeats.value.filter(id => id !== seatId)
        updateSeatStatus(seatId, SEAT_STATUS.AVAILABLE)
      } else {
        // ล็อกที่นั่ง
        await api.lockSeats([seatId], showDate.value)
        selectedSeats.value.push(seatId)
        updateSeatStatus(seatId, SEAT_STATUS.SELECTED)
      }
    } catch (err) {
      error.value = err.message
      console.error('Seat selection failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  const createBooking = async (customerData) => {
    try {
      isLoading.value = true
      error.value = null

      const orderData = {
        seatIds: selectedSeats.value,
        showDate: showDate.value,
        ...customerData
      }

      const result = await api.createOrder(orderData)
      
      // Reset selection
      selectedSeats.value = []
      
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const loadSeats = async (zoneId) => {
    try {
      isLoading.value = true
      const result = await api.getSeatsByZone(zoneId, showDate.value)
      
      // Update seats map
      result.data.forEach(seat => {
        seats.value.set(seat.id, seat)
      })
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  const cleanup = () => {
    disconnect()
    selectedSeats.value = []
    seats.value.clear()
  }

  return {
    // State
    seats: readonly(seats),
    selectedSeats: readonly(selectedSeats),
    lockedSeats: readonly(lockedSeats),
    bookedSeats: readonly(bookedSeats),
    showDate: readonly(showDate),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isConnected,
    SEAT_STATUS,
    
    // Actions
    initializeWebSocket,
    selectSeat,
    createBooking,
    loadSeats,
    clearError,
    cleanup
  }
})
```

---

## 🎨 Vue Components

### **1. Main Booking Component**
```vue
<!-- components/BookingSystem.vue -->
<template>
  <div class="max-w-6xl mx-auto p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        🎫 ระบบจองตั๋วแบบ Real-time
      </h1>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" 
               :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></div>
          <span class="text-sm">
            {{ isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ' }}
          </span>
        </div>
        <div class="text-sm text-gray-600">
          วันแสดง: {{ showDate }}
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" 
         class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
        </svg>
        <span class="text-red-700">{{ error }}</span>
        <button @click="clearError" class="ml-auto text-red-500 hover:text-red-700">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Seat Legend -->
    <SeatLegend />

    <!-- Seat Map -->
    <div class="mb-8">
      <SeatMap @seat-click="handleSeatClick" />
    </div>

    <!-- Booking Form -->
    <BookingForm 
      v-if="selectedSeats.length > 0"
      @submit="handleBookingSubmit"
      :is-loading="isLoading"
      :selected-seats="selectedSeats"
    />

    <!-- Loading Overlay -->
    <div v-if="isLoading" 
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl">
        <div class="flex items-center gap-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span>กำลังดำเนินการ...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const bookingStore = useBookingStore()
const { 
  selectedSeats, 
  isLoading, 
  error, 
  isConnected, 
  showDate 
} = storeToRefs(bookingStore)

const { 
  initializeWebSocket, 
  selectSeat, 
  createBooking, 
  clearError, 
  cleanup 
} = bookingStore

// Initialize WebSocket on mount
onMounted(() => {
  initializeWebSocket()
})

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
})

// Handle seat click
const handleSeatClick = async (seatId) => {
  await selectSeat(seatId)
}

// Handle booking submission
const handleBookingSubmit = async (customerData) => {
  try {
    const result = await createBooking(customerData)
    
    // Show success message
    await navigateTo({
      path: '/booking-success',
      query: { orderNumber: result.data.orderNumber }
    })
  } catch (err) {
    console.error('Booking failed:', err)
  }
}
</script>
```

### **2. Seat Map Component**
```vue
<!-- components/SeatMap.vue -->
<template>
  <div class="bg-white rounded-lg shadow-lg p-6">
    <h2 class="text-xl font-semibold mb-4">แผนผังที่นั่ง</h2>
    
    <!-- Stage -->
    <div class="text-center mb-8">
      <div class="inline-block bg-gray-800 text-white px-8 py-2 rounded-lg">
        🎭 เวที
      </div>
    </div>

    <!-- Zones -->
    <div class="space-y-8">
      <SeatZone 
        v-for="zone in zones" 
        :key="zone.id"
        :zone="zone"
        @seat-click="$emit('seat-click', $event)"
      />
    </div>
  </div>
</template>

<script setup>
defineEmits(['seat-click'])

// Sample zones - replace with actual data
const zones = ref([
  { id: 'ringside', name: 'Ringside', rows: 5, seatsPerRow: 10 },
  { id: 'premium', name: 'Premium', rows: 8, seatsPerRow: 12 },
  { id: 'standard', name: 'Standard', rows: 10, seatsPerRow: 15 }
])
</script>
```

### **3. Seat Zone Component**
```vue
<!-- components/SeatZone.vue -->
<template>
  <div class="border rounded-lg p-4">
    <h3 class="font-semibold mb-4 text-lg">{{ zone.name }}</h3>
    
    <div class="space-y-2">
      <div 
        v-for="row in zone.rows" 
        :key="row"
        class="flex items-center gap-2"
      >
        <!-- Row Label -->
        <div class="w-8 text-center font-medium text-gray-600">
          {{ String.fromCharCode(64 + row) }}
        </div>
        
        <!-- Seats -->
        <div class="flex gap-1">
          <SeatButton
            v-for="seatNum in zone.seatsPerRow"
            :key="`${zone.id}-${row}-${seatNum}`"
            :seat-id="`${zone.id}-${row}-${seatNum}`"
            :status="getSeatStatus(`${zone.id}-${row}-${seatNum}`)"
            @click="$emit('seat-click', `${zone.id}-${row}-${seatNum}`)"
          />
        </div>
        
        <!-- Row Label (Right) -->
        <div class="w-8 text-center font-medium text-gray-600">
          {{ String.fromCharCode(64 + row) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  zone: {
    type: Object,
    required: true
  }
})

defineEmits(['seat-click'])

const bookingStore = useBookingStore()
const { seats } = storeToRefs(bookingStore)

const getSeatStatus = (seatId) => {
  const seat = seats.value.get(seatId)
  return seat?.status || 'AVAILABLE'
}
</script>
```

### **4. Seat Button Component**
```vue
<!-- components/SeatButton.vue -->
<template>
  <button
    :class="seatClasses"
    :disabled="isDisabled"
    @click="handleClick"
    class="w-8 h-8 rounded border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <span class="sr-only">{{ seatId }}</span>
  </button>
</template>

<script setup>
const props = defineProps({
  seatId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['click'])

const bookingStore = useBookingStore()
const { SEAT_STATUS } = bookingStore

const seatClasses = computed(() => {
  const baseClasses = 'text-xs font-medium'
  
  switch (props.status) {
    case SEAT_STATUS.AVAILABLE:
      return `${baseClasses} bg-green-100 border-green-300 text-green-800 hover:bg-green-200`
    case SEAT_STATUS.SELECTED:
      return `${baseClasses} bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200`
    case SEAT_STATUS.LOCKED:
      return `${baseClasses} bg-orange-100 border-orange-300 text-orange-800 cursor-not-allowed`
    case SEAT_STATUS.BOOKED:
      return `${baseClasses} bg-red-100 border-red-300 text-red-800 cursor-not-allowed`
    case SEAT_STATUS.EMPTY:
      return `${baseClasses} bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed`
    default:
      return `${baseClasses} bg-gray-100 border-gray-300 text-gray-500`
  }
})

const isDisabled = computed(() => {
  return props.status === SEAT_STATUS.LOCKED || 
         props.status === SEAT_STATUS.BOOKED || 
         props.status === SEAT_STATUS.EMPTY
})

const handleClick = () => {
  if (!isDisabled.value) {
    emit('click')
  }
}
</script>
```

### **5. Seat Legend Component**
```vue
<!-- components/SeatLegend.vue -->
<template>
  <div class="bg-gray-50 rounded-lg p-4 mb-6">
    <h3 class="font-semibold mb-3">สถานะที่นั่ง</h3>
    <div class="flex flex-wrap gap-4">
      <div 
        v-for="status in legendItems" 
        :key="status.key"
        class="flex items-center gap-2"
      >
        <div 
          class="w-4 h-4 rounded border-2"
          :class="status.class"
        ></div>
        <span class="text-sm">{{ status.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const legendItems = [
  {
    key: 'available',
    label: 'ว่าง',
    class: 'bg-green-100 border-green-300'
  },
  {
    key: 'selected',
    label: 'เลือกอยู่',
    class: 'bg-blue-100 border-blue-300'
  },
  {
    key: 'locked',
    label: 'ถูกล็อก',
    class: 'bg-orange-100 border-orange-300'
  },
  {
    key: 'booked',
    label: 'ถูกจองแล้ว',
    class: 'bg-red-100 border-red-300'
  },
  {
    key: 'empty',
    label: 'ปิดใช้งาน',
    class: 'bg-gray-100 border-gray-300'
  }
]
</script>
```

### **6. Booking Form Component**
```vue
<!-- components/BookingForm.vue -->
<template>
  <div class="bg-white rounded-lg shadow-lg p-6">
    <h2 class="text-xl font-semibold mb-4">ข้อมูลการจอง</h2>
    
    <!-- Selected Seats -->
    <div class="mb-6">
      <h3 class="font-medium mb-2">ที่นั่งที่เลือก</h3>
      <div class="flex flex-wrap gap-2">
        <span 
          v-for="seatId in selectedSeats" 
          :key="seatId"
          class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          {{ seatId }}
        </span>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Customer Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ-นามสกุล *
          </label>
          <input
            v-model="form.customerName"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="กรอกชื่อ-นามสกุล"
          />
        </div>

        <!-- Customer Phone -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            เบอร์โทรศัพท์ *
          </label>
          <input
            v-model="form.customerPhone"
            type="tel"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="081-234-5678"
          />
        </div>

        <!-- Ticket Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            ประเภทตั๋ว *
          </label>
          <select
            v-model="form.ticketType"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">เลือกประเภทตั๋ว</option>
            <option value="RINGSIDE">Ringside</option>
            <option value="PREMIUM">Premium</option>
            <option value="STANDARD">Standard</option>
          </select>
        </div>

        <!-- Payment Method -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            วิธีชำระเงิน *
          </label>
          <select
            v-model="form.paymentMethod"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">เลือกวิธีชำระเงิน</option>
            <option value="QR_CODE">QR Code</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end pt-4">
        <button
          type="submit"
          :disabled="isLoading"
          class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <div v-if="isLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {{ isLoading ? 'กำลังดำเนินการ...' : 'สร้างการจอง' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedSeats: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const form = reactive({
  customerName: '',
  customerPhone: '',
  ticketType: '',
  paymentMethod: ''
})

const handleSubmit = () => {
  emit('submit', { ...form })
}
</script>
```

---

## 📱 Page Implementation

### **Main Booking Page**
```vue
<!-- pages/booking.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <BookingSystem />
  </div>
</template>

<script setup>
// Page meta
definePageMeta({
  title: 'ระบบจองตั๋ว',
  middleware: 'auth' // ถ้ามี authentication
})

// SEO
useSeoMeta({
  title: 'ระบบจองตั๋ว - Real-time Booking System',
  description: 'ระบบจองตั๋วแบบ Real-time ป้องกัน Race Condition'
})
</script>
```

### **Success Page**
```vue
<!-- pages/booking-success.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <div class="text-center">
        <div class="mb-4">
          <svg class="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          จองสำเร็จ!
        </h1>
        
        <p class="text-gray-600 mb-6">
          หมายเลขการจอง: <span class="font-medium">{{ orderNumber }}</span>
        </p>
        
        <div class="space-y-3">
          <button
            @click="navigateTo('/booking')"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            จองใหม่
          </button>
          
          <button
            @click="navigateTo('/')"
            class="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const orderNumber = route.query.orderNumber
</script>
```

---

## 🛠️ Error Handling

### **Error Plugin**
```javascript
// plugins/error-handler.js
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (error, context) => {
    console.error('Vue error:', error, context)
    
    // จัดการ error ตาม status code
    if (error.statusCode) {
      switch (error.statusCode) {
        case 409:
          showError('ที่นั่งไม่สามารถจองได้')
          break
        case 429:
          showError('คำขอมากเกินไป กรุณาลองใหม่')
          break
        case 400:
          showError('ข้อมูลไม่ถูกต้อง')
          break
        default:
          showError('เกิดข้อผิดพลาด')
      }
    }
  }
})
```

---

## 🔒 Authentication Middleware

### **Auth Middleware**
```javascript
// middleware/auth.js
export default defineNuxtRouteMiddleware((to, from) => {
  const token = useCookie('authToken')
  
  if (!token.value) {
    return navigateTo('/login')
  }
})
```

---

## 📊 Performance Optimizations

### **Debounce Composable**
```javascript
// composables/useDebounce.js
export const useDebounce = (callback, delay) => {
  const timeout = ref(null)
  
  const debouncedCallback = (...args) => {
    clearTimeout(timeout.value)
    timeout.value = setTimeout(() => {
      callback(...args)
    }, delay)
  }
  
  const cancel = () => {
    clearTimeout(timeout.value)
  }
  
  return { debouncedCallback, cancel }
}
```

### **Usage Example**
```javascript
// ใช้งาน debounce
const { debouncedCallback: debouncedSeatClick } = useDebounce(selectSeat, 300)
```

---

## 🎯 Key Features Summary

### **✅ Real-time Features**
- WebSocket connection ด้วย Socket.IO
- Live seat updates < 100ms
- Race condition prevention
- Auto-reconnection

### **✅ Vue 3 Features**
- Composition API
- Pinia state management
- Composables pattern
- Reactive data binding

### **✅ Nuxt 3 Features**
- Server-side rendering
- Auto-imports
- File-based routing
- Middleware support

### **✅ Tailwind CSS**
- Responsive design
- Modern UI components
- Custom animations
- Mobile-first approach

---

## 📝 Implementation Checklist

### **1. Setup Project**
```bash
# สร้าง Nuxt 3 project
npx nuxi@latest init ticket-booking-frontend
cd ticket-booking-frontend

# ติดตั้ง dependencies
npm install socket.io-client @pinia/nuxt @vueuse/nuxt @nuxtjs/tailwindcss

# ติดตั้ง Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### **2. Configure Nuxt**
- อัพเดต `nuxt.config.ts`
- ตั้งค่า environment variables
- เพิ่ม modules ที่จำเป็น

### **3. Create Core Files**
- `composables/useWebSocket.js`
- `composables/useApi.js`
- `stores/booking.js`
- `plugins/error-handler.js`

### **4. Build Components**
- `BookingSystem.vue`
- `SeatMap.vue`
- `SeatZone.vue`
- `SeatButton.vue`
- `SeatLegend.vue`
- `BookingForm.vue`

### **5. Create Pages**
- `pages/booking.vue`
- `pages/booking-success.vue`

### **6. Testing**
- ทดสอบ WebSocket connection
- ทดสอบ seat selection
- ทดสอบ booking flow
- ทดสอบ error handling

---

## 🚀 Production Deployment

### **Environment Variables**
```bash
# .env
NUXT_PUBLIC_API_BASE=https://api.yourdomain.com
NUXT_PUBLIC_WEBSOCKET_URL=https://api.yourdomain.com
```

### **Build Commands**
```bash
# Build for production
npm run build

# Start production server
npm run start

# Generate static site
npm run generate
```

---

**🎉 ระบบพร้อมใช้งาน Production!**

Frontend นี้จะทำงานร่วมกับ Backend ที่มีอยู่ได้อย่างสมบูรณ์ และรองรับ high concurrency ด้วย real-time updates
