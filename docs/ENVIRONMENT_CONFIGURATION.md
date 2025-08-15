# 🌐 Environment Configuration Guide

## 📋 **Frontend Environment Variables**

### **Development Environment (.env.development)**
```bash
# Frontend App URL
NUXT_PUBLIC_APP_URL=http://localhost:3000

# Backend API URL
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000

# QR Scanner Settings
NUXT_PUBLIC_QR_TIMEOUT=30000
NUXT_PUBLIC_CAMERA_FACING_MODE=environment

# Debug Settings
NUXT_PUBLIC_DEBUG_MODE=true
NUXT_PUBLIC_STAFF_CREDENTIALS_ENABLED=true
NUXT_PUBLIC_MOCK_QR_RESPONSES=true
```

### **Production Environment (.env.production)**
```bash
# Frontend App URL (Production Server)
NUXT_PUBLIC_APP_URL=http://43.229.133.51:3000

# Backend API URL (Production Server)
NUXT_PUBLIC_API_BASE_URL=http://43.229.133.51:3000

# QR Scanner Settings
NUXT_PUBLIC_QR_TIMEOUT=15000
NUXT_PUBLIC_CAMERA_FACING_MODE=environment

# Debug Settings
NUXT_PUBLIC_DEBUG_MODE=false
NUXT_PUBLIC_STAFF_CREDENTIALS_ENABLED=false
NUXT_PUBLIC_MOCK_QR_RESPONSES=false
```

---

## 📱 **Frontend Routes Structure**

### **Page Routes:**
```
pages/
├── index.vue                     # หน้าแรก
├── mobile/
│   ├── login.vue                # 🔐 หน้าเข้าสู่ระบบ Staff
│   ├── scanner.vue              # 📱 หน้าสแกน QR Code  
│   └── history.vue              # 📊 ประวัติการสแกน
└── admin/
    ├── dashboard.vue            # 📋 Dashboard สำหรับ Admin
    └── reports.vue              # 📈 รายงานการใช้งาน
```

### **API Routes (Backend Proxy):**
```
api/
└── v1/
    └── mobile/
        └── scanner/
            ├── check-in/
            │   └── [orderId].get.ts     # Customer info endpoint
            ├── staff-checkin.post.ts    # Staff check-in endpoint
            └── scan.post.ts             # QR scan endpoint
```

### **URL Mapping:**

| Route | URL | Description |
|-------|-----|-------------|
| **Staff Login** | `/mobile/login` | หน้าเข้าสู่ระบบสำหรับ Staff |
| **QR Scanner** | `/mobile/scanner` | หน้าสแกน QR Code |
| **Scan History** | `/mobile/history` | ประวัติการสแกน |
| **Customer Info** | `/api/v1/mobile/scanner/check-in/[orderId]` | ข้อมูลลูกค้า (Backend render) |

---

## 🔗 **QR Code URL Format**

### **Development:**
```
http://localhost:3000/api/v1/mobile/scanner/check-in/ORD-20250811-001?qr=encrypted_data
```

### **Production:**
```
http://43.229.133.51:3000/api/v1/mobile/scanner/check-in/ORD-20250811-001?qr=encrypted_data
```

---

## ⚙️ **Nuxt Configuration**

### **nuxt.config.ts:**
```typescript
export default defineNuxtConfig({
  // Modules
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt'
  ],

  // Runtime Config
  runtimeConfig: {
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
      qrTimeout: process.env.NUXT_PUBLIC_QR_TIMEOUT || '30000',
      cameraFacingMode: process.env.NUXT_PUBLIC_CAMERA_FACING_MODE || 'environment',
      debugMode: process.env.NUXT_PUBLIC_DEBUG_MODE === 'true',
      staffCredentialsEnabled: process.env.NUXT_PUBLIC_STAFF_CREDENTIALS_ENABLED === 'true',
      mockQrResponses: process.env.NUXT_PUBLIC_MOCK_QR_RESPONSES === 'true'
    }
  },

  // PWA Configuration (for Mobile App)
  pwa: {
    manifest: {
      name: 'Stadium Check-in App',
      short_name: 'Stadium App',
      description: 'Staff QR Code Scanner for Stadium Check-in',
      theme_color: '#3B82F6',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/mobile/scanner',
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512x512.png', 
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      runtimeCaching: [
        {
          urlPattern: '/api/.*',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 300 // 5 minutes
            }
          }
        }
      ]
    }
  },

  // CSS Configuration
  css: [
    '~/assets/css/main.css'
  ],

  // App Configuration
  app: {
    head: {
      title: 'Stadium Check-in App',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Staff QR Code Scanner for Stadium Check-in' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  // Development Configuration
  devtools: { enabled: true },
  
  // Server Configuration
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

---

## 🗂️ **Project Structure**

```
stadium-frontend/
├── assets/
│   ├── css/
│   │   └── main.css
│   └── icons/
│       ├── icon-192x192.png
│       └── icon-512x512.png
│
├── components/
│   ├── QRScanner.vue
│   ├── ScanResult.vue
│   ├── StaffLogin.vue
│   └── ScanHistory.vue
│
├── composables/
│   ├── useAuth.ts
│   ├── useQRScanner.ts
│   └── useCamera.ts
│
├── layouts/
│   ├── default.vue
│   └── mobile.vue
│
├── middleware/
│   ├── auth.ts
│   └── staff.ts
│
├── pages/
│   ├── index.vue
│   └── mobile/
│       ├── login.vue
│       ├── scanner.vue
│       └── history.vue
│
├── plugins/
│   ├── qr-scanner.client.ts
│   └── camera.client.ts
│
├── server/
│   └── api/
│       └── v1/
│           └── mobile/
│               └── scanner/
│                   ├── check-in/
│                   │   └── [orderId].get.ts
│                   ├── staff-checkin.post.ts
│                   └── scan.post.ts
│
├── stores/
│   ├── auth.ts
│   ├── qrScanner.ts
│   └── scanHistory.ts
│
├── utils/
│   ├── api.ts
│   ├── camera.ts
│   └── errorHandling.ts
│
├── .env.development
├── .env.production
├── nuxt.config.ts
└── package.json
```

---

## 🚀 **Deployment Commands**

### **Development:**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for development
npm run build

# Preview build
npm run preview
```

### **Production:**
```bash
# Build for production
npm run build

# Start production server
npm run start

# Generate static files (if needed)
npm run generate
```

---

## 🔧 **Environment-Specific Settings**

### **Development Mode Features:**
- Debug console logs
- Mock API responses
- Staff credentials auto-fill
- Hot reload
- Detailed error messages

### **Production Mode Features:**
- Optimized build
- Error tracking (Sentry)
- Performance monitoring
- Secure API calls
- Production error handling

---

## 📱 **Mobile App Configuration**

### **Capacitor Configuration (capacitor.config.ts):**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stadium.checkin',
  appName: 'Stadium Check-in',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: process.env.NODE_ENV === 'production' 
      ? 'http://43.229.133.51:3000' 
      : 'http://localhost:3000'
  },
  plugins: {
    Camera: {
      permissions: ['camera']
    },
    BarcodeScanner: {
      cameraDirection: 'back'
    }
  }
};

export default config;
```

---

## 🧪 **Testing Configuration**

### **Test Environment Variables:**
```bash
# .env.test
NUXT_PUBLIC_APP_URL=http://localhost:3001
NUXT_PUBLIC_API_BASE_URL=http://localhost:3001
NUXT_PUBLIC_DEBUG_MODE=true
NUXT_PUBLIC_MOCK_QR_RESPONSES=true
```

### **Vitest Configuration:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts']
  }
})
```

---

**📞 Need Help?**
- **Environment Issues:** DevOps Team
- **API Configuration:** Backend Team
- **Frontend Setup:** Frontend Team

**🚀 Ready to deploy! 🎉**
