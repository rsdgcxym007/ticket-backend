# 🗺️ Frontend Routes Guide

## 📱 **Frontend Application Routes**

### **Main Routes:**

| Route | File | Description | Access Level |
|-------|------|-------------|--------------|
| `/` | `pages/index.vue` | หน้าแรก | Public |
| `/mobile/login` | `pages/mobile/login.vue` | 🔐 Staff Login | Public |
| `/mobile/scanner` | `pages/mobile/scanner.vue` | 📱 QR Scanner | Staff Only |
| `/mobile/history` | `pages/mobile/history.vue` | 📊 Scan History | Staff Only |

---

## 🔐 **Authentication Flow**

### **Route Protection:**
```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated.value) {
    return navigateTo('/mobile/login')
  }
})
```

### **Protected Routes:**
```typescript
// pages/mobile/scanner.vue
<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'mobile'
})
</script>
```

---

## 📄 **Page Components**

### **1. Landing Page (`/`)**
```vue
<!-- pages/index.vue -->
<template>
  <div class="landing-page">
    <h1>Stadium Check-in System</h1>
    <div class="actions">
      <NuxtLink to="/mobile/login" class="btn-primary">
        Staff Login
      </NuxtLink>
      <a href="/api/docs" class="btn-secondary">
        API Documentation
      </a>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default'
})
</script>
```

### **2. Staff Login (`/mobile/login`)**
```vue
<!-- pages/mobile/login.vue -->
<template>
  <div class="login-page">
    <div class="login-form">
      <h2>🔐 Staff Login</h2>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Username</label>
          <input 
            v-model="credentials.username" 
            type="text" 
            required
            placeholder="staff1"
          >
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input 
            v-model="credentials.password" 
            type="password" 
            required
            placeholder="staff123"
          >
        </div>
        
        <button 
          type="submit" 
          :disabled="loading"
          class="btn-login"
        >
          {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
        </button>
      </form>
      
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'mobile'
})

const { login } = useAuth()
const router = useRouter()

const credentials = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    await login(credentials.value)
    await router.push('/mobile/scanner')
  } catch (err) {
    error.value = err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
  } finally {
    loading.value = false
  }
}
</script>
```

### **3. QR Scanner (`/mobile/scanner`)**
```vue
<!-- pages/mobile/scanner.vue -->
<template>
  <div class="scanner-page">
    <div class="scanner-header">
      <h2>📱 QR Code Scanner</h2>
      <div class="staff-info">
        <span>👤 {{ user?.name || user?.username }}</span>
        <button @click="handleLogout" class="btn-logout">
          ออกจากระบบ
        </button>
      </div>
    </div>

    <div class="scanner-container">
      <QRScanner 
        @scan="handleScan"
        @error="handleScanError"
        :loading="scanning"
      />
    </div>

    <div class="scanner-controls">
      <button @click="toggleFlash" class="btn-flash">
        {{ flashOn ? '🔦' : '💡' }} Flash
      </button>
      <button @click="switchCamera" class="btn-camera">
        🔄 Switch Camera
      </button>
      <NuxtLink to="/mobile/history" class="btn-history">
        📊 History
      </NuxtLink>
    </div>

    <!-- Scan Result Modal -->
    <ScanResultModal 
      v-if="scanResult"
      :result="scanResult"
      @close="scanResult = null"
      @scan-next="startNextScan"
    />
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'mobile'
})

const { user, logout } = useAuth()
const { scanQRCode } = useQRScanner()

const scanning = ref(false)
const flashOn = ref(false)
const scanResult = ref(null)

const handleScan = async (qrData: string) => {
  scanning.value = true
  
  try {
    const result = await scanQRCode(qrData)
    scanResult.value = result
  } catch (error) {
    handleScanError(error)
  } finally {
    scanning.value = false
  }
}

const handleScanError = (error: Error) => {
  // Show error toast or modal
  console.error('Scan error:', error)
}

const handleLogout = async () => {
  await logout()
  await navigateTo('/mobile/login')
}

const toggleFlash = () => {
  flashOn.value = !flashOn.value
  // Implement flash toggle
}

const switchCamera = () => {
  // Implement camera switch
}

const startNextScan = () => {
  scanResult.value = null
  // Reset scanner for next scan
}
</script>
```

### **4. Scan History (`/mobile/history`)**
```vue
<!-- pages/mobile/history.vue -->
<template>
  <div class="history-page">
    <div class="history-header">
      <h2>📊 Scan History</h2>
      <NuxtLink to="/mobile/scanner" class="btn-back">
        ← กลับไปสแกน
      </NuxtLink>
    </div>

    <div class="history-filters">
      <select v-model="filter.date">
        <option value="today">วันนี้</option>
        <option value="week">สัปดาห์นี้</option>
        <option value="month">เดือนนี้</option>
      </select>
      
      <select v-model="filter.status">
        <option value="all">ทั้งหมด</option>
        <option value="success">สำเร็จ</option>
        <option value="error">ล้มเหลว</option>
      </select>
    </div>

    <div class="history-stats">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">รวมทั้งหมด</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.success }}</span>
        <span class="stat-label">สำเร็จ</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.failed }}</span>
        <span class="stat-label">ล้มเหลว</span>
      </div>
    </div>

    <div class="history-list">
      <div 
        v-for="record in filteredHistory" 
        :key="record.id"
        class="history-item"
        :class="{ 'success': record.success, 'error': !record.success }"
      >
        <div class="item-header">
          <span class="order-id">{{ record.orderId }}</span>
          <span class="timestamp">{{ formatTime(record.timestamp) }}</span>
        </div>
        <div class="item-details">
          <span class="customer-name">{{ record.customerName }}</span>
          <span class="status" :class="record.success ? 'success' : 'error'">
            {{ record.success ? '✅ สำเร็จ' : '❌ ล้มเหลว' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'mobile'
})

const { scanHistory } = useScanHistory()

const filter = ref({
  date: 'today',
  status: 'all'
})

const filteredHistory = computed(() => {
  // Filter logic based on date and status
  return scanHistory.value.filter(record => {
    // Implement filtering logic
    return true
  })
})

const stats = computed(() => {
  const total = filteredHistory.value.length
  const success = filteredHistory.value.filter(r => r.success).length
  const failed = total - success
  
  return { total, success, failed }
})

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('th-TH')
}
</script>
```

---

## 🔗 **Navigation Flow**

```mermaid
graph TD
    A[/] --> B[/mobile/login]
    B --> C[/mobile/scanner]
    C --> D[/mobile/history]
    D --> C
    C --> B[Logout]
    B --> A
```

### **Navigation Guards:**
```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated } = useAuth()
  
  // Public routes
  const publicRoutes = ['/', '/mobile/login']
  
  if (publicRoutes.includes(to.path)) {
    return
  }
  
  // Protected routes require authentication
  if (!isAuthenticated.value) {
    return navigateTo('/mobile/login')
  }
})
```

---

## 🎨 **Layout Structure**

### **Default Layout:**
```vue
<!-- layouts/default.vue -->
<template>
  <div class="app-layout">
    <header class="app-header">
      <h1>Stadium Check-in System</h1>
    </header>
    
    <main class="app-main">
      <slot />
    </main>
    
    <footer class="app-footer">
      <p>&copy; 2025 Stadium Management System</p>
    </footer>
  </div>
</template>
```

### **Mobile Layout:**
```vue
<!-- layouts/mobile.vue -->
<template>
  <div class="mobile-layout">
    <div class="mobile-container">
      <slot />
    </div>
    
    <!-- Status Bar -->
    <div class="status-bar">
      <span class="connection-status" :class="{ 'online': isOnline }">
        {{ isOnline ? '🟢' : '🔴' }} {{ isOnline ? 'Online' : 'Offline' }}
      </span>
    </div>
  </div>
</template>

<script setup>
const isOnline = ref(navigator.onLine)

onMounted(() => {
  window.addEventListener('online', () => isOnline.value = true)
  window.addEventListener('offline', () => isOnline.value = false)
})
</script>
```

---

## 🚦 **Route Configuration**

### **Router Options:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  router: {
    options: {
      hashMode: false,
      scrollBehaviorType: 'smooth'
    }
  },
  
  // Route rules
  routeRules: {
    '/': { prerender: true },
    '/mobile/**': { ssr: false }, // Client-side only for mobile pages
    '/api/**': { proxy: { to: process.env.NUXT_PUBLIC_API_BASE_URL + '/api/**' } }
  }
})
```

---

## 📱 **Deep Linking (Mobile App)**

### **Custom URL Schemes:**
```typescript
// plugins/deep-linking.client.ts
export default defineNuxtPlugin(() => {
  // Handle deep links for mobile app
  if (process.client && window.location.protocol === 'stadium:') {
    const url = new URL(window.location.href)
    const route = url.pathname
    
    switch (route) {
      case '/scan':
        navigateTo('/mobile/scanner')
        break
      case '/login':
        navigateTo('/mobile/login')
        break
      default:
        navigateTo('/')
    }
  }
})
```

---

**🎯 Route Summary:**
- **Landing:** `/` - Welcome page
- **Staff Login:** `/mobile/login` - Authentication
- **QR Scanner:** `/mobile/scanner` - Main functionality  
- **History:** `/mobile/history` - Scan records

**📱 Mobile-First Design with responsive layouts for all screen sizes! 🚀**
